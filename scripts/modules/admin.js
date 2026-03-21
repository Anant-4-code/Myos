// ===== ADMIN MODULE =====
import { getState, setState, setActiveNode } from '../state.js';
import { fetchContentFromServer, saveContentToServer, getContentData, setContentData, isAdminAuthenticated, setAdminAuthenticated, loginAdmin } from '../../utils/storage.js';
import { generateId, getDescendants, escapeHtml, getChildren } from '../../utils/helpers.js';
import { initTree, renderFullTree } from './tree.js';
import { showToast } from '../../utils/clipboard.js';
import { getOverviewMetrics, getUserTableData, getTopContent } from './analytics.js';

const ADMIN_PASSWORD = 'admin123';

let editorPanel = null;
let treeContainer = null;
let currentTab = 'editor';
let currentSearch = '';
let currentFilter = 'all';

/**
 * Initialize admin panel
 */
export function initAdmin() {
  const gateEl = document.getElementById('admin-gate');
  const dashboardEl = document.getElementById('admin-dashboard');

  if (isAdminAuthenticated()) {
    showDashboard(gateEl, dashboardEl);
  } else {
    setupGate(gateEl, dashboardEl);
  }
}

/**
 * Setup password gate
 */
function setupGate(gateEl, dashboardEl) {
  const form = document.getElementById('admin-login-form');
  const input = document.getElementById('admin-password');
  const error = document.getElementById('admin-error');

  if (input) setTimeout(() => input.focus(), 300);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pwd = input.value.trim();
      const success = await loginAdmin(pwd);
      if (success) {
        showDashboard(gateEl, dashboardEl);
      } else {
        error.textContent = '> Access denied. Invalid password.';
        error.classList.add('visible');
        input.value = '';
        input.focus();
      }
    });
  }
}

/**
 * Show admin dashboard
 */
function showDashboard(gateEl, dashboardEl) {
  if (gateEl) gateEl.style.display = 'none';
  if (dashboardEl) dashboardEl.style.display = 'flex';

  editorPanel = document.getElementById('editor-panel');
  treeContainer = document.getElementById('admin-tree-container');

  // Load data
  loadData();

  // Init tree with admin mode
  initTree(treeContainer, {
    admin: true,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate
  });

  // Setup toolbar buttons
  document.getElementById('btn-add-folder')?.addEventListener('click', () => showAddForm('folder'));
  document.getElementById('btn-add-question')?.addEventListener('click', () => showAddForm('question'));
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    setAdminAuthenticated(false);
    window.location.reload();
  });

  // Setup tabs
  document.getElementById('tab-editor-btn')?.addEventListener('click', () => switchTab('editor'));
  document.getElementById('tab-analytics-btn')?.addEventListener('click', () => switchTab('analytics'));

  // Setup search & filters
  document.getElementById('admin-search-input')?.addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase();
    applyFilters();
  });

  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      applyFilters();
    });
  });

  showEditorWelcome();
}

/**
 * Switch between Editor and Analytics tabs
 */
function switchTab(tab) {
  currentTab = tab;
  const editorView = document.getElementById('view-editor');
  const analyticsView = document.getElementById('view-analytics');
  const editorBtn = document.getElementById('tab-editor-btn');
  const analyticsBtn = document.getElementById('tab-analytics-btn');

  if (tab === 'editor') {
    editorView.style.display = 'flex';
    analyticsView.style.display = 'none';
    editorBtn.classList.add('active');
    analyticsBtn.classList.remove('active');
  } else {
    editorView.style.display = 'none';
    analyticsView.style.display = 'block';
    editorBtn.classList.remove('active');
    analyticsBtn.classList.add('active');
    renderAnalytics();
  }
}

/**
 * Apply search and filters to the tree
 */
function applyFilters() {
  const { nodes } = getState();
  
  // Define visibility check
  const isVisible = (node) => {
    // Search match
    const searchMatch = !currentSearch || node.name.toLowerCase().includes(currentSearch);
    
    // Category/Type Filter match
    let filterMatch = true;
    if (currentFilter === 'folder') filterMatch = node.type === 'folder';
    if (currentFilter === 'question') filterMatch = node.type === 'question';
    if (currentFilter === 'easy') filterMatch = node.tags && node.tags.includes('Easy');
    if (currentFilter === 'code') {
      const answers = node.answers || (node.code ? [{code: node.code}] : []);
      filterMatch = answers.some(a => a.code && a.code.trim().length > 0);
    }

    if (searchMatch && filterMatch) return true;

    // Show if any descendant matches (to maintain tree context)
    const descendants = getDescendants(node.id, nodes);
    return descendants.some(d => {
      const dSearchMatch = !currentSearch || d.name.toLowerCase().includes(currentSearch);
      let dFilterMatch = true;
      if (currentFilter === 'folder') dFilterMatch = d.type === 'folder';
      if (currentFilter === 'question') dFilterMatch = d.type === 'question';
      if (currentFilter === 'easy') dFilterMatch = d.tags && d.tags.includes('Easy');
      if (currentFilter === 'code') {
        const dAns = d.answers || (d.code ? [{code: d.code}] : []);
        dFilterMatch = dAns.some(a => dAns.some(ans => ans.code && ans.code.trim().length > 0));
      }
      return dSearchMatch && dFilterMatch;
    });
  };

  // We need to tell tree.js to use this filter
  // For now, we'll manually filter roots and call tree.js recursively?
  // Actually, let's just update tree.js to accept a filter function.
  renderFullTree(isVisible);
}

