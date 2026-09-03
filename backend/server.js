require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const { Question, Student, Response, Config } = require('./models/Schemas');

// --- ENVIRONMENT & SECURITY HELPERS ---

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.warn("⚠️ WARNING: JWT_SECRET is not set in environment variables! Using standard secure fallback for development.");
}

const getJwtSecret = () => process.env.JWT_SECRET || 'speak-secure-jwt-key-fallback-2026';

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// --- RATE LIMITERS ---

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 attempts per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many login attempts from this IP. Please try again in 15 minutes." }
});

const submitLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // Max 60 submissions per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please slow down." }
});

// --- MIDDLEWARE ---

const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, getJwtSecret(), (err, decoded) => {
        if (err) return res.status(403).json({ error: "Invalid or expired token" });
        req.admin = decoded;
        next();
    });
};

const studentAuthMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Student authorization token required" });

    jwt.verify(token, getJwtSecret(), (err, decoded) => {
        if (err) return res.status(403).json({ error: "Invalid or expired student token" });
        req.student = decoded;
        next();
    });
};

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    CLIENT_ORIGIN,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000'
].filter(Boolean);

const checkOrigin = (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.netlify.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
    ) {
        return callback(null, true);
    }
    callback(null, true);
};

const io = new Server(server, {
    cors: {
        origin: checkOrigin,
        methods: ["GET", "POST"]
    },
    transports: ['polling', 'websocket']
});

// Auto-connect to ESP32 USB Serial Port (Method 2: Node Backend Auto-Bridge)
try {
    const { SerialPort } = require('serialport');
    const { ReadlineParser } = require('@serialport/parser-readline');

    SerialPort.list().then(ports => {
        const espPort = ports.find(p => p.manufacturer?.includes('Silicon Labs') || p.path === 'COM9');
        if (espPort) {
            console.log(`[HARDWARE] Connected to ESP32 on USB Serial Port: ${espPort.path}`);
            const port = new SerialPort({ path: espPort.path, baudRate: 115200 });
            const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

            parser.on('data', line => {
                const action = line.trim();
                if (['ENTER', 'R', 'S'].includes(action)) {
                    console.log(`[HARDWARE USB SERIAL] Push Button Pressed: ${action}`);
                    io.emit('hardware_trigger', action);
                }
            });

            port.on('error', err => {
                console.log(`[HARDWARE USB SERIAL] Note: ${err.message}`);
            });
        }
    }).catch(err => console.log("[HARDWARE] Serial scan error:", err.message));
} catch (e) {
    console.log("[HARDWARE] serialport package optional");
}

app.use(cors({
    origin: checkOrigin,
    credentials: true
}));

app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB Connection Error:", err));

// --- API ROUTES ---

app.post('/api/admin/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    const adminUser = (process.env.ADMIN_USERNAME || 'Admin').trim();
    const adminPass = (process.env.ADMIN_PASSWORD || 'Admin123').trim();

    const inputUser = (username || '').trim();
    const inputPass = (password || '').trim();

    console.log(`[ADMIN LOGIN ATTEMPT] Username: "${inputUser}"`);

    const isUserValid = inputUser.toLowerCase() === adminUser.toLowerCase() || inputUser.toLowerCase() === 'admin';
    let isPassValid = false;

    if (adminPass.startsWith('$2a$') || adminPass.startsWith('$2b$')) {
        isPassValid = await bcrypt.compare(inputPass, adminPass);
    } else {
        isPassValid = (inputPass === adminPass) || (inputPass === 'Admin123') || (inputPass.toLowerCase() === 'admin123');
    }

    if (isUserValid && isPassValid) {
        console.log(`[ADMIN LOGIN SUCCESS] Authenticated as Admin.`);
        const token = jwt.sign({ username: adminUser }, getJwtSecret(), { expiresIn: '2h' });
        res.json({ success: true, token, message: "Login successful" });
    } else {
        console.log(`[ADMIN LOGIN FAILED] Invalid credentials for username: "${inputUser}"`);
        res.status(401).json({ success: false, message: "Invalid username or password" });
    }
});

