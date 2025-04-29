require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer();

// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,  
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database: ' + err.stack);
        return;
    }
    console.log('Connected to database as id ' + db.threadId);
});

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication token required'
        });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                status: 'error',
                message: 'Invalid or expired token'
            });
        }
        
        req.user = user;
        next();
    });
}

// Helper function to log activity
async function logActivity(userId, activityText) {
    try {
        await db.promise().query(
            'INSERT INTO activity_log (user_id, activity) VALUES (?, ?)',
            [userId, activityText]
        );
    } catch (error) {
        console.error('Activity logging error:', error);
    }
}

// ========== AUTHENTICATION ROUTES ========== //
app.post('/signup', upload.none(), async (req, res) => {
    try {
        const { email, password, confirmPassword } = req.body;
        const role = 'admin';

        if (!email || !password || !confirmPassword) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'All fields are required' 
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Invalid email format' 
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Passwords do not match' 
            });
        }

        if (password.length < 8) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Password must be at least 8 characters long' 
            });
        }

        const [existingUsers] = await db.promise().query(
            'SELECT * FROM users WHERE email = ?', 
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Email already exists' 
            });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const confirmationToken = crypto.randomBytes(32).toString('hex');

        const [result] = await db.promise().query(
            'INSERT INTO users (email, password, role, is_verified, confirmation_token) VALUES (?, ?, ?, ?, ?)', 
            [email, hashedPassword, role, false, confirmationToken]
        );

        const confirmationLink = `http://localhost:3000/verify-email?token=${confirmationToken}`;

        try {
            const info = await transporter.sendMail({
                from: `"School Management System" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Confirm Your Admin Account',
                html: `
                    <h1>Admin Account Confirmation</h1>
                    <p>Thank you for registering as an Administrator with EduManage Pro!</p>
                    <p>Please click the link below to verify your email:</p>
                    <a href="${confirmationLink}">Confirm Email</a>
                    <p>This link will expire in 24 hours.</p>
                `
            });
            console.log('Email sent successfully:', info.response);
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            await db.promise().query('DELETE FROM users WHERE id = ?', [result.insertId]);
            return res.status(500).json({ 
                status: 'error', 
                message: 'Failed to send confirmation email' 
            });
        }

        res.status(201).json({ 
            status: 'success', 
            message: 'Admin account created. Please check your email to confirm your account.',
            userId: result.insertId
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Internal server error' 
        });
    }
});

app.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({
                status: 'error',
                message: 'Verification token is required'
            });
        }
        
        const [result] = await db.promise().query(
            'UPDATE users SET is_verified = TRUE, confirmation_token = NULL WHERE confirmation_token = ?',
            [token]
        );
        
        if (result.affectedRows === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid or expired verification token'
            });
        }
        
        res.redirect('/login.html');
        
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to verify email'
        });
    }
});

app.post('/login', upload.none(), async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Email and password are required'
            });
        }
        
        const [users] = await db.promise().query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials'
            });
        }
        
        const user = users[0];
        
        if (!user.is_verified) {
            return res.status(401).json({
                status: 'error',
                message: 'Account not verified. Please check your email for verification link.'
            });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials'
            });
        }
        
        await db.promise().query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );
        
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(200).json({
            status: 'success',
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            token
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

// ========== ADMIN MANAGEMENT ROUTES ========== //

// Teacher Management
app.post('/api/teachers', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized access'
            });
        }
        
        const { name, email, password, department, phone, address } = req.body;
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const [userResult] = await db.promise().query(
            'INSERT INTO users (email, password, role, is_verified) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, 'teacher', true]
        );
        
        const [teacherResult] = await db.promise().query(
            'INSERT INTO teachers (user_id, name, department, phone, address) VALUES (?, ?, ?, ?, ?)',
            [userResult.insertId, name, department, phone, address]
        );
        
        await logActivity(req.user.userId, `Added new teacher: ${name}`);
        
        res.status(201).json({
            status: 'success',
            message: 'Teacher added successfully',
            data: {
                id: teacherResult.insertId,
                user_id: userResult.insertId,
                name,
                department,
                phone
            }
        });
        
    } catch (error) {
        console.error('Add teacher error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to add teacher'
        });
    }
});

app.get('/api/teachers', authenticateToken, async (req, res) => {
    try {
        const [teachers] = await db.promise().query(`
            SELECT t.id, t.name, u.email, t.department, t.phone, t.status
            FROM teachers t
            JOIN users u ON t.user_id = u.id
        `);
        
        res.status(200).json({
            status: 'success',
            data: teachers
        });
    } catch (error) {
        console.error('Get teachers error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch teachers'
        });
    }
});

// Student Management
app.post('/api/students', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized access'
            });
        }
        
        const { name, email, password, classId, parentId, address } = req.body;
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const [userResult] = await db.promise().query(
            'INSERT INTO users (email, password, role, is_verified) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, 'student', true]
        );
        
        const [studentResult] = await db.promise().query(
            'INSERT INTO students (user_id, name, class_id, parent_id, address) VALUES (?, ?, ?, ?, ?)',
            [userResult.insertId, name, classId || null, parentId || null, address]
        );
        
        await logActivity(req.user.userId, `Added new student: ${name}`);
        
        res.status(201).json({
            status: 'success',
            message: 'Student added successfully',
            data: {
                id: studentResult.insertId,
                user_id: userResult.insertId,
                name,
                classId,
                parentId
            }
        });
        
    } catch (error) {
        console.error('Add student error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to add student'
        });
    }
});

app.get('/api/students', authenticateToken, async (req, res) => {
    try {
        const [students] = await db.promise().query(`
            SELECT 
                s.id, 
                s.name, 
                u.email, 
                c.name as class_name, 
                p.name as parent_name, 
                s.address,
                s.status
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN classes c ON s.class_id = c.id
            LEFT JOIN parents p ON s.parent_id = p.id
        `);
        
        res.status(200).json({
            status: 'success',
            data: students
        });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch students'
        });
    }
});

// Parent Management
app.post('/api/parents', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized access'
            });
        }
        
        const { name, email, password, phone, address } = req.body;
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const [userResult] = await db.promise().query(
            'INSERT INTO users (email, password, role, is_verified) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, 'parent', true]
        );
        
        const [parentResult] = await db.promise().query(
            'INSERT INTO parents (user_id, name, phone, address) VALUES (?, ?, ?, ?)',
            [userResult.insertId, name, phone, address]
        );
        
        await logActivity(req.user.userId, `Added new parent: ${name}`);
        
        res.status(201).json({
            status: 'success',
            message: 'Parent added successfully',
            data: {
                id: parentResult.insertId,
                user_id: userResult.insertId,
                name,
                phone
            }
        });
        
    } catch (error) {
        console.error('Add parent error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to add parent'
        });
    }
});

app.get('/api/parents', authenticateToken, async (req, res) => {
    try {
        const [parents] = await db.promise().query(`
            SELECT p.id, p.name, u.email, p.phone, p.address
            FROM parents p
            JOIN users u ON p.user_id = u.id
        `);
        
        res.status(200).json({
            status: 'success',
            data: parents
        });
    } catch (error) {
        console.error('Get parents error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch parents'
        });
    }
});

// Class Management
app.post('/api/classes', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized access'
            });
        }
        
        const { name, teacherId, room } = req.body;
        
        const [result] = await db.promise().query(
            'INSERT INTO classes (name, teacher_id, room) VALUES (?, ?, ?)',
            [name, teacherId || null, room || null]
        );
        
        await logActivity(req.user.userId, `Added new class: ${name}`);
        
        res.status(201).json({
            status: 'success',
            message: 'Class added successfully',
            data: {
                id: result.insertId,
                name,
                teacherId,
                room
            }
        });
        
    } catch (error) {
        console.error('Add class error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to add class'
        });
    }
});

app.get('/api/classes', authenticateToken, async (req, res) => {
    try {
        const [classes] = await db.promise().query(`
            SELECT c.id, c.name, c.room, t.name as teacherName
            FROM classes c
            LEFT JOIN teachers t ON c.teacher_id = t.id
        `);
        
        res.status(200).json({
            status: 'success',
            data: classes
        });
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch classes'
        });
    }
});

// Subject Management
app.post('/api/subjects', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized access'
            });
        }
        
        const { name, classId, teacherId, book } = req.body;
        
        const [result] = await db.promise().query(
            'INSERT INTO subjects (name, class_id, teacher_id, book) VALUES (?, ?, ?, ?)',
            [name, classId || null, teacherId || null, book || null]
        );
        
        await logActivity(req.user.userId, `Added new subject: ${name}`);
        
        res.status(201).json({
            status: 'success',
            message: 'Subject added successfully',
            data: {
                id: result.insertId,
                name,
                classId,
                teacherId,
                book
            }
        });
        
    } catch (error) {
        console.error('Add subject error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to add subject'
        });
    }
});

app.get('/api/subjects', authenticateToken, async (req, res) => {
    try {
        const [subjects] = await db.promise().query(`
            SELECT 
                s.id, 
                s.name, 
                c.name as className,
                t.name as teacherName,
                s.book
            FROM subjects s
            LEFT JOIN classes c ON s.class_id = c.id
            LEFT JOIN teachers t ON s.teacher_id = t.id
        `);
        
        res.status(200).json({
            status: 'success',
            data: subjects
        });
    } catch (error) {
        console.error('Get subjects error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch subjects'
        });
    }
});

// ========== ATTENDANCE MANAGEMENT ========== //
app.post('/api/attendance', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized access'
            });
        }

        const { classId, date, records } = req.body;

        if (!classId || !date || !records || !Array.isArray(records)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid attendance data'
            });
        }

        // Delete existing attendance for this class/date combination
        await db.promise().query(
            'DELETE FROM attendance WHERE class_id = ? AND date = ?',
            [classId, date]
        );

        // Insert new attendance records
        const insertPromises = records.map(record => {
            return db.promise().query(
                'INSERT INTO attendance (student_id, class_id, date, status, note) VALUES (?, ?, ?, ?, ?)',
                [record.studentId, classId, date, record.status, record.note || null]
            );
        });

        await Promise.all(insertPromises);

        await logActivity(req.user.userId, `Recorded attendance for class ${classId}`);

        res.status(201).json({
            status: 'success',
            message: 'Attendance recorded successfully'
        });

    } catch (error) {
        console.error('Attendance recording error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to record attendance'
        });
    }
});

app.get('/api/attendance', authenticateToken, async (req, res) => {
    try {
        const { classId, date, studentId } = req.query;
        let query = `
            SELECT 
                a.id, 
                a.student_id as studentId,
                s.name as studentName,
                a.class_id as classId,
                c.name as className,
                a.date,
                a.status,
                a.note
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN classes c ON a.class_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (classId) {
            query += ' AND a.class_id = ?';
            params.push(classId);
        }

        if (date) {
            query += ' AND a.date = ?';
            params.push(date);
        }

        if (studentId) {
            query += ' AND a.student_id = ?';
            params.push(studentId);
        }

        query += ' ORDER BY a.date DESC, s.name ASC';

        const [attendance] = await db.promise().query(query, params);

        res.status(200).json({
            status: 'success',
            data: attendance
        });

    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch attendance records'
        });
    }
});

