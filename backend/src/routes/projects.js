const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Project = require('../models/Project');
const User = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  sendAuditSubmittedEmail,
  sendAuditVerdictEmail,
  sendTrialRunStartedEmail,
  sendTrialRunCompletedEmail,
} = require('../utils/mailer');

const router = express.Router();
const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
const mediaDir = path.join(uploadsRoot, 'media');
const documentsDir = path.join(uploadsRoot, 'documents');
fs.mkdirSync(mediaDir, { recursive: true });
fs.mkdirSync(documentsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'media') return cb(null, mediaDir);
    return cb(null, documentsDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    files: 8,
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'media') {
      if (file.mimetype.startsWith('image/')) return cb(null, true);
      return cb(new Error('Only image files are allowed for media uploads.'));
    }
    if (file.fieldname === 'documents') {
      if (file.mimetype === 'application/pdf') return cb(null, true);
      return cb(new Error('Only PDF files are allowed for documentation uploads.'));
    }
    cb(new Error('Unexpected upload field.'));
  },
});

const uploadFields = upload.fields([
  { name: 'media', maxCount: 5 },
  { name: 'documents', maxCount: 3 },
]);

const toAttachment = (file) => ({
  filename: file.filename,
  originalName: file.originalname,
  mimeType: file.mimetype,
  size: file.size,
  url: `/uploads/${file.fieldname}/${file.filename}`,
  uploadedAt: new Date(),
});

const parseJsonField = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseProjectPayload = (req, fallbackOwner) => {
  const body = req.body || {};
  return {
    name: body.name?.trim(),
    description: body.description || '',
    notes: body.notes || '',
    status: body.status || 'planning',
    riskLevel: body.riskLevel || 'low',
    budget: body.budget ? Number(body.budget) : 0,
    startDate: body.startDate || undefined,
    targetEndDate: body.targetEndDate || undefined,
    owner: {
      name: fallbackOwner.name,
      email: fallbackOwner.email,
      department: body.ownerDepartment || '',
    },
    techStack: parseJsonField(body.techStack, []).filter(Boolean),
    problemDefinition: parseJsonField(body.problemDefinition, {}),
    proposedSolution: parseJsonField(body.proposedSolution, {}),
    risks: parseJsonField(body.risks, []).filter((r) => r?.description?.trim()),
    existingMedia: parseJsonField(body.existingMedia, []),
    existingDocuments: parseJsonField(body.existingDocuments, []),
  };
};

// All routes require authentication
router.use(authenticate);

