const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dbHelper = require('./db');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'contentos_jwt_secret_key_123';
const BACKUP_DIR = path.join(__dirname, 'backups');

// Ensure backups directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// ================= LOCAL DROP & DEVICE TRACKER SETUP =================
const multer = require('multer');

const SHARED_UPLOAD_DIR = path.join(__dirname, 'uploads', 'shared');
if (!fs.existsSync(SHARED_UPLOAD_DIR)) {
  fs.mkdirSync(SHARED_UPLOAD_DIR, { recursive: true });
}

const PROOF_UPLOAD_DIR = path.join(__dirname, 'uploads', 'proofs');
if (!fs.existsSync(PROOF_UPLOAD_DIR)) {
  fs.mkdirSync(PROOF_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, SHARED_UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Multer config for task proof photos (2MB max, images only)
const proofStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PROOF_UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadProof = multer({
  storage: proofStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Hanya file gambar yang diizinkan.'));
    }
    cb(null, true);
  }
});

function getCleanIp(ip) {
  if (!ip) return 'Unknown';
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  if (ip === '::1') {
    return '127.0.0.1';
  }
  return ip;
}

const activeDevices = new Map();

// Periodic stale devices cleanup (older than 35s, checked every 15s)
setInterval(() => {
  const now = Date.now();
  for (const [deviceId, dev] of activeDevices.entries()) {
    if (now - dev.lastSeen > 35000) {
      activeDevices.delete(deviceId);
    }
  }
}, 15000);

// Middleware to verify JWT Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'missing_token', 
      message: 'Akses ditolak. Token tidak ditemukan.' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        error: 'invalid_token', 
        message: 'Token tidak valid atau telah kedaluwarsa.' 
      });
    }
    req.user = user;
    next();
  });
};

// Middleware to verify JWT Token (checks header OR query parameters for downloads)
const authenticateTokenOrQuery = (req, res, next) => {
  let token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
  if (!token && req.query.token) {
    token = req.query.token;
  }
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'missing_token', 
      message: 'Akses ditolak. Token tidak ditemukan.' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        error: 'invalid_token', 
        message: 'Token tidak valid atau telah kedaluwarsa.' 
      });
    }
    req.user = user;
    next();
  });
};

// Middleware to authorize Admin only
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      error: 'unauthorized', 
      message: 'Akses ditolak. Hanya administrator yang diizinkan.' 
    });
  }
};

// Auto-backup function (keeps max 10 backups)
function createAutoBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `auto-backup-${timestamp}.db`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);
    const dbPath = path.join(__dirname, 'database.db');
    
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupFilePath);
      console.log(`Auto-backup created: ${backupFileName}`);
      
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.startsWith('auto-backup-') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(BACKUP_DIR, file),
          time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
        }))
        .sort((a, b) => a.time - b.time); // oldest first
        
      while (files.length > 10) {
        const oldest = files.shift();
        fs.unlinkSync(oldest.path);
        console.log(`Deleted old auto-backup: ${oldest.name}`);
      }
    }
  } catch (error) {
    console.error('Failed to create auto-backup:', error);
  }
}

// Endpoint: Login
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    const user = dbHelper.getUser(username);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30m' });
    return res.json({
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan internal server.' });
  }
});

// Endpoint: Change Password
app.post('/api/change-password', authenticateToken, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const username = req.user.username;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Password lama dan password baru wajib diisi.' });
    }

    const user = dbHelper.getUser(username);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    const validPassword = bcrypt.compareSync(oldPassword, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ success: false, message: 'Password lama tidak sesuai.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ success: false, message: 'Password baru minimal harus 4 karakter.' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    dbHelper.updateUserPassword(username, newHash);
    return res.json({ success: true, message: 'Password berhasil diubah.' });
  } catch (error) {
    console.error('Error during change password:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan internal server.' });
  }
});

// ================= ADMIN USER ENDPOINTS =================

