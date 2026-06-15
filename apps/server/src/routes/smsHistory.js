const express = require('express');
const AdminSmsLog = require('../models/AdminSmsLog');
const BatchSmsLog = require('../models/BatchSmsLog');
const { AppError } = require('../utils/errors');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { sendCustomUserSms } = require('../services/sms');
const { validateCustomUserSmsMessage } = require('../utils/smsLimits');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

function mapSingleLog(log) {
  return {
    kind: 'single',
    _id: log._id,
    targetId: log.targetId,
    recipientName: log.recipientName,
    recipientMobile: log.recipientMobile,
    message: log.message,
    status: log.status,
    errorMessage: log.errorMessage || '',
    sender: log.sender,
    createdAt: log.createdAt,
    encoding: log.encoding,
    charCount: log.charCount,
  };
}

function mapBatchLog(batch) {
  return {
    kind: 'batch',
    _id: batch._id,
    message: batch.message,
    status: batch.status,
    totalRecipients: batch.totalRecipients,
    sentCount: batch.sentCount,
    failedCount: batch.failedCount,
    skippedCount: batch.skippedCount,
    sender: batch.sender,
    createdAt: batch.createdAt,
    encoding: batch.encoding,
    charCount: batch.charCount,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const fetchCount = page * limit;

    const [singles, batches, singleTotal, batchTotal] = await Promise.all([
      AdminSmsLog.find({ batch: null })
        .sort({ createdAt: -1 })
        .populate('sender', 'name')
        .limit(fetchCount),
      BatchSmsLog.find()
        .sort({ createdAt: -1 })
        .populate('sender', 'name')
        .limit(fetchCount),
      AdminSmsLog.countDocuments({ batch: null }),
      BatchSmsLog.countDocuments(),
    ]);

    const merged = [
      ...singles.map(mapSingleLog),
      ...batches.map(mapBatchLog),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice((page - 1) * limit, page * limit);

    const total = singleTotal + batchTotal;

    res.json({
      success: true,
      data: merged,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logs/:id/resend', async (req, res, next) => {
  try {
    const log = await AdminSmsLog.findById(req.params.id);
    if (!log) {
      throw new AppError('এসএমএস রেকর্ড পাওয়া যায়নি', 404);
    }
    if (log.batch) {
      throw new AppError('ব্যাচ এসএমএসের জন্য ব্যাচ ইতিহাস থেকে পুনরায় পাঠান', 400);
    }

    const validation = validateCustomUserSmsMessage(log.message);
    if (!validation.ok) {
      throw new AppError(validation.error, 400);
    }

    const { message, fullMessage, limits } = validation;
    let status = 'sent';
    let errorMessage = '';

    try {
      await sendCustomUserSms(log.recipientMobile, message);
    } catch (smsErr) {
      status = 'failed';
      errorMessage = smsErr.message || 'এসএমএস পাঠাতে ব্যর্থ';
    }

    const newLog = await AdminSmsLog.create({
      targetId: log.targetId,
      person: log.person,
      sender: req.account._id,
      recipientName: log.recipientName,
      recipientMobile: log.recipientMobile,
      message: fullMessage,
      encoding: limits.encoding,
      smsParts: limits.parts,
      charCount: fullMessage.length,
      status,
      errorMessage,
    });

    await newLog.populate('sender', 'name');

    res.status(201).json({ success: true, data: mapSingleLog(newLog) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