/**
 * Render the Analytics Dashboard
 */
async function renderAnalytics() {
  const container = document.getElementById('view-analytics');
  container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted);">Loading analytics...</div>';
  const [metrics, users, topContent] = await Promise.all([
    getOverviewMetrics(),
    getUserTableData(),
    getTopContent()
  ]);
  const { nodes } = getState();

  let html = `
    <div class="analytics-grid">
      <div class="analytics-card">
        <span class="analytics-card-label">Total Users</span>
        <span class="analytics-card-value">${metrics.totalUsers}</span>
      </div>
      <div class="analytics-card">
        <span class="analytics-card-label">Active Today</span>
        <span class="analytics-card-value">${metrics.activeToday}</span>
      </div>
      <div class="analytics-card">
        <span class="analytics-card-label">Questions Viewed</span>
        <span class="analytics-card-value">${metrics.totalViews}</span>
      </div>
    </div>

    <div class="analytics-grid" style="grid-template-columns: 2fr 1fr;">
      <!-- User Table -->
      <div class="analytics-section">
        <h3 class="analytics-section-title">👤 User Activity</h3>
        <div class="analytics-table-wrapper">
          <table class="analytics-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Visits</th>
                <th>Last Seen</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td style="color: var(--accent-green); font-weight: 600;">${escapeHtml(u.username)}</td>
                  <td>${u.visits}</td>
                  <td>${formatTime(u.lastSeen)}</td>
                  <td style="font-family: monospace; font-size: 0.75rem; color: var(--text-muted);">${u.ip}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Top Content -->
      <div class="analytics-section">
        <h3 class="analytics-section-title">📄 Top Content</h3>
        <div class="analytics-table-wrapper">
          <table class="analytics-table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              ${topContent.slice(0, 10).map(item => {
                const node = nodes.find(n => n.id === item.id);
                return `
                  <tr>
                    <td>${escapeHtml(node?.name || item.id)}</td>
                    <td><span class="tag-viewed">${item.views} views</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function formatTime(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' hrs ago';
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Load content data
 */
async function loadData() {
  try {
    const nodes = await fetchContentFromServer();
    if (nodes && nodes.length > 0) {
      setState({ nodes });
    } else {
      // Fallback to localStorage cache
      const cached = getContentData();
      setState({ nodes: cached || [] });
    }
  } catch (err) {
    console.error('Failed to load data:', err);
    const cached = getContentData();
    setState({ nodes: cached || [] });
  }
}

/**
 * Show welcome message in editor
 */
function showEditorWelcome() {
  if (!editorPanel) return;
  editorPanel.innerHTML = `
    <div class="empty-state" style="height: 100%;">
      <div class="empty-state-icon">⚡</div>
      <div>Select a node to edit, or create a new one</div>
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">
        Use the toolbar or click a node's edit/delete buttons
      </div>
    </div>
  `;
}

/**
 * Show the add form
 */
function showAddForm(type) {
  if (!editorPanel) return;
  const { nodes, activeNodeId } = getState();

  // Build parent options
  const folders = nodes.filter(n => n.type === 'folder' || n.type === 'question');
  let parentOptions = `<option value="">— Root Level —</option>`;
  folders.forEach(f => {
    const selected = f.id === activeNodeId ? 'selected' : '';
    const prefix = f.type === 'question' ? '📄 ' : '📁 ';
    parentOptions += `<option value="${f.id}" ${selected}>${prefix}${escapeHtml(f.name)}</option>`;
  });

  let html = `
    <div class="editor-section">
      <h3 class="editor-section-title">Add ${type === 'folder' ? '📁 Folder' : '📄 Question'}</h3>
      <form id="add-form">
        <div class="form-group">
          <label class="form-label">Parent Folder / Question</label>
          <select class="form-input form-select" id="add-parent">${parentOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Name</label>
          <input class="form-input" id="add-name" placeholder="${type === 'folder' ? 'Folder name...' : 'Question title...'}" required />
        </div>
  `;

  if (type === 'question') {
    html += `
        <div class="form-group" style="margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <label class="form-label" style="margin: 0;">Answers</label>
            <button type="button" class="btn btn-sm btn-secondary" id="add-answer-btn">+ Add Answer</button>
          </div>
          <div id="answers-container">
            ${getAnswerBlockHTML(0)}
          </div>
        </div>
    `;
  }


  html += `
        <div class="editor-actions">
          <button type="submit" class="btn btn-primary">⚡ Create</button>
          <button type="button" class="btn btn-secondary" id="add-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;

  editorPanel.innerHTML = html;

  if (type === 'question') {
    let answerCount = 1;
    document.getElementById('add-answer-btn')?.addEventListener('click', () => {
      const container = document.getElementById('answers-container');
      container.insertAdjacentHTML('beforeend', getAnswerBlockHTML(answerCount++));
    });
    document.getElementById('answers-container')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-remove-answer')) {
        e.target.closest('.answer-block').remove();
      }
    });
  }

  // Focus name input
  setTimeout(() => document.getElementById('add-name')?.focus(), 100);

  // Handle submit
  document.getElementById('add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newNode = {
      id: generateId(),
      parentId: document.getElementById('add-parent').value || null,
      type: type,
      name: document.getElementById('add-name').value.trim()
    };

    if (type === 'question') {
      newNode.answers = Array.from(document.querySelectorAll('.answer-block')).map(block => ({
        content: block.querySelector('.answer-content').value,
        code: block.querySelector('.answer-code').value,
        language: block.querySelector('.answer-language').value
      }));
    }

    if (!newNode.name) return;

    const { nodes } = getState();
    const updated = [...nodes, newNode];
    setState({ nodes: updated });
    saveContentToServer(updated);
    showToast(`${type === 'folder' ? 'Folder' : 'Question'} created!`, '✓');
    showEditorWelcome();
  });

  document.getElementById('add-cancel')?.addEventListener('click', showEditorWelcome);
}

/**
 * Handle editing a node
 */
function handleEdit(node) {
  if (!editorPanel) return;
  const { nodes } = getState();
  const folders = nodes.filter(n => (n.type === 'folder' || n.type === 'question') && n.id !== node.id);

  let parentOptions = `<option value="">— Root Level —</option>`;
  folders.forEach(f => {
    const selected = f.id === node.parentId ? 'selected' : '';
    const prefix = f.type === 'question' ? '📄 ' : '📁 ';
    parentOptions += `<option value="${f.id}" ${selected}>${prefix}${escapeHtml(f.name)}</option>`;
  });

  let html = `
    <div class="editor-section">
      <h3 class="editor-section-title">Edit ${node.type === 'folder' ? '📁 Folder' : '📄 Question'}</h3>
      <form id="edit-form">
        <div class="form-group">
          <label class="form-label">Parent Folder / Question</label>
          <select class="form-input form-select" id="edit-parent">${parentOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Name</label>
          <input class="form-input" id="edit-name" value="${escapeHtml(node.name)}" required />
        </div>
  `;

  if (node.type === 'question') {
    const answers = node.answers || (node.content || node.code ? [{ content: node.content, code: node.code, language: node.language }] : [{ content: '', code: '', language: 'plaintext' }]);
    
    html += `
        <div class="form-group" style="padding: 10px; background: rgba(0, 150, 255, 0.1); border: 1px dashed var(--primary-color); border-radius: 6px; margin-bottom: 15px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: var(--text-color); font-size: 0.9rem;">Want to nest another question inside this one?</p>
          <button type="button" class="btn btn-sm btn-primary" id="explicit-add-subquestion-btn">📄 Create Sub-Question</button>
        </div>

        <div class="form-group" style="margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <label class="form-label" style="margin: 0;">Answers</label>
            <button type="button" class="btn btn-sm btn-secondary" id="edit-answer-btn">+ Add Answer</button>
          </div>
          <div id="answers-container">
            ${answers.map((ans, i) => getAnswerBlockHTML(i, ans.content, ans.code, ans.language)).join('')}
          </div>
        </div>
    `;
  }

  html += `
        <div class="editor-actions">
          <button type="submit" class="btn btn-primary">💾 Save</button>
          <button type="button" class="btn btn-secondary" id="edit-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;

  editorPanel.innerHTML = html;

  if (node.type === 'question') {
    let answerCount = 999; // ensure unique keys
    document.getElementById('edit-answer-btn')?.addEventListener('click', () => {
      const container = document.getElementById('answers-container');
      container.insertAdjacentHTML('beforeend', getAnswerBlockHTML(answerCount++));
    });
    document.getElementById('answers-container')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-remove-answer')) {
        e.target.closest('.answer-block').remove();
      }
    });

    document.getElementById('explicit-add-subquestion-btn')?.addEventListener('click', () => {
      // Temporarily bypass the form logic to show the "Add" screen with this node as parent
      setActiveNode(node.id); // ensure it's selected
      showAddForm('question');
    });
  }

  document.getElementById('edit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const { nodes } = getState();
    const updated = nodes.map(n => {
      if (n.id !== node.id) return n;
      const modified = {
        ...n,
        parentId: document.getElementById('edit-parent').value || null,
        name: document.getElementById('edit-name').value.trim()
      };
      if (n.type === 'question') {
        modified.answers = Array.from(document.querySelectorAll('.answer-block')).map(block => ({
          content: block.querySelector('.answer-content').value,
          code: block.querySelector('.answer-code').value,
          language: block.querySelector('.answer-language').value
        }));
        delete modified.content;
        delete modified.code;
        delete modified.language;
      }
      return modified;
    });
    setState({ nodes: updated });
    saveContentToServer(updated);
    showToast('Changes saved!', '✓');
    showEditorWelcome();
  });

  document.getElementById('edit-cancel')?.addEventListener('click', showEditorWelcome);
}

