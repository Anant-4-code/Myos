// ===== SEARCH MODULE =====
import { getState, setActiveNode, expandPathTo, subscribe } from '../state.js';
import { buildPath, escapeHtml, getAncestors } from '../../utils/helpers.js';
import { debounce } from '../../utils/helpers.js';

let searchInput = null;
let searchClear = null;
let treeContainer = null;
let resultsContainer = null;
let originalTreeContent = '';

/**
 * Initialize search
 */
export function initSearch(inputEl, clearEl, treeEl, resultsEl) {
  searchInput = inputEl;
  searchClear = clearEl;
  treeContainer = treeEl;
  resultsContainer = resultsEl;

  if (!searchInput) return;

  const debouncedSearch = debounce(performSearch, 200);

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    searchClear.classList.toggle('visible', query.length > 0);
    
    if (query.length === 0) {
      clearSearch();
      return;
    }
    debouncedSearch(query);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    clearSearch();
    searchInput.focus();
  });

  // Keyboard shortcut: Escape to clear
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchClear.classList.remove('visible');
      clearSearch();
      searchInput.blur();
    }
    if (e.key === 'Enter') {
      // Select first result
      const firstResult = resultsContainer?.querySelector('.search-result-item');
      if (firstResult) firstResult.click();
    }
  });
}

/**
 * Focus the search input (called from keyboard shortcut)
 */
export function focusSearch() {
  if (searchInput) {
    searchInput.focus();
    searchInput.select();
  }
}

/**
 * Perform search
 */
function performSearch(query) {
  const { nodes } = getState();
  const lowerQuery = query.toLowerCase();
  
  const results = nodes.filter(node => {
    const nameMatch = node.name.toLowerCase().includes(lowerQuery);
    const contentMatch = node.content && node.content.toLowerCase().includes(lowerQuery);
    const codeMatch = node.code && node.code.toLowerCase().includes(lowerQuery);
    return nameMatch || contentMatch || codeMatch;
  });

  // Sort: name matches first, then content matches
  results.sort((a, b) => {
    const aName = a.name.toLowerCase().includes(lowerQuery) ? 0 : 1;
    const bName = b.name.toLowerCase().includes(lowerQuery) ? 0 : 1;
    return aName - bName;
  });

  renderResults(results, query);
}

/**
 * Render search results
 */
function renderResults(results, query) {
  if (!resultsContainer) return;

  // Hide tree, show results
  if (treeContainer) treeContainer.style.display = 'none';
  resultsContainer.style.display = 'block';

  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        No results for "${escapeHtml(query)}"
      </div>
    `;
    return;
  }

  const { nodes } = getState();
  let html = `<div class="search-results">`;
  
  results.forEach(node => {
    const icon = node.type === 'folder' ? '📁' : '📄';
    const highlightedName = highlightMatch(node.name, query);
    const path = buildPath(node.id, nodes);
    
    html += `
      <div class="search-result-item" data-node-id="${node.id}">
        <span class="search-result-icon">${icon}</span>
        <span class="search-result-name">${highlightedName}</span>
        <span class="search-result-path">${escapeHtml(path)}</span>
      </div>
    `;
  });

  html += `</div>`;
  resultsContainer.innerHTML = html;

  // Add click listeners
  resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const nodeId = item.dataset.nodeId;
      expandPathTo(nodeId, nodes);
      setActiveNode(nodeId);
      
      // Clear search
      searchInput.value = '';
      searchClear.classList.remove('visible');
      clearSearch();
    });
  });
}

/**
 * Highlight matching text
 */
function highlightMatch(text, query) {
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return escapeHtml(text).replace(regex, '<mark>$1</mark>');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Clear search and restore tree
 */
function clearSearch() {
  if (treeContainer) treeContainer.style.display = 'block';
  if (resultsContainer) {
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
  }
}
