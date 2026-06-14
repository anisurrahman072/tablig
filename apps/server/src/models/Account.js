const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    houseAddress: { type: String, trim: true, default: '' },
    masjid: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, index: true },
    pinHash: { type: String, required: true },
    pinPlain: { type: String, default: '' },
    isAdmin: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound indexes for fast directory listing and filtering
accountSchema.index({ isDeleted: 1, updatedAt: -1 });
accountSchema.index({ isDeleted: 1, masjid: 1, updatedAt: -1 });

module.exports = mongoose.model('Account', accountSchema);
