const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const statsRoutes = require('./routes/stats');
const invitationRoutes = require('./routes/invitations');
const policyRoutes = require('./routes/policy');

const app = express();
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// The frontend is served by this same Express server, so same-origin requests
// are the norm. JWT tokens handle auth — CORS does not need to be restrictive.
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/policy', policyRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
  const indexHtmlPath = path.join(frontendDist, 'index.html');

  console.log('[static] Serving frontend from:', frontendDist);
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('[static] ERROR: index.html NOT found at', indexHtmlPath);
    try {
      const parent = path.dirname(frontendDist);
      console.error('[static] Contents of', parent, ':', fs.readdirSync(parent));
    } catch (e) {
      console.error('[static] Cannot list parent dir:', e.message);
    }
  } else {
    console.log('[static] Found index.html');
    try {
      const assetsDir = path.join(frontendDist, 'assets');
      if (fs.existsSync(assetsDir)) {
        console.log('[static] Assets:', fs.readdirSync(assetsDir).length, 'files');
      }
    } catch (_) {}
  }

  app.use(express.static(frontendDist, { index: false, maxAge: '1h' }));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return res.status(404).json({ message: 'Not found' });
    }
    // If the request looks like a static asset (has an extension) but wasn't
    // served by express.static above, return 404 instead of HTML — otherwise
    // the browser will try to parse index.html as CSS/JS and fail.
    if (path.extname(req.path)) {
      return res.status(404).send('Not found');
    }
    res.sendFile(indexHtmlPath, (err) => {
      if (err) {
        console.error('[static] sendFile error:', err.message);
        if (!res.headersSent) res.status(500).send('Frontend not built');
      }
    });
  });
}

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = '0.0.0.0';
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const server = app.listen(PORT, HOST, () =>
      console.log(`Server running on ${HOST}:${PORT}`)
    );

    const shutdown = (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        mongoose.connection.close(false).finally(() => process.exit(0));
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
