const express = require('express');
const { body, validationResult } = require('express-validator');
const Invitation = require('../models/Invitation');
const User = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendInvitationEmail, isSmtpConfigured } = require('../utils/mailer');

const router = express.Router();

const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

router.use(authenticate);
router.use(requireRole('auditor'));

// GET /api/invitations — list all
router.get('/', async (_req, res) => {
  try {
    const invitations = await Invitation.find()
      .sort({ createdAt: -1 })
      .populate('invitedBy', 'name email');
    res.json({ invitations, smtpConfigured: isSmtpConfigured() });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/invitations — create + send
router.post(
  '/',
  [
    body('email').isEmail().withMessage('Valid email required').toLowerCase(),
    body('role').isIn(['auditor', 'creator']).withMessage('Role must be auditor or creator'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, role } = req.body;
    const domain = email.split('@')[1];

    if (!ALLOWED_DOMAINS.includes(domain)) {
      return res.status(400).json({
        message: `Email must be from an allowed domain: ${ALLOWED_DOMAINS.map((d) => '@' + d).join(' or ')}`,
      });
    }

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'This user already has an account.' });
      }

      const existingInvite = await Invitation.findOne({ email });
      if (existingInvite && existingInvite.status === 'pending') {
        return res.status(400).json({ message: 'An active invitation already exists for this email.' });
      }

      let invitation;
      if (existingInvite) {
        existingInvite.role = role;
        existingInvite.status = 'pending';
        existingInvite.invitedBy = req.user._id;
        existingInvite.invitedByName = req.user.name;
        existingInvite.acceptedAt = null;
        existingInvite.emailSent = false;
        existingInvite.emailError = null;
        invitation = await existingInvite.save();
      } else {
        invitation = await Invitation.create({
          email,
          role,
          invitedBy: req.user._id,
          invitedByName: req.user.name,
        });
      }

      try {
        const result = await sendInvitationEmail({
          to: email,
          inviterName: req.user.name,
          role,
        });
        invitation.emailSent = result.sent;
        if (!result.sent) invitation.emailError = result.reason || null;
        await invitation.save();
      } catch (mailErr) {
        invitation.emailSent = false;
        invitation.emailError = mailErr.message;
        await invitation.save();
      }

      res.status(201).json(invitation);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// POST /api/invitations/:id/resend
router.post('/:id/resend', async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);
    if (!invitation) return res.status(404).json({ message: 'Invitation not found' });
    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending invitations can be resent.' });
    }

    try {
      const result = await sendInvitationEmail({
        to: invitation.email,
        inviterName: req.user.name,
        role: invitation.role,
      });
      invitation.emailSent = result.sent;
      invitation.emailError = result.sent ? null : result.reason || null;
      await invitation.save();
      res.json(invitation);
    } catch (mailErr) {
      invitation.emailSent = false;
      invitation.emailError = mailErr.message;
      await invitation.save();
      res.status(500).json({ message: 'Failed to send email', error: mailErr.message });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/invitations/:id — revoke
router.delete('/:id', async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);
    if (!invitation) return res.status(404).json({ message: 'Invitation not found' });

    if (invitation.status === 'accepted') {
      return res.status(400).json({ message: 'Cannot revoke an accepted invitation. Remove the user account instead.' });
    }

    await invitation.deleteOne();
    res.json({ message: 'Invitation revoked' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
