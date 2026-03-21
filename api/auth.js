const express = require('express');
const router = express.Router();

const ADMIN_PASSWORD = 'admin123';

// POST /api/auth/login — Validate admin password
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

module.exports = router;
