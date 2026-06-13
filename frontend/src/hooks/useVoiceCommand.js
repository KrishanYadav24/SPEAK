import { useState, useCallback, useRef } from 'react';

const useVoiceCommand = (onResultCallback) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const speak = useCallback((text, callback) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.onend = () => callback?.();
    window.speechSynthesis.speak(utterance);
  }, []);

  const fuzzyMatch = (text, options) => {
    if (!options || Object.keys(options).length === 0) return text;
    const input = text.toLowerCase().trim();

    // Check for direct key matches (A, B, C...)
    for (const key of Object.keys(options)) {
      if (input === key.toLowerCase()) return key;
    }

    // Check for "Option A", "Choice B" etc.
    for (const key of Object.keys(options)) {
      if (input.includes(`option ${key.toLowerCase()}`) ||
          input.includes(`choice ${key.toLowerCase()}`) ||
          input.endsWith(` ${key.toLowerCase()}`)) {
        return key;
      }
    }

    // Check for exact value matches
    for (const [key, value] of Object.entries(options)) {
      if (input === value.toLowerCase()) return key;
    }

    return text;
  };

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Stop error:", e);
      }
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech Recognition not supported in this browser. Please use Chrome.");

    if (isListening) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
        setIsListening(true);
        setError(null);
    };

    recognition.onresult = (event) => {
      let fullTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      setTranscript(fullTranscript.trim());
      if (onResultCallback) onResultCallback(fullTranscript.trim());
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
        recognition.start();
    } catch (e) {
        console.error("Start error:", e);
        setIsListening(false);
    }
  }, [isListening, onResultCallback]);

  return { isListening, transcript, startListening, stopListening, speak, fuzzyMatch, error };
};

export default useVoiceCommand;