// Endpoint: Ambil semua user (Admin saja)
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = dbHelper.getAllUsers();
    return res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data user.' });
  }
});

// Endpoint: Buat user baru (Admin saja)
app.post('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: 'Username, password, dan role wajib diisi.' });
    }

    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ success: false, message: 'Username hanya boleh berisi huruf, angka, titik, dan garis bawah.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ success: false, message: 'Password minimal harus 4 karakter.' });
    }

    const existingUser = dbHelper.getUser(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username sudah digunakan.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    dbHelper.createUser(username, passwordHash, role);
    return res.json({ success: true, message: 'User berhasil dibuat.' });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat user.' });
  }
});

// Endpoint: Hapus user (Admin saja)
app.delete('/api/admin/users/:username', authenticateToken, requireAdmin, (req, res) => {
  try {
    const targetUsername = req.params.username;
    if (targetUsername === req.user.username) {
      return res.status(400).json({ success: false, message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
    }

    const users = dbHelper.getAllUsers();
    const admins = users.filter(u => u.role === 'admin');
    const targetUser = dbHelper.getUser(targetUsername);

    if (targetUser && targetUser.role === 'admin' && admins.length <= 1) {
      return res.status(400).json({ success: false, message: 'Tidak dapat menghapus administrator terakhir di sistem.' });
    }

    dbHelper.deleteUser(targetUsername);
    return res.json({ success: true, message: 'User berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus user.' });
  }
});

// ================= ADMIN BACKUP ENDPOINTS =================

// Endpoint: Ambil daftar file backup di server (Admin saja)
app.get('/api/admin/backups', authenticateToken, requireAdmin, (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json([]);
    }
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stat = fs.statSync(filePath);
        return {
          filename: file,
          size: stat.size,
          createdAt: stat.mtime.toISOString()
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // newest first
      
    return res.json(files);
  } catch (error) {
    console.error('Error reading backups directory:', error);
    return res.status(500).json({ success: false, message: 'Gagal membaca direktori backup.' });
  }
});

// Endpoint: Membuat backup secara manual (Admin saja)
app.post('/api/admin/backups', authenticateToken, requireAdmin, (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `manual-backup-${timestamp}.db`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);
    const dbPath = path.join(__dirname, 'database.db');
    
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupFilePath);
      return res.json({ success: true, message: `Backup berhasil dibuat: ${backupFileName}` });
    } else {
      return res.status(404).json({ success: false, message: 'File database tidak ditemukan.' });
    }
  } catch (error) {
    console.error('Error creating manual backup:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat file backup.' });
  }
});

// Endpoint: Memulihkan database dari file backup (Admin saja)
app.post('/api/admin/backups/:filename/restore', authenticateToken, requireAdmin, (req, res) => {
  try {
    const filename = req.params.filename;
    if (filename.includes('/') || filename.includes('\\') || !filename.endsWith('.db')) {
      return res.status(400).json({ success: false, message: 'Nama file backup tidak valid.' });
    }

    const backupFilePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(backupFilePath)) {
      return res.status(404).json({ success: false, message: 'File backup tidak ditemukan.' });
    }

    const dbPath = path.join(__dirname, 'database.db');
    
    // 1. Close db connection
    dbHelper.closeDatabase();
    
    // 2. Overwrite file
    fs.copyFileSync(backupFilePath, dbPath);
    
    // 3. Reopen db connection
    dbHelper.reopenDatabase();
    
    console.log(`Database restored successfully from: ${filename}`);
    return res.json({ success: true, message: 'Database berhasil dipulihkan.' });
  } catch (error) {
    console.error('Error restoring database:', error);
    try {
      dbHelper.reopenDatabase();
    } catch (reopenErr) {
      console.error('Critical error: Failed to reopen database:', reopenErr);
    }
    return res.status(500).json({ success: false, message: 'Gagal memulihkan database: ' + error.message });
  }
});

