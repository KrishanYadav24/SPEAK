import React from 'react';
import { GraduationCap, Settings, ShieldCheck, Zap, Server } from 'lucide-react';

const Portal = ({ onSelect }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden p-4">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[#3b82f6]/10 rounded-full blur-[120px] animate-pulse delay-700" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05]" />

        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="bg-white/95 backdrop-blur-xl p-10 md:p-16 rounded-[50px] shadow-[0_30px_100px_rgba(0,0,0,0.4)] text-center max-w-4xl w-full relative z-10 border border-white/20 animate-in fade-in zoom-in duration-1000">
        <div className="inline-flex items-center gap-2 bg-blue-50/80 px-5 py-2.5 rounded-full mb-10 border border-blue-100/50">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="text-blue-700 text-[10px] font-black uppercase tracking-widest">Enterprise Assessment Network</span>
        </div>

        <h1 className="text-[#0f172a] text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-none">
          SPEAK <span className="text-blue-600 italic">SYSTEM</span>
        </h1>
        <p className="text-slate-500 text-xl font-medium mb-16 max-w-lg mx-auto leading-relaxed">
          The next generation of <span className="text-[#0f172a] font-bold underline decoration-blue-500/30 underline-offset-4">voice-controlled</span> examination infrastructure.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <button
            onClick={() => onSelect('student')}
            className="flex flex-col items-start p-10 bg-slate-50 border border-slate-100 rounded-[40px] hover:border-blue-500 hover:bg-white hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] transition-all duration-500 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-[100px] group-hover:bg-blue-500/10 transition-colors" />
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:bg-blue-600 transition-all duration-500 group-hover:rotate-6">
              <GraduationCap className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-[#0f172a] text-2xl font-black mb-3 tracking-tight">Student Portal</h3>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest opacity-60 text-left">Candidate Entrance</p>
          </button>

          <button
            onClick={() => onSelect('admin')}
            className="flex flex-col items-start p-10 bg-slate-50 border border-slate-100 rounded-[40px] hover:border-blue-500 hover:bg-white hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] transition-all duration-500 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-bl-[100px] group-hover:bg-slate-500/10 transition-colors" />
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:bg-[#1c2b5e] transition-all duration-500 group-hover:-rotate-6">
              <Settings className="w-8 h-8 text-[#1c2b5e] group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-[#0f172a] text-2xl font-black mb-3 tracking-tight">Staff Portal</h3>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest opacity-60 text-left">Admin Infrastructure</p>
          </button>
        </div>

        <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 opacity-40">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px]">Verified Security Core</p>
          <div className="flex items-center gap-8 grayscale">
              <Zap className="w-4 h-4" />
              <Server className="w-4 h-4" />
              <div className="h-4 w-px bg-slate-300" />
              <p className="text-[9px] font-black uppercase tracking-widest">Protocol 2.4.9</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portal;