// GET /api/projects - list all projects with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, riskLevel, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const [projects, total] = await Promise.all([
      Project.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('createdBy', 'name email'),
      Project.countDocuments(filter),
    ]);

    res.json({ projects, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/projects/:id - get single project
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('currentAuditor', 'name email picture')
      .populate('audits.auditor', 'name email picture');
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Option A: auto-transition trial-run → trial-completed on read once the window has elapsed
    if (project.auditStatus === 'trial-run' && project.trialEndsAt && new Date() >= project.trialEndsAt) {
      project.auditStatus = 'trial-completed';
      await project.save();

      // Notify all auditors that this project is ready for final review (fire-and-forget)
      User.find({ role: 'auditor' }).then((auditors) => {
        const emails = auditors.map((a) => a.email).filter(Boolean);
        if (emails.length) {
          sendTrialRunCompletedEmail({
            to: emails,
            projectName: project.name,
            projectId: project._id,
          }).catch((err) => console.error('[mailer] trial-completed email failed:', err.message));
        }
      }).catch((err) => console.error('[mailer] failed to fetch auditors for trial-completed:', err.message));
    }

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects - create project (creator only)
router.post('/', requireRole('creator'), uploadFields, async (req, res) => {
  try {
    const payload = parseProjectPayload(req, {
      name: req.user.name,
      email: req.user.email,
    });
    if (!payload.name) return res.status(400).json({ message: 'Project name is required' });

    const mediaUploads = (req.files?.media || []).map(toAttachment);
    const documentUploads = (req.files?.documents || []).map(toAttachment);

    const project = new Project({
      ...payload,
      media: mediaUploads.slice(0, 5),
      documents: documentUploads.slice(0, 3),
      createdBy: req.user._id,
    });
    await project.save();
    await project.populate('createdBy', 'name email');
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/projects/:id - update project (creator only)
router.put('/:id', requireRole('creator'), uploadFields, async (req, res) => {
  try {
    const payload = parseProjectPayload(req, {
      name: req.user.name,
      email: req.user.email,
    });
    if (!payload.name) return res.status(400).json({ message: 'Project name is required' });
    const mediaUploads = (req.files?.media || []).map(toAttachment);
    const documentUploads = (req.files?.documents || []).map(toAttachment);
    const mergedMedia = [...payload.existingMedia, ...mediaUploads].slice(0, 5);
    const mergedDocuments = [...payload.existingDocuments, ...documentUploads].slice(0, 3);

    const { existingMedia, existingDocuments, ...updateData } = payload;
    updateData.media = mergedMedia;
    updateData.documents = mergedDocuments;
    const project = await Project.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email');

    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/projects/:id (creator only)
router.delete('/:id', requireRole('creator'), async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:id/incidents - log incident (creator or auditor in-review)
router.post('/:id/incidents', async (req, res) => {
  if (!req.body?.title) return res.status(400).json({ message: 'Incident title is required' });

  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isCreator = req.user.role === 'creator';
    const isAuditor = req.user.role === 'auditor';
    if (!isCreator && !(isAuditor && project.auditStatus === 'in-review')) {
      return res.status(403).json({ message: 'Not authorized to log incidents on this project' });
    }

    project.incidents.unshift(req.body);
    await project.save();
    res.status(201).json(project.incidents[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/projects/:id/incidents/:incidentId - update incident (creator or auditor in-review)
router.patch('/:id/incidents/:incidentId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isCreator = req.user.role === 'creator';
    const isAuditor = req.user.role === 'auditor';
    if (!isCreator && !(isAuditor && project.auditStatus === 'in-review')) {
      return res.status(403).json({ message: 'Not authorized to update incidents on this project' });
    }

    const incident = project.incidents.id(req.params.incidentId);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });

    Object.assign(incident, req.body);
    if (req.body.resolved && !incident.resolvedAt) incident.resolvedAt = new Date();
    await project.save();
    res.json(incident);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:id/milestones (creator or auditor in-review)
router.post('/:id/milestones', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isCreator = req.user.role === 'creator';
    const isAuditor = req.user.role === 'auditor';
    if (!isCreator && !(isAuditor && project.auditStatus === 'in-review')) {
      return res.status(403).json({ message: 'Not authorized to add milestones to this project' });
    }

    project.milestones.push(req.body);
    await project.save();
    res.status(201).json(project.milestones[project.milestones.length - 1]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/projects/:id/milestones/:milestoneId (creator or auditor in-review)
router.patch('/:id/milestones/:milestoneId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isCreator = req.user.role === 'creator';
    const isAuditor = req.user.role === 'auditor';
    if (!isCreator && !(isAuditor && project.auditStatus === 'in-review')) {
      return res.status(403).json({ message: 'Not authorized to update milestones on this project' });
    }

    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

    Object.assign(milestone, req.body);
    if (req.body.completed && !milestone.completedAt) milestone.completedAt = new Date();
    await project.save();
    res.json(milestone);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:id/risks — creator or auditor (in-review) adds a risk entry
router.post('/:id/risks', async (req, res) => {
  try {
    const { description, effect } = req.body;
    if (!description?.trim()) return res.status(400).json({ message: 'Risk description is required' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isCreator = req.user.role === 'creator';
    const isAuditor = req.user.role === 'auditor';
    if (!isCreator && !(isAuditor && project.auditStatus === 'in-review')) {
      return res.status(403).json({ message: 'Not authorized to add risks to this project' });
    }

    project.risks.push({ description: description.trim(), effect: effect || 'minimal' });
    await project.save();
    res.status(201).json(project.risks[project.risks.length - 1]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/projects/:id/risks/:riskId — creator or auditor (in-review) removes a risk entry
router.delete('/:id/risks/:riskId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isCreator = req.user.role === 'creator';
    const isAuditor = req.user.role === 'auditor';
    if (!isCreator && !(isAuditor && project.auditStatus === 'in-review')) {
      return res.status(403).json({ message: 'Not authorized to remove risks from this project' });
    }

    const risk = project.risks.id(req.params.riskId);
    if (!risk) return res.status(404).json({ message: 'Risk not found' });

    risk.deleteOne();
    await project.save();
    res.json({ message: 'Risk removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:id/audit/submit — creator submits project for audit
router.post('/:id/audit/submit', requireRole('creator'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const blocked = ['in-review', 'approved', 'trial-run', 'trial-completed'];
    if (blocked.includes(project.auditStatus)) {
      return res.status(400).json({ message: `Cannot submit — project is currently ${project.auditStatus}.` });
    }

    const isResubmission = ['denied', 'needs-review'].includes(project.auditStatus);
    project.auditStatus = 'pending';
    project.auditSubmittedAt = new Date();
    project.currentAuditor = null;
    await project.save();

    // Notify all auditors (fire-and-forget — don't block the response)
    User.find({ role: 'auditor' }).then((auditors) => {
      const emails = auditors.map((a) => a.email).filter(Boolean);
      if (emails.length) {
        sendAuditSubmittedEmail({
          to: emails,
          projectName: project.name,
          projectId: project._id,
          submitterName: req.user.name,
          isResubmission,
        }).catch((err) => console.error('[mailer] audit-submitted email failed:', err.message));
      }
    }).catch((err) => console.error('[mailer] failed to fetch auditors:', err.message));

    res.json({ auditStatus: project.auditStatus, auditSubmittedAt: project.auditSubmittedAt });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:id/audit/claim — auditor claims project for review
router.post('/:id/audit/claim', requireRole('auditor'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.auditStatus !== 'pending') {
      return res.status(400).json({ message: `Project is not pending audit (status: ${project.auditStatus}).` });
    }

    project.auditStatus = 'in-review';
    project.currentAuditor = req.user._id;
    await project.save();
    await project.populate('currentAuditor', 'name email picture');
    res.json({ auditStatus: project.auditStatus, currentAuditor: project.currentAuditor });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:id/audit/verdict — auditor submits verdict (approved/denied/needs-review/trial-run)
router.post('/:id/audit/verdict', requireRole('auditor'), async (req, res) => {
  try {
    const { verdict, findings, conditions, nextReviewDate, checklist, trialDurationDays } = req.body;
    if (!verdict) return res.status(400).json({ message: 'Verdict is required.' });
    if (!findings?.trim()) return res.status(400).json({ message: 'Findings/reasoning is required.' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.auditStatus !== 'in-review') {
      return res.status(400).json({ message: 'Project must be in-review before submitting a verdict.' });
    }

    // Guard: direct approval requires a completed trial run first
    if (verdict === 'approved') {
      if (!project.trialEndsAt) {
        return res.status(400).json({
          message: 'This project must complete a trial run before it can be approved. Use "Initiate Trial Run" instead.',
        });
      }
      if (new Date() < project.trialEndsAt) {
        const remaining = Math.ceil((project.trialEndsAt - new Date()) / 86400000);
        return res.status(400).json({
          message: `Trial run has not completed yet — ${remaining} day(s) remaining. Use the final verdict once the trial ends.`,
        });
      }
    }

    // Handle trial-run verdict
    if (verdict === 'trial-run') {
      const days = Number(trialDurationDays);
      if (![30, 60].includes(days)) {
        return res.status(400).json({ message: 'Trial duration must be 30 or 60 days.' });
      }
      const start = new Date();
      project.trialStartedAt = start;
      project.trialDurationDays = days;
      project.trialEndsAt = new Date(start.getTime() + days * 86400000);
    }

    const entry = {
      auditor: req.user._id,
      verdict,
      findings,
      conditions: conditions || '',
      nextReviewDate: nextReviewDate || undefined,
      trialDurationDays: verdict === 'trial-run' ? Number(trialDurationDays) : undefined,
      checklist: checklist || {},
      auditedAt: new Date(),
    };

    project.audits.unshift(entry);
    project.auditStatus = verdict;
    project.currentAuditor = null;
    await project.save();
    await project.populate('audits.auditor', 'name email picture');
    await project.populate('createdBy', 'name email');

    // Notify creator (fire-and-forget)
    const creatorEmail = project.createdBy?.email;
    if (creatorEmail) {
      if (verdict === 'trial-run') {
        sendTrialRunStartedEmail({
          to: creatorEmail,
          projectName: project.name,
          projectId: project._id,
          auditorName: req.user.name,
          trialDurationDays: Number(trialDurationDays),
          trialEndsAt: project.trialEndsAt,
          findings,
        }).catch((err) => console.error('[mailer] trial-run-started email failed:', err.message));
      } else {
        sendAuditVerdictEmail({
          to: creatorEmail,
          projectName: project.name,
          projectId: project._id,
          auditorName: req.user.name,
          verdict,
          findings,
          conditions: conditions || '',
          nextReviewDate: nextReviewDate || null,
        }).catch((err) => console.error('[mailer] audit-verdict email failed:', err.message));
      }
    }

    res.json({ auditStatus: project.auditStatus, audit: project.audits[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:id/audit/final-verdict — final approval after trial run completes
router.post('/:id/audit/final-verdict', requireRole('auditor'), async (req, res) => {
  try {
    const { verdict, findings, conditions, nextReviewDate, checklist } = req.body;
    if (!verdict) return res.status(400).json({ message: 'Verdict is required.' });
    if (!['approved', 'denied'].includes(verdict)) {
      return res.status(400).json({ message: 'Final verdict must be "approved" or "denied".' });
    }
    if (!findings?.trim()) return res.status(400).json({ message: 'Findings/reasoning is required.' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.auditStatus !== 'trial-completed') {
      return res.status(400).json({ message: 'Final verdict can only be submitted after the trial run has completed.' });
    }

    const entry = {
      auditor: req.user._id,
      verdict,
      findings,
      conditions: conditions || '',
      nextReviewDate: nextReviewDate || undefined,
      checklist: checklist || {},
      auditedAt: new Date(),
    };

    project.audits.unshift(entry);
    project.auditStatus = verdict;
    project.currentAuditor = null;
    await project.save();
    await project.populate('audits.auditor', 'name email picture');
    await project.populate('createdBy', 'name email');

    // Notify creator (fire-and-forget)
    const creatorEmail = project.createdBy?.email;
    if (creatorEmail) {
      sendAuditVerdictEmail({
        to: creatorEmail,
        projectName: project.name,
        projectId: project._id,
        auditorName: req.user.name,
        verdict,
        findings,
        conditions: conditions || '',
        nextReviewDate: nextReviewDate || null,
      }).catch((err) => console.error('[mailer] final-verdict email failed:', err.message));
    }

    res.json({ auditStatus: project.auditStatus, audit: project.audits[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/projects/audit-queue — auditor queue (pending + in-review + trial-run + trial-completed)
router.get('/audit-queue/list', requireRole('auditor'), async (req, res) => {
  try {
    const projects = await Project.find({
      auditStatus: { $in: ['pending', 'in-review', 'trial-run', 'trial-completed'] },
    })
      .sort({ auditSubmittedAt: 1 })
      .populate('createdBy', 'name email')
      .populate('currentAuditor', 'name email picture');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ message: err.message || 'Upload failed' });
  }
  next();
});

module.exports = router;
