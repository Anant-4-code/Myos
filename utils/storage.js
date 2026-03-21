// ===== LOCAL STORAGE HELPERS =====

const STORAGE_KEYS = {
  USERNAME: 'devterm_username',
  CONTENT: 'devterm_content',
  EXPANDED: 'devterm_expanded',
  ADMIN_AUTH: 'devterm_admin_auth',
  BOOKMARKS: 'devterm_bookmarks'
};

export function getUsername() {
  return localStorage.getItem(STORAGE_KEYS.USERNAME) || '';
}

export function setUsername(name) {
  localStorage.setItem(STORAGE_KEYS.USERNAME, name.trim());
}

export function clearUsername() {
  localStorage.removeItem(STORAGE_KEYS.USERNAME);
}

export function getContentData() {
  const data = localStorage.getItem(STORAGE_KEYS.CONTENT);
  return data ? JSON.parse(data) : null;
}

export function setContentData(nodes) {
  localStorage.setItem(STORAGE_KEYS.CONTENT, JSON.stringify(nodes));
}

export function getExpandedNodes() {
  const data = localStorage.getItem(STORAGE_KEYS.EXPANDED);
  return data ? new Set(JSON.parse(data)) : new Set();
}

export function setExpandedNodes(expandedSet) {
  localStorage.setItem(STORAGE_KEYS.EXPANDED, JSON.stringify([...expandedSet]));
}

export function getBookmarks() {
  const data = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
  return data ? new Set(JSON.parse(data)) : new Set();
}

export function setBookmarks(bookmarkSet) {
  localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify([...bookmarkSet]));
}

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
