// ===== CONTENT RENDERING MODULE =====
import { getState, subscribe, setActiveNode, expandPathTo, toggleBookmark, toggleFocusMode } from '../state.js';
import { buildPath, getAncestors, getChildren, escapeHtml } from '../../utils/helpers.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { setBookmarks } from '../../utils/storage.js';
import { logQuestionView } from './analytics.js';

let contentBody = null;
let breadcrumbEl = null;
let promptPathEl = null;

const ASCII_ART = `
 ____              _____                   
|  _ \\  _____   _|_   _|__ _ __ _ __ ___  
| | | |/ _ \\ \\ / / | |/ _ \\ '__| '_ \` _ \\ 
| |_| |  __/\\ V /  | |  __/ |  | | | | | |
|____/ \\___| \\_/   |_|\\___|_|  |_| |_| |_|
`;

/**
 * Initialize content module
 */
export function initContent(bodyEl, breadcrumb, promptPath) {
  contentBody = bodyEl;
  breadcrumbEl = breadcrumb;
  promptPathEl = promptPath;

  subscribe('activeNodeId', () => renderContent());
  
  showWelcome();
}

/**
 * Render the active node's content
 */
function renderContent() {
  const { activeNodeId, nodes } = getState();
  if (!activeNodeId || !contentBody) return;

  const node = nodes.find(n => n.id === activeNodeId);
  if (!node) return;

  updateBreadcrumb(node);

  if (promptPathEl) {
    promptPathEl.textContent = buildPath(node.id, nodes);
  }

  if (node.type === 'question') {
    logQuestionView(node.id);
    showTerminalLoading(node, () => renderQuestion(node));
  } else {
    renderFolder(node);
  }
}

/**
 * Terminal intelligence: show loading animation before content
 */
function showTerminalLoading(node, callback) {
  const { nodes } = getState();
  const path = buildPath(node.id, nodes).replace('~/', '');
  
  contentBody.innerHTML = `
    <div class="terminal-loading">
      <div class="terminal-loading-cmd">$ open ${escapeHtml(path)}</div>
      <div class="terminal-loading-status" id="loading-status">Loading...</div>
    </div>
  `;

  setTimeout(() => {
    const statusEl = document.getElementById('loading-status');
    if (statusEl) {
      statusEl.textContent = '✔ Loaded successfully';
      statusEl.className = 'terminal-loading-status success';
    }
    setTimeout(() => {
      callback();
    }, 250);
  }, 400);
}

/**
 * Render a question with structured sections
 */
