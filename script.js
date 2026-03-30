import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, remove, update } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

// --- CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDQ0WVqIceaNI6nVsrsFhqFmFSlcHE2nlk",
    authDomain: "speak-b8849.firebaseapp.com",
    databaseURL: "https://speak-b8849-default-rtdb.firebaseio.com",
    projectId: "speak-b8849",
    storageBucket: "speak-b8849.firebasestorage.app",
    messagingSenderId: "663799474841",
    appId: "1:663799474841:web:927b20b2534de0a045a608",
    measurementId: "G-5M4YG2P0ZJ"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// State Variables
let questions = [];
let currentIndex = 0;
let skippedIndices = [];
let isReviewingSkipped = false;
let currentSkippedPtr = 0;
let isExamStarted = false;
let isRecording = false;
let isVerifyingAnswer = false;
let currentAnswer = "";
let totalTime = 3600;
let timeLeft = 3600;
let timerInterval;
let currentUserId = null;
let currentUserName = "";
let warningsGiven = { half: false, quarter: false };
let isNameRecording = false;
let isAuthorized = false;
let isWaitingForStartEnter = false;
let examStartTime = null;

// Palette & Status States
let questionStates = {};

const synth = window.speechSynthesis;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let nameRecognition;

// --- PORTAL NAVIGATION ---

function goToStudentPortal() {
    document.getElementById('portal-screen').style.display = 'none';
    document.getElementById('student-entry-screen').style.display = 'flex';
    speak("Student portal entered. Press enter to record, tell your name, and press enter again to stop.");
}

document.getElementById('to-student-portal').onclick = () => goToStudentPortal();
document.getElementById('to-admin-login').onclick = () => {
    document.getElementById('portal-screen').style.display = 'none';
    document.getElementById('admin-login-screen').style.display = 'flex';
};

// --- STUDENT FLOW ---

function handleNameEntryVoice() {
    if (isNameRecording) {
        isNameRecording = false;
        if (nameRecognition) nameRecognition.stop();
    } else {
        isNameRecording = true;
        nameRecognition = new SpeechRecognition();
        nameRecognition.lang = 'en-US';
        nameRecognition.onstart = () => {
            document.getElementById('student-name-display').innerText = "Recording Name...";
        };
        nameRecognition.onresult = (event) => {
            const name = event.results[0][0].transcript;
            currentUserName = name;
            document.getElementById('student-name-display').innerText = "Detected: " + name;
        };
        nameRecognition.onend = () => {
            if (currentUserName && !isNameRecording) {
                speak(currentUserName + ". Wait for authorization.");
                submitStudentEntry();
            }
        };
        nameRecognition.start();
    }
}

async function submitStudentEntry() {
    currentUserId = currentUserName.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Math.floor(Math.random() * 1000);
    await set(ref(db, 'waiting_students/' + currentUserId), {
        name: currentUserName,
        status: 'waiting',
        timestamp: Date.now()
    });
    document.getElementById('student-entry-screen').style.display = 'none';
    document.getElementById('waiting-screen').style.display = 'flex';

    const authRef = ref(db, 'waiting_students/' + currentUserId);
    onValue(authRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.status === 'authorized' && !isAuthorized) {
                isAuthorized = true;
                runAuthorizationCountdown();
            }
        }
    });
}

