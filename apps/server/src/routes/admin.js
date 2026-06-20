const express = require("express");
const bcrypt = require("bcryptjs");
const Account = require("../models/Account");
const Person = require("../models/Person");
const Masjid = require("../models/Masjid");
const School = require("../models/School");
const { AppError } = require("../utils/errors");
const {
  normalizeMobile,
  isValidBangladeshMobile,
  formatMobileForDisplay,
} = require("../utils/mobile");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");
const { getSuperAdminMobile, isSuperAdminMobile } = require("../constants/admin");
const { MASJID_UNKNOWN } = require("../constants");
const { ACTIVE, findLinkedPersonByMobile } = require("../utils/directory");
const { sendAdminGrantedSms } = require("../services/sms");

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/admins", async (req, res, next) => {
  try {
    const admins = await Account.find({ isAdmin: true })
      .sort({ name: 1 })
      .select("name mobile");

    res.json({
      success: true,
      data: admins.map((a) => ({
        id: a._id,
        name: a.name,
        mobile: a.mobile,
        displayMobile: formatMobileForDisplay(a.mobile),
        isSuperAdmin: isSuperAdminMobile(a.mobile),
      })),
      meta: {
        canRevokeAdmin: isSuperAdminMobile(req.account.mobile),
      },
    });
  } catch (err) {
    next(err);
  }
});

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function resolveGrantTarget({ mobile: rawMobile, personId }) {
  let person = null;
  let mobile = rawMobile ? normalizeMobile(rawMobile) : "";

  if (personId) {
    person = await Person.findOne({ _id: personId, isDeleted: ACTIVE });
    if (!person) {
      // Directory account entries use Account._id as _id; the client may send that as personId.
      const account = await Account.findOne({ _id: personId, isDeleted: ACTIVE });
      if (account) {
        mobile = normalizeMobile(account.mobile) || mobile;
        person = await findLinkedPersonByMobile(mobile, account._id);
      } else if (!mobile) {
        throw new AppError("ব্যক্তি পাওয়া যায়নি", 404);
      }
    } else if (person.mobile) {
      mobile = normalizeMobile(person.mobile);
    }
  }

  if (!mobile) {
    throw new AppError("মোবাইল নম্বর পাওয়া যায়নি");
  }

  if (!isValidBangladeshMobile(mobile)) {
    throw new AppError("সঠিক বাংলাদেশি মোবাইল নম্বর দিন");
  }

  if (!person) {
    person = await findLinkedPersonByMobile(mobile);
  }

  return { mobile, person };
}

async function ensureAccountForAdminGrant({ mobile, person }) {
  let account = await Account.findOne({ mobile });
  let pin = null;
  let created = false;

  if (!account) {
    const defaultMasjid =
      person?.masjid || (await Masjid.findOne().sort({ createdAt: 1 }))?.name;
    if (!defaultMasjid) {
      throw new AppError("কোনো মসজিদ পাওয়া যায়নি");
    }

    pin = generatePin();
    const pinHash = await bcrypt.hash(pin, 10);
    account = await Account.create({
      name: person?.name?.trim() || "ব্যবহারকারী",
      houseAddress: person?.houseLocation?.trim() || "",
      masjid: defaultMasjid,
      mobile,
      pinHash,
      pinPlain: pin,
      isAdmin: true,
    });
    created = true;

    const unclaimedPersons = await Person.find({
      mobile,
      isDeleted: ACTIVE,
      claimedBy: null,
    });
    for (const unclaimed of unclaimedPersons) {
      unclaimed.claimedBy = account._id;
      unclaimed.isLocked = true;
      await unclaimed.save();
    }

    return { account, pin, created };
  }

  if (account.isAdmin) {
    pin = account.pinPlain || generatePin();
    if (!account.pinPlain) {
      account.pinHash = await bcrypt.hash(pin, 10);
      account.pinPlain = pin;
      await account.save();
    }
    return { account, pin, created: false };
  }

  pin = account.pinPlain || generatePin();
  if (!account.pinPlain) {
    account.pinHash = await bcrypt.hash(pin, 10);
    account.pinPlain = pin;
  }

  account.isAdmin = true;
  await account.save();

  return { account, pin, created };
}

