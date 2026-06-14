const mongoose = require('mongoose');

const adminSmsLogSchema = new mongoose.Schema(
  {
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    recipientName: { type: String, required: true, trim: true },
    recipientMobile: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    encoding: { type: String, enum: ['gsm', 'unicode'], required: true },
    smsParts: { type: Number, required: true, min: 1 },
    charCount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['sent', 'failed'], required: true },
    errorMessage: { type: String, default: '' },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'BatchSmsLog', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminSmsLog', adminSmsLogSchema);
