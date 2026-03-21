const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const DATA_FILE = path.join(__dirname, '..', 'data', 'content.json');

// Helper: read content from disk
function readContent() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading content.json:', err.message);
    return [];
  }
}

// Helper: write content to disk
function writeContent(nodes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(nodes, null, 2), 'utf-8');
}

// Helper: get all descendant IDs (for cascade delete)
function getDescendantIds(nodeId, nodes) {
  const ids = [];
  const children = nodes.filter(n => n.parentId === nodeId);
  children.forEach(child => {
    ids.push(child.id);
    ids.push(...getDescendantIds(child.id, nodes));
  });
  return ids;
}

// GET /api/content — Return entire content tree
router.get('/', (req, res) => {
  const nodes = readContent();
  res.json(nodes);
});

// PUT /api/content — Replace entire content tree (admin bulk save)
router.put('/', (req, res) => {
  const nodes = req.body;
  if (!Array.isArray(nodes)) {
    return res.status(400).json({ error: 'Body must be an array of nodes' });
  }
  writeContent(nodes);
  res.json({ success: true, count: nodes.length });
});

// POST /api/content/node — Add a single node
router.post('/node', (req, res) => {
  const newNode = req.body;
  if (!newNode || !newNode.id || !newNode.name) {
    return res.status(400).json({ error: 'Node must have id and name' });
  }
  const nodes = readContent();
  nodes.push(newNode);
  writeContent(nodes);
  res.json({ success: true, node: newNode });
});

// PUT /api/content/node/:id — Update a single node
router.put('/node/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const nodes = readContent();
  const index = nodes.findIndex(n => n.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Node not found' });
  }
  nodes[index] = { ...nodes[index], ...updates };
  writeContent(nodes);
  res.json({ success: true, node: nodes[index] });
});

// DELETE /api/content/node/:id — Delete node + all descendants
router.delete('/node/:id', (req, res) => {
  const { id } = req.params;
  let nodes = readContent();
  const idsToRemove = new Set([id, ...getDescendantIds(id, nodes)]);
  const before = nodes.length;
  nodes = nodes.filter(n => !idsToRemove.has(n.id));
  writeContent(nodes);
  res.json({ success: true, removed: before - nodes.length });
});

module.exports = router;
