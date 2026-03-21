const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const LOGS_FILE = path.join(__dirname, '..', 'data', 'logs.json');

// Helper: read logs
function readLogs() {
  try {
    const raw = fs.readFileSync(LOGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

// Helper: write logs
function writeLogs(logs) {
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
}

// POST /api/analytics/log — Append event
router.post('/log', (req, res) => {
  const { username, ip, action, nodeId } = req.body;
  if (!username || !action) {
    return res.status(400).json({ error: 'username and action are required' });
  }

  const logs = readLogs();
  const event = {
    username,
    ip: ip || req.ip || 'unknown',
    action,
    nodeId: nodeId || null,
    timestamp: Date.now()
  };
  logs.push(event);
  writeLogs(logs);
  res.json({ success: true });
});

// GET /api/analytics/overview — Aggregated metrics
router.get('/overview', (req, res) => {
  const logs = readLogs();
  const now = Date.now();
  const oneDayAgo = now - 86400000;

  // Unique usernames
  const allUsers = new Set(logs.map(l => l.username));
  const activeToday = new Set(
    logs.filter(l => l.timestamp > oneDayAgo).map(l => l.username)
  );
  const totalViews = logs.filter(l => l.action === 'view').length;

  res.json({
    totalUsers: allUsers.size,
    activeToday: activeToday.size,
    totalViews
  });
});

// GET /api/analytics/users — User table data
router.get('/users', (req, res) => {
  const logs = readLogs();
  const userMap = {};

  logs.forEach(log => {
    if (!userMap[log.username]) {
      userMap[log.username] = {
        username: log.username,
        visits: 0,
        lastSeen: log.timestamp,
        ip: log.ip || 'unknown'
      };
    }
    userMap[log.username].visits++;
    if (log.timestamp > userMap[log.username].lastSeen) {
      userMap[log.username].lastSeen = log.timestamp;
      userMap[log.username].ip = log.ip || userMap[log.username].ip;
    }
  });

  const users = Object.values(userMap).sort((a, b) => b.lastSeen - a.lastSeen);
  res.json(users);
});

// GET /api/analytics/top-content — Top viewed content
router.get('/top-content', (req, res) => {
  const logs = readLogs();
  const viewCounts = {};

  logs.filter(l => l.action === 'view' && l.nodeId).forEach(log => {
    viewCounts[log.nodeId] = (viewCounts[log.nodeId] || 0) + 1;
  });

  const sorted = Object.entries(viewCounts)
    .map(([id, views]) => ({ id, views }))
    .sort((a, b) => b.views - a.views);

  res.json(sorted);
});

module.exports = router;
