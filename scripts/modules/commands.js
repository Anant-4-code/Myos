// ===== COMMAND LAYER MODULE =====
import { getState, setActiveNode, toggleExpanded, expandPathTo, toggleBookmark, addCommandToHistory } from '../state.js';
import { getChildren, buildPath, escapeHtml, getRoots } from '../../utils/helpers.js';
import { showToast } from '../../utils/clipboard.js';
import { setBookmarks } from '../../utils/storage.js';

let commandInput = null;
let commandOutput = null;
let currentPath = null; // current "directory" nodeId (null = root)

const COMMANDS = {
  help: '  cd <folder>     Navigate into a folder\n  ls               List contents of current directory\n  open <name>      Open a question by name\n  search <query>   Search all content\n  bookmark         Toggle bookmark on current item\n  clear            Clear terminal output\n  pwd              Print current path\n  back             Go to parent folder\n  help             Show this help message'
};

/**
 * Initialize command module
 */
export function initCommands(inputEl, outputEl) {
  commandInput = inputEl;
  commandOutput = outputEl;
  currentPath = null;

  if (!commandInput) return;

  commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = commandInput.value.trim();
      if (cmd) {
        executeCommand(cmd);
        addCommandToHistory(cmd);
        commandInput.value = '';
      }
    }
    // Command history navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateHistory(-1);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateHistory(1);
    }
  });

  // Close button for output panel
  const closeBtn = document.getElementById('command-output-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      handleClear();
    });
  }

  // Help hint button
  const helpBtn = document.getElementById('command-help-btn');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      appendOutput('$ help', 'cmd');
      showOutput();
      appendOutput('Available commands:', 'info');
      COMMANDS.help.split('\n').forEach(line => appendOutput(line, 'info'));
      commandInput.focus();
    });
  }
}

/**
 * Navigate command history
 */
function navigateHistory(direction) {
  const { commandHistory, commandHistoryIndex } = getState();
  if (commandHistory.length === 0) return;
  
  let newIndex = commandHistoryIndex + direction;
  newIndex = Math.max(0, Math.min(newIndex, commandHistory.length));
  
  const state = getState();
  state.commandHistoryIndex = newIndex;
  
  if (newIndex < commandHistory.length) {
    commandInput.value = commandHistory[newIndex];
  } else {
    commandInput.value = '';
  }
}

/**
 * Execute a command
 */
function executeCommand(rawCmd) {
  const parts = rawCmd.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  // Show the command in output
  appendOutput(`$ ${rawCmd}`, 'cmd');
  showOutput();

  switch (cmd) {
    case 'cd':
      handleCd(args);
      break;
    case 'ls':
      handleLs();
      break;
    case 'open':
      handleOpen(args);
      break;
    case 'search':
      handleSearch(args);
      break;
    case 'clear':
      handleClear();
      break;
    case 'help':
      appendOutput('Available commands:', 'info');
      COMMANDS.help.split('\n').forEach(line => appendOutput(line, 'info'));
      break;
    case 'pwd':
      handlePwd();
      break;
    case 'back':
      handleBack();
      break;
    case 'bookmark':
      handleBookmark();
      break;
    case 'admin':
    case 'su':
      appendOutput('Redirecting to admin panel...', 'success');
      setTimeout(() => {
        window.location.href = 'admin.html';
      }, 400);
      break;
    default:
      appendOutput(`Command not found: ${cmd}. Type 'help' for available commands.`, 'error');
  }
}

/**
 * cd <folder> — navigate into a folder
 */
function handleCd(folderName) {
  if (!folderName) {
    currentPath = null;
    appendOutput('Navigated to root ~', 'success');
    return;
  }

  if (folderName === '..' || folderName === 'back') {
    handleBack();
    return;
  }

  const { nodes } = getState();
  const children = currentPath ? getChildren(currentPath, nodes) : nodes.filter(n => n.parentId === null);
  
  // Fuzzy match folder name
  const folder = children.find(n => 
    n.type === 'folder' && n.name.toLowerCase().includes(folderName.toLowerCase())
  );

  if (!folder) {
    // Try global search
    const globalMatch = nodes.find(n => 
      n.type === 'folder' && n.name.toLowerCase().includes(folderName.toLowerCase())
    );
    if (globalMatch) {
      currentPath = globalMatch.id;
      expandPathTo(globalMatch.id, nodes);
      toggleExpanded(globalMatch.id);
      setActiveNode(globalMatch.id);
      appendOutput(`Navigated to ${buildPath(globalMatch.id, nodes)}`, 'success');
      return;
    }
    appendOutput(`Folder not found: ${folderName}`, 'error');
    return;
  }

  currentPath = folder.id;
  expandPathTo(folder.id, nodes);
  if (!getState().expandedSet.has(folder.id)) {
    toggleExpanded(folder.id);
  }
  setActiveNode(folder.id);
  appendOutput(`Navigated to ${buildPath(folder.id, nodes)}`, 'success');
}

