const express = require('express');
const {
  TIME_GIVEN_OPTIONS,
  MASTURAT_DAYS_OPTIONS,
  STUDENT_CLASS_OPTIONS,
  KARGUZARI_TIME_SLOTS,
} = require('../constants');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      timeGivenOptions: TIME_GIVEN_OPTIONS,
      masturatDaysOptions: MASTURAT_DAYS_OPTIONS,
      studentClassOptions: STUDENT_CLASS_OPTIONS,
      karguzariTimeSlots: KARGUZARI_TIME_SLOTS,
    },
  });
});

module.exports = router;
