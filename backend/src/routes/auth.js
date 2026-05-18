const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
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

// POST /api/auth/login — email + password
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user || user.authProvider !== 'local') {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const match = await user.comparePassword(password);
      if (!match) return res.status(401).json({ message: 'Invalid credentials' });

      const token = signToken(user._id);
      res.json({ token, user: user.toSafeObject() });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// POST /api/auth/google — Google OAuth sign-in
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

    if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
      return res.status(403).json({
        message: `Access restricted. Only ${ALLOWED_DOMAINS.join(' and ')} accounts are allowed.`,
      });
    }

    let user = await User.findOne({ email });

    if (user) {
      // Existing user — update Google fields if missing
      if (!user.googleId) {
        user.googleId = payload.sub;
        user.picture = payload.picture || null;
        if (user.authProvider === 'local' && !user.passwordHash) {
          user.authProvider = 'google';
        }
        await user.save();
      }
    } else {
      // New user — auto-provision with executive role
      user = await User.create({
        name: payload.name,
        email,
        googleId: payload.sub,
        picture: payload.picture || null,
        authProvider: 'google',
        role: 'executive',
      });
    }

    const token = signToken(user._id);
    res.json({ token, user: user.toSafeObject() });
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
