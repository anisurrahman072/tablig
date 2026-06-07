const express = require('express');
const Masjid = require('../models/Masjid');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const masjids = await Masjid.find().sort({ name: 1 }).select('name');
    res.json({
      success: true,
      data: masjids.map((m) => m.name),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