/**
 * ls — list contents
 */
function handleLs() {
  const { nodes } = getState();
  const children = currentPath ? getChildren(currentPath, nodes) : nodes.filter(n => n.parentId === null);

  if (children.length === 0) {
    appendOutput('(empty directory)', 'info');
    return;
  }

  children.forEach(child => {
    const prefix = child.type === 'folder' ? '📁' : '📄';
    const cssClass = child.type === 'folder' ? 'folder' : 'question';
    appendOutput(`  ${prefix} ${child.name}`, cssClass);
  });
}

/**
 * open <name> — open a question
 */
function handleOpen(name) {
  if (!name) {
    appendOutput('Usage: open <question name>', 'error');
    return;
  }

  const { nodes } = getState();
  
  // Search in current directory first, then globally
  let match = null;
  if (currentPath) {
    const children = getChildren(currentPath, nodes);
    match = children.find(n => n.name.toLowerCase().includes(name.toLowerCase()));
  }
  
  if (!match) {
    match = nodes.find(n => n.name.toLowerCase().includes(name.toLowerCase()));
  }

  if (!match) {
    appendOutput(`Not found: ${name}`, 'error');
    return;
  }

  expandPathTo(match.id, nodes);
  setActiveNode(match.id);
  appendOutput(`✔ Opened: ${match.name}`, 'success');
}

/**
 * search <query>
 */
function handleSearch(query) {
  if (!query) {
    appendOutput('Usage: search <query>', 'error');
    return;
  }

  const { nodes } = getState();
  const lowerQuery = query.toLowerCase();
  const results = nodes.filter(n => 
    n.name.toLowerCase().includes(lowerQuery) || 
    (n.content && n.content.toLowerCase().includes(lowerQuery))
  );

  if (results.length === 0) {
    appendOutput(`No results for: ${query}`, 'info');
    return;
  }

  appendOutput(`Found ${results.length} result(s):`, 'info');
  results.slice(0, 10).forEach(r => {
    const prefix = r.type === 'folder' ? '📁' : '📄';
    const cssClass = r.type === 'folder' ? 'folder' : 'question';
    appendOutput(`  ${prefix} ${r.name}`, cssClass);
  });
  if (results.length > 10) {
    appendOutput(`  ... and ${results.length - 10} more`, 'info');
  }
}

/**
 * pwd — print working directory
 */
function handlePwd() {
  const { nodes } = getState();
  const path = currentPath ? buildPath(currentPath, nodes) : '~';
  appendOutput(path, 'info');
}

/**
 * back — go to parent
 */
function handleBack() {
  const { nodes } = getState();
  if (!currentPath) {
    appendOutput('Already at root', 'info');
    return;
  }
  const current = nodes.find(n => n.id === currentPath);
  currentPath = current?.parentId || null;
  if (currentPath) {
    setActiveNode(currentPath);
    appendOutput(`Navigated to ${buildPath(currentPath, nodes)}`, 'success');
  } else {
    appendOutput('Navigated to root ~', 'success');
  }
}

/**
 * bookmark — toggle bookmark
 */
function handleBookmark() {
  const { activeNodeId, nodes, bookmarks } = getState();
  if (!activeNodeId) {
    appendOutput('No item selected. Select a question first.', 'error');
    return;
  }
  toggleBookmark(activeNodeId);
  const node = nodes.find(n => n.id === activeNodeId);
  const isNowBookmarked = !bookmarks.has(activeNodeId);
  
  // Persist
  const newBookmarks = new Set(bookmarks);
  if (isNowBookmarked) newBookmarks.add(activeNodeId);
  else newBookmarks.delete(activeNodeId);
  setBookmarks(newBookmarks);
  
  appendOutput(
    isNowBookmarked ? `★ Bookmarked: ${node?.name}` : `☆ Removed bookmark: ${node?.name}`,
    'success'
  );
}

/**
 * clear — clear output
 */
function handleClear() {
  if (commandOutput) {
    commandOutput.innerHTML = '';
    commandOutput.classList.remove('expanded');
  }
}

/**
 * Append a line to the command output
 */
function appendOutput(text, cssClass = 'info') {
  if (!commandOutput) return;
  const line = document.createElement('div');
  line.className = `command-output-line ${cssClass}`;
  line.textContent = text;
  commandOutput.appendChild(line);
  commandOutput.scrollTop = commandOutput.scrollHeight;
}

/**
 * Show the output panel
 */
function showOutput() {
  if (commandOutput) {
    commandOutput.classList.add('expanded');
  }
}
