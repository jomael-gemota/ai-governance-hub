const express = require('express');
const User = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET /api/users — auditors and admins can list users
router.get('/', requireRole('auditor'), async (_req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-googleId');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/users/:id/role — admin only
router.patch('/:id/role', requireRole('admin'), async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'auditor', 'creator'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role. Must be admin, auditor, or creator.' });
  }
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ message: 'You cannot change your own role.' });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.toSafeObject());
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/users/:id — admin only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ message: 'You cannot remove your own account.' });
  }
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
