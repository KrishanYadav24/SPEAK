import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Portal from './components/Portal';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import ExamInterface from './components/ExamInterface';
import StudentEntry from './components/StudentEntry';
import WaitingRoom from './components/WaitingRoom';

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(API_URL);

function App() {
  const [screen, setScreen] = useState('portal');
  const [user, setUser] = useState(null);
  const [examConfig, setExamConfig] = useState({ duration: 60 });
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    socket.on('exam_authorized', (config) => {
      setExamConfig(config);
      setIsAuthorized(true);
    });

    socket.on('student_id_assigned', (id) => {
      setUser(prev => ({ ...prev, id }));
    });

    return () => {
      socket.off('exam_authorized');
      socket.off('student_id_assigned');
    };
  }, []);

  const handleAdminLogin = async (username, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/admin/login`, { username, password });
      if (response.data.success) {
        localStorage.setItem('adminToken', response.data.token);
        setScreen('admin-dashboard');
      }
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  const handleFinish = () => {
    if (user?.id) {
      socket.emit('exam_finished', user.id);
    }
    setScreen('finish');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      {screen === 'portal' && (
        <Portal onSelect={(role) => setScreen(role === 'admin' ? 'admin-login' : 'student-entry')} />
      )}

      {screen === 'admin-login' && (
        <AdminLogin onLogin={handleAdminLogin} onBack={() => setScreen('portal')} />
      )}

      {screen === 'admin-dashboard' && (
        <AdminDashboard socket={socket} />
      )}

      {screen === 'student-entry' && (
        <StudentEntry
          onJoined={(name) => {
            setUser({ name });
            socket.emit('student_join', name);
            setScreen('waiting');
          }}
          onBack={() => setScreen('portal')}
        />
      )}

      {screen === 'waiting' && (
        <WaitingRoom
          name={user?.name}
          isAuthorized={isAuthorized}
          onCountdownEnd={() => setScreen('exam')}
        />
      )}

      {screen === 'exam' && <ExamInterface user={user} config={examConfig} onFinish={handleFinish} />}

      {screen === 'finish' && (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="finish-container animate-in zoom-in duration-700">
            <div className="finish-header">
                <h1>VIT TESTING AGENCY</h1>
                <p className="agency-subtitle">Excellence in Assessment</p>
            </div>
            <div className="finish-body">
                <h2>EXAM FINISHED</h2>
                <p id="finish-msg">Thank you, your exam is completed.</p>
                <div className="finish-pulse"></div>
            </div>
            <button
                onClick={() => window.location.reload()}
                className="mt-8 text-slate-400 hover:text-[#1c2b5e] transition-colors font-bold text-sm tracking-wider uppercase"
            >
                Return to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
