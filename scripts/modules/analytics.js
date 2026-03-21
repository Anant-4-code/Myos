// ===== ANALYTICS MODULE =====

const ANALYTICS_KEY = 'devterm_analytics_db';

const defaultDB = {
  users: [
    { username: 'anant', visits: 12, lastSeen: Date.now() - 120000, ip: '103.45.12.1' }, // 2 mins ago
    { username: 'rahul', visits: 5, lastSeen: Date.now() - 86400000, ip: '98.22.41.9' }, // 1 day ago
    { username: 'guest_42', visits: 1, lastSeen: Date.now() - 3600000, ip: '192.168.1.1' }
  ],
  views: {
    'dsa-arrays': 120, // Kadane / Arrays
    'dsa-stack': 90,   // Stack Implementation
    'dbms-sql': 45
  },
  dailyActive: [ 'anant', 'rahul', 'guest_42', 'user_1', 'user_2', 'user_3', 'user_4', 'user_5', 'user_6', 'user_7', 'user_8', 'user_9', 'user_10', 'user_11', 'user_12', 'user_13', 'user_14', 'user_15' ] // Seed 18 active users
};

// Ensure basic mock data is present
export function getDB() {
  const dbStr = localStorage.getItem(ANALYTICS_KEY);
  if (!dbStr) {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(defaultDB));
    return defaultDB;
  }
  return JSON.parse(dbStr);
}

function saveDB(db) {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(db));
}

export function logUserVisit(username, ip) {
  const db = getDB();
  const existing = db.users.find(u => u.username === username);
  
  if (existing) {
    existing.visits += 1;
    existing.lastSeen = Date.now();
    existing.ip = ip || existing.ip;
  } else {
    db.users.push({
      username,
      visits: 1,
      lastSeen: Date.now(),
      ip: ip || 'Unknown'
    });
  }
  
  // Track daily active conceptually
  if (!db.dailyActive.includes(username)) {
    db.dailyActive.push(username);
  }
  
  saveDB(db);
}

export function logQuestionView(questionId) {
  const db = getDB();
  db.views[questionId] = (db.views[questionId] || 0) + 1;
  saveDB(db);
}

export function getOverviewMetrics() {
  const db = getDB();
  const totalViews = Object.values(db.views).reduce((a, b) => a + b, 0);
  // Add base + actual users for a grand dummy total
  const totalUsers = 120 + db.users.length - 3; // base 120 + newly registered
  
  return {
    totalUsers,
    activeToday: db.dailyActive.length,
    totalViews
  };
}

export function getUserTableData() {
  return getDB().users.sort((a, b) => b.lastSeen - a.lastSeen);
}

export function getTopContent() {
  const db = getDB();
  const entries = Object.entries(db.views).sort((a, b) => b[1] - a[1]);
  return entries.map(([id, views]) => ({ id, views }));
}
