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
    let status = 'sent';
    let errorMessage = '';

    try {
      await sendCustomUserSms(mobile, message);
    } catch (smsErr) {
      status = 'failed';
      errorMessage = smsErr.message || 'এসএমএস পাঠাতে ব্যর্থ';
    }

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
      status,
      errorMessage,
    });

    await log.populate('sender', 'name');

    if (status === 'failed') {
      throw new AppError(errorMessage || 'এসএমএস পাঠাতে ব্যর্থ', 502);
    }

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
