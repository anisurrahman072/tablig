const express = require('express');
const AdminSmsLog = require('../models/AdminSmsLog');
const { AppError } = require('../utils/errors');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { normalizeMobile } = require('../utils/mobile');
const { sendCustomUserSms } = require('../services/sms');
const { validateCustomUserSmsMessage } = require('../utils/smsLimits');
const { resolveSmsTarget } = require('../utils/smsTarget');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const target = await resolveSmsTarget(req.params.id);
    if (!target) {
      throw new AppError('তথ্য পাওয়া যায়নি', 404);
    }

    const orFilters = [{ targetId: target.targetId }];
    if (target.personId) {
      orFilters.push({ person: target.personId });
    }

    const logs = await AdminSmsLog.find({ $or: orFilters })
      .sort({ createdAt: -1 })
      .populate('sender', 'name')
      .limit(100);

    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

// How long to wait for BulkSMSBD before responding optimistically.
// If the SMS provider takes longer than this, we respond with success immediately
// and update the log in the background when it finishes. This prevents mobile
// network drops (4G handoffs, weak signal) from producing false "connection error"
// alerts even when the SMS was actually delivered.
const SMS_RESPONSE_DEADLINE_MS = 10000;

router.post('/', async (req, res, next) => {
  try {
    const target = await resolveSmsTarget(req.params.id);
    if (!target) {
      throw new AppError('তথ্য পাওয়া যায়নি', 404);
    }

    const mobile = normalizeMobile(target.mobile);
    if (!mobile) {
      throw new AppError('মোবাইল নম্বর পাওয়া যায়নি', 400);
    }

    const validation = validateCustomUserSmsMessage(req.body?.message);
    if (!validation.ok) {
      throw new AppError(validation.error, 400);
    }

    const { message, fullMessage, limits } = validation;

    // Race SMS against a deadline so we always respond before the network drops
    const smsPromise = sendCustomUserSms(mobile, message)
      .then(() => ({ ok: true }))
      .catch((err) => ({ ok: false, error: err.message || 'এসএমএস পাঠাতে ব্যর্থ' }));

    const raceResult = await Promise.race([
      smsPromise,
      new Promise((resolve) =>
        setTimeout(() => resolve({ timedOut: true }), SMS_RESPONSE_DEADLINE_MS)
      ),
    ]);

    // If SMS finished quickly and failed, log it and report the error to the client
    if (!raceResult.timedOut && !raceResult.ok) {
      await AdminSmsLog.create({
        targetId: target.targetId,
        person: target.personId,
        sender: req.account._id,
        recipientName: target.name,
        recipientMobile: mobile,
        message: fullMessage,
        encoding: limits.encoding,
        smsParts: limits.parts,
        charCount: fullMessage.length,
        status: 'failed',
        errorMessage: raceResult.error,
      });
      throw new AppError(raceResult.error, 502);
    }

    // SMS succeeded or is still in flight — respond immediately with optimistic "sent"
    const log = await AdminSmsLog.create({
      targetId: target.targetId,
      person: target.personId,
      sender: req.account._id,
      recipientName: target.name,
      recipientMobile: mobile,
      message: fullMessage,
      encoding: limits.encoding,
      smsParts: limits.parts,
      charCount: fullMessage.length,
      status: 'sent',
      errorMessage: '',
    });

    res.status(201).json({ success: true, data: log });

    // If the SMS is still running (deadline was hit), update the log when it finishes
    if (raceResult.timedOut) {
      smsPromise.then(async (result) => {
        if (!result.ok) {
          try {
            await AdminSmsLog.findByIdAndUpdate(log._id, {
              status: 'failed',
              errorMessage: result.error,
            });
          } catch {
            // best-effort background update, not critical
          }
        }
      });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
