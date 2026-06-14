const express = require('express');
const { z } = require('zod');
const Karguzari = require('../models/Karguzari');
const Account = require('../models/Account');
const Person = require('../models/Person');
const { AppError } = require('../utils/errors');
const authMiddleware = require('../middleware/auth');
const { resolvePersonForKarguzari, ACTIVE } = require('../utils/directory');
const { KARGUZARI_TIME_SLOTS } = require('../constants');

const router = express.Router({ mergeParams: true });

const karguzariSchema = z.object({
  meetingDate: z.string().min(1, 'তারিখ দিন'),
  timeSlot: z.enum(KARGUZARI_TIME_SLOTS),
  text: z.string().min(2, 'কারগুজারি লিখুন'),
  attendeeIds: z.array(z.string()).optional().default([]),
  attendeeNames: z.array(z.string().trim().min(1)).optional().default([]),
});

const populateFields = [
  { path: 'author', select: 'name' },
  { path: 'person', select: 'name type' },
  { path: 'attendees', select: 'name type' },
];

const DEFAULT_PAGE_LIMIT = 5;
const MAX_PAGE_LIMIT = 20;

function parsePagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_PAGE_LIMIT));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildPaginationMeta(page, limit, total) {
  const pages = Math.ceil(total / limit) || 1;
  return { page, limit, total, pages, hasMore: page < pages };
}

async function resolveProfileContext(id) {
  const person = await resolvePersonForKarguzari(id);
  if (!person) {
    return { person: null, authorAccountId: null };
  }
  const authorAccountId = await resolveAuthorAccountId(id);
  return { person, authorAccountId };
}

router.use(authMiddleware);

async function resolveAuthorAccountId(id) {
  const account = await Account.findOne({ _id: id, isDeleted: ACTIVE });
  if (account) return account._id;

  const person = await Person.findOne({ _id: id, isDeleted: ACTIVE }).select('claimedBy');
  if (person?.claimedBy) return person.claimedBy;

  return null;
}

async function resolveAttendeePersonIds(ids, visitedPersonId) {
  const resolved = [];
  const seen = new Set();

  for (const rawId of ids) {
    const person = await resolvePersonForKarguzari(rawId);
    if (!person) continue;

    const key = String(person._id);
    if (key === String(visitedPersonId) || seen.has(key)) continue;

    seen.add(key);
    resolved.push(person._id);
  }

  return resolved;
}

router.get('/received', async (req, res, next) => {
  try {
    const { person } = await resolveProfileContext(req.params.id);
    if (!person) {
      return res.json({ success: true, data: [], pagination: buildPaginationMeta(1, DEFAULT_PAGE_LIMIT, 0) });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const filter = { person: person._id };
    const sort = { meetingDate: -1, createdAt: -1 };

    const [total, data] = await Promise.all([
      Karguzari.countDocuments(filter),
      Karguzari.find(filter).sort(sort).skip(skip).limit(limit).populate(populateFields),
    ]);

    res.json({ success: true, data, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.get('/authored', async (req, res, next) => {
  try {
    // Only the author's Account ID is needed for this query — no Person document required.
    // resolveProfileContext would short-circuit to null when an Account has no linked Person,
    // which incorrectly hides all karguzaris written by that account user.
    const authorAccountId = await resolveAuthorAccountId(req.params.id);
    if (!authorAccountId) {
      return res.json({ success: true, data: [], pagination: buildPaginationMeta(1, DEFAULT_PAGE_LIMIT, 0) });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const filter = { author: authorAccountId };
    const sort = { meetingDate: -1, createdAt: -1 };

    const [total, data] = await Promise.all([
      Karguzari.countDocuments(filter),
      Karguzari.find(filter).sort(sort).skip(skip).limit(limit).populate(populateFields),
    ]);

    res.json({ success: true, data, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.get('/attended', async (req, res, next) => {
  try {
    const { person, authorAccountId } = await resolveProfileContext(req.params.id);
    if (!person) {
      return res.json({ success: true, data: [], pagination: buildPaginationMeta(1, DEFAULT_PAGE_LIMIT, 0) });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const filter = {
      attendees: person._id,
      person: { $ne: person._id },
    };
    if (authorAccountId) {
      filter.author = { $ne: authorAccountId };
    }

    const sort = { meetingDate: -1, createdAt: -1 };

    const [total, data] = await Promise.all([
      Karguzari.countDocuments(filter),
      Karguzari.find(filter).sort(sort).skip(skip).limit(limit).populate(populateFields),
    ]);

    res.json({ success: true, data, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const person = await resolvePersonForKarguzari(req.params.id);
    if (!person) {
      return res.json({
        success: true,
        data: { received: [], authored: [], attended: [] },
      });
    }

    const authorAccountId = await resolveAuthorAccountId(req.params.id);

    const [received, authored, attendedRaw] = await Promise.all([
      Karguzari.find({ person: person._id })
        .sort({ meetingDate: -1, createdAt: -1 })
        .populate(populateFields),
      authorAccountId
        ? Karguzari.find({ author: authorAccountId })
            .sort({ meetingDate: -1, createdAt: -1 })
            .populate(populateFields)
        : [],
      Karguzari.find({ attendees: person._id })
        .sort({ meetingDate: -1, createdAt: -1 })
        .populate(populateFields),
    ]);

    const authoredIds = new Set(authored.map((k) => String(k._id)));
    const receivedIds = new Set(received.map((k) => String(k._id)));
    const attended = attendedRaw.filter(
      (k) => !authoredIds.has(String(k._id)) && !receivedIds.has(String(k._id))
    );

    res.json({ success: true, data: { received, authored, attended } });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const person = await resolvePersonForKarguzari(req.params.id);
    if (!person) {
      throw new AppError('কারগুজারি লিখতে আগে এই সাথীর প্রোফাইল তৈরি করুন', 404);
    }

    const data = karguzariSchema.parse(req.body);
    const attendees = await resolveAttendeePersonIds(data.attendeeIds, person._id);
    const attendeeNames = [...new Set(data.attendeeNames.map((n) => n.trim()).filter(Boolean))];

    const karguzari = await Karguzari.create({
      person: person._id,
      author: req.account._id,
      meetingDate: new Date(data.meetingDate),
      timeSlot: data.timeSlot,
      text: data.text.trim(),
      attendees,
      attendeeNames,
    });

    await karguzari.populate(populateFields);

    res.status(201).json({ success: true, data: karguzari });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message));
    }
    next(err);
  }
});

module.exports = router;
