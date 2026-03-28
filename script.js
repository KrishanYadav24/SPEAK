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

// Palette & Status States
let questionStates = {};

const synth = window.speechSynthesis;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let portalRecognition;
let nameRecognition;

// --- PORTAL NAVIGATION (VOICE & CURSOR FREE) ---

function goToStudentPortal() {
    document.getElementById('portal-screen').style.display = 'none';
    document.getElementById('student-entry-screen').style.display = 'flex';
    speak("Student portal entered. Press enter to record, tell your name, and press enter again to stop.");
}

// MAKE CLICKABLE: Student Entrance
document.getElementById('to-student-portal').onclick = () => {
    goToStudentPortal();
};

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

    // Listen for authorization
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
    // Hide waiting screen immediately to avoid being stuck
    document.getElementById('waiting-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'flex';

    // Update instructions visuals
    document.getElementById('exam-title').innerText = "Authorized: Proceed to Exam";

    loadQuestions(); // Load questions just before starting
    setupMicTest();

    speak("You have been authorized.", () => {
        let count = 5;
        const countdownLoop = () => {
            if (count > 0) {
                speak(count.toString(), () => {
                    count--;
                    setTimeout(countdownLoop, 300);
                });
            } else {
                speak("Press Enter to start the exam.");
                isWaitingForStartEnter = true;
            }
        };
        countdownLoop();
    });
}

// --- ADMIN FLOW ---

document.getElementById('admin-login-btn').onclick = () => {
    const user = document.getElementById('admin-username').value;
    const pass = document.getElementById('admin-password').value;
    if (user === 'admin' && pass === 'admin123') {
        document.getElementById('admin-login-screen').style.display = 'none';
        document.getElementById('admin-screen').style.display = 'flex';
        loadAdminDashboard();
    } else { alert("Invalid Admin Credentials"); }
};

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
                    item.innerHTML = `<span><strong style="font-size: 1.2rem; color: #d9534f; font-weight: 900;">${students[id].name}</strong></span>
                                      <div style="display:flex; gap:10px;">
                                        <button class="btn btn-save" onclick="authorizeStudent('${id}')">Authorize</button>
                                        <button class="btn btn-clear" style="color:red; font-weight:bold;" onclick="clearStudent('${id}')">X</button>
                                      </div>`;
                    list.appendChild(item);
                }
            }
        } else { list.innerHTML = "No students waiting."; }
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
        refreshResponses();
    }
};

window.clearAllResponses = async () => {
    if(confirm("ARE YOU SURE? This will clear ALL student responses!")) {
        await remove(ref(db, 'exam_responses'));
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
            // Header with Clear All
            const header = document.createElement('div');
            header.style.marginBottom = "10px";
            header.innerHTML = `<button class="btn btn-clear" style="background:#d9534f; color:white;" onclick="clearAllResponses()">CLEAR ALL RESPONSES</button>`;
            list.appendChild(header);

            for (let userId in data) {
                const item = document.createElement('div');
                item.className = 'response-file-item';
                item.innerHTML = `<span><strong>User:</strong> ${userId}</span>
                                  <div style="display:flex; gap:5px;">
                                    <button class="btn btn-nav" onclick="downloadTXT('${userId}', ${JSON.stringify(data[userId]).replace(/"/g, '&quot;')})">Download TXT</button>
                                    <button class="btn btn-clear" style="color:red;" onclick="clearResponse('${userId}')">X</button>
                                  </div>`;
                list.appendChild(item);
            }
        } else { list.innerHTML = "No responses."; }
    });
}

window.downloadTXT = (name, data) => {
    let textContent = `EXAM RESPONSE: ${name}\n`;
    textContent += `---------------------------\n\n`;

    for (let qId in data) {
        const q = data[qId];
        textContent += `Question ${parseInt(qId)+1}: ${q.question}\n`;
        textContent += `Answer: ${q.answer}\n`;
        textContent += `Timestamp: ${new Date(q.timestamp).toLocaleString()}\n`;
        textContent += `---------------------------\n`;
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
        // ALWAYS fetch the local file first to ensure user edits are captured
        const res = await fetch('questions.json?' + Date.now());
        if (res.ok) {
            questions = await res.json();
            console.log("Questions loaded from local JSON file.");
        } else {
            // Fallback to Firebase if local file fails
            const qSnap = await get(ref(db, 'exam_questions'));
            if (qSnap.exists()) {
                questions = qSnap.val();
                console.log("Questions loaded from Firebase.");
            }
        }

        const cSnap = await get(ref(db, 'exam_config/duration'));
        if (cSnap.exists()) { totalTime = parseInt(cSnap.val()) * 60; timeLeft = totalTime; }

        questionStates = {};
        questions.forEach((_, i) => questionStates[i] = 0);
        renderPalette();
        updateCounts();
    } catch (e) {
        console.error("Error loading questions:", e);
    }
}