app.get('/api/attendance/summary', authenticateToken, async (req, res) => {
    try {
        const { classId, startDate, endDate } = req.query;
        
        let query = `
            SELECT 
                a.status,
                COUNT(*) as count
            FROM attendance a
            WHERE 1=1
        `;
        const params = [];

        if (classId) {
            query += ' AND a.class_id = ?';
            params.push(classId);
        }

        if (startDate && endDate) {
            query += ' AND a.date BETWEEN ? AND ?';
            params.push(startDate, endDate);
        } else if (startDate) {
            query += ' AND a.date >= ?';
            params.push(startDate);
        } else if (endDate) {
            query += ' AND a.date <= ?';
            params.push(endDate);
        }

        query += ' GROUP BY a.status';

        const [summary] = await db.promise().query(query, params);

        res.status(200).json({
            status: 'success',
            data: summary
        });

    } catch (error) {
        console.error('Attendance summary error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch attendance summary'
        });
    }
});

// ========== SCHOOL INFORMATION ========== //
app.get('/api/school-info', authenticateToken, async (req, res) => {
    try {
        const [info] = await db.promise().query('SELECT * FROM school_info LIMIT 1');
        
        res.status(200).json({
            status: 'success',
            data: info[0] || null
        });
    } catch (error) {
        console.error('Get school info error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch school information'
        });
    }
});

