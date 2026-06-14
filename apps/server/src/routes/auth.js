const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const Account = require('../models/Account');
const Person = require('../models/Person');
const Otp = require('../models/Otp');
const {
  ACTIVE,
  syncAccountToClaimedPerson,
  findLinkedPersonByMobile,
} = require('../utils/directory');
const { AppError } = require('../utils/errors');
const { normalizeMobile, isValidBangladeshMobile } = require('../utils/mobile');
const { sendSMS } = require('../services/sms');
const { isValidMasjid } = require('../utils/masjid');
const { isSuperAdminMobile } = require('../constants/admin');
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
      pin: account.pinPlain || '',
      isAdmin: !!account.isAdmin,
      isSuperAdmin: isSuperAdminMobile(account.mobile),
    },
  };
}

const UNCLAIMED_LOGIN_MESSAGE = 'Apnar account toiri korun';

async function ensureAccountHouseAddress(account) {
  if (account.houseAddress?.trim()) return account;

  const linkedPerson = await findLinkedPersonByMobile(account.mobile, account._id);
  const personHouse = linkedPerson?.houseLocation?.trim();
  if (personHouse) {
    account.houseAddress = personHouse;
    await account.save();
  }
  return account;
}

async function findUnclaimedPersonByMobile(mobile) {
  return Person.findOne({
    mobile,
    isDeleted: ACTIVE,
    claimedBy: null,
  });
}

function pickPrimaryUnclaimedPerson(persons) {
  if (!persons.length) return null;
  return persons.find((p) => p.type === 'sathi') || persons[0];
}

function applySignupMasterInfoToPerson(person, signupData) {
  person.name = signupData.name.trim();
  person.masjid = signupData.masjid;

  const houseAddress = signupData.houseAddress?.trim();
  if (houseAddress) {
    person.houseLocation = houseAddress;
  }

  person.claimedBy = signupData.accountId;
  person.isLocked = true;
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

    const unclaimedPersons = await Person.find({
      mobile,
      isDeleted: ACTIVE,
      claimedBy: null,
    });

    const primaryPerson = pickPrimaryUnclaimedPerson(unclaimedPersons);
    const signupHouse = data.houseAddress?.trim();
    const mergedHouseAddress =
      signupHouse || primaryPerson?.houseLocation?.trim() || '';

    const pinHash = await bcrypt.hash(data.pin, 10);
    const account = await Account.create({
      name: data.name.trim(),
      houseAddress: mergedHouseAddress,
      masjid: data.masjid,
      mobile,
      pinHash,
      pinPlain: data.pin,
      isAdmin: isSuperAdminMobile(mobile),
    });

    for (const person of unclaimedPersons) {
      applySignupMasterInfoToPerson(person, { ...data, accountId: account._id });
      await person.save();
    }

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
    const account = await ensureAccountHouseAddress(req.account);
    res.json({
      success: true,
      data: {
        id: account._id,
        name: account.name,
        houseAddress: account.houseAddress,
        masjid: account.masjid,
        mobile: account.mobile,
        pin: account.pinPlain || '',
        isAdmin: !!account.isAdmin,
        isSuperAdmin: isSuperAdminMobile(account.mobile),
      },
    });
  } catch (err) {
    next(err);
  }
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'নাম দিন').optional(),
  houseAddress: z.string().optional(),
  masjid: z.string().min(1, 'মসজিদ নির্বাচন করুন').optional(),
  mobile: z.string().min(11, 'মোবাইল নম্বর দিন').optional(),
  pin: z.string().min(4, 'পিন কমপক্ষে ৪ অঙ্কের হতে হবে').optional().or(z.literal('')),
});

router.put('/profile', authMiddleware, async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const account = await Account.findById(req.account._id);

    if (!account) {
      throw new AppError('অ্যাকাউন্ট পাওয়া যায়নি', 404);
    }

    if (data.name) account.name = data.name.trim();
    if (data.houseAddress !== undefined) account.houseAddress = data.houseAddress.trim();
    if (data.masjid) {
      if (!(await isValidMasjid(data.masjid))) {
        throw new AppError('সঠিক মসজিদ নির্বাচন করুন');
      }
      account.masjid = data.masjid;
    }

    if (data.mobile) {
      const mobile = normalizeMobile(data.mobile);
      if (!isValidBangladeshMobile(mobile)) {
        throw new AppError('সঠিক বাংলাদেশি মোবাইল নম্বর দিন');
      }
      if (mobile !== account.mobile) {
        const existing = await Account.findOne({ mobile });
        if (existing) {
          throw new AppError('মোবাইল নম্বরটি ইতিমধ্যে ব্যাবহৃত হচ্ছে!');
        }
        account.mobile = mobile;
      }
    }

    if (data.pin && data.pin.length >= 4) {
      account.pinHash = await bcrypt.hash(data.pin, 10);
      account.pinPlain = data.pin;
    }

    await account.save();
    await syncAccountToClaimedPerson(account);

    res.json({
      success: true,
      message: 'প্রোফাইল আপডেট হয়েছে',
      data: {
        id: account._id,
        name: account.name,
        houseAddress: account.houseAddress,
        masjid: account.masjid,
        mobile: account.mobile,
        pin: account.pinPlain || '',
        isAdmin: !!account.isAdmin,
        isSuperAdmin: isSuperAdminMobile(account.mobile),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message));
    }
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const mobile = normalizeMobile(data.mobile);

    const account = await Account.findOne({ mobile });
    if (!account) {
      const unclaimedPerson = await findUnclaimedPersonByMobile(mobile);
      if (unclaimedPerson) {
        throw new AppError(UNCLAIMED_LOGIN_MESSAGE);
      }
      throw new AppError('মোবাইল বা পিন ভুল');
    }

    const valid = await bcrypt.compare(data.pin, account.pinHash);
    if (!valid) {
      throw new AppError('মোবাইল বা পিন ভুল');
    }

    account.lastLoginAt = new Date();
    await account.save();
    await ensureAccountHouseAddress(account);

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
    account.pinPlain = newPin;
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
    account.pinPlain = String(newPin);
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
