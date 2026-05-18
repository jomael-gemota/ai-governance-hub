const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ['auditor', 'creator'], required: true },
    status: { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    invitedByName: { type: String },
    acceptedAt: { type: Date },
    emailSent: { type: Boolean, default: false },
    emailError: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invitation', invitationSchema);
