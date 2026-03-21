// ===== ANANT_OS PORTFOLIO LANDING LOGIC =====
import { setUsername } from '../utils/storage.js';
import { logUserVisit } from './modules/analytics.js';

const bootOverlay = document.getElementById('boot-overlay');
const termOutput = document.getElementById('term-output');
const termInput = document.getElementById('term-input');
const portfolioContainer = document.querySelector('.portfolio-container');

let isAwaitingUsername = false;

// Boot Sequence timings
const BOOT_DELAY = 1000;
const BOOT_STEPS = [
  { id: 'boot-1', delay: 400 },
  { id: 'boot-2', delay: 800 },
  { id: 'boot-3', delay: 1400 },
  { id: 'boot-4', delay: 1800 },
  { id: 'boot-5', delay: 2000 },
  { id: 'boot-6', delay: 2600 },
  { id: 'boot-7', delay: 3400, action: hideBootOverlay }
];

document.addEventListener('DOMContentLoaded', () => {
  // Start Boot Sequence
  setTimeout(runBootSequence, BOOT_DELAY);

  // Setup Terminal Input
  if (termInput) {
    termInput.addEventListener('keydown', handleCommand);
    
    // Focus input when clicking anywhere on the terminal side
    const termSide = document.querySelector('.portfolio-left');
    if (termSide) {
      termSide.addEventListener('click', () => termInput.focus());
    }
  }

  // Quick Launch Button
  const quickLaunchBtn = document.getElementById('quick-launch-btn');
  if (quickLaunchBtn) {
    quickLaunchBtn.addEventListener('click', () => {
      // Provide visual feedback in the terminal before execution
      termInput.value = 'launch app';
      executeCommand('launch app');
      termInput.value = '';
    });
  }

  // Action links setup
  document.addEventListener('click', (e) => {
    if (e.target.matches('.action-link')) {
      const cmd = e.target.dataset.cmd;
      if (cmd) {
        termInput.value = cmd;
        executeCommand(cmd);
      }
    }
    
    if (e.target.matches('.module-folder')) {
      const nextSibling = e.target.nextElementSibling;
      if (nextSibling && nextSibling.classList.contains('module-children')) {
        nextSibling.classList.toggle('open');
      }
    }
  });
});

function runBootSequence() {
  BOOT_STEPS.forEach(step => {
    setTimeout(() => {
      const el = document.getElementById(step.id);
      if (el) el.classList.add('visible');
      if (step.action) step.action();
    }, step.delay);
  });
}

function hideBootOverlay() {
  if (bootOverlay) {
    bootOverlay.classList.add('hidden');
    setTimeout(() => {
      bootOverlay.style.display = 'none';
      termInput.focus();
      printInitialMessage();
    }, 800);
  }
}

function printInitialMessage() {
  appendOutput("> Welcome to DevTerm.", 'info');
  appendOutput("> A terminal-themed developer knowledge system by Anant Rai.", 'info', 400);
  setTimeout(() => {
    const hint = document.createElement('div');
    hint.className = 'term-output-line info';
    hint.innerHTML = '<br>Type <button class="action-link" data-cmd="help">help</button> to see available commands or <button class="action-link" data-cmd="launch app">launch app</button> to enter the system.';
    termOutput.appendChild(hint);
    scrollToBottom();
  }, 1000);
}

function handleCommand(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const cmd = termInput.value.trim();
    
    if (cmd) {
      appendOutput(cmd, 'cmd');
      if (isAwaitingUsername) {
        processUsername(cmd);
      } else {
        executeCommand(cmd.toLowerCase());
      }
      termInput.value = '';
    }
  }
}

async function processUsername(username) {
  isAwaitingUsername = false;
  appendOutput('Authenticating...', 'info');
  setUsername(username);
  
  try {
     const res = await fetch('https://api.ipify.org?format=json');
     const data = await res.json();
     logUserVisit(username, data.ip);
  } catch (err) {
     logUserVisit(username, 'Unknown IP');
  }

  appendOutput(`Welcome aboard, ${username}. Establishing session...`, 'success');
  setTimeout(() => {
    document.body.style.opacity = '0';
    setTimeout(() => {
      window.location.href = 'app.html';
    }, 500);
  }, 800);
}