/**
 * Handle deleting a node (with cascade confirmation)
 */
function handleDelete(node) {
  const { nodes } = getState();
  const descendants = getDescendants(node.id, nodes);
  const hasChildren = descendants.length > 0;

  // Show confirmation modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3 class="modal-title">⚠ Confirm Delete</h3>
      <p class="modal-text">
        Delete <strong>${escapeHtml(node.name)}</strong>?
        ${hasChildren ? `<br><br>This will also delete <strong>${descendants.length}</strong> child item(s).` : ''}
      </p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-danger" id="modal-confirm">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.getElementById('modal-confirm').addEventListener('click', () => {
    const idsToRemove = new Set([node.id, ...descendants.map(d => d.id)]);
    const updated = nodes.filter(n => !idsToRemove.has(n.id));
    setState({ nodes: updated, activeNodeId: null });
    saveContentToServer(updated);
    overlay.remove();
    showToast('Deleted successfully', '✓');
    showEditorWelcome();
  });
}

/**
 * Handle duplicating a node (with all descendants)
 */
function handleDuplicate(node) {
  const { nodes } = getState();

  // Build a map of old ID -> new ID
  const idMap = new Map();
  const allIds = [node.id];

  // Collect all descendants
  function collectDescendants(parentId) {
    nodes.filter(n => n.parentId === parentId).forEach(child => {
      allIds.push(child.id);
      collectDescendants(child.id);
    });
  }
  collectDescendants(node.id);

  // Generate new IDs for all
  allIds.forEach(oldId => {
    idMap.set(oldId, generateId());
  });

  // Clone all nodes, remapping IDs and parentIds
  const cloned = allIds.map(oldId => {
    const original = nodes.find(n => n.id === oldId);
    const clone = JSON.parse(JSON.stringify(original));
    clone.id = idMap.get(oldId);

    if (oldId === node.id) {
      // Root clone keeps same parent, rename with "(Copy)"
      clone.name = clone.name + ' (Copy)';
    } else {
      // Remap parentId
      clone.parentId = idMap.get(clone.parentId) || clone.parentId;
    }
    return clone;
  });

  const updated = [...nodes, ...cloned];
  setState({ nodes: updated });
  saveContentToServer(updated);
  showToast(`Duplicated "${node.name}" with ${cloned.length} item(s)`, '✓');
}

