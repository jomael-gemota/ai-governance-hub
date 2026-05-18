const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

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
    const project = await Project.findById(req.params.id).populate('createdBy', 'name email');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects - create project (auditor only)
router.post(
  '/',
  requireRole('auditor'),
  [
    body('name').notEmpty().withMessage('Project name is required'),
    body('owner.name').notEmpty().withMessage('Owner name is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const project = new Project({ ...req.body, createdBy: req.user._id });
      await project.save();
      await project.populate('createdBy', 'name email');
      res.status(201).json(project);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// PUT /api/projects/:id - update project (auditor only)
router.put('/:id', requireRole('auditor'), async (req, res) => {
  try {
    const { incidents, milestones, ...updateData } = req.body;
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

// DELETE /api/projects/:id (auditor only)
router.delete('/:id', requireRole('auditor'), async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:id/incidents - log incident (auditor only)
router.post(
  '/:id/incidents',
  requireRole('auditor'),
  [body('title').notEmpty().withMessage('Incident title is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

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

// PATCH /api/projects/:id/incidents/:incidentId - update incident (auditor only)
router.patch('/:id/incidents/:incidentId', requireRole('auditor'), async (req, res) => {
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

// POST /api/projects/:id/milestones (auditor only)
router.post('/:id/milestones', requireRole('auditor'), async (req, res) => {
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

// PATCH /api/projects/:id/milestones/:milestoneId (auditor only)
router.patch('/:id/milestones/:milestoneId', requireRole('auditor'), async (req, res) => {
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

module.exports = router;