// Endpoint: Menghapus file backup tertentu (Admin saja)
app.delete('/api/admin/backups/:filename', authenticateToken, requireAdmin, (req, res) => {
  try {
    const filename = req.params.filename;
    if (filename.includes('/') || filename.includes('\\') || !filename.endsWith('.db')) {
      return res.status(400).json({ success: false, message: 'Nama file backup tidak valid.' });
    }

    const backupFilePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(backupFilePath)) {
      return res.status(404).json({ success: false, message: 'File backup tidak ditemukan.' });
    }

    fs.unlinkSync(backupFilePath);
    return res.json({ success: true, message: 'File backup berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting backup file:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus file backup.' });
  }
});

// ================= AUDIT TRAIL ENDPOINTS =================

// Endpoint: Buat log aktivitas baru
app.post('/api/activity-logs', authenticateToken, (req, res) => {
  try {
    const { action, targetName, details } = req.body;
    const username = req.user.username;

    if (!action || !targetName) {
      return res.status(400).json({ success: false, message: 'Action dan targetName wajib diisi.' });
    }

    const id = 'log-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const timestamp = new Date().toISOString();

    dbHelper.createActivityLog(id, username, action, targetName, details, timestamp);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error creating activity log:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat log aktivitas.' });
  }
});

// Endpoint: Ambil daftar log aktivitas (Admin saja)
app.get('/api/admin/activity-logs', authenticateToken, requireAdmin, (req, res) => {
  try {
    const logs = dbHelper.getActivityLogs();
    return res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil log aktivitas.' });
  }
});

// ================= LOCAL DROP & DEVICE TRACKER ENDPOINTS =================

// Endpoint: Heartbeat untuk mendaftarkan/memperbarui status perangkat
app.post('/api/network/heartbeat', authenticateToken, (req, res) => {
  try {
    const { deviceId, deviceName, userAgent } = req.body;
    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'deviceId wajib diisi.' });
    }
    
    const clientIp = getCleanIp(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
    activeDevices.set(deviceId, {
      deviceId,
      deviceName: deviceName || 'Perangkat Tanpa Nama',
      userAgent: userAgent || req.headers['user-agent'] || 'Unknown Browser',
      ip: clientIp,
      username: req.user ? req.user.username : 'Guest',
      lastSeen: Date.now()
    });
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error in heartbeat endpoint:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada heartbeat.' });
  }
});

// Endpoint: Ambil daftar perangkat yang aktif
app.get('/api/network/devices', authenticateToken, (req, res) => {
  try {
    const devices = Array.from(activeDevices.values());
    return res.json(devices);
  } catch (error) {
    console.error('Error fetching active devices:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar perangkat.' });
  }
});

// Endpoint: Ambil daftar log aktivitas singkat untuk jaringan (Semua user login)
app.get('/api/network/activity-logs', authenticateToken, (req, res) => {
  try {
    const logs = dbHelper.getActivityLogs();
    return res.json(logs.slice(0, 10)); // Kembalikan 10 log terbaru saja
  } catch (error) {
    console.error('Error fetching network activity logs:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil log aktivitas.' });
  }
});

// Endpoint: Upload file ke Local Share
app.post('/api/network/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada berkas yang diunggah.' });
    }

    const { deviceName } = req.body;
    const fileId = 'file-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const uploadedAt = new Date().toISOString();
    const uploadedBy = deviceName || req.user.username || 'Perangkat Jaringan';

    // Simpan ke SQLite
    dbHelper.createSharedFile(
      fileId, 
      req.file.filename, 
      req.file.originalname, 
      req.file.mimetype, 
      req.file.size, 
      uploadedBy, 
      uploadedAt
    );

    // Catat ke Log Aktivitas
    const logId = 'log-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    dbHelper.createActivityLog(
      logId,
      req.user.username,
      'Upload Berkas Jaringan',
      req.file.originalname,
      `Berbagi berkas '${req.file.originalname}' (${(req.file.size / 1024 / 1024).toFixed(2)} MB) melalui Local Share dari perangkat '${uploadedBy}'.`,
      uploadedAt
    );

    return res.json({
      success: true,
      file: {
        id: fileId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy,
        uploadedAt
      }
    });
  } catch (error) {
    console.error('Error uploading shared file:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengunggah berkas.' });
  }
});