router.post("/admins", async (req, res, next) => {
  try {
    const { mobile: rawMobile, personId } = req.body || {};
    if (!rawMobile && !personId) {
      throw new AppError("মোবাইল নম্বর বা ব্যক্তি নির্বাচন করুন");
    }

    const { mobile, person } = await resolveGrantTarget({
      mobile: rawMobile,
      personId,
    });
    const { account, pin } = await ensureAccountForAdminGrant({ mobile, person });

    try {
      await sendAdminGrantedSms(mobile, pin);
    } catch (smsErr) {
      console.error("[এডমিন] SMS পাঠাতে ব্যর্থ:", smsErr.message);
    }

    res.json({
      success: true,
      message: "এডমিন অ্যাক্সেস দেওয়া হয়েছে এবং SMS পাঠানো হয়েছে",
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

router.delete("/admins/:mobile", async (req, res, next) => {
  try {
    if (!isSuperAdminMobile(req.account.mobile)) {
      throw new AppError("শুধু প্রধান এডমিন এডমিন অ্যাক্সেস বাতিল করতে পারবেন", 403);
    }

    const mobile = normalizeMobile(req.params.mobile || "");
    if (isSuperAdminMobile(mobile)) {
      throw new AppError("প্রধান এডমিনের অ্যাক্সেস বাতিল করা যাবে না");
    }

    const account = await Account.findOne({ mobile });
    if (!account || !account.isAdmin) {
      throw new AppError("এডমিন পাওয়া যায়নি", 404);
    }

    account.isAdmin = false;
    await account.save();

    res.json({ success: true, message: "এডমিন অ্যাক্সেস বাতিল করা হয়েছে" });
  } catch (err) {
    next(err);
  }
});

router.get("/masjids", async (req, res, next) => {
  try {
    const masjids = await Masjid.find().sort({ createdAt: 1 });
    res.json({
      success: true,
      data: masjids.map((m) => ({ id: m._id, name: m.name })),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/masjids", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (name.length < 2) {
      throw new AppError("মসজিদের নাম দিন");
    }
    if (name === MASJID_UNKNOWN) {
      throw new AppError("এই নামটি সংরক্ষিত, অন্য নাম ব্যবহার করুন");
    }

    const existing = await Masjid.findOne({ name });
    if (existing) {
      throw new AppError("এই মসজিদ ইতিমধ্যে আছে");
    }

    const masjid = await Masjid.create({ name });

    res.status(201).json({
      success: true,
      message: "মসজিদ যোগ করা হয়েছে",
      data: { id: masjid._id, name: masjid.name },
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError("এই মসজিদ ইতিমধ্যে আছে"));
    }
    next(err);
  }
});

router.patch("/masjids/:id", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (name.length < 2) {
      throw new AppError("মসজিদের নাম দিন");
    }
    if (name === MASJID_UNKNOWN) {
      throw new AppError("এই নামটি সংরক্ষিত, অন্য নাম ব্যবহার করুন");
    }

    const masjid = await Masjid.findById(req.params.id);
    if (!masjid) {
      throw new AppError("মসজিদ পাওয়া যায়নি", 404);
    }

    const oldName = masjid.name;
    if (oldName === name) {
      return res.json({
        success: true,
        message: "মসজিদের নাম আপডেট করা হয়েছে",
        data: { id: masjid._id, name: masjid.name },
      });
    }

    const existing = await Masjid.findOne({ name });
    if (existing) {
      throw new AppError("এই মসজিদ ইতিমধ্যে আছে");
    }

    masjid.name = name;
    await masjid.save();

    await Promise.all([
      Person.updateMany({ masjid: oldName }, { $set: { masjid: name } }),
      Account.updateMany({ masjid: oldName }, { $set: { masjid: name } }),
    ]);

    res.json({
      success: true,
      message: "মসজিদের নাম আপডেট করা হয়েছে",
      data: { id: masjid._id, name: masjid.name },
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError("এই মসজিদ ইতিমধ্যে আছে"));
    }
    next(err);
  }
});

router.delete("/masjids/:id", async (req, res, next) => {
  try {
    const masjid = await Masjid.findById(req.params.id);
    if (!masjid) {
      throw new AppError("মসজিদ পাওয়া যায়নি", 404);
    }

    const totalMasjids = await Masjid.countDocuments();
    if (totalMasjids <= 1) {
      throw new AppError("কমপক্ষে একটি মসজিদ থাকতে হবে");
    }

    await masjid.deleteOne();

    res.json({ success: true, message: "মসজিদ মুছে ফেলা হয়েছে" });
  } catch (err) {
    next(err);
  }
});

// ── Schools ──────────────────────────────────────────────
router.get("/schools", async (req, res, next) => {
  try {
    const schools = await School.find({ isDeleted: ACTIVE }).sort({ createdAt: 1 });
    res.json({
      success: true,
      data: schools.map((s) => ({ id: s._id, name: s.name })),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/schools", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (name.length < 2) {
      throw new AppError("স্কুলের নাম দিন");
    }

    const existing = await School.findOne({ name });
    if (existing) {
      if (existing.isDeleted) {
        existing.isDeleted = false;
        await existing.save();
        return res.status(201).json({
          success: true,
          message: "স্কুল যোগ করা হয়েছে",
          data: { id: existing._id, name: existing.name },
        });
      }
      throw new AppError("এই স্কুল ইতিমধ্যে আছে");
    }

    const school = await School.create({ name });

    res.status(201).json({
      success: true,
      message: "স্কুল যোগ করা হয়েছে",
      data: { id: school._id, name: school.name },
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError("এই স্কুল ইতিমধ্যে আছে"));
    }
    next(err);
  }
});

router.patch("/schools/:id", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (name.length < 2) {
      throw new AppError("স্কুলের নাম দিন");
    }

    const school = await School.findOne({ _id: req.params.id, isDeleted: ACTIVE });
    if (!school) {
      throw new AppError("স্কুল পাওয়া যায়নি", 404);
    }

    const oldName = school.name;
    if (oldName === name) {
      return res.json({
        success: true,
        message: "স্কুলের নাম আপডেট করা হয়েছে",
        data: { id: school._id, name: school.name },
      });
    }

    const existing = await School.findOne({ name, isDeleted: ACTIVE });
    if (existing) {
      throw new AppError("এই স্কুল ইতিমধ্যে আছে");
    }

    school.name = name;
    await school.save();

    await Person.updateMany({ schoolName: oldName }, { $set: { schoolName: name } });

    res.json({
      success: true,
      message: "স্কুলের নাম আপডেট করা হয়েছে",
      data: { id: school._id, name: school.name },
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError("এই স্কুল ইতিমধ্যে আছে"));
    }
    next(err);
  }
});

router.delete("/schools/:id", async (req, res, next) => {
  try {
    const school = await School.findOneAndUpdate(
      { _id: req.params.id, isDeleted: ACTIVE },
      { $set: { isDeleted: true } },
      { new: true },
    );
    if (!school) {
      throw new AppError("স্কুল পাওয়া যায়নি", 404);
    }

    res.json({ success: true, message: "স্কুল মুছে ফেলা হয়েছে" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
