const mongoose = require('mongoose');
const { PERSON_TYPES } = require('../constants');

const personSchema = new mongoose.Schema(
  {
    type: { type: String, enum: PERSON_TYPES, required: true },
    name: { type: String, required: true, trim: true, index: true },
    masjid: { type: String, required: true, trim: true, index: true },
    houseLocation: { type: String, trim: true, default: '' },
    mobile: { type: String, trim: true, index: true, default: '' },
    timeGivenValue: { type: Number, default: null },
    masturatDaysValue: { type: Number, default: null },
    profession: { type: String, trim: true, default: '' },
    classValue: { type: Number, default: null },
    schoolName: { type: String, trim: true, default: '', index: true },
    fatherName: { type: String, trim: true, default: '' },
    fatherMobile: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

personSchema.index({ name: 'text', schoolName: 'text' });

module.exports = mongoose.model('Person', personSchema);