/**
 * Helper to generate HTML for a single answer block
 */
function getAnswerBlockHTML(index, content = '', code = '', language = 'plaintext') {
  return `
    <div class="answer-block" data-index="${index}" style="border: 1px solid var(--border-color); padding: 10px; margin-bottom: 10px; border-radius: 4px; position: relative;">
      <button type="button" class="btn-remove-answer" title="Remove answer" style="position: absolute; right: 10px; top: 10px; background: none; border: none; color: var(--danger-color); cursor: pointer; font-size: 1.2rem; padding: 2px;">✕</button>
      <div class="form-group">
        <label class="form-label">Content / Answer</label>
        <textarea class="form-input form-textarea answer-content" placeholder="Explanation...">${escapeHtml(content || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Code (optional)</label>
        <textarea class="form-input form-textarea answer-code" placeholder="Code snippet..." style="font-family: 'Fira Code', monospace; font-size: 0.8rem;">${escapeHtml(code || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Language</label>
        <select class="form-input form-select answer-language">
          ${['javascript','python','java','cpp','c','sql','html','css','typescript','go','rust','bash','plaintext']
            .map(l => `<option value="${l}" ${l === (language || 'plaintext') ? 'selected' : ''}>${l}</option>`)
            .join('')}
        </select>
      </div>
    </div>
  `;
}
