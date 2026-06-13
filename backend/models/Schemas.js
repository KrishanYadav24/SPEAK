const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    type: { type: String, enum: ['mcq', 'text', 'subjective'], default: 'mcq' },
    options: { type: Map, of: String },
    correctAnswer: String,
    originalId: Number
});

const StudentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    socketId: String,
    status: { type: String, enum: ['waiting', 'authorized', 'finished'], default: 'waiting' },
    startTime: Date,
    endTime: Date
});

const ResponseSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    questionText: String,
    answer: String,
    timestamp: { type: Date, default: Date.now }
});

const ConfigSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    value: mongoose.Schema.Types.Mixed
});

module.exports = {
    Question: mongoose.model('Question', QuestionSchema),
    Student: mongoose.model('Student', StudentSchema),
    Response: mongoose.model('Response', ResponseSchema),
    Config: mongoose.model('Config', ConfigSchema)
};
