const mongoose = require('mongoose');
const { Schema } = mongoose;

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

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const problemDefinitionSchema = new mongoose.Schema(
  {
    currentProcess: { type: String, default: '' },
    currentTiming: { type: String, default: '' },
    idealOutcome: { type: String, default: '' },
  },
  { _id: false }
);

const proposedSolutionSchema = new mongoose.Schema(
  {
    implementationApproach: { type: String, default: '' },
    impactedWorkflow: { type: String, default: '' },
    targetUsers: { type: String, default: '' },
    dataSources: { type: String, default: '' },
    validationMethod: { type: String, default: '' },
    estimatedTimeSavings: { type: String, default: '' },
  },
  { _id: false }
);

const riskSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    effect: {
      type: String,
      enum: ['minimal', 'moderate', 'severe', 'catastrophic'],
      default: 'minimal',
    },
  },
  { _id: true }
);

const auditChecklistSchema = new mongoose.Schema(
  {
    dataPrivacy:    { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
    security:       { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
    biasFairness:   { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
    accuracy:       { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
    compliance:     { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
    explainability: { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
  },
  { _id: false }
);

const auditEntrySchema = new mongoose.Schema(
  {
    auditor:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    verdict:           { type: String, enum: ['approved', 'denied', 'needs-review', 'trial-run'], required: true },
    findings:          { type: String, default: '' },
    conditions:        { type: String, default: '' },
    nextReviewDate:    { type: Date },
    trialDurationDays: { type: Number },
    checklist:         { type: auditChecklistSchema, default: () => ({}) },
    auditedAt:         { type: Date, default: Date.now },
  },
  { _id: true, timestamps: true }
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
    problemDefinition: { type: problemDefinitionSchema, default: () => ({}) },
    proposedSolution: { type: proposedSolutionSchema, default: () => ({}) },
    media: { type: [attachmentSchema], default: [] },
    documents: { type: [attachmentSchema], default: [] },
    risks: { type: [riskSchema], default: [] },
    milestones: [milestoneSchema],
    incidents: [incidentSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    auditStatus: {
      type: String,
      enum: ['not-submitted', 'pending', 'in-review', 'trial-run', 'trial-completed', 'approved', 'denied', 'needs-review'],
      default: 'not-submitted',
    },
    currentAuditor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    auditSubmittedAt: { type: Date },
    trialStartedAt: { type: Date },
    trialDurationDays: { type: Number, enum: [30, 60] },
    trialEndsAt: { type: Date },
    audits: { type: [auditEntrySchema], default: [] },
  },
  { timestamps: true }
);

projectSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Project', projectSchema);
