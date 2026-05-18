const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Invitation = require('../models/Invitation');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/google
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Google credential is required' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const email = payload.email?.toLowerCase();
    const domain = email?.split('@')[1];

    // 1. Domain allowlist
    if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
      return res.status(403).json({
        code: 'DOMAIN_NOT_ALLOWED',
        message: `Access is restricted to ${ALLOWED_DOMAINS.map((d) => '@' + d).join(' and ')} accounts.`,
      });
    }

    const bootstrapEmail = (process.env.BOOTSTRAP_AUDITOR_EMAIL || '').toLowerCase().trim();
    let user = await User.findOne({ email });

    // 2. Existing user — sign in
    if (user) {
      // Migrate legacy 'executive' role from old schema -> 'creator'
      if (user.role === 'executive') user.role = 'creator';
      // Promote bootstrap email to auditor if not already
      if (bootstrapEmail && email === bootstrapEmail && user.role !== 'auditor') {
        user.role = 'auditor';
      }
      user.googleId = user.googleId || payload.sub;
      user.picture = payload.picture || user.picture;
      user.lastLoginAt = new Date();
      await user.save();

      const token = signToken(user._id);
      return res.json({ token, user: user.toSafeObject() });
    }

    // 3. New user — check for bootstrap auditor
    if (bootstrapEmail && email === bootstrapEmail) {
      user = await User.create({
        name: payload.name,
        email,
        googleId: payload.sub,
        picture: payload.picture || null,
        role: 'auditor',
        lastLoginAt: new Date(),
      });
      const token = signToken(user._id);
      return res.json({ token, user: user.toSafeObject() });
    }

    // 4. New user — check for valid invitation
    const invitation = await Invitation.findOne({ email, status: 'pending' });
    if (!invitation) {
      return res.status(403).json({
        code: 'NOT_INVITED',
        message: `You are not qualified to log in to the hub. Please contact an auditor to invite you first.`,
      });
    }

    user = await User.create({
      name: payload.name,
      email,
      googleId: payload.sub,
      picture: payload.picture || null,
      role: invitation.role,
      lastLoginAt: new Date(),
    });

    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await invitation.save();

    const token = signToken(user._id);
    return res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user.toSafeObject ? req.user.toSafeObject() : req.user });
});

module.exports = router;