function renderQuestion(node) {
  const { bookmarks } = getState();
  const isBookmarked = bookmarks.has(node.id);

  let html = `<div class="content-question">`;
  
  // Title bar with actions
  html += `
    <div class="content-title-bar">
      <h1 class="content-title">${escapeHtml(node.name)}</h1>
      <div class="content-actions">
        <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" id="content-bookmark" title="Toggle bookmark">
          ${isBookmarked ? '★' : '☆'} ${isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
        <button class="focus-toggle" id="content-focus-toggle" title="Toggle focus mode">
          ◱ Focus
        </button>
      </div>
    </div>
  `;

  // Render answers dynamically
  const answers = node.answers || (node.content || node.code ? [{ content: node.content, code: node.code, language: node.language }] : []);

  answers.forEach((ans, index) => {
    html += `<div class="answer-block-rendered" style="${index < answers.length - 1 ? 'margin-bottom: 2rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;' : ''}">`;
    
    // Description section
    if (ans.content) {
      html += `
        <div class="content-section">
          <div class="content-section-header">
            <span class="section-icon">📝</span> Description ${answers.length > 1 ? `(${index + 1})` : ''}
          </div>
          <div class="content-description">${escapeHtml(ans.content)}</div>
        </div>
      `;
    }
    
    // Code section
    if (ans.code) {
      const lang = ans.language || 'plaintext';
      html += `
        <div class="content-section">
          <div class="content-section-header">
            <span class="section-icon">💻</span> Code
          </div>
          <div class="code-block-wrapper">
            <div class="code-block-header">
              <span class="code-block-lang">${escapeHtml(lang)}</span>
              <button class="code-block-copy" data-answer-index="${index}">
                <span>⎘</span> Copy
              </button>
            </div>
            <div class="code-block-body">
              <pre><code class="language-${lang}">${escapeHtml(ans.code)}</code></pre>
            </div>
          </div>
        </div>
      `;
    }
    html += `</div>`;
  });

  // Render Sub-questions if any natively
  const { nodes } = getState();
  const children = getChildren(node.id, nodes);
  const subQuestions = children.filter(c => c.type === 'question');
  
  if (subQuestions.length > 0) {
    html += `<div class="sub-questions-container" style="margin-top: 3rem; border-top: 2px dashed var(--border-color); padding-top: 2rem;">`;
    html += `<h2 style="margin-bottom: 1.5rem; color: var(--text-color); font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px;">📄 Sub-questions</h2>`;
    
    subQuestions.forEach(child => {
      html += `<details class="sub-question-block" style="margin-bottom: 1rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: 6px; background: rgba(0,0,0,0.2);">`;
      html += `<summary style="color: var(--primary-color); font-size: 1.1rem; font-weight: bold; cursor: pointer; outline: none; transition: color 0.2s;">
                 ${escapeHtml(child.name)}
               </summary>`;
               
      html += `<div class="sub-question-content" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);">`;
      
      const childAnswers = child.answers || (child.content || child.code ? [{ content: child.content, code: child.code, language: child.language }] : []);

      childAnswers.forEach((ans, index) => {
        html += `<div class="answer-block-rendered" style="${index < childAnswers.length - 1 ? 'margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;' : ''}">`;
        
        if (ans.content) {
          html += `
            <div class="content-section">
              <div class="content-section-header" style="font-size: 0.85rem; padding: 4px 0;">
                <span class="section-icon">📝</span> Description ${childAnswers.length > 1 ? `(${index + 1})` : ''}
              </div>
              <div class="content-description" style="font-size: 0.95rem;">${escapeHtml(ans.content)}</div>
            </div>
          `;
        }
        
        if (ans.code) {
          const lang = ans.language || 'plaintext';
          html += `
            <div class="content-section">
              <div class="content-section-header" style="font-size: 0.85rem; padding: 4px 0;">
                <span class="section-icon">💻</span> Code
              </div>
              <div class="code-block-wrapper">
                <div class="code-block-header">
                  <span class="code-block-lang">${escapeHtml(lang)}</span>
                  <button class="code-block-copy" data-child-id="${child.id}" data-child-answer-index="${index}">
                    <span>⎘</span> Copy
                  </button>
                </div>
                <div class="code-block-body">
                  <pre><code class="language-${lang}">${escapeHtml(ans.code)}</code></pre>
                </div>
              </div>
            </div>
          `;
        }
        html += `</div>`;
      });
      
      html += `</div></details>`;
    });
    
    html += `</div>`;
  }


  html += `</div>`;
  contentBody.innerHTML = html;

  // Attach copy listeners
  const copyBtns = contentBody.querySelectorAll('.code-block-copy');
  copyBtns.forEach(copyBtn => {
    copyBtn.addEventListener('click', async () => {
      // Primary answers code copy
      const indexAttr = copyBtn.getAttribute('data-answer-index');
      if (indexAttr !== null) {
        const ans = answers[indexAttr];
        if (!ans || !ans.code) return;
        
        const success = await copyToClipboard(ans.code);
        if (success) {
          copyBtn.innerHTML = '<span>✓</span> Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.innerHTML = '<span>⎘</span> Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        }
        return;
      }
      
      // Sub-question code copy
      const childId = copyBtn.getAttribute('data-child-id');
      const childIndex = copyBtn.getAttribute('data-child-answer-index');
      if (childId !== null && childIndex !== null) {
        const targetNode = nodes.find(n => n.id === childId);
        if (!targetNode) return;
        
        const cAnswers = targetNode.answers || (targetNode.content || targetNode.code ? [{ content: targetNode.content, code: targetNode.code, language: targetNode.language }] : []);
        const ans = cAnswers[childIndex];
        
        if (!ans || !ans.code) return;
        
        const success = await copyToClipboard(ans.code);
        if (success) {
          copyBtn.innerHTML = '<span>✓</span> Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.innerHTML = '<span>⎘</span> Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        }
      }
    });
  });

  // Bookmark button
  const bookmarkBtn = document.getElementById('content-bookmark');
  if (bookmarkBtn) {
    bookmarkBtn.addEventListener('click', () => {
      toggleBookmark(node.id);
      // Re-render to update button state
      setTimeout(() => renderQuestion(node), 50);
    });
  }

  // Focus mode button
  const focusBtn = document.getElementById('content-focus-toggle');
  if (focusBtn) {
    focusBtn.addEventListener('click', () => {
      toggleFocusMode();
      document.body.classList.toggle('focus-mode');
    });
  }

  // Highlight code
  if (window.hljs) {
    contentBody.querySelectorAll('pre code').forEach(block => {
      window.hljs.highlightElement(block);
    });
  }
}