function executeCommand(cmd) {
  // Clean multiple spaces
  const cleanCmd = cmd.replace(/\\s+/g, ' ');

  switch (cleanCmd) {
    case 'whoami':
      appendOutput('Visitor exploring the knowledge base', 'success');
      break;
    case 'about':
      appendOutput('DevTerm is a friction-less, terminal-style knowledge platform where I structure and share my developer notes.', 'info');
      break;
    case 'author':
      appendOutput('Built by Anant Rai', 'system');
      appendOutput('GitHub: github.com/anant', 'info');
      appendOutput('LinkedIn: linkedin.com/anant', 'info');
      break;
    case 'ls topics':
      renderModules();
      break;
    case 'help':
      appendOutput('Available commands:', 'info');
      appendOutput('  - <button class="action-link" data-cmd="whoami">whoami</button>', 'system');
      appendOutput('  - <button class="action-link" data-cmd="about">about</button>', 'system');
      appendOutput('  - <button class="action-link" data-cmd="ls topics">ls topics</button>', 'system');
      appendOutput('  - <button class="action-link" data-cmd="author">author</button>', 'system');
      appendOutput('  - <button class="action-link" data-cmd="launch app">launch app</button>', 'success');
      appendOutput('  - <button class="action-link" data-cmd="clear">clear</button>', 'system');
      break;
    case 'clear':
      termOutput.innerHTML = '';
      break;
    case 'launch app':
      appendOutput('Initializing DevTerm Knowledge System...', 'system');
      appendOutput('> Please enter your requested username:', 'info');
      isAwaitingUsername = true;
      break;
    case 'admin':
    case 'su':
      appendOutput('Initiating root control sequence...', 'success');
      setTimeout(() => {
        document.body.style.opacity = '0';
        setTimeout(() => {
          window.location.href = 'admin.html';
        }, 300);
      }, 500);
      break;
    default:
      appendOutput(`Command not found: ${cmd}. Type 'help' for available commands.`, 'error');
  }
}

function appendOutput(html, type = 'info', delay = 0) {
  if (delay > 0) {
    setTimeout(() => {
      const line = document.createElement('div');
      line.className = `term-output-line ${type}`;
      line.innerHTML = html;
      termOutput.appendChild(line);
      scrollToBottom();
    }, delay);
  } else {
    const line = document.createElement('div');
    line.className = `term-output-line ${type}`;
    line.innerHTML = html;
    termOutput.appendChild(line);
    scrollToBottom();
  }
}

function scrollToBottom() {
  termOutput.scrollTop = termOutput.scrollHeight;
}

function renderModules() {
  const treeHtml = `
    <div class="module-tree">
      <div class="module-folder">📁 dbms/</div>
      <div class="module-children">
        <div class="module-file">Normalization</div>
        <div class="module-file">SQL Basics</div>
      </div>
      
      <div class="module-folder">📁 dsa/</div>
      <div class="module-children">
        <div class="module-file">Arrays</div>
        <div class="module-file">Linked List</div>
        <div class="module-file">Stack</div>
      </div>
      
      <div class="module-folder">📁 javascript/</div>
      <div class="module-children">
        <div class="module-file">Closures</div>
        <div class="module-file">Promises</div>
        <div class="module-file">Event Loop</div>
      </div>

      <div class="module-folder">📁 system-design/</div>
      <div class="module-children">
        <div class="module-file">Load Balancing</div>
        <div class="module-file">Caching</div>
        <div class="module-file">Databases</div>
      </div>
    </div>
    <div class="term-output-line info" style="font-size: 0.75rem; margin-top: 4px;">(Click a folder to expand/collapse)</div>
  `;
  appendOutput(treeHtml, 'info');
}
