const mongoose = require('mongoose');
const { KARGUZARI_TIME_SLOTS } = require('../constants');

const karguzariSchema = new mongoose.Schema(
  {
    person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    meetingDate: { type: Date, required: true },
    timeSlot: { type: String, enum: KARGUZARI_TIME_SLOTS, required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Karguzari', karguzariSchema);
