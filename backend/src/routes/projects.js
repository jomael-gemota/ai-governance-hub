const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Project = require('../models/Project');
const User = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendAuditSubmittedEmail, sendAuditVerdictEmail } = require('../utils/mailer');

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

// POST /api/projects/:id/incidents - log incident (creator only)
router.post(
  '/:id/incidents',
  requireRole('creator'),
  async (req, res) => {
    if (!req.body?.title) return res.status(400).json({ message: 'Incident title is required' });

    try {
      const project = await Project.findById(req.params.id);
      if (!project) return res.status(404).json({ message: 'Project not found' });

      project.incidents.unshift(req.body);
      await project.save();
      res.status(201).json(project.incidents[0]);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// PATCH /api/projects/:id/incidents/:incidentId - update incident (creator only)
router.patch('/:id/incidents/:incidentId', requireRole('creator'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

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

// POST /api/projects/:id/milestones (creator only)
router.post('/:id/milestones', requireRole('creator'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    project.milestones.push(req.body);
    await project.save();
    res.status(201).json(project.milestones[project.milestones.length - 1]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/projects/:id/milestones/:milestoneId (creator only)
router.patch('/:id/milestones/:milestoneId', requireRole('creator'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

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

// POST /api/projects/:id/audit/submit — creator submits project for audit
router.post('/:id/audit/submit', requireRole('creator'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const blocked = ['in-review', 'approved'];
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

// POST /api/projects/:id/audit/verdict — auditor submits verdict
router.post('/:id/audit/verdict', requireRole('auditor'), async (req, res) => {
  try {
    const { verdict, findings, conditions, nextReviewDate, checklist } = req.body;
    if (!verdict) return res.status(400).json({ message: 'Verdict is required.' });
    if (!findings?.trim()) return res.status(400).json({ message: 'Findings/reasoning is required.' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.auditStatus !== 'in-review') {
      return res.status(400).json({ message: 'Project must be in-review before submitting a verdict.' });
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
      }).catch((err) => console.error('[mailer] audit-verdict email failed:', err.message));
    }

    res.json({ auditStatus: project.auditStatus, audit: project.audits[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/projects/audit-queue — auditor queue (pending + in-review)
router.get('/audit-queue/list', requireRole('auditor'), async (req, res) => {
  try {
    const projects = await Project.find({ auditStatus: { $in: ['pending', 'in-review'] } })
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
