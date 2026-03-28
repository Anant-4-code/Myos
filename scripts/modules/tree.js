// ===== TREE RENDERING MODULE =====
import { getState, toggleExpanded, setActiveNode, toggleBookmark, subscribe } from '../state.js';
import { getChildren, escapeHtml, countDescendants } from '../../utils/helpers.js';
import { setExpandedNodes, setBookmarks } from '../../utils/storage.js';

let treeContainer = null;
let isAdminMode = false;
let onAdminEdit = null;
let onAdminDelete = null;
let onAdminDuplicate = null;

/**
 * Initialize tree module
 */
export function initTree(containerEl, options = {}) {
  treeContainer = containerEl;
  isAdminMode = options.admin || false;
  onAdminEdit = options.onEdit || null;
  onAdminDelete = options.onDelete || null;
  onAdminDuplicate = options.onDuplicate || null;

  subscribe('expandedSet', () => {
    renderFullTree();
    setExpandedNodes(getState().expandedSet);
  });
  subscribe('activeNodeId', () => renderFullTree());
  subscribe('bookmarks', () => {
    renderFullTree();
    setBookmarks(getState().bookmarks);
  });
  subscribe('nodes', () => renderFullTree());

  renderFullTree();
}

/**
 * Re-render the entire tree
 */
export function renderFullTree(filterFunc = null) {
  if (!treeContainer) return;
  const { nodes } = getState();
  treeContainer.innerHTML = '';

  const roots = nodes.filter(n => n.parentId === null);
  roots.sort(sortNodes);

  roots.forEach(node => {
    const el = createNodeElement(node, 0, filterFunc);
    if (el) treeContainer.appendChild(el);
  });

  if (roots.length === 0) {
    treeContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📁</div>
        <div>No content yet</div>
      </div>
    `;
  }
}

/**
 * Create a single tree node DOM element (recursive)
 */
function createNodeElement(node, depth, filterFunc = null) {
  if (filterFunc && !filterFunc(node)) return null;
  const { nodes, expandedSet, activeNodeId, bookmarks } = getState();
  const isFolder = node.type === 'folder';
  const isExpanded = expandedSet.has(node.id);
  const isActive = activeNodeId === node.id;
  const isBookmarked = bookmarks.has(node.id);
  const children = getChildren(node.id, nodes).sort(sortNodes);
  const hasChildren = children.length > 0;

  const el = document.createElement('div');
  el.className = 'tree-node';
  el.dataset.nodeId = node.id;

  // Row
  const row = document.createElement('div');
  row.className = `tree-node-row${isActive ? ' active' : ''}`;
  row.style.paddingLeft = `${20 + depth * 18}px`;

  // Expand icon (for folders or questions that can have children)
  const expandIcon = document.createElement('span');
  expandIcon.className = `tree-node-icon${isExpanded ? ' expanded' : ''}`;
  if (isFolder || hasChildren) {
    expandIcon.textContent = '▶';
  } else {
    expandIcon.textContent = '';
    expandIcon.style.width = '16px';
  }
  row.appendChild(expandIcon);

  // Type icon
  const typeIcon = document.createElement('span');
  typeIcon.className = `tree-node-type-icon ${isFolder ? 'folder' : 'question'}`;
  typeIcon.textContent = isFolder ? '📁' : '📄';
  row.appendChild(typeIcon);

  // Name
  const nameSpan = document.createElement('span');
  nameSpan.className = 'tree-node-name';
  nameSpan.textContent = node.name;
  row.appendChild(nameSpan);

  // Bookmark star (not in admin mode)
  if (!isAdminMode) {
    const star = document.createElement('span');
    star.className = `bookmark-star${isBookmarked ? ' active' : ''}`;
    star.textContent = isBookmarked ? '★' : '☆';
    star.title = isBookmarked ? 'Remove bookmark' : 'Bookmark';
    star.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBookmark(node.id);
    });
    row.appendChild(star);
  }

  // Child count for folders
  if (isFolder && hasChildren) {
    const count = document.createElement('span');
    count.className = 'node-count';
    count.textContent = `(${countDescendants(node.id, nodes)})`;
    row.appendChild(count);
  }

  // Admin actions
  if (isAdminMode) {
    const actions = document.createElement('div');
    actions.className = 'admin-node-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'admin-node-btn edit';
    editBtn.textContent = '✎';
    editBtn.title = 'Edit';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onAdminEdit) onAdminEdit(node);
    });

    const dupBtn = document.createElement('button');
    dupBtn.className = 'admin-node-btn duplicate';
    dupBtn.textContent = '⧉';
    dupBtn.title = 'Duplicate';
    dupBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onAdminDuplicate) onAdminDuplicate(node);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'admin-node-btn delete';
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onAdminDelete) onAdminDelete(node);
    });

    actions.appendChild(editBtn);
    actions.appendChild(dupBtn);
    actions.appendChild(deleteBtn);
    row.appendChild(actions);
  }

  // Click handler
  row.addEventListener('click', () => {
    if (isFolder || hasChildren) {
      toggleExpanded(node.id);
    }
    setActiveNode(node.id);
    
    // In Admin Mode, also trigger the edit panel
    if (isAdminMode && onAdminEdit) {
      onAdminEdit(node);
    }
  });

  el.appendChild(row);

  // Children container
  if (hasChildren) {
    const childContainer = document.createElement('div');
    childContainer.className = `tree-node-children${isExpanded ? '' : ' collapsed'}`;
    
    children.forEach(child => {
      const childEl = createNodeElement(child, depth + 1, filterFunc);
      if (childEl) childContainer.appendChild(childEl);
    });
    
    if (isExpanded) {
      requestAnimationFrame(() => {
        childContainer.style.maxHeight = childContainer.scrollHeight + 'px';
      });
    }
    
    el.appendChild(childContainer);
  }

  return el;
}

/**
 * Sort: folders first, then alphabetical
 */
function sortNodes(a, b) {
  if (a.type === 'folder' && b.type !== 'folder') return -1;
  if (a.type !== 'folder' && b.type === 'folder') return 1;
  return a.name.localeCompare(b.name);
}