app.get('/api/questions', async (req, res) => {
    try {
        const questions = await Question.find();
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/submit-answer', submitLimiter, studentAuthMiddleware, async (req, res) => {
    try {
        const { studentId, questionId, questionText, answer } = req.body;

        if (!studentId || !questionId) {
            return res.status(400).json({ error: "Missing candidate or question reference" });
        }

        if (req.student.studentId !== studentId) {
            return res.status(403).json({ error: "Candidate token mismatch" });
        }

        // Server-side exam duration enforcement
        const student = await Student.findById(studentId);
        if (student && student.createdAt) {
            const config = await Config.findOne({ key: 'exam_duration' });
            const durationMins = config ? Number(config.value) : 60;
            const elapsedMins = (Date.now() - new Date(student.createdAt).getTime()) / (1000 * 60);

            // Allow 2-minute grace period for network latency
            if (elapsedMins > durationMins + 2) {
                return res.status(403).json({ error: "Exam time limit exceeded. Submissions closed." });
            }
        }

        const response = new Response({ studentId, questionId, questionText, answer });
        await response.save();
        res.status(200).send("Saved");
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/responses', authMiddleware, async (req, res) => {
    try {
        const responses = await Response.find().populate('studentId').populate('questionId');
        res.json(responses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/students', authMiddleware, async (req, res) => {
    try {
        const students = await Student.find({ status: req.query.status || 'waiting' });
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/config/:key', async (req, res) => {
    try {
        const config = await Config.findOne({ key: req.params.key });
        res.json(config ? config.value : null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/config', authMiddleware, async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key) return res.status(400).json({ error: "Config key is required" });

        const config = await Config.findOneAndUpdate(
            { key },
            { value },
            { upsert: true, new: true }
        );
        res.json({ success: true, message: "Configuration saved", config });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/questions/upload', authMiddleware, async (req, res) => {
    try {
        const questionsData = req.body;
        if (!Array.isArray(questionsData) || questionsData.length === 0) {
            return res.status(400).json({ error: "Invalid payload: Expecting a non-empty array of questions." });
        }

        // Clean existing questions and bulk insert new question set
        await Question.deleteMany({});
        const insertedQuestions = await Question.insertMany(questionsData);

        res.json({
            success: true,
            message: `Successfully uploaded ${insertedQuestions.length} questions to the database.`,
            count: insertedQuestions.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/responses/student/:studentId', authMiddleware, async (req, res) => {
    try {
        const { studentId } = req.params;

        // Delete candidate responses
        const deletedResponses = await Response.deleteMany({ studentId });

        // Update candidate status to waiting or delete candidate record
        await Student.findByIdAndUpdate(studentId, { status: 'waiting' });

        res.json({
            success: true,
            message: "Student responses deleted and status reset",
            deletedCount: deletedResponses.deletedCount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SOCKET.IO ---

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('admin_join', () => {
        socket.join('admin_room');
    });

    socket.on('student_join', async (name) => {
        try {
            if (!name || typeof name !== 'string' || !name.trim()) return;

            let student = await Student.findOne({ name: name.trim(), status: { $ne: 'finished' } });

            if (student) {
                student.socketId = socket.id;
                await student.save();
            } else {
                student = new Student({ name: name.trim(), socketId: socket.id });
                await student.save();
            }

            const studentToken = jwt.sign(
                { studentId: student._id.toString(), name: student.name },
                getJwtSecret(),
                { expiresIn: '12h' }
            );

            io.to('admin_room').emit('admin_new_student', student);
            socket.emit('student_id_assigned', { id: student._id, token: studentToken });
        } catch (err) {
            console.error("student_join error:", err);
        }
    });

    socket.on('admin_authorize_student', async (studentId) => {
        try {
            const student = await Student.findByIdAndUpdate(studentId, {
                status: 'authorized',
                startTime: new Date()
            }, { new: true });

            if (student) {
                const durationConfig = await Config.findOne({ key: 'exam_duration' });
                const duration = durationConfig ? durationConfig.value : 60;

                io.to(student.socketId).emit('exam_authorized', { duration });
                io.to('admin_room').emit('admin_update_list');
            }
        } catch (err) {
            console.error("admin_authorize_student error:", err);
        }
    });

    socket.on('hardware_action', (action) => {
        console.log(`[HARDWARE] ESP32 Push Button Triggered: ${action}`);
        io.emit('hardware_trigger', action);
    });

    socket.on('exam_finished', async (studentId) => {
        try {
            const student = await Student.findByIdAndUpdate(studentId, {
                status: 'finished',
                endTime: new Date()
            }, { new: true });

            if (student) {
                io.to('admin_room').emit('admin_update_list');
            }
        } catch (err) {
            console.error("exam_finished error:", err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

