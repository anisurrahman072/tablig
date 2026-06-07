const express = require('express');
const { z } = require('zod');
const Karguzari = require('../models/Karguzari');
const Person = require('../models/Person');
const { AppError } = require('../utils/errors');
const authMiddleware = require('../middleware/auth');
const { KARGUZARI_TIME_SLOTS } = require('../constants');

const router = express.Router({ mergeParams: true });

const karguzariSchema = z.object({
  meetingDate: z.string().min(1, 'তারিখ দিন'),
  timeSlot: z.enum(KARGUZARI_TIME_SLOTS),
  text: z.string().min(2, 'কারগুজারি লিখুন'),
});

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const person = await Person.findById(req.params.id);
    if (!person) {
      throw new AppError('তথ্য পাওয়া যায়নি', 404);
    }

    const items = await Karguzari.find({ person: person._id })
      .sort({ meetingDate: -1, createdAt: -1 })
      .populate('author', 'name');

    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const person = await Person.findById(req.params.id);
    if (!person) {
      throw new AppError('তথ্য পাওয়া যায়নি', 404);
    }

    const data = karguzariSchema.parse(req.body);

    const karguzari = await Karguzari.create({
      person: person._id,
      author: req.account._id,
      meetingDate: new Date(data.meetingDate),
      timeSlot: data.timeSlot,
      text: data.text.trim(),
    });

    await karguzari.populate('author', 'name');

    res.status(201).json({ success: true, data: karguzari });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message));
    }
    next(err);
  }
});

module.exports = router;
