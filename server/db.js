const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'database.db');
const JSON_DB_PATH = path.join(__dirname, 'db.json');

// Initialize database connection (using let instead of const so we can reopen)
let db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');

// Initialize schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      emoji TEXT,
      createdAt TEXT
    );
    
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      workspaceId TEXT,
      name TEXT NOT NULL,
      color TEXT
    );
    
    CREATE TABLE IF NOT EXISTS content_items (
      id TEXT PRIMARY KEY,
      workspaceId TEXT,
      title TEXT NOT NULL,
      categoryId TEXT,
      status TEXT,
      scheduleDate TEXT,
      platform TEXT,
      notes TEXT,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT
    );
    
    CREATE TABLE IF NOT EXISTS analytics_history (
      id TEXT PRIMARY KEY,
      workspaceId TEXT,
      platform TEXT,
      date TEXT,
      followers INTEGER DEFAULT 0,
      totalViews INTEGER DEFAULT 0,
      avgEngagementRate REAL DEFAULT 0.0
    );
    
    CREATE TABLE IF NOT EXISTS platforms (
      id TEXT PRIMARY KEY,
      workspaceId TEXT,
      name TEXT NOT NULL,
      color TEXT,
      initialFollowers INTEGER DEFAULT 0,
      followerTarget INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      workspaceId TEXT,
      title TEXT NOT NULL,
      content TEXT,
      createdAt TEXT,
      isRead INTEGER DEFAULT 0,
      isUrgent INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'employee'
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      targetName TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL,
      restoreData TEXT
    );

    CREATE TABLE IF NOT EXISTS shared_files (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      originalName TEXT NOT NULL,
      mimeType TEXT,
      size INTEGER,
      uploadedBy TEXT,
      uploadedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      assignedTo TEXT NOT NULL,
      createdBy TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      deadline TEXT,
      createdAt TEXT NOT NULL,
      completedAt TEXT
    );
  `);

  // Migrate schema: Add instagramUsername column to platforms if not exists
  try {
    db.exec("ALTER TABLE platforms ADD COLUMN instagramUsername TEXT");
  } catch (e) {
    // Ignore error if column already exists
  }

  // Migrate schema: Add referenceUrl column to content_items if not exists
  try {
    db.exec("ALTER TABLE content_items ADD COLUMN referenceUrl TEXT");
  } catch (e) {
    // Ignore error if column already exists
  }

  // Migrate schema: Add isUrgent column to notes if not exists
  try {
    db.exec("ALTER TABLE notes ADD COLUMN isUrgent INTEGER DEFAULT 0");
  } catch (e) {
    // Ignore error if column already exists
  }

  // Migrate schema: Add proofPhoto column to user_tasks if not exists
  try {
    db.exec("ALTER TABLE user_tasks ADD COLUMN proofPhoto TEXT");
  } catch (e) {
    // Ignore error if column already exists
  }

  // Migrate schema: Add viewsHistory column to content_items if not exists
  try {
    db.exec("ALTER TABLE content_items ADD COLUMN viewsHistory TEXT");
  } catch (e) {
    // Ignore error if column already exists
  }

  // Migrate schema: Add restoreData column to activity_logs if not exists
  try {
    db.exec("ALTER TABLE activity_logs ADD COLUMN restoreData TEXT");
  } catch (e) {
    // Ignore error if column already exists
  }
}

// Seed default admin user if users table is empty
function seedAdminUser() {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const row = stmt.get();
  if (row.count === 0) {
    const passwordHash = bcrypt.hashSync('admin', 10);
    const insertStmt = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
    insertStmt.run('admin', passwordHash, 'admin');
    console.log('----------------------------------------------------');
    console.log('DEFAULT USER CREATED: admin / admin');
    console.log('Please log in and change this password in settings.');
    console.log('----------------------------------------------------');
  }
}

// Save state to SQLite database using a transaction
function saveState(state) {
  db.exec('BEGIN TRANSACTION');
  try {
    // Clear old data
    db.exec('DELETE FROM workspaces');
    db.exec('DELETE FROM categories');
    db.exec('DELETE FROM content_items');
    db.exec('DELETE FROM analytics_history');
    db.exec('DELETE FROM platforms');
    db.exec('DELETE FROM notes');

    // Save activeWorkspaceId
    const insertSetting = db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)');
    insertSetting.run('activeWorkspaceId', state.activeWorkspaceId || '');

    // Save workspaces
    const insertWorkspace = db.prepare('INSERT INTO workspaces (id, name, color, emoji, createdAt) VALUES (?, ?, ?, ?, ?)');
    for (const ws of state.workspaces || []) {
      insertWorkspace.run(ws.id, ws.name, ws.color || '', ws.emoji || '', ws.createdAt || '');
    }

    // Save categories
    const insertCategory = db.prepare('INSERT INTO categories (id, workspaceId, name, color) VALUES (?, ?, ?, ?)');
    for (const cat of state.categories || []) {
      insertCategory.run(cat.id, cat.workspaceId, cat.name, cat.color || '');
    }

    const insertContent = db.prepare(`
      INSERT INTO content_items (
        id, workspaceId, title, categoryId, status, scheduleDate, platform, notes, referenceUrl,
        views, likes, comments, shares, saves, viewsHistory, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of state.contentItems || []) {
      const perf = item.performance || {};
      insertContent.run(
        item.id,
        item.workspaceId,
        item.title,
        item.categoryId || '',
        item.status || '',
        item.scheduleDate || '',
        item.platform || '',
        item.notes || '',
        item.referenceUrl || '',
        perf.views || 0,
        perf.likes || 0,
        perf.comments || 0,
        perf.shares || 0,
        perf.saves || 0,
        JSON.stringify(perf.viewsHistory || []),
        item.createdAt || '',
        item.updatedAt || ''
      );
    }

    // Save analytics_history
    const insertAnalytics = db.prepare(`
      INSERT INTO analytics_history (
        id, workspaceId, platform, date, followers, totalViews, avgEngagementRate
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const snap of state.analyticsHistory || []) {
      insertAnalytics.run(
        snap.id,
        snap.workspaceId,
        snap.platform || '',
        snap.date || '',
        snap.followers || 0,
        snap.totalViews || 0,
        snap.avgEngagementRate || 0.0
      );
    }

    // Save platforms
    const insertPlatform = db.prepare(`
      INSERT INTO platforms (id, workspaceId, name, color, initialFollowers, followerTarget, instagramUsername)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const plat of state.platforms || []) {
      insertPlatform.run(
        plat.id,
        plat.workspaceId,
        plat.name,
        plat.color || '',
        plat.initialFollowers || 0,
        plat.followerTarget || 0,
        plat.instagramUsername || ''
      );
    }

    // Save notes
    const insertNote = db.prepare(`
      INSERT INTO notes (id, workspaceId, title, content, createdAt, isRead, isUrgent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const note of state.notes || []) {
      insertNote.run(
        note.id,
        note.workspaceId,
        note.title,
        note.content || '',
        note.createdAt || '',
        note.isRead ? 1 : 0,
        note.isUrgent ? 1 : 0
      );
    }

    db.exec('COMMIT');
    return true;
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Failed to save state to SQLite database:', err);
    throw err;
  }
}

// Retrieve state from SQLite database
function getState() {
  try {
    const state = {};

    // Get activeWorkspaceId
    const settingStmt = db.prepare("SELECT value FROM system_settings WHERE key = 'activeWorkspaceId'");
    const settingRow = settingStmt.get();
    state.activeWorkspaceId = settingRow ? settingRow.value : null;

    // Get workspaces
    const workspacesStmt = db.prepare("SELECT * FROM workspaces");
    state.workspaces = workspacesStmt.all();

    // Get categories
    const categoriesStmt = db.prepare("SELECT * FROM categories");
    state.categories = categoriesStmt.all();

    // Get contentItems
    const contentStmt = db.prepare("SELECT * FROM content_items");
    const contentRows = contentStmt.all();
    state.contentItems = contentRows.map(row => ({
      id: row.id,
      workspaceId: row.workspaceId,
      title: row.title,
      categoryId: row.categoryId,
      status: row.status,
      scheduleDate: row.scheduleDate,
      platform: row.platform,
      notes: row.notes,
      referenceUrl: row.referenceUrl || '',
      performance: {
        views: row.views,
        likes: row.likes,
        comments: row.comments,
        shares: row.shares,
        saves: row.saves,
        viewsHistory: row.viewsHistory ? JSON.parse(row.viewsHistory) : []
      },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

    // Get analyticsHistory
    const analyticsStmt = db.prepare("SELECT * FROM analytics_history");
    state.analyticsHistory = analyticsStmt.all();

    // Get platforms
    const platformsStmt = db.prepare("SELECT * FROM platforms");
    state.platforms = platformsStmt.all();

    // Get notes
    const notesStmt = db.prepare("SELECT * FROM notes");
    const notesRows = notesStmt.all();
    state.notes = notesRows.map(row => ({
      id: row.id,
      workspaceId: row.workspaceId,
      title: row.title,
      content: row.content,
      createdAt: row.createdAt,
      isRead: row.isRead === 1,
      isUrgent: row.isUrgent === 1
    }));

    return state;
  } catch (err) {
    console.error('Failed to retrieve state from SQLite database:', err);
    return {};
  }
}

// Migrate data from db.json if database is empty
function autoMigrate() {
  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM workspaces');
  const countRow = checkStmt.get();
  
  if (countRow.count === 0 && fs.existsSync(JSON_DB_PATH)) {
    try {
      console.log('Migrating existing data from db.json to SQLite...');
      const rawData = fs.readFileSync(JSON_DB_PATH, 'utf8');
      const state = JSON.parse(rawData);
      
      saveState(state);
      console.log('Migration completed successfully!');
      
      // Rename db.json to db.json.backup to prevent re-migration
      const backupPath = JSON_DB_PATH + '.backup';
      fs.renameSync(JSON_DB_PATH, backupPath);
      console.log(`Renamed db.json to db.json.backup`);
    } catch (err) {
      console.error('Error during auto-migration from db.json:', err);
    }
  }
}

// Helper user functions
function getUser(username) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username);
}

function getAllUsers() {
  const stmt = db.prepare('SELECT username, role FROM users');
  return stmt.all();
}

function createUser(username, passwordHash, role = 'employee') {
  const stmt = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
  return stmt.run(username, passwordHash, role);
}

function deleteUser(username) {
  const stmt = db.prepare('DELETE FROM users WHERE username = ?');
  return stmt.run(username);
}

function updateUserPassword(username, newPasswordHash) {
  const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE username = ?');
  return stmt.run(newPasswordHash, username);
}

// Close and reopen functions to support restore operations
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

function reopenDatabase() {
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
}

function createActivityLog(id, username, action, targetName, details, timestamp, restoreData) {
  const stmt = db.prepare('INSERT INTO activity_logs (id, username, action, targetName, details, timestamp, restoreData) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const res = stmt.run(id, username, action, targetName, details || '', timestamp, restoreData || null);
  
  // Auto-prune activity logs: keep only the last 1000 entries to prevent database bloat
  try {
    db.exec(`
      DELETE FROM activity_logs 
      WHERE id NOT IN (
        SELECT id FROM activity_logs 
        ORDER BY timestamp DESC 
        LIMIT 1000
      )
    `);
  } catch (err) {
    console.error('Failed to auto-prune activity logs:', err);
  }
  
  return res;
}

function clearActivityLogs() {
  const stmt = db.prepare('DELETE FROM activity_logs');
  return stmt.run();
}

function pruneActivityLogsManual(keepCount = 100) {
  const stmt = db.prepare(`
    DELETE FROM activity_logs 
    WHERE id NOT IN (
      SELECT id FROM activity_logs 
      ORDER BY timestamp DESC 
      LIMIT ?
    )
  `);
  return stmt.run(keepCount);
}

function getActivityLogs() {
  const stmt = db.prepare('SELECT * FROM activity_logs ORDER BY timestamp DESC');
  return stmt.all();
}

function createSharedFile(id, filename, originalName, mimeType, size, uploadedBy, uploadedAt) {
  const stmt = db.prepare('INSERT INTO shared_files (id, filename, originalName, mimeType, size, uploadedBy, uploadedAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
  return stmt.run(id, filename, originalName, mimeType, size, uploadedBy, uploadedAt);
}

function getSharedFiles() {
  const stmt = db.prepare('SELECT * FROM shared_files ORDER BY uploadedAt DESC');
  return stmt.all();
}

function getSharedFileById(id) {
  const stmt = db.prepare('SELECT * FROM shared_files WHERE id = ?');
  return stmt.get(id);
}

function deleteSharedFile(id) {
  const stmt = db.prepare('DELETE FROM shared_files WHERE id = ?');
  return stmt.run(id);
}

// User Tasks operations
function getAllUserTasks() {
  const stmt = db.prepare('SELECT * FROM user_tasks ORDER BY createdAt DESC');
  return stmt.all();
}

function getUserTasks(username) {
  const stmt = db.prepare('SELECT * FROM user_tasks WHERE assignedTo = ? ORDER BY createdAt DESC');
  return stmt.all(username);
}

function getUserTaskById(id) {
  const stmt = db.prepare('SELECT * FROM user_tasks WHERE id = ?');
  return stmt.get(id);
}

function createUserTask(id, title, description, assignedTo, createdBy, deadline, createdAt) {
  const stmt = db.prepare('INSERT INTO user_tasks (id, title, description, assignedTo, createdBy, status, deadline, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  return stmt.run(id, title, description || '', assignedTo, createdBy, 'pending', deadline || '', createdAt);
}

function updateUserTaskStatus(id, status, completedAt, proofPhoto) {
  const stmt = db.prepare('UPDATE user_tasks SET status = ?, completedAt = ?, proofPhoto = ? WHERE id = ?');
  return stmt.run(status, completedAt || null, proofPhoto || null, id);
}

function deleteUserTask(id) {
  const stmt = db.prepare('DELETE FROM user_tasks WHERE id = ?');
  return stmt.run(id);
}

// Initialize on load
initSchema();
seedAdminUser();
autoMigrate();

module.exports = {
  getState,
  saveState,
  getUser,
  getAllUsers,
  createUser,
  deleteUser,
  updateUserPassword,
  createActivityLog,
  clearActivityLogs,
  pruneActivityLogsManual,
  getActivityLogs,
  createSharedFile,
  getSharedFiles,
  getSharedFileById,
  deleteSharedFile,
  closeDatabase,
  reopenDatabase,
  getAllUserTasks,
  getUserTasks,
  getUserTaskById,
  createUserTask,
  updateUserTaskStatus,
  deleteUserTask
};
