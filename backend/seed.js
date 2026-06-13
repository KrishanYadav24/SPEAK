require('dotenv').config();
const mongoose = require('mongoose');
const { Question, Config } = require('./models/Schemas');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speak_exam';

const seedDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("MongoDB Connected for seeding");

        // Seed Questions
        const questionsPath = path.join(__dirname, '../questions.json');
        if (!fs.existsSync(questionsPath)) {
            throw new Error(`questions.json not found at ${questionsPath}`);
        }
        const rawData = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));

        // Clean data: Rename 'id' to 'originalId' to avoid MongoDB _id conflicts
        const questionsData = rawData.map(q => {
            const { id, ...rest } = q;
            return { ...rest, originalId: id };
        });

        await Question.deleteMany({});
        await Question.insertMany(questionsData);
        console.log("Questions Seeded Successfully!");

        // Seed Default Config
        await Config.deleteMany({});
        await Config.create({ key: 'exam_duration', value: 60 });
        console.log("Default Config Seeded!");

        process.exit(0);
    } catch (err) {
        console.error("Seeding Error:", err.message);
        process.exit(1);
    }
};

seedDB();
