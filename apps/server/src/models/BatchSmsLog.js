const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema(
  {
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    personId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person' },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    type: { type: String, enum: ['sathi', 'student'], required: true },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending',
    },
    errorMessage: { type: String, default: '' },
    adminSmsLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminSmsLog' },
  },
  { _id: true }
);

const batchSmsLogSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    message: { type: String, required: true, trim: true },
    encoding: { type: String, enum: ['gsm', 'unicode'], required: true },
    smsParts: { type: Number, required: true, min: 1 },
    charCount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'partial', 'failed'],
      default: 'pending',
      index: true,
    },
    totalRecipients: { type: Number, required: true, min: 1 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    recipients: [recipientSchema],
    parentBatch: { type: mongoose.Schema.Types.ObjectId, ref: 'BatchSmsLog' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BatchSmsLog', batchSmsLogSchema);
