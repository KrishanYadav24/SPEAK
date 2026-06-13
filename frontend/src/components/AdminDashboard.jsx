import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  RefreshCcw,
  Download,
  Trash2,
  UserCheck,
  Settings,
  Database,
  LayoutDashboard,
  LogOut,
  FileJson,
  Users
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = ({ socket }) => {
  const [waitingStudents, setWaitingStudents] = useState([]);
  const [responses, setResponses] = useState([]);
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    socket.emit('admin_join');

    socket.on('admin_new_student', (student) => {
      setWaitingStudents(prev => [...prev, student]);
    });

    socket.on('admin_update_list', fetchResponses);

    fetchData();

    return () => {
      socket.off('admin_new_student');
      socket.off('admin_update_list');
    };
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };

      const configRes = await axios.get(`${API_URL}/api/config/exam_duration`);
      if (configRes.data) setDuration(configRes.data);

      const studentsRes = await axios.get(`${API_URL}/api/admin/students?status=waiting`, { headers });
      setWaitingStudents(studentsRes.data);

      fetchResponses();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchResponses = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API_URL}/api/admin/responses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResponses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.reload();
  };

  const authorize = (id) => {
    socket.emit('admin_authorize_student', id);
    setWaitingStudents(prev => prev.filter(s => s._id !== id));
  };

  const downloadAllJSON = () => {
    // Group responses by student for a cleaner JSON structure
    const groupedData = responses.reduce((acc, curr) => {
      const studentName = curr.studentId?.name || 'Unknown';
      if (!acc[studentName]) acc[studentName] = [];
      acc[studentName].push({
        question: curr.questionText,
        answer: curr.answer,
        timestamp: curr.timestamp
      });
      return acc;
    }, {});

    const dataStr = JSON.stringify(groupedData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_student_responses_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const downloadTXT = (res) => {
    const text = `EXAM RESPONSE\nStudent: ${res.studentId?.name || 'Unknown'}\nQuestion: ${res.questionText}\nAnswer: ${res.answer}\nTime: ${new Date(res.timestamp).toLocaleString()}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response_${res.studentId?.name || 'student'}.txt`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col w-full overflow-x-hidden">
      {/* PROFESSIONAL ADMIN TOP BAR */}
      <header className="bg-white px-10 h-[80px] flex items-center justify-between border-b border-[#e2e8f0] shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-[#1c2b5e] p-2 rounded-lg">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <h3 className="text-[#1c2b5e] text-[1.6rem] font-black tracking-[2px] uppercase">SPEAK Admin</h3>
        </div>
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[0.9rem] text-[#64748b] font-medium">Welcome, <strong>Administrator</strong></span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white text-[#ef4444] border border-[#fee2e2] px-5 py-2.5 rounded-xl text-[0.85rem] font-black uppercase hover:bg-[#ef4444] hover:text-white transition-all shadow-sm active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
        </div>
      </header>

      <main className="p-10 flex-1">
        <div className="max-w-[1500px] mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Authorize Card */}
              <div className="bg-white rounded-[24px] border border-[#e2e8f0] shadow-sm flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-[#f1f5f9] flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-3 text-[#1c2b5e]">
                        <UserCheck className="w-5 h-5" />
                        <h3 className="text-[1.1rem] font-black uppercase tracking-tight">Authorization Queue</h3>
                      </div>
                      <span className="bg-blue-600 text-white text-[0.7rem] font-black px-2.5 py-1 rounded-full">{waitingStudents.length}</span>
                  </div>
                  <div className="flex-1 min-h-[350px] p-6 space-y-3">
                      {waitingStudents.map(s => (
                          <div key={s._id} className="bg-white p-5 rounded-2xl border border-[#e2e8f0] flex justify-between items-center shadow-sm hover:border-blue-300 transition-colors animate-in fade-in slide-in-from-left-4">
                              <div className="flex flex-col">
                                <span className="font-black text-[#1e293b]">{s.name}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Candidate ID: {s._id.slice(-6)}</span>
                              </div>
                              <button onClick={() => authorize(s._id)} className="bg-[#3b82f6] text-white px-5 py-2 rounded-xl text-xs font-black uppercase hover:bg-[#2563eb] transition-all shadow-md active:scale-95">Authorize</button>
                          </div>
                      ))}
                      {waitingStudents.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                          <Users className="w-12 h-12 mb-4 opacity-20" />
                          <p className="text-center font-bold text-sm uppercase tracking-widest opacity-50">No students waiting</p>
                        </div>
                      )}
                  </div>
              </div>

              {/* Config Card */}
              <div className="bg-white rounded-[24px] border border-[#e2e8f0] shadow-sm p-8 flex flex-col overflow-hidden">
                  <div className="flex items-center gap-3 text-[#1c2b5e] mb-8 pb-4 border-b border-slate-50">
                    <Settings className="w-5 h-5" />
                    <h3 className="text-[1.1rem] font-black uppercase tracking-tight">Exam Control</h3>
                  </div>
                  <div className="space-y-8 flex-1">
                      <div className="space-y-3">
                          <label className="text-[0.75rem] font-black text-[#64748b] uppercase tracking-widest block ml-1">Test Duration (Minutes)</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={duration}
                              onChange={e => setDuration(e.target.value)}
                              className="w-full p-5 bg-slate-50 border border-[#e2e8f0] rounded-2xl font-black text-xl text-blue-600 outline-none focus:border-[#3b82f6] transition-all"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">MINS</span>
                          </div>
                      </div>
                      <button className="w-full bg-[#1c2b5e] text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 mt-auto">Save Changes</button>
                  </div>
              </div>

              {/* Upload Card */}
              <div className="bg-white rounded-[24px] border border-[#e2e8f0] shadow-sm p-8 flex flex-col overflow-hidden">
                  <div className="flex items-center gap-3 text-[#1c2b5e] mb-8 pb-4 border-b border-slate-50">
                    <Database className="w-5 h-5" />
                    <h3 className="text-[1.1rem] font-black uppercase tracking-tight">Question Bank</h3>
                  </div>
                  <div className="space-y-8 flex-1">
                      <div className="space-y-3">
                          <label className="text-[0.75rem] font-black text-[#64748b] uppercase tracking-widest block ml-1 text-center mb-2">Sync Source File</label>
                          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                            <input type="file" id="q-file" className="hidden" />
                            <label htmlFor="q-file" className="cursor-pointer">
                              <FileJson className="w-8 h-8 text-slate-400 mx-auto mb-3 group-hover:text-blue-500 transition-colors" />
                              <p className="text-[0.65rem] font-black text-slate-400 uppercase tracking-tighter">Choose JSON Resource</p>
                            </label>
                          </div>
                      </div>
                      <button className="w-full bg-[#3b82f6] text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#2563eb] transition-all shadow-xl shadow-blue-100 active:scale-95 mt-auto">Upload to Server</button>
                  </div>
              </div>
          </div>

          {/* Responses Card (Full width) */}
          <div className="bg-white rounded-[32px] border border-[#e2e8f0] shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="p-10 border-b border-[#f1f5f9] flex justify-between items-center bg-slate-50/30">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-100">
                      <Users className="text-white w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[1.3rem] font-black text-[#1c2b5e] uppercase tracking-tight">Student Submissions</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                        Consolidated Activity Log <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={downloadAllJSON}
                      className="flex items-center gap-2 bg-[#1c2b5e] text-white px-8 py-4 rounded-2xl text-[0.8rem] font-black uppercase hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/10 active:scale-95 group"
                    >
                      <FileJson className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      Export All as JSON
                    </button>
                    <button
                      onClick={fetchResponses}
                      className="p-4 bg-white border border-slate-200 text-blue-600 rounded-2xl hover:bg-blue-50 transition-all active:rotate-180 duration-500 shadow-sm"
                    >
                      <RefreshCcw className="w-5 h-5" />
                    </button>
                  </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(responses.reduce((acc, curr) => {
                    const studentId = curr.studentId?._id || 'unknown';
                    if (!acc[studentId]) acc[studentId] = { name: curr.studentId?.name || 'Unknown', responses: [] };
                    acc[studentId].responses.push(curr);
                    return acc;
                  }, {})).map(([studentId, data], idx) => (
                    <div key={studentId} className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#1c2b5e] text-xl font-black shadow-sm group-hover:bg-[#1c2b5e] group-hover:text-white transition-all">
                            {data.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-[#1e293b] tracking-tight">{data.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total Responses: {data.responses.length}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              const studentData = JSON.stringify(data.responses, null, 2);
                              const blob = new Blob([studentData], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `responses_${data.name}.json`;
                              a.click();
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-[0.7rem] font-black uppercase text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download JSON
                          </button>
                          <button className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline summary of answers */}
                      <div className="mt-6 flex flex-wrap gap-2">
                        {data.responses.slice(0, 3).map((res, i) => (
                          <div key={i} className="bg-white px-4 py-2 rounded-xl border border-slate-100 text-[0.7rem] font-bold text-slate-500 shadow-sm">
                            Q{i+1}: <span className="text-blue-600">"{res.answer.substring(0, 20)}..."</span>
                          </div>
                        ))}
                        {data.responses.length > 3 && (
                          <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 text-[0.7rem] font-bold text-slate-400">
                            +{data.responses.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {responses.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-200">
                      <Database className="w-16 h-12 mb-4 opacity-10" />
                      <p className="text-center font-black text-sm uppercase tracking-[4px] opacity-30">Awaiting Submission Stream</p>
                    </div>
                  )}
                </div>
              </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
