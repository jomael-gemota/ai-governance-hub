const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Policy = require('../models/Policy');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const policyDir = path.join(__dirname, '..', '..', 'uploads', 'policy');
fs.mkdirSync(policyDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, policyDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are allowed.'));
  },
});

// GET /api/policy — get current policy document metadata
router.get('/', authenticate, async (_req, res) => {
  try {
    const policy = await Policy.findOne().sort({ uploadedAt: -1 }).populate('uploadedBy', 'name email');
    if (!policy) return res.json({ policy: null });
    res.json({ policy });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/policy — upload new policy PDF (auditor only, replaces existing)
router.post('/', authenticate, requireRole('auditor'), upload.single('policy'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    // Delete old file from disk
    const existing = await Policy.findOne().sort({ uploadedAt: -1 });
    if (existing) {
      const oldPath = path.join(policyDir, existing.filename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      await Policy.deleteMany({});
    }

    const policy = await Policy.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    });

    await policy.populate('uploadedBy', 'name email');
    res.status(201).json({ policy });
  } catch (err) {
    if (err instanceof multer.MulterError || err.message === 'Only PDF files are allowed.') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/policy — remove policy (auditor only)
router.delete('/', authenticate, requireRole('auditor'), async (_req, res) => {
  try {
    const existing = await Policy.findOne().sort({ uploadedAt: -1 });
    if (!existing) return res.status(404).json({ message: 'No policy document found.' });

    const oldPath = path.join(policyDir, existing.filename);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    await Policy.deleteMany({});

    res.json({ message: 'Policy document removed.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
