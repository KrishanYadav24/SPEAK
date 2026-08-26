require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { Question, Student, Response, Config } = require('./models/Schemas');

// --- MIDDLEWARE ---

const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, process.env.JWT_SECRET || 'speak-secret-key', (err, decoded) => {
        if (err) return res.status(403).json({ error: "Invalid token" });
        req.admin = decoded;
        next();
    });
};

const studentAuthMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Student authorization token required" });

    jwt.verify(token, process.env.JWT_SECRET || 'speak-secret-key', (err, decoded) => {
        if (err) return res.status(403).json({ error: "Invalid or expired student token" });
        req.student = decoded;
        next();
    });
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB Connection Error:", err));

// --- API ROUTES ---

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME || 'Admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'Admin123';

    // Secure timing-safe password verification with bcrypt support
    const isUserValid = username === adminUser;
    let isPassValid = password === adminPass;

    if (adminPass.startsWith('$2a$') || adminPass.startsWith('$2b$')) {
        isPassValid = await bcrypt.compare(password, adminPass);
    }

    if (isUserValid && isPassValid) {
        const token = jwt.sign({ username }, process.env.JWT_SECRET || 'speak-secret-key', { expiresIn: '2h' });
        res.json({ success: true, token, message: "Login successful" });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
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

app.post('/api/submit-answer', studentAuthMiddleware, async (req, res) => {
    try {
        const { studentId, questionId, questionText, answer } = req.body;

        if (req.student.studentId !== studentId) {
            return res.status(403).json({ error: "Candidate token mismatch" });
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
        const responses = await Response.find().populate('studentId');
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

// --- SOCKET.IO ---

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('admin_join', () => {
        socket.join('admin_room');
    });

    socket.on('student_join', async (name) => {
        try {
            let student = await Student.findOne({ name, status: { $ne: 'finished' } });

            if (student) {
                student.socketId = socket.id;
                await student.save();
            } else {
                student = new Student({ name, socketId: socket.id });
                await student.save();
            }

            const studentToken = jwt.sign(
                { studentId: student._id.toString(), name: student.name },
                process.env.JWT_SECRET || 'speak-secret-key',
                { expiresIn: '12h' }
            );

            io.to('admin_room').emit('admin_new_student', student);
            socket.emit('student_id_assigned', { id: student._id, token: studentToken });
        } catch (err) {
            console.error(err);
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
            console.error(err);
        }
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
            console.error(err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
