const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    houseAddress: { type: String, trim: true, default: '' },
    masjid: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, index: true },
    pinHash: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Account', accountSchema);
