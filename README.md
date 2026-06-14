# 🎤 SPEAK – AI Voice-Controlled Exam System (MERN)

**SPEAK** is a cutting-edge, hands-free examination platform designed for accessibility and security. It leverages the **Web Speech API** for intuitive voice navigation and **Socket.io** for real-time orchestration between students and administrators.

![SPEAK Portal](https://img.shields.io/badge/Stack-MERN-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 🚀 Key Features

### 👨‍🎓 Student Experience
*   **Voice-First UX**: Entire journey from identification to submission is controlled via speech.
*   **Automatic Question Reading**: The system reads questions and MCQ options aloud using Speech Synthesis.
*   **Intelligent Verification**: Hear your recorded answer back before confirming; spelling-based name verification.
*   **Smart Navigation**: 
    *   `ENTER`: Start/Stop recording or Confirm.
    *   `R`: Repeat the current question or re-record an answer.
    *   `S`: Skip question (to be revisited later).
*   **Automatic Review**: The system intelligently flags skipped questions and returns to them once the initial round is finished.

### 👨‍💼 Administrator Control
*   **Real-time Handshake**: Instant notification when a student enters the "Waiting Room" via WebSockets.
*   **Live Monitoring**: Watch student responses stream into the dashboard in real-time.
*   **Exam Orchestration**: Remotely authorize students, set dynamic exam timers, and manage question banks.
*   **Data Export**: Download individual responses as `.txt` or the entire dataset as a structured `.json` file.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React (Vite), Tailwind CSS, Lucide React, Socket.io-client |
| **Backend** | Node.js, Express.js, Socket.io |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **Voice Engine** | Web Speech API (`SpeechRecognition` & `SpeechSynthesis`) |
| **Logic** | Custom React Hooks for fuzzy MCQ matching & state management |

---

## 🏗️ Architecture

1.  **Real-time Connection**: When a student confirms their name, a Socket.io event is emitted to the Admin.
2.  **Authorization**: The Admin clicks "Authorize," which triggers a signal back to the student's browser to start the exam.
3.  **Data Persistence**: Responses are sent via REST API to the Node.js server and stored in MongoDB.
4.  **Sync Engine**: The Admin dashboard listens for `admin_update_list` events to refresh analytics without page reloads.

---

## 💻 Getting Started

### Prerequisites
*   Node.js (v16+)
*   MongoDB Atlas Account or Local MongoDB Compass
*   Google Chrome (Required for Web Speech API support)

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/speak.git
    cd speak
    ```

2.  **Install All Dependencies** (Root, Backend, and Frontend)
    ```bash
    npm run install-all
    ```

3.  **Configure Environment Variables**
    Create a `.env` in the `backend/` folder:
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    ```
    Create a `.env` in the `frontend/` folder:
    ```env
    VITE_API_URL=http://localhost:5000
    ```

4.  **Seed the Question Bank**
    ```bash
    npm run seed
    ```

### Running the System
Start both the backend and frontend servers with one command:
```bash
npm run dev
```
*   **Frontend**: `http://localhost:5173`
*   **Backend**: `http://localhost:5000`

---


## 🎯 Future Roadmap
- [ ] **Proctoring**: Tab-switch detection and face-tracking using TensorFlow.js.
- [ ] **Multi-lingual Support**: Native language support for regional entrance exams.
- [ ] **Analytics**: Graphical score distribution and time-per-question metrics.
- [ ] **Auth**: Full Firebase/Auth0 integration for student accounts.

---

## 📌 Author
**Krishan Yadav**
*Full-Stack Developer | Accessible Systems Specialist*

---
*Protected by VIT Secure Proctoring Protocols*
