// ===== APP ENTRY POINT =====
import { setState, getState, toggleFocusMode } from './state.js';
import { getUsername, fetchContentFromServer, getContentData, setContentData, getExpandedNodes, getBookmarks } from '../utils/storage.js';
import { initTree } from './modules/tree.js';
import { initContent, showWelcome } from './modules/content.js';
import { createPromptHTML } from './modules/terminal.js';
import { initSearch, focusSearch } from './modules/search.js';
import { initCommands } from './modules/commands.js';

/**
 * Main app initialization
 */
async function init() {
  // Check authentication (Bypassed for guest access)
  let username = getUsername();
  if (!username) {
    username = 'Guest';
    console.log('No username found, continuing as Guest');
  }

  // Load content data from backend
  let nodes;
  try {
    nodes = await fetchContentFromServer();
  } catch (err) {
    console.warn('Backend unavailable, using cached data');
    nodes = getContentData();
  }

  if (!nodes) {
    try {
      const response = await fetch('data/content.json');
      nodes = await response.json();
      setContentData(nodes);
    } catch (err) {
      console.error('Failed to load content:', err);
      nodes = [];
    }
  }

  // Load persisted states
  const expandedSet = getExpandedNodes();
  const bookmarks = getBookmarks();

  // Initialize state
  setState({
    nodes,
    username,
    expandedSet,
    bookmarks,
    activeNodeId: null,
    breadcrumbPath: '~'
  });

  // Initialize UI modules
  const treeContainer = document.getElementById('tree-container');
  const contentBody = document.getElementById('content-body');
  const breadcrumbEl = document.getElementById('breadcrumb');
  const promptPath = document.getElementById('prompt-path');

  initTree(treeContainer);
  initContent(contentBody, breadcrumbEl, promptPath);

  // Initialize search
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const searchResults = document.getElementById('search-results');
  initSearch(searchInput, searchClear, treeContainer, searchResults);

  // Initialize commands
  const commandInput = document.getElementById('command-input');
  const commandOutput = document.getElementById('command-output');
  initCommands(commandInput, commandOutput);

  // Set prompt
  const promptEl = document.getElementById('terminal-prompt');
  if (promptEl) {
    promptEl.innerHTML = createPromptHTML(username);
  }

  // Set username display
  const userDisplay = document.getElementById('user-display');
  if (userDisplay) {
    userDisplay.textContent = username;
  }

  // Mobile sidebar toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay?.classList.toggle('active');
    });

    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+K → focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      focusSearch();
    }
    // Escape → exit focus mode
    if (e.key === 'Escape') {
      const { focusMode } = getState();
      if (focusMode) {
        toggleFocusMode();
        document.body.classList.remove('focus-mode');
      }
    }
  });

  // Smooth load
  document.body.style.opacity = '1';
}

// Start app
document.addEventListener('DOMContentLoaded', init);
