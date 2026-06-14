const mongoose = require('mongoose');
const { KARGUZARI_TIME_SLOTS } = require('../constants');

const karguzariSchema = new mongoose.Schema(
  {
    person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    meetingDate: { type: Date, required: true },
    timeSlot: { type: String, enum: KARGUZARI_TIME_SLOTS, required: true },
    text: { type: String, required: true, trim: true },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Person' }],
    attendeeNames: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

karguzariSchema.index({ attendees: 1 });
karguzariSchema.index({ author: 1, meetingDate: -1, createdAt: -1 });
karguzariSchema.index({ person: 1, meetingDate: -1, createdAt: -1 });
karguzariSchema.index({ attendees: 1, meetingDate: -1, createdAt: -1 });

module.exports = mongoose.model('Karguzari', karguzariSchema);