function runAuthorizationCountdown() {
    document.getElementById('waiting-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'flex';
    loadQuestions();
    setupMicTest();

    speak("You have been authorized.", () => {
        let count = 5;
        const countdownLoop = () => {
            if (count > 0) {
                document.getElementById('countdown-display').innerText = count;
                speak(count.toString(), () => {
                    count--;
                    setTimeout(countdownLoop, 300);
                });
            } else {
                document.getElementById('countdown-display').innerText = "GO!";
                speak("Press Enter to start the exam.");
                isWaitingForStartEnter = true;
            }
        };
        countdownLoop();
    });
}

// --- ADMIN DASHBOARD ---

document.getElementById('admin-login-btn').onclick = () => {
    const user = document.getElementById('admin-username').value;
    const pass = document.getElementById('admin-password').value;
    if (user === 'admin' && pass === 'admin123') {
        document.getElementById('admin-login-screen').style.display = 'none';
        document.getElementById('admin-screen').style.display = 'flex';
        loadAdminDashboard();
    } else { alert("Invalid Admin Credentials"); }
};

// Toggle between sections
function showAdminSection(sectionId) {
    const sections = ['dashboard-view', 'students-view'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === sectionId) ? 'block' : 'none';
    });

    // Update active link
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    navLinks.forEach(link => {
        if (link.innerText.toLowerCase() === sectionId.replace('-view', '').toLowerCase()) {
            link.classList.add('active');
        } else if (link.innerText === "Dashboard" && sectionId === "dashboard-view") {
             link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Assign click handlers for sidebar
document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.onclick = (e) => {
        const text = e.target.innerText;
        if (text === "Dashboard") showAdminSection('dashboard-view');
        if (text === "Students") {
            showAdminSection('students-view');
            loadStudentsAnalytics();
        }
    };
});

function loadAdminDashboard() {
    onValue(ref(db, 'waiting_students'), (snapshot) => {
        const list = document.getElementById('waiting-students-list');
        list.innerHTML = "";
        if (snapshot.exists()) {
            const students = snapshot.val();
            for (let id in students) {
                if (students[id].status === 'waiting') {
                    const item = document.createElement('div');
                    item.className = 'response-file-item';
                    item.innerHTML = `<span><strong>${students[id].name}</strong></span>
                                      <div class="controls-row">
                                        <button class="admin-btn admin-btn-primary" onclick="authorizeStudent('${id}')">Authorize</button>
                                        <button class="admin-btn admin-btn-secondary" style="color:red;" onclick="clearStudent('${id}')">X</button>
                                      </div>`;
                    list.appendChild(item);
                }
            }
        } else { list.innerHTML = "<p style='padding:10px; color:#999;'>No students waiting.</p>"; }
    });

    get(ref(db, 'exam_config/duration')).then(snap => {
        if(snap.exists()) document.getElementById('exam-duration-input').value = snap.val();
    });

    document.getElementById('save-config-btn').onclick = async () => {
        const dur = document.getElementById('exam-duration-input').value;
        await set(ref(db, 'exam_config/duration'), dur);
        alert("Configuration saved!");
    };

    refreshResponses();
    document.getElementById('upload-btn').onclick = uploadQuestions;
    document.getElementById('refresh-responses').onclick = refreshResponses;
}

async function loadStudentsAnalytics() {
    const container = document.getElementById('students-analytics-list');
    container.innerHTML = "Loading analytics...";

    const responsesSnap = await get(ref(db, 'exam_responses'));
    const metadataSnap = await get(ref(db, 'exam_metadata'));
    const questionsSnap = await get(ref(db, 'exam_questions'));

    const totalQuestions = questionsSnap.exists() ? questionsSnap.val().length : 0;

    container.innerHTML = "";

    if (responsesSnap.exists()) {
        const responses = responsesSnap.val();
        const metadata = metadataSnap.exists() ? metadataSnap.val() : {};

        for (let userId in responses) {
            const userResponses = responses[userId];
            const userMeta = metadata[userId] || {};

            let attempted = 0;
            for (let qIdx in userResponses) attempted++;

            const skipped = totalQuestions - attempted;

            // Format time taken
            let timeStr = "N/A";
            if (userMeta.startTime && userMeta.endTime) {
                const diffMs = userMeta.endTime - userMeta.startTime;
                const totalSecs = Math.floor(diffMs / 1000);
                const mins = Math.floor(totalSecs / 60);
                const secs = totalSecs % 60;
                timeStr = `${mins}m ${secs}s`;
            } else if (userMeta.startTime) {
                timeStr = "In Progress";
            }

            const card = document.createElement('div');
            card.className = 'admin-card';
            card.style.marginBottom = "15px";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h4 style="color:#1c2b5e; margin:0;">${userId}</h4>
                        <p style="font-size:0.85rem; color:#64748b; margin:5px 0;">Time Taken: <strong>${timeStr}</strong></p>
                    </div>
                    <div style="display:flex; gap:20px; text-align:center;">
                        <div>
                            <div style="font-size:1.2rem; font-weight:700; color:#22c55e;">${attempted}</div>
                            <div style="font-size:0.7rem; color:#64748b; text-transform:uppercase;">Attempted</div>
                        </div>
                        <div>
                            <div style="font-size:1.2rem; font-weight:700; color:#ef4444;">${skipped}</div>
                            <div style="font-size:0.7rem; color:#64748b; text-transform:uppercase;">Skipped</div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        }
    } else {
        container.innerHTML = "<p>No student data available yet.</p>";
    }
}

window.authorizeStudent = async (id) => {
    await update(ref(db, 'waiting_students/' + id), { status: 'authorized' });
};

window.clearStudent = async (id) => {
    if(confirm("Clear this student?")) {
        await remove(ref(db, 'waiting_students/' + id));
    }
};

window.clearResponse = async (userId) => {
    if(confirm("Clear response for " + userId + "?")) {
        await remove(ref(db, 'exam_responses/' + userId));
        await remove(ref(db, 'exam_metadata/' + userId));
        refreshResponses();
    }
};

async function uploadQuestions() {
    const fileInput = document.getElementById('question-upload');
    if (fileInput.files.length === 0) { alert("Select a file"); return; }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const qs = JSON.parse(e.target.result);
            await set(ref(db, 'exam_questions'), qs);
            alert("Questions uploaded to server!");
            loadQuestions();
        } catch (err) { alert("Invalid JSON"); }
    };
    reader.readAsText(file);
}

