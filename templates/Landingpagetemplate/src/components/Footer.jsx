import React from 'react';
import { ArrowUp, ShieldCheck, Sparkles } from 'lucide-react';

export default function Footer({ onOpenModal }) {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#0e0f12] py-24 px-6 border-t border-white/10 text-center overflow-hidden">
      {/* Ambient Radial Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-radial from-blue-600/5 to-transparent rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto flex flex-col items-center">
        {/* Top Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span className="text-xs uppercase tracking-[0.2em] font-mono text-blue-500 font-bold">
            [Footer Pill Label — e.g. Enrollment Closing Soon]
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight mb-6 leading-tight max-w-2xl">
          [Footer Headline — e.g. Ready to scale your business?]
        </h2>

        {/* Subtitle */}
        <p className="text-gray-400 text-base sm:text-lg font-light max-w-2xl mb-10 leading-relaxed">
          [Footer Subtitle — Describe the immediate next action and long-term benefit of taking the course in one sentence.]
        </p>

        {/* CTA Button */}
        <button
          onClick={onOpenModal}
          className="button-blue uppercase tracking-widest text-sm font-extrabold mb-16"
        >
          [Footer CTA Button]
        </button>

        {/* Scroll to Top */}
        <button
          onClick={handleScrollToTop}
          className="p-3 rounded-full bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all mb-12 text-gray-400 hover:text-blue-500 cursor-pointer active:scale-95"
        >
          <ArrowUp className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div className="w-full h-px bg-white/10 mb-10" />

        {/* Copyright & Policy */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full text-xs text-gray-500 font-mono gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <span>[Footer Brand Name — e.g. YOUR BUSINESS MENTORSHIP]</span>
          </div>
          <span>[Footer Copyright Text — e.g. © 2026 ALL RIGHTS RESERVED]</span>
          <span className="text-gray-600">ZERO NAVIGATION LEAKS</span>
        </div>
      </div>
    </footer>
  );
}