app.put('/api/school-info', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized access'
            });
        }

        const { name, address, email, phone } = req.body;

        const [existing] = await db.promise().query('SELECT id FROM school_info LIMIT 1');

        if (existing.length > 0) {
            await db.promise().query(
                'UPDATE school_info SET name = ?, address = ?, email = ?, phone = ? WHERE id = ?',
                [name, address, email, phone, existing[0].id]
            );
        } else {
            await db.promise().query(
                'INSERT INTO school_info (name, address, email, phone) VALUES (?, ?, ?, ?)',
                [name, address, email, phone]
            );
        }

        await logActivity(req.user.userId, 'Updated school information');

        res.status(200).json({
            status: 'success',
            message: 'School information updated successfully'
        });

    } catch (error) {
        console.error('Update school info error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update school information'
        });
    }
});

// ========== DASHBOARD STATISTICS ========== //
app.get('/api/dashboard-stats', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized access'
            });
        }

        const [teacherCount] = await db.promise().query('SELECT COUNT(*) as count FROM teachers');
        const [studentCount] = await db.promise().query('SELECT COUNT(*) as count FROM students');
        const [classCount] = await db.promise().query('SELECT COUNT(*) as count FROM classes');
        const [subjectCount] = await db.promise().query('SELECT COUNT(*) as count FROM subjects');
        const [parentCount] = await db.promise().query('SELECT COUNT(*) as count FROM parents');

        const [attendanceSummary] = await db.promise().query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM attendance
            WHERE date = CURDATE()
            GROUP BY status
        `);

        res.status(200).json({
            status: 'success',
            data: {
                teacherCount: teacherCount[0].count,
                studentCount: studentCount[0].count,
                classCount: classCount[0].count,
                subjectCount: subjectCount[0].count,
                parentCount: parentCount[0].count,
                attendanceSummary
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch dashboard statistics'
        });
    }
});

// ========== ACCOUNT MANAGEMENT ========== //
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        let userData;
        
        switch(req.user.role) {
            case 'admin':
                const [admin] = await db.promise().query(
                    'SELECT name FROM admins WHERE user_id = ?',
                    [req.user.userId]
                );
                userData = admin[0];
                break;
                
            case 'teacher':
                const [teacher] = await db.promise().query(
                    'SELECT id, name, department, phone FROM teachers WHERE user_id = ?',
                    [req.user.userId]
                );
                userData = teacher[0];
                break;
                
            case 'student':
                const [student] = await db.promise().query(`
                    SELECT s.id, s.name, c.name as class_name, p.name as parent_name 
                    FROM students s
                    LEFT JOIN classes c ON s.class_id = c.id
                    LEFT JOIN parents p ON s.parent_id = p.id
                    WHERE s.user_id = ?
                `, [req.user.userId]);
                userData = student[0];
                break;
                
            case 'parent':
                const [parent] = await db.promise().query(
                    'SELECT id, name, phone FROM parents WHERE user_id = ?',
                    [req.user.userId]
                );
                userData = parent[0];
                break;
                
            default:
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid user role'
                });
        }

        const [user] = await db.promise().query(
            'SELECT email, role FROM users WHERE id = ?',
            [req.user.userId]
        );
        
        res.status(200).json({
            status: 'success',
            data: {
                ...user[0],
                ...userData
            }
        });
        
    } catch (error) {
        console.error('Get user data error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user data'
        });
    }
});

app.put('/api/profile', authenticateToken, upload.none(), async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        
        switch(req.user.role) {
            case 'admin':
                await db.promise().query(
                    'UPDATE admins SET name = ?, phone = ?, address = ? WHERE user_id = ?',
                    [name, phone, address, req.user.userId]
                );
                break;
                
            case 'teacher':
                await db.promise().query(
                    'UPDATE teachers SET name = ?, phone = ?, address = ? WHERE user_id = ?',
                    [name, phone, address, req.user.userId]
                );
                break;
                
            case 'student':
                await db.promise().query(
                    'UPDATE students SET name = ?, phone = ?, address = ? WHERE user_id = ?',
                    [name, phone, address, req.user.userId]
                );
                break;
                
            case 'parent':
                await db.promise().query(
                    'UPDATE parents SET name = ?, phone = ?, address = ? WHERE user_id = ?',
                    [name, phone, address, req.user.userId]
                );
                break;
        }
        
        res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully'
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update profile'
        });
    }
});

app.put('/api/change-password', authenticateToken, upload.none(), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const [users] = await db.promise().query(
            'SELECT password FROM users WHERE id = ?',
            [req.user.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        
        const isMatch = await bcrypt.compare(currentPassword, users[0].password);
        
        if (!isMatch) {
            return res.status(400).json({
                status: 'error',
                message: 'Current password is incorrect'
            });
        }
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        await db.promise().query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.user.userId]
        );
        
        res.status(200).json({
            status: 'success',
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to change password'
        });
    }
});

// ========== PASSWORD RESET ========== //
app.post('/api/forgot-password', upload.none(), async (req, res) => {
    try {
        const { email } = req.body;
        
        const [users] = await db.promise().query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Email not found'
            });
        }
        
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000);
        
        await db.promise().query(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
            [resetToken, expiresAt, users[0].id]
        );
        
        const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
        
        await transporter.sendMail({
            from: `"School Management System" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h1>Password Reset</h1>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetLink}">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        });
        
        res.status(200).json({
            status: 'success',
            message: 'Password reset email sent'
        });
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process password reset request'
        });
    }
});

app.post('/api/reset-password', upload.none(), async (req, res) => {
    try {
        const { token, password } = req.body;
        
        if (!token || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Token and new password are required'
            });
        }
        
        const [users] = await db.promise().query(
            'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
            [token]
        );
        
        if (users.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid or expired token'
            });
        }
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        await db.promise().query(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [hashedPassword, users[0].id]
        );
        
        res.status(200).json({
            status: 'success',
            message: 'Password reset successfully'
        });
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to reset password'
        });
    }
});

// ========== ERROR HANDLING ========== //
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
});

app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Endpoint not found'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});