/**
 * Render a folder overview
 */
function renderFolder(node) {
  const { nodes } = getState();
  const children = getChildren(node.id, nodes);
  const folders = children.filter(c => c.type === 'folder');
  const questions = children.filter(c => c.type === 'question');

  let html = `<div class="content-question">`;
  html += `<h1 class="content-title">📁 ${escapeHtml(node.name)}</h1>`;
  html += `<div class="content-description">`;

  if (folders.length > 0) {
    html += `📂 Subfolders (${folders.length}):\n`;
    folders.forEach(f => {
      html += `  └─ ${escapeHtml(f.name)}\n`;
    });
    html += '\n';
  }

  if (questions.length > 0) {
    html += `📄 Questions (${questions.length}):\n`;
    questions.forEach(q => {
      html += `  └─ ${escapeHtml(q.name)}\n`;
    });
  }

  if (children.length === 0) {
    html += 'This folder is empty.';
  }

  html += `</div></div>`;
  contentBody.innerHTML = html;
}

/**
 * Update breadcrumb — clickable segments
 */
function updateBreadcrumb(node) {
  if (!breadcrumbEl) return;
  const { nodes } = getState();
  const ancestors = getAncestors(node.id, nodes);

  breadcrumbEl.innerHTML = '';

  // Root ~
  const rootSpan = document.createElement('span');
  rootSpan.className = 'breadcrumb-segment';
  rootSpan.textContent = '~';
  rootSpan.addEventListener('click', () => showWelcome());
  breadcrumbEl.appendChild(rootSpan);

  // Ancestors
  ancestors.forEach(a => {
    const sep = document.createElement('span');
    sep.className = 'breadcrumb-separator';
    sep.textContent = '/';
    breadcrumbEl.appendChild(sep);

    const seg = document.createElement('span');
    seg.className = 'breadcrumb-segment';
    seg.textContent = a.name;
    seg.addEventListener('click', () => {
      expandPathTo(a.id, nodes);
      setActiveNode(a.id);
    });
    breadcrumbEl.appendChild(seg);
  });

  // Current node
  const sep = document.createElement('span');
  sep.className = 'breadcrumb-separator';
  sep.textContent = '/';
  breadcrumbEl.appendChild(sep);

  const active = document.createElement('span');
  active.className = 'breadcrumb-active';
  active.textContent = node.name;
  breadcrumbEl.appendChild(active);
}

/**
 * Show welcome
 */
function showWelcome() {
  if (!contentBody) return;
  const { username } = getState();
  
  contentBody.innerHTML = `
    <div class="welcome-screen">
      <pre class="welcome-ascii">${ASCII_ART}</pre>
      <h2 class="welcome-title">Welcome back, ${escapeHtml(username || 'dev')}!</h2>
      <p class="welcome-subtitle">
        Select a topic from the explorer to begin.<br>
        Type commands below or use <kbd style="border: 1px solid var(--border-color); padding: 1px 6px; border-radius: 3px; font-size: 0.75rem;">Ctrl+K</kbd> to search.
      </p>
    </div>
  `;
}

export { showWelcome };