function refreshResponses() {
    const list = document.getElementById('responses-list');
    list.innerHTML = "Loading...";
    get(ref(db, 'exam_responses')).then((snapshot) => {
        list.innerHTML = "";
        if (snapshot.exists()) {
            const data = snapshot.val();
            for (let userId in data) {
                const item = document.createElement('div');
                item.className = 'response-file-item';
                item.innerHTML = `<span><strong>${userId}</strong></span>
                                  <div class="controls-row">
                                    <button class="admin-btn admin-btn-secondary" onclick="downloadTXT('${userId}', ${JSON.stringify(data[userId]).replace(/"/g, '&quot;')})">Download</button>
                                    <button class="admin-btn admin-btn-secondary" style="color:red;" onclick="clearResponse('${userId}')">X</button>
                                  </div>`;
                list.appendChild(item);
            }
        } else { list.innerHTML = "<p style='padding:10px; color:#999;'>No responses found.</p>"; }
    });
}

window.downloadTXT = (name, data) => {
    let textContent = `EXAM RESPONSE: ${name}\n\n`;
    for (let qId in data) {
        const q = data[qId];
        textContent += `Q${parseInt(qId)+1}: ${q.question}\nAnswer: ${q.answer}\n\n`;
    }
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response_${name}.txt`;
    a.click();
};

// --- CORE EXAM ENGINE ---

async function loadQuestions() {
    try {
        const res = await fetch('questions.json?' + Date.now());
        if (res.ok) questions = await res.json();
        else {
            const qSnap = await get(ref(db, 'exam_questions'));
            if (qSnap.exists()) questions = qSnap.val();
        }

        const cSnap = await get(ref(db, 'exam_config/duration'));
        if (cSnap.exists()) { totalTime = parseInt(cSnap.val()) * 60; timeLeft = totalTime; }

        questionStates = {};
        questions.forEach((_, i) => questionStates[i] = 0);
        renderPalette();
    } catch (e) { console.error("Error loading questions:", e); }
}

async function setupMicTest() {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) { console.error("Mic access denied"); }
}

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => {
        isRecording = true;
        document.getElementById('recording-indicator').style.display = 'block';
        document.getElementById('status-indicator').innerText = "Status: LISTENING...";
    };
    recognition.onresult = (event) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
        currentAnswer = transcript.trim();
        document.getElementById('answer-box').value = currentAnswer;
    };
    recognition.onend = () => {
        isRecording = false;
        document.getElementById('recording-indicator').style.display = 'none';
        if (isVerifyingAnswer === 'pending') processRecordedAnswer();
    };
}

function renderPalette() {
    const palette = document.getElementById('question-palette');
    if (!palette) return;
    palette.innerHTML = "";

    const activeIdx = isReviewingSkipped ? skippedIndices[currentSkippedPtr] : currentIndex;

    questions.forEach((_, i) => {
        const item = document.createElement('div');
        item.className = 'palette-item';
        if (i === activeIdx) item.classList.add('active');

        if (questionStates[i] === 2) {
            item.classList.add('v-answered');
        } else if (questionStates[i] === 1) {
            item.classList.add('v-notanswered');
        }

        item.innerText = i + 1;
        palette.appendChild(item);
    });
}

function speak(text, callback) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => { if (callback) callback(); };
    window.speechSynthesis.speak(utterance);
}

function loadQuestion() {
    let qIdx = isReviewingSkipped ? skippedIndices[currentSkippedPtr] : currentIndex;
    const q = questions[qIdx];
    if (questionStates[qIdx] === 0) questionStates[qIdx] = 1;

    document.getElementById('q-label').innerHTML = `<span class="question-number-tag">Question ${qIdx + 1}/${questions.length}:</span>`;
    document.getElementById('question-display').innerText = q.question;

    const optCont = document.getElementById('options-container');
    optCont.innerHTML = "";
    document.getElementById('answer-box').value = "";
    currentAnswer = "";
    isVerifyingAnswer = false;

    let speechText = `Question ${qIdx + 1}. ${q.question}. `;
    if (q.type === 'mcq') {
        for (let [key, val] of Object.entries(q.options)) {
            optCont.innerHTML += `<div class="option-item">${key}: ${val}</div>`;
            speechText += `Option ${key}, ${val}. `;
        }
    }

    renderPalette();
    speak(speechText + " Press Enter to record.");
}

function handleEnter() {
    if (isWaitingForStartEnter) {
        isWaitingForStartEnter = false;
        startExam();
        return;
    }
    if (document.getElementById('student-entry-screen').style.display === 'flex') {
        handleNameEntryVoice();
        return;
    }
    if (isVerifyingAnswer === true) { saveAnswer(); return; }
    if (!isRecording) {
        currentAnswer = "";
        document.getElementById('answer-box').value = "";
        speak("Recording started.", () => recognition.start());
    } else {
        isVerifyingAnswer = 'pending';
        recognition.stop();
    }
}

function processRecordedAnswer() {
    if (currentAnswer === "") {
        isVerifyingAnswer = false;
        speak("I didn't hear anything. Try again.");
    } else {
        isVerifyingAnswer = true;
        speak(`You said: ${currentAnswer}. Press Enter to save or R to rerecord.`);
    }
}

async function saveAnswer() {
    let qIdx = isReviewingSkipped ? skippedIndices[currentSkippedPtr] : currentIndex;
    try {
        await set(ref(db, `exam_responses/${currentUserId}/${qIdx}`), {
            question: questions[qIdx].question,
            answer: currentAnswer,
            timestamp: Date.now()
        });
        questionStates[qIdx] = 2;
        moveToNext();
    } catch (e) { speak("Error saving."); }
}

function skipQuestion() {
    let qIdx = isReviewingSkipped ? skippedIndices[currentSkippedPtr] : currentIndex;
    if (!isReviewingSkipped) {
        if (!skippedIndices.includes(qIdx)) skippedIndices.push(qIdx);
    }
    questionStates[qIdx] = 1;
    speak("Skipped.");
    moveToNext();
}

function moveToNext() {
    isVerifyingAnswer = false;
    if (!isReviewingSkipped) {
        currentIndex++;
        if (currentIndex < questions.length) loadQuestion();
        else startReview();
    } else {
        currentSkippedPtr++;
        if (currentSkippedPtr < skippedIndices.length) loadQuestion();
        else finishExam();
    }
}

function startReview() {
    if (skippedIndices.length > 0) {
        isReviewingSkipped = true;
        currentSkippedPtr = 0;
        speak("Now reviewing skipped questions.", loadQuestion);
    } else finishExam();
}

async function finishExam() {
    isExamStarted = false;

    // Save metadata
    if (currentUserId) {
        await update(ref(db, 'exam_metadata/' + currentUserId), {
            endTime: Date.now()
        });
    }

    document.getElementById('exam-screen').style.display = 'none';
    document.getElementById('finish-screen').style.display = 'flex';
    speak("Your exam has finished. Thank you.", () => {
        setTimeout(() => location.reload(), 5000);
    });
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        let mins = Math.floor(timeLeft / 60);
        let secs = timeLeft % 60;
        document.getElementById('timer').innerText = `Time Left: ${mins}:${secs.toString().padStart(2, '0')}`;
        if (timeLeft <= 0) finishExam();
    }, 1000);
}

async function startExam() {
    isExamStarted = true;
    examStartTime = Date.now();

    // Save metadata
    if (currentUserId) {
        await set(ref(db, 'exam_metadata/' + currentUserId), {
            startTime: examStartTime,
            name: currentUserName
        });
    }

    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('exam-screen').style.display = 'flex';
    document.getElementById('display-name').innerText = currentUserName;
    startTimer();
    loadQuestion();
}

function handleRKey() {
    if (!isExamStarted) return;

    if (isVerifyingAnswer === true) {
        // Rerecord logic
        window.speechSynthesis.cancel();
        isVerifyingAnswer = false;
        currentAnswer = "";
        document.getElementById('answer-box').value = "";
        speak("Recording restarted.", () => recognition.start());
    } else if (!isRecording) {
        // Repeat question logic
        loadQuestion();
    }
}

window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    const key = e.key.toLowerCase();
    if (key === 'enter') handleEnter();
    else if (key === 's' && isExamStarted && !isRecording && !isVerifyingAnswer) skipQuestion();
    else if (key === 'r') handleRKey();
});

document.getElementById('manual-save-btn').onclick = saveAnswer;
