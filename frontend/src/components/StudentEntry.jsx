import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, UserCircle, ArrowLeft, Radio, CheckCircle2, RefreshCcw } from 'lucide-react';
import useVoiceCommand from '../hooks/useVoiceCommand';

const StudentEntry = ({ onJoined, onBack }) => {
  const [detectedName, setDetectedName] = useState("");
  const [isVerifyingName, setIsVerifyingName] = useState(false);
  const containerRef = useRef(null);

  const onVoiceResult = useCallback((result) => {
    setDetectedName(result);
  }, []);

  const { speak, startListening, stopListening, isListening, error } = useVoiceCommand(onVoiceResult);

  // Initial instructions and focus
  useEffect(() => {
    speak("Student portal entered. Press enter to record your name, and press enter again to stop.");
    if (containerRef.current) containerRef.current.focus();
  }, [speak]);

  // Handle automatic logic when recording stops
  const handleRecordingStopped = useCallback(() => {
    if (detectedName) {
      setIsVerifyingName(true);
      const spelledName = detectedName.split('').join(' ');
      speak(`I heard ${detectedName}. Spelled as ${spelledName}. Press Enter to proceed or R to re-record.`);
    } else {
      speak("I was unable to hear your name. Press enter to re-record.");
    }
  }, [detectedName, speak]);

  // Watch for isListening changing from true to false
  const prevIsListening = useRef(false);
  useEffect(() => {
    if (prevIsListening.current === true && isListening === false && !isVerifyingName) {
      handleRecordingStopped();
    }
    prevIsListening.current = isListening;
  }, [isListening, isVerifyingName, handleRecordingStopped]);

  const handleKeyDown = (e) => {
    const key = e.key.toLowerCase();

    if (key === 'enter') {
      if (isVerifyingName) {
        speak("Name confirmed. Wait for authorization.");
        onJoined(detectedName);
      } else if (isListening) {
        stopListening();
      } else {
        setDetectedName("");
        setIsVerifyingName(false);
        startListening();
      }
    } else if (key === 'r') {
      window.speechSynthesis.cancel();
      setDetectedName("");
      setIsVerifyingName(false);
      startListening();
    }
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden p-4 outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-[#1c2b5e]/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      </div>

      <div className="bg-white p-10 md:p-14 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 max-w-lg w-full relative z-10 animate-in fade-in slide-in-from-bottom-12 duration-700">
        <div className="flex flex-col items-center mb-10 text-center">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-500 shadow-lg rotate-3
                ${isListening ? 'bg-blue-600 scale-110' : (isVerifyingName ? 'bg-green-600' : 'bg-slate-800')}
            `}>
                {isListening ? <Radio className="w-10 h-10 text-white animate-pulse" /> : (isVerifyingName ? <CheckCircle2 className="w-10 h-10 text-white" /> : <UserCircle className="w-10 h-10 text-white" />)}
            </div>
            <h2 className="text-[#1c2b5e] text-4xl font-black tracking-tight mb-2 uppercase">Identity Check</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">
                Biometric Voice Verification
            </p>
        </div>

        <div className="space-y-6 mb-10">
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center space-y-4">
                <p className="text-[#1c2b5e] font-black text-sm uppercase tracking-widest">Instructions</p>
                <p className="text-slate-500 font-bold text-base leading-relaxed px-4">
                    Press <span className="text-blue-600">ENTER</span> to record your name, then <br />
                    press <span className="text-blue-600">ENTER</span> again to stop.
                </p>
            </div>

            <div className={`relative overflow-hidden transition-all duration-500 bg-white border-2 rounded-[32px] p-10 flex flex-col items-center justify-center min-h-[140px]
                ${isListening ? 'border-blue-500 ring-8 ring-blue-500/5 shadow-inner' : (isVerifyingName ? 'border-green-500 bg-green-50/30' : 'border-slate-100')}
            `}>
              {isListening && (
                  <div className="absolute inset-x-0 bottom-0 h-1 flex items-end gap-1 px-8 opacity-40">
                      {[...Array(15)].map((_, i) => (
                          <div key={i} className="flex-1 bg-blue-500 rounded-t-full" style={{ height: `${20 + Math.random() * 80}%`, transition: 'height 0.2s ease' }} />
                      ))}
                  </div>
              )}

              <div className={`text-2xl font-black tracking-tight transition-all duration-300 text-center
                ${detectedName ? 'text-[#1c2b5e]' : 'text-slate-300 italic'}
              `}>
                {isListening ? (
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                        Listening...
                    </div>
                ) : (detectedName ? detectedName : "Waiting for command")}
              </div>
            </div>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-500">
                <Mic className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs font-black uppercase tracking-tight leading-tight">
                    Microphone Error: {error === 'not-allowed' ? "Permission Denied" : error}
                </p>
            </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center gap-2">
                <kbd className="bg-white border-2 border-slate-200 px-3 py-1 rounded-xl text-[10px] font-black text-slate-500 shadow-sm">R</kbd>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Re-record</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center gap-2">
                <kbd className="bg-white border-2 border-slate-200 px-3 py-1 rounded-xl text-[10px] font-black text-slate-500 shadow-sm">ENTER</kbd>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm</span>
            </div>
        </div>

        <button
          onClick={onBack}
          className="w-full py-4 text-slate-400 hover:text-[#1c2b5e] transition-all font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-2 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Cancel Registration
        </button>
      </div>
    </div>
  );
};

export default StudentEntry;
