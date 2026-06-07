const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Otp', otpSchema);
