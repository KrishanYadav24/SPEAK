import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import useVoiceCommand from '../hooks/useVoiceCommand';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ExamInterface = ({ user, config, onFinish }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(config.duration * 60);
  const [status, setStatus] = useState("Ready");
  const [isVerifyingAnswer, setIsVerifyingAnswer] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [skippedIndices, setSkippedIndices] = useState([]);
  const [isReviewingSkipped, setIsReviewingSkipped] = useState(false);
  const [currentSkippedPtr, setCurrentSkippedPtr] = useState(0);

  const onVoiceResult = useCallback((result) => {
    setCurrentAnswer(result);
  }, []);

  const { speak, startListening, stopListening, isListening, fuzzyMatch, error } = useVoiceCommand(onVoiceResult);

  // Sync internal isRecording with hook's isListening
  useEffect(() => {
    setIsRecording(isListening);
  }, [isListening]);

  useEffect(() => {
    axios.get(`${API_URL}/api/questions`).then(res => {
      setQuestions(res.data);
      if (res.data.length > 0) readQuestion(res.data[0], 0);
    });

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const nextTime = prev - 1;

        // Periodic audio announcements for accessibility
        const minutes = nextTime / 60;
        if (nextTime > 0) {
          if (minutes === 30 || minutes === 15 || minutes === 5 || minutes === 2) {
            speak(`${minutes} minutes remaining.`);
          } else if (nextTime === 60) {
            speak("One minute remaining.");
          } else if (nextTime === 30) {
            speak("30 seconds remaining.");
          } else if (nextTime <= 10 && nextTime > 0) {
             // Optional: count down last 10 seconds? User might find it too noisy,
             // but good for high stakes. For now, just the minutes/half-minute.
          }
        }

        if (nextTime <= 0) {
          clearInterval(timer);
          speak("Time is up. Your exam is being submitted automatically.", () => {
            onFinish();
          });
          return 0;
        }
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const readQuestion = (q, idx) => {
    let text = `Question ${idx + 1}. ${q.question}. `;
    if (q.type === 'mcq' && q.options) {
      Object.entries(q.options).forEach(([k, v]) => {
        text += `Option ${k}, ${v}. `;
      });
    }
    setCurrentAnswer("");
    setIsVerifyingAnswer(false);
    setStatus("Ready");
    speak(text + "Press Enter to record.");
  };

  const processRecordedAnswer = useCallback(() => {
    if (currentAnswer === "") {
      setIsVerifyingAnswer(false);
      speak("I didn't hear anything. Press Enter to try again.");
    } else {
      setIsVerifyingAnswer(true);
      const q = questions[currentIdx];
      const matched = fuzzyMatch(currentAnswer, q.options);

      // If it's an MCQ, speak the option key and value for clarity
      let feedback = `You said: ${matched}. `;
      if (q.type === 'mcq' && q.options[matched]) {
        feedback = `You selected option ${matched}: ${q.options[matched]}. `;
      } else {
        feedback = `I heard: ${currentAnswer}. `;
      }

      speak(feedback + "Press Enter to save or R to rerecord.");
    }
  }, [currentAnswer, questions, currentIdx, fuzzyMatch, speak]);

  // Watch for recording to stop and trigger verification
  const prevIsListening = useRef(false);
  useEffect(() => {
    if (prevIsListening.current === true && isListening === false && !isVerifyingAnswer) {
      processRecordedAnswer();
    }
    prevIsListening.current = isListening;
  }, [isListening, isVerifyingAnswer, processRecordedAnswer]);

  const handleSave = async () => {
    const q = questions[currentIdx];
    const matched = fuzzyMatch(currentAnswer, q.options);
    try {
      setStatus("Saving...");
      await axios.post(`${API_URL}/api/submit-answer`, {
        studentId: user.id,
        questionId: q._id,
        questionText: q.question,
        answer: matched
      });
      setAnswers(prev => ({ ...prev, [currentIdx]: matched }));
      setStatus("Status: Saved");
      moveToNext();
    } catch (err) {
      console.error(err);
      setStatus("Status: Error saving");
    }
  };

  const skipQuestion = () => {
    window.speechSynthesis.cancel();
    if (isListening) stopListening();

    if (!isReviewingSkipped) {
      setSkippedIndices(prev => prev.includes(currentIdx) ? prev : [...prev, currentIdx]);
    }

    speak("Skipped.");
    moveToNext();
  };

  const moveToNext = () => {
    setIsVerifyingAnswer(false);
    if (!isReviewingSkipped) {
      if (currentIdx < questions.length - 1) {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        readQuestion(questions[nextIdx], nextIdx);
      } else {
        startReview();
      }
    } else {
      if (currentSkippedPtr < skippedIndices.length - 1) {
        const nextPtr = currentSkippedPtr + 1;
        setCurrentSkippedPtr(nextPtr);
        const nextIdx = skippedIndices[nextPtr];
        setCurrentIdx(nextIdx);
        readQuestion(questions[nextIdx], nextIdx);
      } else {
        speak("Thank you, your exam is completed.", () => {
          onFinish();
        });
      }
    }
  };

  const startReview = () => {
    if (skippedIndices.length > 0) {
      setIsReviewingSkipped(true);
      setCurrentSkippedPtr(0);
      speak("Now we will visit the skipped questions.", () => {
        const firstSkippedIdx = skippedIndices[0];
        setCurrentIdx(firstSkippedIdx);
        readQuestion(questions[firstSkippedIdx], firstSkippedIdx);
      });
    } else {
      speak("Thank you, your exam is completed.", () => {
        onFinish();
      });
    }
  };

  const handleEnter = () => {
    if (isVerifyingAnswer) {
      handleSave();
    } else if (isListening) {
      stopListening();
    } else {
      setCurrentAnswer("");
      setIsVerifyingAnswer(false);
      speak("Recording started.", () => startListening());
    }
  };

  const handleRKey = () => {
    if (isVerifyingAnswer) {
      window.speechSynthesis.cancel();
      setIsVerifyingAnswer(false);
      setCurrentAnswer("");
      speak("Recording restarted.", () => startListening());
    } else if (!isListening) {
      readQuestion(questions[currentIdx], currentIdx);
    }
  };

  const handleKeyDown = (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    const key = e.key.toLowerCase();
    if (key === 'enter') {
      handleEnter();
    } else if (key === 's') {
      skipQuestion();
    } else if (key === 'r') {
      handleRKey();
    }
  };

  if (!questions.length) return <div role="status">Loading questions...</div>;
  const q = questions[currentIdx];

  return (
    <div
      className="h-screen flex flex-col bg-white overflow-hidden outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      autoFocus
      role="main"
      aria-label={`Exam Interface: Question ${currentIdx + 1} of ${questions.length}`}
    >
      {/* JEE MAIN HEADER */}
      <header className="flex justify-between items-center px-8 py-4 border-b-2 border-[#e2e8f0] min-h-[80px]" role="banner">
        <div className="text-center">
          <p className="text-[0.9rem] text-[#28a745] font-bold uppercase tracking-[1.5px] mt-1">Excellence in Assessment</p>
        </div>

        <div className="flex items-center gap-4 bg-[#f8fafc] border border-[#e2e8f0] p-3 px-5 rounded-lg">
          <div className="text-right text-[0.85rem] font-semibold">
            <p>Candidate: <span className="text-[#dc3545] font-extrabold">{user?.name}</span></p>
            <p>Remaining: <span className="text-[#dc3545] font-extrabold">Time Left: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span></p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* QUESTION AREA */}
        <main className="flex-1 p-10 overflow-y-auto flex flex-col relative" role="region" aria-labelledby="question-heading">
          <div className="border-b-2 border-[#f1f5f9] pb-5 mb-8">
            <h3 id="question-heading" className="text-[1.1rem] text-[#1c2b5e] font-bold mb-2 uppercase">
              Question {currentIdx + 1} of {questions.length}:
            </h3>
            <div className="text-[1.35rem] font-semibold text-[#0f172a] leading-relaxed" aria-describedby="question-text">
              <p id="question-text">{q.question}</p>
            </div>
          </div>

          <div className="space-y-3 mb-8" role="radiogroup" aria-label="Options">
            {q.type === 'mcq' && q.options && Object.entries(q.options).map(([key, val]) => {
              const isSelected = (isVerifyingAnswer || answers[currentIdx]) && fuzzyMatch(isVerifyingAnswer ? currentAnswer : (answers[currentIdx] || ""), q.options) === key;
              return (
                <div key={key}
                  role="radio"
                  aria-checked={isSelected}
                  className={`p-4 border-2 rounded-xl text-[1.1rem] font-medium transition-all duration-300
                    ${isSelected
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                      : 'bg-[#f8fafc] border-[#e2e8f0] text-slate-600 hover:border-slate-300'}`}>
                  <span className="font-bold mr-3">{key}.</span> {val}
                </div>
              );
            })}
          </div>

          <div
            className={`relative p-6 transition-all duration-500 rounded-xl mb-4 border-2
              ${isListening ? 'bg-blue-50/50 border-blue-400 shadow-lg' : 'bg-[#fffdf0] border-[#fde68a]'}`}
            aria-live="polite"
          >
            {isListening && (
                <div id="recording-indicator" className="absolute top-4 right-4 flex items-center gap-2" role="alert">
                    <span className="text-[0.7rem] font-bold text-red-500 animate-pulse uppercase tracking-widest">Recording</span>
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                </div>
            )}
            <label htmlFor="voice-transcript" className="font-bold text-[#1c2b5e] mb-2 block">Your Response:</label>
            <textarea
              id="voice-transcript"
              readOnly
              className="w-full h-44 p-5 text-[1.2rem] border border-[#cbd5e1] rounded-lg bg-white resize-none outline-none shadow-inner"
              placeholder="Your voice response will appear here..."
              value={isVerifyingAnswer || isListening ? currentAnswer : (answers[currentIdx] || "")}
              aria-label="Transcribed voice response"
            />
          </div>

          <div className="flex items-center justify-between mb-8">
            <p
                className={`font-bold uppercase text-sm tracking-widest transition-colors duration-300
                    ${isListening ? 'text-blue-600 animate-pulse' : (isVerifyingAnswer ? 'text-orange-500' : 'text-[#64748b]')}
                `}
                aria-live="assertive"
                role="status"
            >
                {isListening ? "Status: LISTENING..." : (isVerifyingAnswer ? "Status: PLEASE CONFIRM" : status)}
            </p>
            {error && <p className="text-red-500 text-[0.7rem] font-bold uppercase tracking-tight">Mic Error: {error}</p>}
          </div>

          <div className="mt-auto flex gap-4 pt-5 bg-[#f8fafc] -mx-10 px-10 border-t-2 border-[#f1f5f9]">
            <button className="bg-[#28a745] text-white px-8 py-3 rounded-lg font-bold shadow-[0_4px_0_#1e7e34] active:translate-y-0.5 active:shadow-none transition-all uppercase text-sm tracking-wider">Save & Next</button>
            <button onClick={onFinish} className="bg-[#1c2b5e] text-white px-8 py-3 rounded-lg font-bold ml-auto uppercase text-sm tracking-wider shadow-lg hover:bg-[#121c3d]">Submit Exam</button>
          </div>
        </main>

        {/* SIDEBAR */}
        <aside className="w-[340px] bg-[#f8fafc] border-l-2 border-[#f1f5f9] p-8 overflow-y-auto flex flex-col shrink-0">
          <div className="bg-white border border-[#e2e8f0] p-6 rounded-2xl mb-8 shadow-sm">
            <div className="flex items-center gap-4 mb-4 text-[0.9rem] font-semibold text-[#475569]">
              <span className="w-5 h-5 bg-[#28a745] rounded-md border border-[#1e7e34]" /> Answered
            </div>
            <div className="flex items-center gap-4 text-[0.9rem] font-semibold text-[#475569]">
              <span className="w-5 h-5 bg-[#dc3545] rounded-md border border-[#bd2130]" /> Skipped / Pending
            </div>
          </div>

          <h4 className="text-[#1c2b5e] font-black uppercase tracking-widest text-xs mb-6 px-1 opacity-60">Question Palette:</h4>
          <div className="grid grid-cols-4 gap-3">
            {questions.map((_, i) => {
              const isAnswered = !!answers[i];
              const isSkipped = skippedIndices.includes(i);
              const isActive = i === currentIdx;

              return (
                <button
                  key={i}
                  onClick={() => {
                      if (!isReviewingSkipped || skippedIndices.includes(i)) {
                          setCurrentIdx(i);
                          if (isReviewingSkipped) {
                              setCurrentSkippedPtr(skippedIndices.indexOf(i));
                          }
                      }
                  }}
                  className={`aspect-square flex items-center justify-center rounded-xl font-bold text-[1.1rem] border-2 transition-all duration-300
                    ${isActive ? 'ring-4 ring-blue-500/20 border-blue-500 scale-105 z-10' : 'border-[#cbd5e1] hover:border-slate-400'}
                    ${isAnswered ? 'bg-[#28a745] text-white border-[#1e7e34]' : (isSkipped ? 'bg-[#dc3545] text-white border-[#bd2130]' : 'bg-white text-slate-400')}
                  `}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-12 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <p className="text-[0.7rem] font-black text-slate-400 uppercase tracking-widest text-center">Controls</p>
              <div className="grid gap-2">
                  <div className="flex items-center justify-between text-[0.75rem] font-bold text-slate-500 bg-slate-50 p-2 px-3 rounded-lg">
                      <span>Start/Stop</span>
                      <kbd className="bg-white border border-slate-300 rounded px-1 min-w-[30px] text-center shadow-sm">ENTER</kbd>
                  </div>
                  <div className="flex items-center justify-between text-[0.75rem] font-bold text-slate-500 bg-slate-50 p-2 px-3 rounded-lg">
                      <span>Rerecord</span>
                      <kbd className="bg-white border border-slate-300 rounded px-1 min-w-[30px] text-center shadow-sm">R</kbd>
                  </div>
                  <div className="flex items-center justify-between text-[0.75rem] font-bold text-slate-500 bg-slate-50 p-2 px-3 rounded-lg">
                      <span>Skip</span>
                      <kbd className="bg-white border border-slate-300 rounded px-1 min-w-[30px] text-center shadow-sm">S</kbd>
                  </div>
              </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ExamInterface;
