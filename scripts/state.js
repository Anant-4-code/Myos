// ===== GLOBAL STATE MANAGEMENT =====

const state = {
  nodes: [],
  expandedSet: new Set(),
  activeNodeId: null,
  username: '',
  breadcrumbPath: '~',
  bookmarks: new Set(),
  focusMode: false,
  searchQuery: '',
  searchResults: [],
  commandHistory: [],
  commandHistoryIndex: -1
};

const listeners = {};

/**
 * Get current state (shallow copy)
 */
export function getState() {
  return { ...state };
}

/**
 * Update state partially
 */
export function setState(updates) {
  const changedKeys = [];
  for (const key of Object.keys(updates)) {
    if (state.hasOwnProperty(key)) {
      state[key] = updates[key];
      changedKeys.push(key);
    }
  }
  changedKeys.forEach(key => emit(key, state[key]));
  emit('stateChange', state);
}

/**
 * Subscribe to a specific state key change
 */
export function subscribe(event, callback) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
  return () => {
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  };
}

/**
 * Emit event to all listeners
 */
function emit(event, data) {
  if (listeners[event]) {
    listeners[event].forEach(cb => cb(data));
  }
}

/**
 * Toggle a node's expanded state
 */
export function toggleExpanded(nodeId) {
  if (state.expandedSet.has(nodeId)) {
    state.expandedSet.delete(nodeId);
  } else {
    state.expandedSet.add(nodeId);
  }
  emit('expandedSet', state.expandedSet);
  emit('stateChange', state);
}

/**
 * Set the active node
 */
export function setActiveNode(nodeId) {
  state.activeNodeId = nodeId;
  emit('activeNodeId', nodeId);
  emit('stateChange', state);
}

/**
 * Toggle bookmark on a node
 */
export function toggleBookmark(nodeId) {
  if (state.bookmarks.has(nodeId)) {
    state.bookmarks.delete(nodeId);
  } else {
    state.bookmarks.add(nodeId);
  }
  emit('bookmarks', state.bookmarks);
  emit('stateChange', state);
}

/**
 * Toggle focus mode
 */
export function toggleFocusMode() {
  state.focusMode = !state.focusMode;
  emit('focusMode', state.focusMode);
  emit('stateChange', state);
}

/**
 * Expand path to a specific node (auto-expand ancestors)
 */
export function expandPathTo(nodeId, nodes) {
  let current = nodes.find(n => n.id === nodeId);
  while (current && current.parentId) {
    state.expandedSet.add(current.parentId);
    current = nodes.find(n => n.id === current.parentId);
  }
  emit('expandedSet', state.expandedSet);
  emit('stateChange', state);
}

/**
 * Add command to history
 */
export function addCommandToHistory(cmd) {
  state.commandHistory.push(cmd);
  state.commandHistoryIndex = state.commandHistory.length;
}
