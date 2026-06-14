const express = require('express');
const BatchSmsLog = require('../models/BatchSmsLog');
const AdminSmsLog = require('../models/AdminSmsLog');
const { AppError } = require('../utils/errors');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { normalizeMobile } = require('../utils/mobile');
const { sendCustomUserSms } = require('../services/sms');
const { validateCustomUserSmsMessage } = require('../utils/smsLimits');
const { resolveSmsTarget } = require('../utils/smsTarget');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

const processingBatches = new Set();

async function resolveRecipients(ids) {
  const seenMobiles = new Set();
  const recipients = [];

  for (const id of ids) {
    const target = await resolveSmsTarget(id);
    if (!target) continue;

    const mobile = normalizeMobile(target.mobile);
    if (!mobile) {
      recipients.push({
        targetId: target.targetId,
        personId: target.personId,
        name: target.name,
        mobile: target.mobile || '',
        type: target.type || 'sathi',
        status: 'skipped',
        errorMessage: 'মোবাইল নম্বর নেই',
      });
      continue;
    }

    if (seenMobiles.has(mobile)) continue;
    seenMobiles.add(mobile);

    recipients.push({
      targetId: target.targetId,
      personId: target.personId,
      name: target.name,
      mobile,
      type: target.type || 'sathi',
      status: 'pending',
      errorMessage: '',
    });
  }

  return recipients;
}

function finalizeBatchStatus(batch) {
  const sent = batch.recipients.filter((r) => r.status === 'sent').length;
  const failed = batch.recipients.filter((r) => r.status === 'failed').length;
  const skipped = batch.recipients.filter((r) => r.status === 'skipped').length;

  batch.sentCount = sent;
  batch.failedCount = failed;
  batch.skippedCount = skipped;

  if (failed === 0 && skipped === 0 && sent === batch.totalRecipients) {
    batch.status = 'completed';
  } else if (sent === 0) {
    batch.status = 'failed';
  } else {
    batch.status = 'partial';
  }
}

async function processBatch(batchId, senderId, onlyFailed = false) {
  if (processingBatches.has(String(batchId))) return;
  processingBatches.add(String(batchId));

  try {
    const batch = await BatchSmsLog.findById(batchId);
    if (!batch) return;

    batch.status = 'processing';
    await batch.save();

    const validation = validateCustomUserSmsMessage(batch.message);
    if (!validation.ok) {
      batch.status = 'failed';
      await batch.save();
      return;
    }

    const { message, fullMessage, limits } = validation;

    for (let i = 0; i < batch.recipients.length; i++) {
      const recipient = batch.recipients[i];

      if (onlyFailed && recipient.status !== 'failed') continue;
      if (!onlyFailed && recipient.status !== 'pending') continue;

      if (recipient.status === 'skipped' || !recipient.mobile) {
        continue;
      }

      recipient.status = 'pending';
      recipient.errorMessage = '';
      let logStatus = 'sent';
      let errorMessage = '';

      try {
        await sendCustomUserSms(recipient.mobile, message);
      } catch (smsErr) {
        logStatus = 'failed';
        errorMessage = smsErr.message || 'এসএমএস পাঠাতে ব্যর্থ';
      }

      const log = await AdminSmsLog.create({
        targetId: recipient.targetId,
        person: recipient.personId,
        sender: senderId,
        recipientName: recipient.name,
        recipientMobile: recipient.mobile,
        message: fullMessage,
        encoding: limits.encoding,
        smsParts: limits.parts,
        charCount: fullMessage.length,
        status: logStatus,
        errorMessage,
        batch: batch._id,
      });

      batch.recipients[i].status = logStatus;
      batch.recipients[i].errorMessage = errorMessage;
      batch.recipients[i].adminSmsLogId = log._id;

      batch.sentCount = batch.recipients.filter((r) => r.status === 'sent').length;
      batch.failedCount = batch.recipients.filter((r) => r.status === 'failed').length;
      batch.skippedCount = batch.recipients.filter((r) => r.status === 'skipped').length;
      batch.markModified('recipients');
      await batch.save();
    }

    finalizeBatchStatus(batch);
    await batch.save();
  } finally {
    processingBatches.delete(String(batchId));
  }
}

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [batches, total] = await Promise.all([
      BatchSmsLog.find()
        .sort({ createdAt: -1 })
        .populate('sender', 'name')
        .skip(skip)
        .limit(limit),
      BatchSmsLog.countDocuments(),
    ]);

    res.json({
      success: true,
      data: batches,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const batch = await BatchSmsLog.findById(req.params.id).populate('sender', 'name');
    if (!batch) {
      throw new AppError('ব্যাচ পাওয়া যায়নি', 404);
    }
    res.json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.recipientIds) ? req.body.recipientIds : [];
    if (ids.length === 0) {
      throw new AppError('কমপক্ষে একজন গ্রহীতা নির্বাচন করুন', 400);
    }

    const validation = validateCustomUserSmsMessage(req.body?.message);
    if (!validation.ok) {
      throw new AppError(validation.error, 400);
    }

    const recipients = await resolveRecipients(ids);
    if (recipients.length === 0) {
      throw new AppError('কোনো বৈধ গ্রহীতা পাওয়া যায়নি', 400);
    }

    const { fullMessage, limits } = validation;

    const batch = await BatchSmsLog.create({
      sender: req.account._id,
      message: fullMessage,
      encoding: limits.encoding,
      smsParts: limits.parts,
      charCount: fullMessage.length,
      status: 'pending',
      totalRecipients: recipients.length,
      sentCount: 0,
      failedCount: 0,
      skippedCount: recipients.filter((r) => r.status === 'skipped').length,
      recipients,
    });

    await batch.populate('sender', 'name');

    res.status(201).json({ success: true, data: batch });

    setImmediate(() => {
      processBatch(batch._id, req.account._id, false).catch((err) => {
        console.error('[BatchSMS] প্রক্রিয়াকরণ ব্যর্থ:', err.message);
      });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/retry', async (req, res, next) => {
  try {
    const batch = await BatchSmsLog.findById(req.params.id);
    if (!batch) {
      throw new AppError('ব্যাচ পাওয়া যায়নি', 404);
    }

    const failedRecipients = batch.recipients.filter((r) => r.status === 'failed');
    if (failedRecipients.length === 0) {
      throw new AppError('পুনরায় পাঠানোর মতো ব্যর্থ গ্রহীতা নেই', 400);
    }

    batch.status = 'pending';
    batch.markModified('recipients');
    await batch.save();

    res.json({ success: true, data: batch });

    setImmediate(() => {
      processBatch(batch._id, req.account._id, true).catch((err) => {
        console.error('[BatchSMS] পুনরায় পাঠানো ব্যর্থ:', err.message);
      });
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
