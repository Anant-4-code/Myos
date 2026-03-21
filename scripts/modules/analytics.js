// ===== ANALYTICS MODULE =====
// Sends telemetry to the backend API

const DB_KEY = 'devterm_analytics_db';

/**
 * Log a user login event
 */
export async function logUserLogin(username) {
  let ip = 'unknown';
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    ip = data.ip;
  } catch (e) { /* ignore */ }

  try {
    await fetch('/api/analytics/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, ip, action: 'login' })
    });
  } catch (err) {
    console.warn('Failed to log login to server, saving locally:', err.message);
    // Fallback: save to localStorage
    const db = getLocalDb();
    db.logs.push({ username, ip, action: 'login', timestamp: Date.now() });
    saveLocalDb(db);
  }
}

/**
 * Log a question view event
 */
export async function logQuestionView(nodeId) {
  const username = localStorage.getItem('devterm_username') || 'anonymous';

  try {
    await fetch('/api/analytics/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, action: 'view', nodeId })
    });
  } catch (err) {
    console.warn('Failed to log view to server:', err.message);
    const db = getLocalDb();
    db.logs.push({ username, action: 'view', nodeId, timestamp: Date.now() });
    saveLocalDb(db);
  }
}

/**
 * Get overview metrics from backend
 */
export async function getOverviewMetrics() {
  try {
    const res = await fetch('/api/analytics/overview');
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch overview, using local fallback');
    return getLocalOverview();
  }
}

/**
 * Get user table data from backend
 */
export async function getUserTableData() {
  try {
    const res = await fetch('/api/analytics/users');
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch users, using local fallback');
    return [];
  }
}

/**
 * Get top content from backend
 */
export async function getTopContent() {
  try {
    const res = await fetch('/api/analytics/top-content');
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch top content');
    return [];
  }
}

// ===== LOCAL FALLBACKS =====
function getLocalDb() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) || { logs: [] };
  } catch { return { logs: [] }; }
}

function saveLocalDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getLocalOverview() {
  const db = getLocalDb();
  const now = Date.now();
  const oneDayAgo = now - 86400000;
  const allUsers = new Set(db.logs.map(l => l.username));
  const activeToday = new Set(db.logs.filter(l => l.timestamp > oneDayAgo).map(l => l.username));
  return {
    totalUsers: allUsers.size,
    activeToday: activeToday.size,
    totalViews: db.logs.filter(l => l.action === 'view').length
  };
}
