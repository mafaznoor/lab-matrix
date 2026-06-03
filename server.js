require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'labmatrix_super_secret_2026';

// Multer — profile pic uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `avatar_${req.user.userId}_${Date.now()}${ext}`);
    }
});
const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Images only'));
        cb(null, true);
    }
});

// In-memory OTP store: { email: { otp, expiresAt, userData } }
const otpStore = {};



app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 30000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test initial connection and run setup queries
db.getConnection((err, connection) => {
    if (err) { console.error('❌ Database connection failed: ' + err.message); return; }
    console.log('✅ Connected to Railway MySQL Database!');
    connection.release();
    console.log('✅ Connected to Railway MySQL Database!');

    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            UserID INT AUTO_INCREMENT PRIMARY KEY,
            Username VARCHAR(50) UNIQUE NOT NULL,
            Email VARCHAR(100) UNIQUE NOT NULL,
            PasswordHash VARCHAR(255) NOT NULL,
            Role ENUM('admin','maintainer','viewer') DEFAULT 'viewer',
            IsVerified TINYINT(1) DEFAULT 0,
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
    db.query(createUsersTable, (err2) => {
        if (err2) console.error('❌ Failed to create users table:', err2.message);
        else console.log('✅ Users table ready!');
        // Ensure 'maintainer' exists in Role ENUM for existing tables
        db.query("ALTER TABLE users MODIFY COLUMN Role ENUM('admin','maintainer','viewer') DEFAULT 'viewer'", (err3) => {
            if (err3) console.error('⚠️ Role ENUM alter skipped:', err3.message);
            else console.log('✅ Role ENUM updated (admin/maintainer/viewer)');
        });

        // Add ProfilePic column if not exists
        db.query("ALTER TABLE users ADD COLUMN ProfilePic VARCHAR(255) DEFAULT NULL", (err4) => {
            if (err4 && err4.code !== 'ER_DUP_FIELDNAME') console.error('⚠️ ProfilePic column alter skipped:', err4.message);
            else console.log('✅ ProfilePic column ready!');
        });
    });

    const createIssueReportsTable = `
        CREATE TABLE IF NOT EXISTS issue_reports (
            ID INT AUTO_INCREMENT PRIMARY KEY,
            ReporterID INT,
            ReporterName VARCHAR(100),
            Type ENUM('bug','lab','equipment') NOT NULL,
            Title VARCHAR(255) NOT NULL,
            Description TEXT,
            Status ENUM('open','in_progress','resolved') DEFAULT 'open',
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
    db.query(createIssueReportsTable, (err3) => {
        if (err3) console.error('❌ Failed to create issue_reports table:', err3.message);
        else console.log('✅ Issue reports table ready!');
    });

    const createAdminLogsTable = `
        CREATE TABLE IF NOT EXISTS admin_logs (
            ID INT AUTO_INCREMENT PRIMARY KEY,
            AdminID INT,
            AdminName VARCHAR(100),
            Action VARCHAR(255),
            TargetUserID INT,
            TargetUsername VARCHAR(100),
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
    db.query(createAdminLogsTable, (err4) => {
        if (err4) console.error('❌ Failed to create admin_logs table:', err4.message);
        else console.log('✅ Admin logs table ready!');
    });
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token.' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

const validatePassword = (password) => {
    if (password.length < 8 || password.length > 16) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/@/.test(password)) return false;
    return true;
};

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP email
const sendOTPEmail = async (email, username, otp) => {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.BREVO_API_KEY
        },
        body: JSON.stringify({
            sender: { name: 'Lab Matrix OS', email: process.env.BREVO_USER },
            to: [{ email: email }],
            subject: 'Lab Matrix — Your Verification Code',
            htmlContent: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;">
                <h2 style="color:#1e293b;">Lab Matrix OS</h2>
                <p style="color:#64748b;">Hi <strong>${username}</strong>, your verification code is:</p>
                <div style="background:#1e293b;color:#38bdf8;font-size:36px;font-weight:900;letter-spacing:12px;text-align:center;padding:24px;border-radius:12px;margin-bottom:24px;">
                    ${otp}
                </div>
                <p style="color:#94a3b8;font-size:13px;">Expires in 10 minutes.</p>
            </div>`
        })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Brevo API error');
    }
};

// --- AUTH ROUTES ---

// STEP 1: Register → send OTP (don't save to DB yet)
app.post('/api/register', async (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password)
        return res.status(400).json({ error: 'Username, email, and password are required.' });
    if (!validatePassword(password))
        return res.status(400).json({ error: 'Password must be 8-16 chars with uppercase, lowercase, number, and @' });

    // Check duplicate
    db.query('SELECT UserID FROM users WHERE Username = ? OR Email = ?', [username, email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(409).json({ error: 'Username or email already exists.' });

        try {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            const otp = generateOTP();
            const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min

            // Store in memory
            otpStore[email] = { otp, expiresAt, userData: { username, email, passwordHash, role: role || 'viewer' } };

            await sendOTPEmail(email, username, otp);
            res.json({ message: 'OTP sent to email. Please verify.', email });
        } catch (err) {
            console.error('❌ OTP send error:', err.message);
            res.status(500).json({ error: 'Failed to send OTP. Check email config.' });
        }
    });
});

// STEP 2: Verify OTP → save user to DB
app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required.' });

    const record = otpStore[email];
    if (!record) return res.status(400).json({ error: 'No OTP found. Register again.' });
    if (Date.now() > record.expiresAt) {
        delete otpStore[email];
        return res.status(400).json({ error: 'OTP expired. Register again.' });
    }
    if (record.otp !== otp.toString()) return res.status(400).json({ error: 'Invalid OTP.' });

    // OTP correct — save to DB
    const { username, email: userEmail, passwordHash, role } = record.userData;
    db.query(
        'INSERT INTO users (Username, Email, PasswordHash, Role, IsVerified) VALUES (?, ?, ?, ?, 1)',
        [username, userEmail, passwordHash, role],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY')
                    return res.status(409).json({ error: 'Username or email already exists.' });
                return res.status(500).json({ error: err.message });
            }
            delete otpStore[email];
            res.json({ message: 'Account verified! You can now login.' });
        }
    );
});

// Resend OTP
app.post('/api/resend-otp', async (req, res) => {
    const { email } = req.body;
    const record = otpStore[email];
    if (!record) return res.status(400).json({ error: 'No pending registration. Register again.' });

    const otp = generateOTP();
    record.otp = otp;
    record.expiresAt = Date.now() + 10 * 60 * 1000;

    try {
        await sendOTPEmail(email, record.userData.username, otp);
        res.json({ message: 'New OTP sent.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to resend OTP.' });
    }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ error: 'Username and password are required.' });
    db.query(
        'SELECT * FROM users WHERE Username = ? OR Email = ?',
        [username, username],
        async (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials.' });
            const user = results[0];
            if (!user.IsVerified) return res.status(403).json({ error: 'Account not verified. Check your email for OTP.' });
            const validPassword = await bcrypt.compare(password, user.PasswordHash);
            if (!validPassword) return res.status(401).json({ error: 'Invalid credentials.' });
            const token = jwt.sign(
                { userId: user.UserID, username: user.Username, role: user.Role },
                JWT_SECRET,
                { expiresIn: '8h' }
            );
            res.json({
                message: 'Login successful!',
                token,
                user: { id: user.UserID, username: user.Username, email: user.Email, role: user.Role, profilePic: user.ProfilePic || null }
            });
        }
    );
});

app.get('/api/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// --- PROTECTED API ROUTES ---

app.get('/api/equipment', authenticateToken, (req, res) => {
    db.query('SELECT * FROM equipment', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/add-equipment', authenticateToken, (req, res) => {
    const { name, category, brand, model, serial, purchaseDate, price, status } = req.body;
    const values = [name || null, category || null, brand || null, model || null,
    serial || null, purchaseDate || null, price ? parseFloat(price) : null, status || 'Active'];
    db.query(
        `INSERT INTO equipment (EquipmentName, Category, Brand, Model, SerialNumber, PurchaseDate, Price, Status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        values, (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Equipment added successfully', id: result.insertId });
        }
    );
});

app.post('/api/update-status', authenticateToken, (req, res) => {
    const { equipmentId, newStatus, issueDescription, repairCost } = req.body;
    db.query(`CALL UpdateEquipmentStatus(?, ?, ?, ?)`,
        [equipmentId, newStatus, issueDescription || '', repairCost || 0], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Status updated successfully' });
        });
});

app.get('/api/departments', authenticateToken, (req, res) => {
    db.query('SELECT * FROM departmentequipmentview', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/departments-list', authenticateToken, (req, res) => {
    db.query('SELECT DepartmentID, DepartmentName, Location FROM department', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/add-department', authenticateToken, (req, res) => {
    const { departmentName, name, department, deptName, location } = req.body;
    const finalDepartmentName = departmentName || name || department || deptName;
    if (!finalDepartmentName) return res.status(400).json({ error: 'Department Name is required.' });
    db.query(`INSERT INTO department (DepartmentName, Location) VALUES (?, ?)`,
        [finalDepartmentName, location || null], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Department added successfully', id: result.insertId });
        }
    );
});

app.get('/api/maintenance', authenticateToken, (req, res) => {
    const query = `SELECT M.MaintenanceID, E.EquipmentName, M.IssueDescription, M.RepairDate, M.RepairCost 
        FROM maintenance M JOIN equipment E ON M.EquipmentID = E.EquipmentID`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/add-maintenance', authenticateToken, (req, res) => {
    const { equipmentId, issueDescription, repairDate, repairCost } = req.body;
    db.query(`INSERT INTO maintenance (EquipmentID, IssueDescription, RepairDate, RepairCost) VALUES (?, ?, ?, ?)`,
        [equipmentId || null, issueDescription || null, repairDate || null, repairCost || null],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Maintenance log added successfully', id: result.insertId });
        }
    );
});

app.post('/api/allocate-equipment', authenticateToken, (req, res) => {
    const { equipmentId, departmentId, assignDate } = req.body;
    db.query(`INSERT INTO assignment (EquipmentID, DepartmentID, AssignDate, ReturnDate) VALUES (?, ?, ?, NULL)`,
        [equipmentId || null, departmentId || null, assignDate || null], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Equipment allocated successfully' });
        }
    );
});