async function setupMicTest() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;
        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);
        javascriptNode.onaudioprocess = () => {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            let values = 0;
            for (let i = 0; i < array.length; i++) values += array[i];
            const average = values / array.length;
            if (document.getElementById('mic-meter-fill')) document.getElementById('mic-meter-fill').style.width = Math.min(average * 2, 100) + "%";
            if (document.getElementById('live-mic-fill')) document.getElementById('live-mic-fill').style.width = Math.min(average * 2, 100) + "%";
        };
    } catch (e) { console.error(e); }
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
        const filtered = transcript.replace(/recording started/gi, "").trim();
        currentAnswer = filtered;
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
    questions.forEach((_, i) => {
        const item = document.createElement('div');
        item.className = 'palette-item';
        item.innerText = (i + 1).toString().padStart(2, '0');
        if (i === (isReviewingSkipped ? skippedIndices[currentSkippedPtr] : currentIndex)) item.classList.add('active');
        if (questionStates[i] === 1) item.classList.add('v-notanswered');
        else if (questionStates[i] === 2) item.classList.add('v-answered');
        else item.classList.add('v-notvisited');
        palette.appendChild(item);
    });
}

function updateCounts() {
    let visited = 0, answered = 0, skipped = 0;
    Object.values(questionStates).forEach(state => {
        if (state === 0) visited++;
        else if (state === 1) skipped++;
        else if (state === 2) answered++;
    });
    if (document.getElementById('count-notvisited')) document.getElementById('count-notvisited').innerText = visited;
    if (document.getElementById('count-notanswered')) document.getElementById('count-notanswered').innerText = skipped;
    if (document.getElementById('count-answered')) document.getElementById('count-answered').innerText = answered;
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
    document.getElementById('q-label').innerText = `Question ${qIdx + 1}:`;
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
    updateCounts();
    speak(speechText + " Press Enter to record.");
}

function handleEnter() {
    // If waiting for the final start command
    if (isWaitingForStartEnter) {
        isWaitingForStartEnter = false;
        startExam();
        return;
    }

    // If on student entry screen (name recording)
    if (document.getElementById('student-entry-screen').style.display === 'flex') {
        handleNameEntryVoice();
        return;
    }

    if (isVerifyingAnswer === true) { saveAnswer(); return; }
    if (!isRecording) {
        currentAnswer = "";
        document.getElementById('answer-box').value = "";
        speak("Recording started.", () => {
            recognition.start();
        });
    }
    else { isVerifyingAnswer = 'pending'; recognition.stop(); }
}

function processRecordedAnswer() {
    if (currentAnswer === "") {
        isVerifyingAnswer = false;
        speak("I didn't hear anything. Try again.");
    } else {
        isVerifyingAnswer = true;
        speak(`You said: ${currentAnswer}. Press Enter to save.`);
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
    if (!isReviewingSkipped) skippedIndices.push(qIdx);
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
    document.getElementById('exam-screen').style.display = 'none';
    document.getElementById('finish-screen').style.display = 'block';

    const finishMessage = "Your exam has finished. Thank you.";
    speak(finishMessage, () => {
        // REDIRECT TO HOME AFTER 2 SECONDS of speech completion
        setTimeout(() => {
            location.reload();
        }, 2000);
    });
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft === Math.floor(totalTime / 2) && !warningsGiven.half) {
            speak("Time Warning. Half of the exam time is remaining.");
            warningsGiven.half = true;
        } else if (timeLeft === Math.floor(totalTime / 4) && !warningsGiven.quarter) {
            speak("Time Warning. One quarter of the exam time is remaining.");
            warningsGiven.quarter = true;
        }
        let mins = Math.floor(timeLeft / 60);
        let secs = timeLeft % 60;
        document.getElementById('timer').innerText = `Time Left: ${mins}:${secs.toString().padStart(2, '0')}`;
        if (timeLeft <= 0) finishExam();
    }, 1000);
}

function startExam() {
    isExamStarted = true;
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('exam-screen').style.display = 'flex';
    document.getElementById('display-name').innerText = currentUserName;
    startTimer();
    loadQuestion();
}

window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT') return;
    const key = e.key.toLowerCase();
    if (key === 'enter') handleEnter();
    else if (key === 'r' && isExamStarted) {
        if (isVerifyingAnswer) { isVerifyingAnswer = false; handleEnter(); }
        else loadQuestion();
    }
    else if (key === 's' && isExamStarted && !isRecording && !isVerifyingAnswer) skipQuestion();
});

document.getElementById('manual-save-btn').onclick = saveAnswer;
loadQuestions();
