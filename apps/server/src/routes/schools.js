const express = require('express');
const School = require('../models/School');
const { ACTIVE } = require('../utils/directory');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const schools = await School.find({ isDeleted: ACTIVE }).sort({ name: 1 }).select('name');
    res.json({ success: true, data: schools.map((s) => s.name) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
