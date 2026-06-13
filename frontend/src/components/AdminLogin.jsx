import React, { useState } from 'react';
import { Lock, User, ArrowLeft, ShieldCheck } from 'lucide-react';

const AdminLogin = ({ onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden p-4">
      {/* Decorative background elements to use space */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-[#1c2b5e]/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      </div>

      <div className="bg-white p-10 md:p-14 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 max-w-lg w-full relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
                <Lock className="w-8 h-8 text-[#3b82f6]" />
            </div>
            <h2 className="text-[#1c2b5e] text-4xl font-black tracking-tight mb-2">Admin Access</h2>
            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5" />
                Secure login required
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[#1c2b5e] font-black text-xs uppercase tracking-widest block ml-1">Username</label>
            <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                    <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter administrator ID"
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-slate-700 focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all outline-none"
                />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[#1c2b5e] font-black text-xs uppercase tracking-widest block ml-1">Password</label>
            <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                    <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-slate-700 focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all outline-none"
                />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#1c2b5e] text-white py-6 rounded-[30px] font-black uppercase tracking-widest shadow-2xl shadow-blue-900/20 hover:bg-blue-800 transition-all transform hover:-translate-y-1 active:scale-[0.98] mt-4 flex items-center justify-center gap-3"
          >
            Authenticate
          </button>
        </form>

        <button
          onClick={onBack}
          className="mt-12 w-full py-4 text-slate-400 hover:text-[#1c2b5e] transition-all font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-2 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Return to Portal
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
