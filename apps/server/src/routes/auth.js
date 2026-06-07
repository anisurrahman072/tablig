const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const Account = require('../models/Account');
const Person = require('../models/Person');
const Otp = require('../models/Otp');
const { AppError } = require('../utils/errors');
const { normalizeMobile, isValidBangladeshMobile } = require('../utils/mobile');
const { sendSMS } = require('../services/sms');
const { isValidMasjid } = require('../utils/masjid');
const { SUPER_ADMIN_MOBILE } = require('../constants/admin');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const signupSchema = z.object({
  name: z.string().min(2, 'নাম দিন'),
  houseAddress: z.string().optional(),
  masjid: z.string().min(1, 'মসজিদ নির্বাচন করুন'),
  mobile: z.string().min(11, 'মোবাইল নম্বর দিন'),
  pin: z.string().min(4, 'পিন কমপক্ষে ৪ অঙ্কের হতে হবে'),
});

const loginSchema = z.object({
  mobile: z.string().min(11, 'মোবাইল নম্বর দিন'),
  pin: z.string().min(4, 'পিন দিন'),
});

function createToken(account) {
  return jwt.sign({ id: account._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function accountResponse(account, token) {
  return {
    token,
    account: {
      id: account._id,
      name: account.name,
      houseAddress: account.houseAddress,
      masjid: account.masjid,
      mobile: account.mobile,
      isAdmin: !!account.isAdmin,
    },
  };
}

async function claimPersonsByMobile(account) {
  await Person.updateMany(
    { mobile: account.mobile, isLocked: false },
    { claimedBy: account._id, isLocked: true }
  );
}

router.post('/signup', async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const mobile = normalizeMobile(data.mobile);

    if (!isValidBangladeshMobile(mobile)) {
      throw new AppError('সঠিক বাংলাদেশি মোবাইল নম্বর দিন');
    }

    if (!(await isValidMasjid(data.masjid))) {
      throw new AppError('সঠিক মসজিদ নির্বাচন করুন');
    }

    const existing = await Account.findOne({ mobile });
    if (existing) {
      throw new AppError('এই মোবাইল নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে');
    }

    const pinHash = await bcrypt.hash(data.pin, 10);
    const account = await Account.create({
      name: data.name.trim(),
      houseAddress: data.houseAddress?.trim() || '',
      masjid: data.masjid,
      mobile,
      pinHash,
      isAdmin: mobile === SUPER_ADMIN_MOBILE,
    });

    await claimPersonsByMobile(account);

    const token = createToken(account);
    res.status(201).json({ success: true, data: accountResponse(account, token) });
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError('এই মোবাইল নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে'));
    }
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message));
    }
    next(err);
  }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        id: req.account._id,
        name: req.account.name,
        houseAddress: req.account.houseAddress,
        masjid: req.account.masjid,
        mobile: req.account.mobile,
        isAdmin: !!req.account.isAdmin,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const mobile = normalizeMobile(data.mobile);

    const account = await Account.findOne({ mobile });
    if (!account) {
      throw new AppError('মোবাইল বা পিন ভুল');
    }

    const valid = await bcrypt.compare(data.pin, account.pinHash);
    if (!valid) {
      throw new AppError('মোবাইল বা পিন ভুল');
    }

    account.lastLoginAt = new Date();
    await account.save();

    const token = createToken(account);
    res.json({ success: true, data: accountResponse(account, token) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message));
    }
    next(err);
  }
});

router.post('/forgot-pin', async (req, res, next) => {
  try {
    const mobile = normalizeMobile(req.body.mobile || '');
    if (!isValidBangladeshMobile(mobile)) {
      throw new AppError('সঠিক বাংলাদেশি মোবাইল নম্বর দিন');
    }

    const account = await Account.findOne({ mobile });
    if (!account) {
      throw new AppError('এই মোবাইলে কোনো অ্যাকাউন্ট নেই');
    }

    // Generate a new random 4-digit PIN, save it, and send it via SMS
    const newPin = String(Math.floor(1000 + Math.random() * 9000));
    account.pinHash = await bcrypt.hash(newPin, 10);
    await account.save();

    const message = `তাবলিগ অ্যাপ: আপনার নতুন পিন হলো ${newPin}। লগইন করুন।`;

    console.log(`[পিন রিকভারি] ${mobile} — নতুন পিন: ${newPin}`);

    if (process.env.SMS_API_KEY) {
      try {
        await sendSMS(mobile, message);
        console.log(`[পিন রিকভারি] SMS সফলভাবে পাঠানো হয়েছে → ${mobile}`);
      } catch (smsErr) {
        console.error(`[পিন রিকভারি] SMS পাঠাতে ব্যর্থ:`, smsErr.message);
        // PIN is already saved — don't block the response, just warn
      }
    }

    res.json({
      success: true,
      message: 'আপনার নতুন পিন মোবাইলে পাঠানো হয়েছে',
      devPin: process.env.NODE_ENV !== 'production' ? newPin : undefined,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-otp', async (req, res, next) => {
  try {
    const mobile = normalizeMobile(req.body.mobile || '');
    const code = String(req.body.code || '');

    const otp = await Otp.findOne({
      mobile,
      code,
      consumed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      throw new AppError('ওটিপি সঠিক নয় বা মেয়াদ শেষ');
    }

    otp.consumed = true;
    await otp.save();

    const resetToken = jwt.sign({ mobile, purpose: 'reset-pin' }, process.env.JWT_RESET_SECRET, {
      expiresIn: '15m',
    });

    res.json({ success: true, data: { resetToken } });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-pin', async (req, res, next) => {
  try {
    const { resetToken, newPin } = req.body;

    if (!resetToken || !newPin || String(newPin).length < 4) {
      throw new AppError('নতুন পিন কমপক্ষে ৪ অঙ্কের হতে হবে');
    }

    const decoded = jwt.verify(resetToken, process.env.JWT_RESET_SECRET);
    if (decoded.purpose !== 'reset-pin') {
      throw new AppError('অবৈধ অনুরোধ');
    }

    const account = await Account.findOne({ mobile: decoded.mobile });
    if (!account) {
      throw new AppError('অ্যাকাউন্ট পাওয়া যায়নি');
    }

    account.pinHash = await bcrypt.hash(String(newPin), 10);
    await account.save();

    res.json({ success: true, message: 'পিন সফলভাবে পরিবর্তন হয়েছে' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('রিসেট লিংকের মেয়াদ শেষ'));
    }
    next(err);
  }
});

module.exports = router;