// --- PROFILE ROUTES ---

// Update profile (username/email)
app.post('/api/update-profile', authenticateToken, (req, res) => {
    const { username, email } = req.body;
    if (!username || !email) return res.status(400).json({ error: 'Username and email required.' });
    db.query(
        'UPDATE users SET Username = ?, Email = ? WHERE UserID = ?',
        [username, email, req.user.userId],
        (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username or email already taken.' });
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Profile updated.' });
        }
    );
});

// Change password
app.post('/api/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required.' });
    db.query('SELECT PasswordHash FROM users WHERE UserID = ?', [req.user.userId], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'User not found.' });
        const valid = await bcrypt.compare(currentPassword, results[0].PasswordHash);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });
        const hash = await bcrypt.hash(newPassword, 10);
        db.query('UPDATE users SET PasswordHash = ? WHERE UserID = ?', [hash, req.user.userId], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: 'Password changed.' });
        });
    });
});

// Role upgrade request (store in DB)
app.post('/api/role-request', authenticateToken, (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required.' });
    db.query(
        `CREATE TABLE IF NOT EXISTS role_requests (
            ID INT AUTO_INCREMENT PRIMARY KEY,
            UserID INT NOT NULL,
            Message TEXT,
            Status ENUM('pending','approved','rejected') DEFAULT 'pending',
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        () => {
            db.query(
                'INSERT INTO role_requests (UserID, Message) VALUES (?, ?)',
                [req.user.userId, message],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Request submitted.' });
                }
            );
        }
    );
});

// --- ISSUE REPORTING ---
app.post('/api/report-issue', authenticateToken, (req, res) => {
    const { type, title, description } = req.body;
    if (!type || !title) return res.status(400).json({ error: 'Type and title are required.' });

    const reporterName = req.user.username || 'Unknown';
    db.query(
        'INSERT INTO issue_reports (ReporterID, ReporterName, Type, Title, Description) VALUES (?, ?, ?, ?, ?)',
        [req.user.userId, reporterName, type, title, description || ''],
        async (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            // Send email notification
            try {
                const typeLabels = { bug: '🐛 Bug Report', lab: '🏢 Lab Issue', equipment: '⚙️ Equipment Issue' };
                const typeColors = { bug: '#f43f5e', lab: '#3b82f6', equipment: '#f59e0b' };
                const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': process.env.BREVO_API_KEY
                    },
                    body: JSON.stringify({
                        sender: { name: 'Lab Matrix OS', email: process.env.BREVO_USER },
                        to: [{ email: 'mafaznoor510@gmail.com' }],
                        subject: `[Lab Matrix] New ${type} Report: ${title}`,
                        htmlContent: `
                        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;">
                            <h2 style="color:#1e293b;margin-bottom:4px;">Lab Matrix OS — Issue Report</h2>
                            <p style="color:#94a3b8;font-size:13px;margin-bottom:24px;">A new report has been submitted.</p>
                            <div style="background:${typeColors[type] || '#3b82f6'};color:white;display:inline-block;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:bold;margin-bottom:16px;">
                                ${typeLabels[type] || type}
                            </div>
                            <div style="background:white;padding:20px;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:16px;">
                                <p style="color:#64748b;font-size:12px;margin:0 0 4px;">TITLE</p>
                                <p style="color:#1e293b;font-size:16px;font-weight:bold;margin:0 0 16px;">${title}</p>
                                <p style="color:#64748b;font-size:12px;margin:0 0 4px;">DESCRIPTION</p>
                                <p style="color:#334155;font-size:14px;margin:0;">${description || 'No description provided.'}</p>
                            </div>
                            <p style="color:#94a3b8;font-size:12px;">Reported by <strong style="color:#1e293b;">${reporterName}</strong> at ${new Date().toLocaleString()}</p>
                        </div>`
                    })
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.message || 'Brevo API error for issue report');
                }
            } catch (emailErr) {
                console.error('❌ Issue report email failed:', emailErr.message);
            }

            res.json({ message: 'Report submitted.', id: result.insertId });
        }
    );
});

// --- ADMIN PANEL ROUTES ---
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
    next();
};

const logAdminAction = (adminId, adminName, action, targetUserId, targetUsername) => {
    db.query('INSERT INTO admin_logs (AdminID, AdminName, Action, TargetUserID, TargetUsername) VALUES (?, ?, ?, ?, ?)',
        [adminId, adminName, action, targetUserId, targetUsername]);
};

// GET all users
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    db.query('SELECT UserID, Username, Email, Role, IsVerified, CreatedAt FROM users ORDER BY CreatedAt DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// PUT change user role
app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, (req, res) => {
    const { role } = req.body;
    const userId = req.params.id;
    if (!['viewer', 'maintainer', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
    db.query('SELECT Username FROM users WHERE UserID = ?', [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const targetName = rows[0]?.Username || 'Unknown';
        db.query('UPDATE users SET Role = ? WHERE UserID = ?', [role, userId], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            logAdminAction(req.user.userId, req.user.username, `Changed role to ${role}`, parseInt(userId), targetName);
            res.json({ message: `Role updated to ${role}.` });
        });
    });
});

// DELETE user
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const userId = req.params.id;
    if (parseInt(userId) === req.user.userId) return res.status(400).json({ error: 'Cannot delete yourself.' });
    db.query('SELECT Username FROM users WHERE UserID = ?', [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const targetName = rows[0]?.Username || 'Unknown';
        db.query('DELETE FROM users WHERE UserID = ?', [userId], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            logAdminAction(req.user.userId, req.user.username, 'Deleted user', parseInt(userId), targetName);
            res.json({ message: 'User deleted.' });
        });
    });
});

// GET all role requests
app.get('/api/admin/role-requests', authenticateToken, requireAdmin, (req, res) => {
    db.query(`SELECT r.*, u.Username, u.Email, u.Role as CurrentRole FROM role_requests r LEFT JOIN users u ON r.UserID = u.UserID ORDER BY r.CreatedAt DESC`, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// PUT approve/reject role request
app.put('/api/admin/role-requests/:id', authenticateToken, requireAdmin, (req, res) => {
    const { action } = req.body;
    const requestId = req.params.id;
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid action.' });
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    db.query('SELECT UserID FROM role_requests WHERE ID = ?', [requestId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length === 0) return res.status(404).json({ error: 'Request not found.' });
        const targetUserId = rows[0].UserID;
        db.query('UPDATE role_requests SET Status = ? WHERE ID = ?', [newStatus, requestId], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (action === 'approve') {
                db.query('UPDATE users SET Role = ? WHERE UserID = ?', ['maintainer', targetUserId], (err3) => {
                    if (err3) return res.status(500).json({ error: err3.message });
                    db.query('SELECT Username FROM users WHERE UserID = ?', [targetUserId], (err4, uRows) => {
                        const targetName = uRows?.[0]?.Username || 'Unknown';
                        logAdminAction(req.user.userId, req.user.username, 'Approved role upgrade to maintainer', targetUserId, targetName);
                        res.json({ message: 'Request approved. User upgraded to maintainer.' });
                    });
                });
            } else {
                db.query('SELECT Username FROM users WHERE UserID = ?', [targetUserId], (err4, uRows) => {
                    const targetName = uRows?.[0]?.Username || 'Unknown';
                    logAdminAction(req.user.userId, req.user.username, 'Rejected role upgrade request', targetUserId, targetName);
                    res.json({ message: 'Request rejected.' });
                });
            }
        });
    });
});

// GET all issue reports
app.get('/api/admin/issue-reports', authenticateToken, requireAdmin, (req, res) => {
    db.query('SELECT * FROM issue_reports ORDER BY CreatedAt DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// PUT update issue report status
app.put('/api/admin/issue-reports/:id/status', authenticateToken, requireAdmin, (req, res) => {
    const { status } = req.body;
    if (!['open', 'in_progress', 'resolved'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    db.query('UPDATE issue_reports SET Status = ? WHERE ID = ?', [status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Status updated.' });
    });
});

// GET admin logs
app.get('/api/admin/logs', authenticateToken, requireAdmin, (req, res) => {
    db.query('SELECT * FROM admin_logs ORDER BY CreatedAt DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// --- PROFILE PIC UPLOAD ---
app.post('/api/upload-avatar', authenticateToken, uploadAvatar.single('avatar'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const filePath = `/uploads/${req.file.filename}`;

    // Delete old pic from disk
    db.query('SELECT ProfilePic FROM users WHERE UserID = ?', [req.user.userId], (err, rows) => {
        if (!err && rows[0]?.ProfilePic) {
            const oldPath = path.join(__dirname, rows[0].ProfilePic);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
    });

    db.query('UPDATE users SET ProfilePic = ? WHERE UserID = ?', [filePath, req.user.userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Avatar updated.', path: filePath });
    });
});

// Delete avatar
app.delete('/api/delete-avatar', authenticateToken, (req, res) => {
    db.query('SELECT ProfilePic FROM users WHERE UserID = ?', [req.user.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows[0]?.ProfilePic) {
            const oldPath = path.join(__dirname, rows[0].ProfilePic);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        db.query('UPDATE users SET ProfilePic = NULL WHERE UserID = ?', [req.user.userId], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: 'Avatar removed.' });
        });
    });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.static(path.join(__dirname, 'frontend/build')));
app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Lab Matrix OS running on http://localhost:${PORT}`); });