// ===== AUTH MODULE =====
import { getUsername, setUsername } from '../../utils/storage.js';
import { initMatrixRain } from './terminal.js';

/**
 * Initialize the landing page auth
 */
export function initAuth() {
  const usernameInput = document.getElementById('username-input');
  const submitBtn = document.getElementById('username-submit');
  const errorEl = document.getElementById('username-error');
  const form = document.getElementById('username-form');

  // Check if already authenticated
  const existing = getUsername();
  if (existing) {
    window.location.href = 'app.html';
    return;
  }

  // Start matrix rain
  initMatrixRain('matrix-canvas');

  // Focus input
  if (usernameInput) {
    setTimeout(() => usernameInput.focus(), 500);
  }

  // Handle submit
  function handleSubmit(e) {
    if (e) e.preventDefault();
    const name = usernameInput.value.trim();
    
    if (!name) {
      errorEl.textContent = '> Error: Username cannot be empty';
      errorEl.classList.add('visible');
      usernameInput.focus();
      return;
    }

    if (name.length > 20) {
      errorEl.textContent = '> Error: Username must be 20 characters or less';
      errorEl.classList.add('visible');
      return;
    }

    // Save and redirect
    setUsername(name);
    
    // Smooth transition
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.4s ease';
    setTimeout(() => {
      window.location.href = 'app.html';
    }, 400);
  }

  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  // Also handle Enter key
  if (usernameInput) {
    usernameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleSubmit(e);
      }
      // Clear error on typing
      errorEl.classList.remove('visible');
    });
  }
}
