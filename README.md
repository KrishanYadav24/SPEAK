# 🎤 SPEAK – Voice Controlled Exam System

## 📌 Overview

SPEAK is a voice-enabled online examination system that allows students to take exams hands-free using speech. Admins can monitor, authorize, and manage exams in real time.

---

## 🚀 Key Features

### 👨‍🎓 Student Side

* 🎤 Voice-based answer recording using Web Speech API
* ⏳ Real-time exam timer with warnings
* 📊 Question palette (Answered / Skipped / Not Visited)
* 🔁 Automatic review of skipped questions

### 👨‍💼 Admin Side

* ✅ Authorize students before exam start
* ⏱️ Set exam duration dynamically
* 📂 Upload questions via JSON
* 📥 Download student responses as TXT files
* 🧹 Clear individual or all responses

---

## ⚙️ Tech Stack

* HTML, CSS, JavaScript
* Firebase Realtime Database
* Web Speech API (Speech Recognition + Speech Synthesis)

---

## 🧠 How It Works

1. Student enters name using voice
2. Waits for admin authorization
3. Admin approves from dashboard
4. Exam starts with countdown
5. Student answers using voice
6. Responses saved in Firebase

---

## 📁 Project Structure

* `index.html` → UI screens and layout
* `style.css` → JEE-style UI design
* `script.js` → Core logic (voice + Firebase + exam flow)
* `questions.json` → Question bank

---

## 🎯 Future Improvements

* 🔐 Firebase Authentication (Admin & Student login)
* 🛡️ Anti-cheating system (tab switch detection)
* 📊 Analytics dashboard (scores, time tracking)
* ⌨️ Typing fallback for voice input

---

## 🌐 Live Demo

(Coming soon – will be deployed on Vercel)

---

## 📌 Author

Krishan Yadav
