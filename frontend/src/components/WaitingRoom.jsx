import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldCheck, Timer } from 'lucide-react';

const WaitingRoom = ({ name, isAuthorized, onCountdownEnd }) => {
  const [count, setCount] = useState(5);
  const hasSpokenRef = useRef(false);

  const speak = (text, callback) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.onend = () => callback?.();
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isAuthorized) {
      if (!hasSpokenRef.current) {
        speak("You got authorized. Exam starts in...");
        hasSpokenRef.current = true;
      }

      if (count > 0) {
        const timer = setTimeout(() => {
          const nextCount = count - 1;
          setCount(nextCount);
          if (nextCount > 0) {
            speak(nextCount.toString());
          } else {
            speak("Exam begins", () => {
              onCountdownEnd();
            });
          }
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthorized, count, onCountdownEnd]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 text-center font-inter">
      <div className="bg-white p-12 md:p-16 rounded-[40px] shadow-2xl max-w-md w-full animate-in zoom-in duration-700 border border-slate-100 relative overflow-hidden">

        {isAuthorized && (
          <div className="absolute top-0 left-0 w-full h-2 bg-red-500 animate-pulse" />
        )}

        {!isAuthorized ? (
          <>
            <div className="relative w-32 h-32 mx-auto mb-10">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-25" />
                <div className="absolute inset-0 bg-blue-50 rounded-full" />
                <div className="relative h-full flex items-center justify-center">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                </div>
            </div>

            <h2 className="text-[#1e293b] text-3xl font-black mb-4">Hello, {name}</h2>
            <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full mb-8">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Awaiting Authorization</span>
            </div>

            <p className="text-slate-400 text-lg font-medium leading-relaxed mb-10">
                Your instructor is reviewing your request. Please stay on this screen to automatically start.
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-[120px] mx-auto">
                {[0, 1, 2].map(i => (
                    <div key={i} className="h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
            </div>
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="w-24 h-24 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border-2 border-red-100">
                <Timer className="w-12 h-12 text-red-500" />
             </div>

             <h2 className="text-red-600 text-2xl font-black uppercase tracking-tight mb-2">You got authorized!</h2>
             <p className="text-slate-500 font-bold uppercase text-[0.7rem] tracking-[0.2em] mb-8">Exam starts in</p>

             <div className="text-[120px] font-black text-red-600 leading-none mb-8 animate-bounce">
                {count > 0 ? count : "GO"}
             </div>

             <p className="text-slate-400 font-medium italic">Get ready to speak...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitingRoom;
