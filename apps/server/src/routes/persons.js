const express = require('express');
const { z } = require('zod');
const Person = require('../models/Person');
const { AppError } = require('../utils/errors');
const { normalizeMobile } = require('../utils/mobile');
const authMiddleware = require('../middleware/auth');
const {
  TIME_GIVEN_OPTIONS,
  MASTURAT_DAYS_OPTIONS,
  STUDENT_CLASS_OPTIONS,
} = require('../constants');
const { isValidMasjid } = require('../utils/masjid');

const router = express.Router();

const timeGivenValues = TIME_GIVEN_OPTIONS.map((o) => o.value);
const masturatValues = MASTURAT_DAYS_OPTIONS.map((o) => o.value);
const classValues = STUDENT_CLASS_OPTIONS.map((o) => o.value);

const basePersonSchema = z.object({
  type: z.enum(['sathi', 'student']),
  name: z.string().min(2, 'নাম দিন'),
  masjid: z.string().min(1, 'মসজিদ নির্বাচন করুন'),
  houseLocation: z.string().optional(),
  mobile: z.string().optional(),
  timeGivenValue: z.number().nullable().optional(),
});

const sathiSchema = basePersonSchema.extend({
  type: z.literal('sathi'),
  masturatDaysValue: z.number().nullable().optional(),
  profession: z.string().optional(),
});

const studentSchema = basePersonSchema.extend({
  type: z.literal('student'),
  classValue: z.number().nullable().optional(),
  schoolName: z.string().optional(),
  fatherName: z.string().optional(),
  fatherMobile: z.string().optional(),
});

async function validatePersonData(data) {
  if (!(await isValidMasjid(data.masjid))) {
    throw new AppError('সঠিক মসজিদ নির্বাচন করুন');
  }

  if (data.timeGivenValue != null && !timeGivenValues.includes(data.timeGivenValue)) {
    throw new AppError('সময়ের মান সঠিক নয়');
  }

  if (data.type === 'sathi') {
    const parsed = sathiSchema.parse(data);
    if (parsed.masturatDaysValue != null && !masturatValues.includes(parsed.masturatDaysValue)) {
      throw new AppError('মাস্তুরাতের মান সঠিক নয়');
    }
    return parsed;
  }

  const parsed = studentSchema.parse(data);
  if (parsed.classValue != null && !classValues.includes(parsed.classValue)) {
    throw new AppError('ক্লাসের মান সঠিক নয়');
  }
  return parsed;
}

function formatPerson(person) {
  const obj = person.toObject();
  const claimedById = obj.claimedBy?._id ?? obj.claimedBy;
  obj.canEdit =
    !obj.isLocked ||
    (claimedById != null && String(claimedById) === String(person._viewerId));
  // Admins can delete anyone. Non-admins can only delete unclaimed records.
  obj.canDelete = person._isAdmin || !obj.isLocked;
  return obj;
}

function canEditPerson(person, accountId) {
  if (!person.isLocked) return true;
  return person.claimedBy && String(person.claimedBy) === String(accountId);
}

router.use(authMiddleware);

router.post('/', async (req, res, next) => {
  try {
    const data = await validatePersonData(req.body);
    const mobile = data.mobile ? normalizeMobile(data.mobile) : '';

    const person = await Person.create({
      ...data,
      name: data.name.trim(),
      houseLocation: data.houseLocation?.trim() || '',
      mobile,
      profession: data.profession?.trim() || '',
      schoolName: data.schoolName?.trim() || '',
      fatherName: data.fatherName?.trim() || '',
      fatherMobile: data.fatherMobile ? normalizeMobile(data.fatherMobile) : '',
      createdBy: req.account._id,
    });

    res.status(201).json({ success: true, data: person });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message));
    }
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const {
      q,
      type,
      classValue,
      schoolName,
      mobile,
      masjid,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (type && ['sathi', 'student'].includes(type)) {
      filter.type = type;
    }

    if (masjid) {
      filter.masjid = masjid;
    }

    if (classValue) {
      filter.classValue = Number(classValue);
    }

    if (schoolName) {
      filter.schoolName = { $regex: schoolName, $options: 'i' };
    }

    if (mobile) {
      filter.mobile = normalizeMobile(mobile);
    }

    if (q) {
      filter.name = { $regex: q, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Person.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('createdBy', 'name')
        .populate('claimedBy', 'name lastLoginAt'),
      Person.countDocuments(filter),
    ]);

    const data = items.map((p) => {
      p._viewerId = req.account._id;
      p._isAdmin = req.account.isAdmin;
      return formatPerson(p);
    });

    res.json({
      success: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const person = await Person.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('claimedBy', 'name lastLoginAt');

    if (!person) {
      throw new AppError('তথ্য পাওয়া যায়নি', 404);
    }

    person._viewerId = req.account._id;
    person._isAdmin = req.account.isAdmin;
    res.json({ success: true, data: formatPerson(person) });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const person = await Person.findById(req.params.id);
    if (!person) {
      throw new AppError('তথ্য পাওয়া যায়নি', 404);
    }

    if (!canEditPerson(person, req.account._id)) {
      throw new AppError('এই তথ্য এখন শুধু মালিকই সম্পাদনা করতে পারবেন', 403);
    }

    const data = await validatePersonData({ ...person.toObject(), ...req.body, type: person.type });

    person.name = data.name.trim();
    person.masjid = data.masjid;
    person.houseLocation = data.houseLocation?.trim() || '';
    person.mobile = data.mobile ? normalizeMobile(data.mobile) : '';
    person.timeGivenValue = data.timeGivenValue ?? null;

    if (person.type === 'sathi') {
      person.masturatDaysValue = data.masturatDaysValue ?? null;
      person.profession = data.profession?.trim() || '';
    } else {
      person.classValue = data.classValue ?? null;
      person.schoolName = data.schoolName?.trim() || '';
      person.fatherName = data.fatherName?.trim() || '';
      person.fatherMobile = data.fatherMobile ? normalizeMobile(data.fatherMobile) : '';
    }

    await person.save();
    person._viewerId = req.account._id;
    person._isAdmin = req.account.isAdmin;

    res.json({ success: true, data: formatPerson(person) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message));
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const person = await Person.findById(req.params.id);
    if (!person) {
      throw new AppError('তথ্য পাওয়া যায়নি', 404);
    }
    if (person.isLocked && !req.account.isAdmin) {
      throw new AppError('দাবিকৃত রেকর্ড মুছে ফেলা যাবে না', 403);
    }
    await person.deleteOne();
    res.json({ success: true, message: 'রেকর্ড মুছে ফেলা হয়েছে' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
