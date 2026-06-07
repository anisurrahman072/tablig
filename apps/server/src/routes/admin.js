const express = require('express');
const Account = require('../models/Account');
const Masjid = require('../models/Masjid');
const School = require('../models/School');
const { AppError } = require('../utils/errors');
const { normalizeMobile, isValidBangladeshMobile, formatMobileForDisplay } = require('../utils/mobile');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { SUPER_ADMIN_MOBILE } = require('../constants/admin');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/admins', async (req, res, next) => {
  try {
    const admins = await Account.find({ isAdmin: true })
      .sort({ name: 1 })
      .select('name mobile');

    res.json({
      success: true,
      data: admins.map((a) => ({
        id: a._id,
        name: a.name,
        mobile: a.mobile,
        displayMobile: formatMobileForDisplay(a.mobile),
        isSuperAdmin: a.mobile === SUPER_ADMIN_MOBILE,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/admins', async (req, res, next) => {
  try {
    const mobile = normalizeMobile(req.body.mobile || '');
    if (!isValidBangladeshMobile(mobile)) {
      throw new AppError('সঠিক বাংলাদেশি মোবাইল নম্বর দিন');
    }

    const account = await Account.findOne({ mobile });
    if (!account) {
      throw new AppError('এই মোবাইলে কোনো অ্যাকাউন্ট নেই। প্রথমে অ্যাকাউন্ট তৈরি করতে হবে');
    }

    if (account.isAdmin) {
      throw new AppError('এই মোবাইল ইতিমধ্যে এডমিন');
    }

    account.isAdmin = true;
    await account.save();

    res.json({
      success: true,
      message: 'এডমিন অ্যাক্সেস দেওয়া হয়েছে',
      data: {
        id: account._id,
        name: account.name,
        mobile: account.mobile,
        displayMobile: formatMobileForDisplay(account.mobile),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/admins/:mobile', async (req, res, next) => {
  try {
    const mobile = normalizeMobile(req.params.mobile || '');
    if (mobile === SUPER_ADMIN_MOBILE) {
      throw new AppError('প্রধান এডমিনের অ্যাক্সেস বাতিল করা যাবে না');
    }

    const account = await Account.findOne({ mobile });
    if (!account || !account.isAdmin) {
      throw new AppError('এডমিন পাওয়া যায়নি', 404);
    }

    account.isAdmin = false;
    await account.save();

    res.json({ success: true, message: 'এডমিন অ্যাক্সেস বাতিল করা হয়েছে' });
  } catch (err) {
    next(err);
  }
});

router.get('/masjids', async (req, res, next) => {
  try {
    const masjids = await Masjid.find().sort({ name: 1 });
    res.json({
      success: true,
      data: masjids.map((m) => ({ id: m._id, name: m.name })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/masjids', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (name.length < 2) {
      throw new AppError('মসজিদের নাম দিন');
    }

    const existing = await Masjid.findOne({ name });
    if (existing) {
      throw new AppError('এই মসজিদ ইতিমধ্যে আছে');
    }

    const masjid = await Masjid.create({ name });

    res.status(201).json({
      success: true,
      message: 'মসজিদ যোগ করা হয়েছে',
      data: { id: masjid._id, name: masjid.name },
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError('এই মসজিদ ইতিমধ্যে আছে'));
    }
    next(err);
  }
});

router.delete('/masjids/:id', async (req, res, next) => {
  try {
    const masjid = await Masjid.findById(req.params.id);
    if (!masjid) {
      throw new AppError('মসজিদ পাওয়া যায়নি', 404);
    }

    const totalMasjids = await Masjid.countDocuments();
    if (totalMasjids <= 1) {
      throw new AppError('কমপক্ষে একটি মসজিদ থাকতে হবে');
    }

    await masjid.deleteOne();

    res.json({ success: true, message: 'মসজিদ মুছে ফেলা হয়েছে' });
  } catch (err) {
    next(err);
  }
});

// ── Schools ──────────────────────────────────────────────
router.get('/schools', async (req, res, next) => {
  try {
    const schools = await School.find().sort({ name: 1 });
    res.json({
      success: true,
      data: schools.map((s) => ({ id: s._id, name: s.name })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/schools', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (name.length < 2) {
      throw new AppError('স্কুলের নাম দিন');
    }

    const existing = await School.findOne({ name });
    if (existing) {
      throw new AppError('এই স্কুল ইতিমধ্যে আছে');
    }

    const school = await School.create({ name });

    res.status(201).json({
      success: true,
      message: 'স্কুল যোগ করা হয়েছে',
      data: { id: school._id, name: school.name },
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError('এই স্কুল ইতিমধ্যে আছে'));
    }
    next(err);
  }
});

router.delete('/schools/:id', async (req, res, next) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) {
      throw new AppError('স্কুল পাওয়া যায়নি', 404);
    }

    await school.deleteOne();

    res.json({ success: true, message: 'স্কুল মুছে ফেলা হয়েছে' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
