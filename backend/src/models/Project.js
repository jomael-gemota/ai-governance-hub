const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { _id: true }
);

const incidentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    resolvedNotes: { type: String, default: '' },
  },
  { _id: true, timestamps: true }
);

const ownerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    department: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    owner: { type: ownerSchema, required: true },
    status: {
      type: String,
      enum: ['planning', 'active', 'on-hold', 'completed', 'failed'],
      default: 'planning',
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    techStack: [{ type: String, trim: true }],
    startDate: { type: Date },
    targetEndDate: { type: Date },
    budget: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    milestones: [milestoneSchema],
    incidents: [incidentSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

projectSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Project', projectSchema);