// Endpoint: Ambil daftar berkas yang dibagikan
app.get('/api/network/shared-files', authenticateToken, (req, res) => {
  try {
    const files = dbHelper.getSharedFiles();
    return res.json(files);
  } catch (error) {
    console.error('Error fetching shared files:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar berkas.' });
  }
});

// Endpoint: Unduh berkas fisik berdasarkan ID
app.get('/api/network/download/:id', authenticateTokenOrQuery, (req, res) => {
  try {
    const fileId = req.params.id;
    const fileRecord = dbHelper.getSharedFileById(fileId);
    
    if (!fileRecord) {
      return res.status(404).json({ success: false, message: 'Berkas tidak ditemukan di database.' });
    }

    const filePath = path.join(SHARED_UPLOAD_DIR, fileRecord.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Berkas fisik tidak ditemukan di server.' });
    }

    return res.download(filePath, fileRecord.originalName);
  } catch (error) {
    console.error('Error downloading shared file:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengunduh berkas.' });
  }
});

// Endpoint: Hapus berkas fisik dan record metadata-nya
app.delete('/api/network/shared-files/:id', authenticateToken, (req, res) => {
  try {
    const fileId = req.params.id;
    const fileRecord = dbHelper.getSharedFileById(fileId);
    
    if (!fileRecord) {
      return res.status(404).json({ success: false, message: 'Berkas tidak ditemukan.' });
    }

    // Hapus berkas fisik jika ada
    const filePath = path.join(SHARED_UPLOAD_DIR, fileRecord.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Hapus dari SQLite
    dbHelper.deleteSharedFile(fileId);

    // Catat ke Log Aktivitas
    const logId = 'log-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const deletedAt = new Date().toISOString();
    dbHelper.createActivityLog(
      logId,
      req.user.username,
      'Hapus Berkas Jaringan',
      fileRecord.originalName,
      `Menghapus berkas '${fileRecord.originalName}' yang dibagikan oleh '${fileRecord.uploadedBy}' di Local Share.`,
      deletedAt
    );

    return res.json({ success: true, message: 'Berkas berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting shared file:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus berkas.' });
  }
});

// ================= SYSTEM ENDPOINTS =================

// Endpoint: Ambil daftar IP Address LAN server (Untuk QR Code Share)
app.get('/api/network-ips', authenticateToken, (req, res) => {
  try {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name in interfaces) {
      for (const alias of interfaces[name]) {
        if ((alias.family === 'IPv4' || alias.family === 4) && alias.address !== '127.0.0.1' && !alias.internal) {
          ips.push(alias.address);
        }
      }
    }
    return res.json({ ips });
  } catch (error) {
    console.error('Error fetching network IPs:', error);
    return res.status(500).json({ success: false, message: 'Gagal mendeteksi alamat IP jaringan.' });
  }
});

// Endpoint: Ambil state data (Membaca dari SQLite)
app.get('/api/state', authenticateToken, (req, res) => {
  try {
    const state = dbHelper.getState();
    return res.json(state);
  } catch (error) {
    console.error('Error reading from SQLite database:', error);
    return res.status(500).json({ success: false, error: 'read_error', message: error.message });
  }
});

// Endpoint: Menyimpan state data (Menulis ke SQLite + memicu auto-backup)
app.post('/api/state', authenticateToken, (req, res) => {
  try {
    const state = req.body;
    dbHelper.saveState(state);
    
    // Trigger auto-backup asynchronously so it doesn't block response
    setTimeout(createAutoBackup, 100);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error writing to SQLite database:', error);
    return res.status(500).json({ success: false, error: 'write_error', message: error.message });
  }
});

