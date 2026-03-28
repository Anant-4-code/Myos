const express = require('express');
const cors = require('cors');
const path = require('path');

const contentRoutes = require('./api/content');
const analyticsRoutes = require('./api/analytics');
const authRoutes = require('./api/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/content', contentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);

// Serve static files (HTML, CSS, JS, etc.)
app.use(express.static(path.join(__dirname)));

// Direct bypass to app.html (Landing page index.html is still available at /index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'app.html'));
});

// Fallback: serve app.html for unknown routes instead of index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'app.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ⚡ DevTerm Backend running at http://localhost:${PORT}\n`);
});

// Export for Vercel serverless
module.exports = app;
