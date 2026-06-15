const mongoose = require('mongoose');

const signupApprovalSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    houseAddress: { type: String, default: '' },
    masjid: { type: String, required: true },
    mobile: { type: String, required: true, index: true },
    pinHash: { type: String, required: true },
    pinPlain: { type: String, required: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    consumed: { type: Boolean, default: false },
    verifyAttempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

signupApprovalSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SignupApproval', signupApprovalSchema);
