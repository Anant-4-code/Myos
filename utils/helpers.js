// ===== HELPER UTILITIES =====

/**
 * Generate a pseudo-random ID
 */
export function generateId() {
  return 'node-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Build the full path string for a node (e.g. ~/DSA/Stack)
 */
export function buildPath(nodeId, nodes) {
  const parts = [];
  let current = nodes.find(n => n.id === nodeId);
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? nodes.find(n => n.id === current.parentId) : null;
  }
  return '~/' + parts.join('/');
}

/**
 * Get direct children of a parent node
 */
export function getChildren(parentId, nodes) {
  return nodes.filter(n => n.parentId === parentId);
}

/**
 * Get all root nodes (no parent)
 */
export function getRoots(nodes) {
  return nodes.filter(n => n.parentId === null);
}

/**
 * Get all descendants of a node (recursive)
 */
export function getDescendants(nodeId, nodes) {
  const children = getChildren(nodeId, nodes);
  let all = [...children];
  for (const child of children) {
    all = all.concat(getDescendants(child.id, nodes));
  }
  return all;
}

/**
 * Get ancestor chain (from root to parent of nodeId)
 */
export function getAncestors(nodeId, nodes) {
  const ancestors = [];
  let current = nodes.find(n => n.id === nodeId);
  if (!current) return ancestors;
  let parent = nodes.find(n => n.id === current.parentId);
  while (parent) {
    ancestors.unshift(parent);
    parent = parent.parentId ? nodes.find(n => n.id === parent.parentId) : null;
  }
  return ancestors;
}

/**
 * Count children of a folder (including nested)
 */
export function countDescendants(nodeId, nodes) {
  return getDescendants(nodeId, nodes).length;
}

/**
 * Simple debounce
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