// Endpoint: Menganalisis username Instagram
app.get('/api/analyze-instagram/:username', authenticateToken, (req, res) => {
  const username = req.params.username.toLowerCase();

  // 1. Sanitasi Username
  const usernameRegex = /^[a-zA-Z0-9._]+$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({
      success: false,
      error: 'invalid_username',
      message: 'Username tidak valid. Hanya boleh mengandung huruf, angka, titik, dan garis bawah.'
    });
  }

  // 2. Proteksi Spam: Batasi 1x per hari per username
  const cachePath = path.join(__dirname, 'sync_cache.json');
  let cache = {};
  try {
    if (fs.existsSync(cachePath)) {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to read sync cache:', err);
  }

  const today = new Date().toLocaleDateString('en-CA'); // format: YYYY-MM-DD
  if (cache[username] === today) {
    return res.status(429).json({
      success: false,
      error: 'rate_limited',
      message: `Batas Tercapai: Akun @${username} sudah dianalisis hari ini. Silakan coba lagi besok untuk menghindari pemblokiran IP oleh Instagram.`
    });
  }

  const scriptPath = path.join(__dirname, 'analyze_instagram.py');

  // 3. Spawn Child Process
  const pythonProcess = spawn('python', [scriptPath, username]);

  let stdoutData = '';
  let stderrData = '';

  pythonProcess.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    stderrData += data.toString();
  });

  // 4. Tangani Ketika Proses Python Selesai
  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Python script exited with code ${code}. Stderr: ${stderrData}`);
      return res.status(500).json({
        success: false,
        error: 'script_error',
        message: 'Gagal menjalankan modul analisis Instagram.',
        details: stderrData.trim()
      });
    }

    try {
      const result = JSON.parse(stdoutData);
      if (!result.success) {
        const statusCode = result.error === 'profile_not_found' ? 404 : 400;
        return res.status(statusCode).json(result);
      }

      // Update sync cache on success
      try {
        cache[username] = today;
        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
      } catch (writeErr) {
        console.error('Failed to write sync cache:', writeErr);
      }

      return res.json(result);

    } catch (parseError) {
      console.error('JSON Parse Error dari output Python:', parseError, 'Raw:', stdoutData);
      return res.status(500).json({
        success: false,
        error: 'invalid_json_format',
        message: 'Output script Python rusak atau bukan format JSON.',
        rawOutput: stdoutData
      });
    }
  });

  // 5. Tangani Jika Proses Python Gagal Dijalankan
  pythonProcess.on('error', (err) => {
    console.error('Gagal memulai process Python:', err);
    
    let friendlyMessage = 'Terjadi kesalahan sistem saat memulai proses analisis.';
    if (err.code === 'ENOENT') {
      friendlyMessage = 'Interpreter Python tidak ditemukan di server. Pastikan Python sudah terinstall dan terdaftar di Environment Path.';
    }

    return res.status(500).json({
      success: false,
      error: 'python_not_found',
      message: friendlyMessage,
      details: err.message
    });
  });
});

// ================= USER TASKS ENDPOINTS =================

// Endpoint: Ambil daftar tugas
app.get('/api/tasks', authenticateToken, (req, res) => {
  try {
    let tasks;
    if (req.user.role === 'admin') {
      tasks = dbHelper.getAllUserTasks();
    } else {
      tasks = dbHelper.getUserTasks(req.user.username);
    }
    return res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar tugas.' });
  }
});

// Endpoint: Buat tugas baru (Admin saja)
app.post('/api/tasks', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, description, assignedTo, deadline } = req.body;
    if (!title || !assignedTo) {
      return res.status(400).json({ success: false, message: 'Judul tugas dan penerima wajib diisi.' });
    }

    const id = 'task-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const createdAt = new Date().toISOString();
    const createdBy = req.user.username;

    dbHelper.createUserTask(id, title, description, assignedTo, createdBy, deadline, createdAt);
    
    // Catat log aktivitas
    const logId = 'log-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    dbHelper.createActivityLog(
      logId,
      createdBy,
      'Buat Tugas',
      title,
      `Menugaskan '${title}' kepada user '${assignedTo}' dengan deadline '${deadline || 'Tidak ada'}'.`,
      createdAt
    );

    return res.json({ success: true, message: 'Tugas berhasil dibuat.', taskId: id });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat tugas.' });
  }
});

// Endpoint: Update status tugas
app.put('/api/tasks/:id/status', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status, proofPhoto } = req.body; // 'pending' atau 'completed'

    if (!status || (status !== 'pending' && status !== 'completed')) {
      return res.status(400).json({ success: false, message: 'Status tidak valid.' });
    }

    const task = dbHelper.getUserTaskById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan.' });
    }

    // Check authorization: Admin or the assigned user
    if (req.user.role !== 'admin' && task.assignedTo !== req.user.username) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Anda tidak ditugaskan untuk tugas ini.' });
    }

    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    dbHelper.updateUserTaskStatus(id, status, completedAt, proofPhoto || null);

    // Catat log aktivitas
    const logId = 'log-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const timestamp = new Date().toISOString();
    dbHelper.createActivityLog(
      logId,
      req.user.username,
      status === 'completed' ? 'Selesaikan Tugas' : 'Buka Kembali Tugas',
      task.title,
      `Status tugas '${task.title}' diperbarui menjadi '${status}' oleh '${req.user.username}'.${proofPhoto ? ' Bukti foto dilampirkan.' : ''}`,
      timestamp
    );

    return res.json({ success: true, message: 'Status tugas berhasil diperbarui.' });
  } catch (error) {
    console.error('Error updating task status:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui status tugas.' });
  }
});

// Endpoint: Upload bukti foto penyelesaian tugas
app.post('/api/tasks/:id/proof', authenticateToken, (req, res, next) => {
  uploadProof.single('proof')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Ukuran foto maksimal 2 MB.' });
      }
      return res.status(400).json({ success: false, message: err.message || 'Gagal mengunggah foto.' });
    }
    next();
  });
}, (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada foto yang diunggah.' });
    }

    const task = dbHelper.getUserTaskById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan.' });
    }
    if (req.user.role !== 'admin' && task.assignedTo !== req.user.username) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    return res.json({ success: true, filename: req.file.filename, message: 'Foto berhasil diunggah.' });
  } catch (error) {
    console.error('Error uploading task proof:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengunggah foto bukti.' });
  }
});

// Endpoint: Tampilkan foto bukti tugas
app.get('/api/tasks/proof/:filename', authenticateToken, (req, res) => {
  try {
    const filename = req.params.filename;
    if (filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, message: 'Nama file tidak valid.' });
    }
    const filePath = path.join(PROOF_UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Foto bukti tidak ditemukan.' });
    }
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving proof photo:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil foto bukti.' });
  }
});

// Endpoint: Hapus tugas (Admin saja)
app.delete('/api/tasks/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const task = dbHelper.getUserTaskById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan.' });
    }

    dbHelper.deleteUserTask(id);

    // Catat log aktivitas
    const logId = 'log-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const timestamp = new Date().toISOString();
    dbHelper.createActivityLog(
      logId,
      req.user.username,
      'Hapus Tugas',
      task.title,
      `Tugas '${task.title}' yang ditugaskan kepada '${task.assignedTo}' telah dihapus oleh Admin.`,
      timestamp
    );

    return res.json({ success: true, message: 'Tugas berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus tugas.' });
  }
});

// Serve frontend build dynamically
const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
  });
}

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Express Backend Server running on port ${PORT}`);
});
