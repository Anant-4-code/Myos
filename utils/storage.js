// ===== LOCAL STORAGE + API HELPERS =====

const STORAGE_KEYS = {
  USERNAME: 'devterm_username',
  CONTENT: 'devterm_content',
  EXPANDED: 'devterm_expanded',
  ADMIN_AUTH: 'devterm_admin_auth',
  BOOKMARKS: 'devterm_bookmarks'
};

// ===== USERNAME (stays in localStorage — it's user-side) =====
export function getUsername() {
  return localStorage.getItem(STORAGE_KEYS.USERNAME) || '';
}

export function setUsername(name) {
  localStorage.setItem(STORAGE_KEYS.USERNAME, name.trim());
}

export function clearUsername() {
  localStorage.removeItem(STORAGE_KEYS.USERNAME);
}

// ===== CONTENT DATA (now fetched from backend) =====

// Fetch content from backend API
export async function fetchContentFromServer() {
  try {
    const res = await fetch('/api/content');
    if (!res.ok) throw new Error('Failed to fetch content');
    const nodes = await res.json();
    // Cache locally for offline use
    localStorage.setItem(STORAGE_KEYS.CONTENT, JSON.stringify(nodes));
    return nodes;
  } catch (err) {
    console.warn('Backend unreachable, using cached content:', err.message);
    return getContentData();
  }
}

// Save content to backend API
export async function saveContentToServer(nodes) {
  try {
    const res = await fetch('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nodes)
    });
    if (!res.ok) throw new Error('Failed to save content');
    // Update local cache too
    localStorage.setItem(STORAGE_KEYS.CONTENT, JSON.stringify(nodes));
    return true;
  } catch (err) {
    console.error('Failed to save to server:', err.message);
    // Fallback: save to localStorage
    localStorage.setItem(STORAGE_KEYS.CONTENT, JSON.stringify(nodes));
    return false;
  }
}

// Legacy localStorage getter (used as offline fallback)
export function getContentData() {
  const data = localStorage.getItem(STORAGE_KEYS.CONTENT);
  return data ? JSON.parse(data) : null;
}

// Legacy localStorage setter (kept for fallback)
export function setContentData(nodes) {
  localStorage.setItem(STORAGE_KEYS.CONTENT, JSON.stringify(nodes));
}

// ===== EXPANDED NODES (stays in localStorage) =====
export function getExpandedNodes() {
  const data = localStorage.getItem(STORAGE_KEYS.EXPANDED);
  return data ? new Set(JSON.parse(data)) : new Set();
}

export function setExpandedNodes(expandedSet) {
  localStorage.setItem(STORAGE_KEYS.EXPANDED, JSON.stringify([...expandedSet]));
}

// ===== BOOKMARKS (stays in localStorage) =====
export function getBookmarks() {
  const data = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
  return data ? new Set(JSON.parse(data)) : new Set();
}

export function setBookmarks(bookmarkSet) {
  localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify([...bookmarkSet]));
}

// ===== ADMIN AUTH (now calls backend) =====
export function isAdminAuthenticated() {
  return sessionStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
}

export function setAdminAuthenticated(val) {
  if (val) {
    sessionStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
  }
}

export async function loginAdmin(password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (data.success) {
      setAdminAuthenticated(true);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Auth error:', err.message);
    return false;
  }
}
