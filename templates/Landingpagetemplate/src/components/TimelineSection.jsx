import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Play, CheckCircle2, TrendingUp, Monitor, Calendar, Sparkles } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const stepsData = [
  {
    number: "01",
    label: "[Step 1 Label — e.g. STEP ONE]",
    title: "[Step 1 Headline — e.g. You'll have a funnel that brings clients to you]",
    desc: "[Placeholder description of what happens in step one. Describe the system and mechanics in one or two sentences.]",
    bullets: [
      "[Step 1 Bullet Point 1]",
      "[Step 1 Bullet Point 2]",
      "[Step 1 Bullet Point 3]"
    ],
    visualType: "funnel"
  },
  {
    number: "02",
    label: "[Step 2 Label — e.g. STEP TWO]",
    title: "[Step 2 Headline — e.g. You'll be confident on camera and post consistently]",
    desc: "[Placeholder description of what happens in step two. Explain the creation process and content workflow.]",
    bullets: [
      "[Step 2 Bullet Point 1]",
      "[Step 2 Bullet Point 2]",
      "[Step 2 Bullet Point 3]"
    ],
    visualType: "content"
  },
  {
    number: "03",
    label: "[Step 3 Label — e.g. STEP THREE]",
    title: "[Step 3 Headline — e.g. You'll stop trading time for money]",
    desc: "[Placeholder description of what happens in step three. Detail the scaling mechanisms and asset building.]",
    bullets: [
      "[Step 3 Bullet Point 1]",
      "[Step 3 Bullet Point 2]",
      "[Step 3 Bullet Point 3]"
    ],
    visualType: "scale"
  }
];

export default function TimelineSection() {
  const containerRef = useRef(null);
  const lineProgressRef = useRef(null);
  const stepRefs = useRef([]);

  useEffect(() => {
    stepRefs.current = stepRefs.current.slice(0, stepsData.length);

    let ctx = gsap.context(() => {
      // 1. Scroll-linked vertical progress line height
      gsap.fromTo(lineProgressRef.current,
        { height: '0%' },
        {
          height: '100%',
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 25%',
            end: 'bottom 75%',
            scrub: true,
          }
        }
      );

      // 2. Animate step components individually on scroll
      stepRefs.current.forEach((stepEl, idx) => {
        if (!stepEl) return;
        const indicator = stepEl.querySelector('.timeline-indicator');
        const content = stepEl.querySelector('.timeline-content');
        const visual = stepEl.querySelector('.timeline-visual');

        // Center badge active highlight
        gsap.to(indicator, {
          backgroundColor: '#1f58d0', // Royal blue active
          borderColor: '#ffffff',
          color: '#ffffff',
          boxShadow: '0 0 30px rgba(31, 88, 208, 0.8)',
          scale: 1.1,
          scrollTrigger: {
            trigger: stepEl,
            start: 'top 50%',
            end: 'bottom 50%',
            toggleActions: 'play reverse play reverse',
          }
        });

        // Content panel entry (fade & slide)
        gsap.fromTo(content,
          { opacity: 0.2, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: stepEl,
              start: 'top 75%',
              end: 'top 35%',
              scrub: 1,
            }
          }
        );

        // Visual panel entry (fade & scale/rotate slightly)
        gsap.fromTo(visual,
          { opacity: 0.1, scale: 0.95, y: 60 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: stepEl,
              start: 'top 70%',
              end: 'top 30%',
              scrub: 1,
            }
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Renders the mockup visual depending on the step
  const renderVisual = (type) => {
    switch (type) {
      case "funnel":
        return (
          <div className="relative w-full h-[280px] sm:h-[350px] rounded-2xl bg-[#0e0f12] border border-white/10 overflow-hidden flex flex-col p-6 shadow-lg">
            {/* Top Bar Mockup */}
            <div className="flex items-center gap-1.5 pb-4 border-b border-white/5 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              <div className="ml-4 bg-black/50 rounded px-3 py-0.5 text-[10px] text-gray-500 font-mono w-48 truncate">
                https://[YourBrand].com/active
              </div>
            </div>
            {/* Funnel Content Grid */}
            <div className="flex-1 grid grid-cols-3 gap-3">
              {/* Funnel Stage 1: Landing Page */}
              <div className="rounded-xl bg-black/40 border border-white/5 p-3 flex flex-col justify-between text-left">
                <div className="flex items-center gap-1.5 text-blue-500">
                  <Monitor className="w-4 h-4" />
                  <span className="text-[9px] font-bold uppercase font-display">[Page]</span>
                </div>
                <div className="space-y-1.5 my-3">
                  <div className="h-2 bg-white/20 rounded w-full" />
                  <div className="h-2 bg-white/10 rounded w-5/6" />
                  <div className="h-4 bg-blue-500/20 rounded-md w-3/4 flex items-center justify-center">
                    <span className="text-[8px] text-blue-500 font-bold">[CTA BUTTON]</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">CR: <span className="text-blue-500 font-bold">24.2%</span></div>
              </div>
              {/* Funnel Stage 2: Email Sequence */}
              <div className="rounded-xl bg-black/40 border border-white/5 p-3 flex flex-col justify-between text-left relative">
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <ArrowRight className="w-2.5 h-2.5 text-black font-bold" />
                </div>
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span className="text-[9px] font-bold uppercase font-display">[Emails]</span>
                </div>
                <div className="space-y-1 my-3">
                  <div className="h-1.5 bg-white/15 rounded w-full" />
                  <div className="h-1.5 bg-white/15 rounded w-5/6" />
                  <div className="h-1.5 bg-white/15 rounded w-4/6" />
                </div>
                <div className="text-[10px] text-gray-500 font-mono">Open Rate: <span className="text-indigo-400 font-bold">64.5%</span></div>
              </div>
              {/* Funnel Stage 3: Closed Booking */}
              <div className="rounded-xl bg-black/40 border border-white/5 p-3 flex flex-col justify-between text-left relative">
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                  <ArrowRight className="w-2.5 h-2.5 text-black font-bold" />
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-[9px] font-bold uppercase font-display">[Goal]</span>
                </div>
                <div className="space-y-1.5 my-3">
                  <div className="h-3 bg-emerald-500/20 border border-emerald-500/30 rounded flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[8px] text-emerald-400 font-bold">[$$$] PAID</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">ROAS: <span className="text-emerald-400 font-bold">5.8x</span></div>
              </div>
            </div>
            {/* Visual backdrop highlight */}
            <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
          </div>
        );
      case "content":
        return (
          <div className="relative w-full h-[280px] sm:h-[350px] rounded-2xl bg-[#0e0f12] border border-white/10 overflow-hidden flex flex-col p-6 shadow-lg">
            {/* Camera View Overlay */}
            <div className="absolute inset-0 border-[16px] border-black/40 pointer-events-none" />
            <div className="flex-1 flex flex-col justify-between relative z-10">
              {/* Header: REC + Time */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-[10px] text-white font-mono uppercase tracking-widest font-bold">REC 4K 60FPS</span>
                </div>
                <span className="text-[10px] text-white/70 font-mono">00:14:52</span>
              </div>
              
              {/* Center Box / Focus Grid */}
              <div className="my-auto flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/20 hover:border-blue-500/50 hover:scale-105 transition-all flex items-center justify-center cursor-pointer group">
                  <Play className="w-6 h-6 text-white group-hover:text-blue-500 fill-white/10 transition-colors" />
                </div>
                <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold font-mono mt-3">[Play Preview]</span>
              </div>

              {/* Footer: Script prompts & Audio bars */}
              <div className="flex items-end justify-between">
                <div className="max-w-[70%] text-left">
                  <span className="text-[8px] text-blue-500 font-bold uppercase tracking-wider block">Script Hook:</span>
                  <p className="text-[10px] text-white/80 italic font-medium leading-tight line-clamp-2">
                    "[Placeholder Hook Script — e.g. The single biggest mistake you are making...]"
                  </p>
                </div>
                {/* Simulated Audio Bars */}
                <div className="flex items-end gap-1 h-8">
                  <span className="w-1 h-3 bg-blue-500 rounded-full animate-[pulse_1s_infinite]" />
                  <span className="w-1 h-6 bg-indigo-500 rounded-full animate-[pulse_0.7s_infinite_delay-100]" />
                  <span className="w-1 h-4 bg-blue-500 rounded-full animate-[pulse_1.2s_infinite_delay-250]" />
                  <span className="w-1 h-7 bg-indigo-500 rounded-full animate-[pulse_0.5s_infinite_delay-150]" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-indigo-600/5 blur-3xl pointer-events-none" />
          </div>
        );
      case "scale":
        return (
          <div className="relative w-full h-[280px] sm:h-[350px] rounded-2xl bg-[#0e0f12] border border-white/10 overflow-hidden flex flex-col p-6 shadow-lg">
            {/* Analytics Dashboard Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <div className="text-left">
                <span className="text-[8px] text-gray-500 font-mono uppercase block">[MRR Metric]</span>
                <span className="text-lg font-bold font-display text-white tracking-tight">$[Value] <span className="text-[10px] text-emerald-400 font-normal font-mono">+128%</span></span>
              </div>
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            
            {/* Passive Income Growth Curve */}
            <div className="flex-1 flex flex-col justify-between">
              {/* Grid Lines */}
              <div className="relative h-24 flex items-end">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="w-full border-t border-white/5" />
                  <div className="w-full border-t border-white/5" />
                  <div className="w-full border-t border-white/5" />
                </div>
                {/* SVG Curve Line */}
                <svg className="w-full h-full overflow-visible z-10" viewBox="0 0 200 60">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1f58d0" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#1f58d0" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Filled Area */}
                  <path d="M 0,60 C 20,45 40,55 60,35 C 80,15 100,40 120,20 C 140,0 160,10 200,2 Z L 200,60 L 0,60" fill="url(#chartGrad)" />
                  {/* Stroke Line */}
                  <path d="M 0,60 C 20,45 40,55 60,35 C 80,15 100,40 120,20 C 140,0 160,10 200,2" fill="none" stroke="#1f58d0" strokeWidth="2.5" />
                  {/* Glow circles */}
                  <circle cx="200" cy="2" r="4" fill="#00F0FF" />
                  <circle cx="120" cy="20" r="3.5" fill="#1f58d0" />
                </svg>
              </div>

              {/* Freedom Metrics Footer */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5 text-left">
                <div>
                  <span className="text-[8px] text-gray-500 font-mono uppercase block">[Time Metric]</span>
                  <span className="text-xs font-semibold text-white">[Value]/Week</span>
                </div>
                <div>
                  <span className="text-[8px] text-gray-500 font-mono uppercase block">[Asset Metric]</span>
                  <span className="text-xs font-semibold text-emerald-400">[Value]% of Portfolio</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section 
      ref={containerRef} 
      className="relative bg-[#0e0f12] py-24 sm:py-32 px-6 overflow-hidden border-t border-white/5"
      id="process-timeline"
    >
      <div className="max-w-6xl mx-auto text-center mb-20 relative z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-[#0e0f12]/50 text-[10px] uppercase tracking-[0.2em] font-semibold text-blue-500 mb-4 font-mono">
          [Pill — e.g. The Process]
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight max-w-4xl mx-auto mb-6 text-white leading-tight">
          [Timeline Section Title — State Your Process's Main Value Proposition]
        </h2>
        <p className="text-gray-400 text-base sm:text-lg font-light max-w-2xl mx-auto leading-relaxed">
          [Timeline Section Subtitle — e.g. Based on strategies tested across 8-figures of revenue]
        </p>
      </div>

      {/* Timeline Structure Wrapper */}
      <div className="relative max-w-5xl mx-auto z-10">
        
        {/* Vertical Timeline Guide Line */}
        <div className="absolute left-[30px] md:left-1/2 top-0 bottom-0 w-[2px] bg-white/10 -translate-x-1/2 z-0">
          <div 
            ref={lineProgressRef} 
            className="absolute top-0 left-0 w-full bg-gradient-to-b from-[#1f58d0] to-indigo-600 shadow-[0_0_15px_rgba(31,88,208,0.7)] z-10 origin-top" 
            style={{ height: '0%' }} 
          />
        </div>

        {/* Steps mapping */}
        <div className="space-y-24 md:space-y-36">
          {stepsData.map((step, idx) => {
            const isEven = idx % 2 === 1;
            return (
              <div 
                key={idx}
                ref={el => stepRefs.current[idx] = el}
                className="grid grid-cols-[60px_1fr] md:grid-cols-2 gap-8 items-center relative z-10"
              >
                {/* Center Indicator Badge - Positioned absolute on MD screens */}
                <div className="absolute left-[30px] md:left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20">
                  <div className="timeline-indicator w-[50px] h-[50px] rounded-full bg-[#0e0f12] border-2 border-white/20 text-gray-500 font-display font-black text-lg flex items-center justify-center transition-all duration-300">
                    <span className="timeline-number">{idx + 1}</span>
                  </div>
                </div>

                {/* Left Side: Text Description on Odd, Visual on Even */}
                <div className={`col-start-2 ${isEven ? 'md:col-start-2 md:order-2 text-left' : 'md:col-start-1 md:text-right'} pl-4 md:pl-0 md:pr-12`}>
                  <div className="timeline-content space-y-4">
                    <span className="text-xs font-bold text-blue-500 uppercase tracking-widest font-mono block">
                      {step.label}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight leading-tight">
                      {step.title}
                    </h3>
                    <p className={`text-gray-400 text-sm sm:text-base font-light leading-relaxed max-w-xl ${isEven ? 'text-left' : 'md:ml-auto md:text-right'}`}>
                      {step.desc}
                    </p>
                    
                    {/* Item Bullet Points */}
                    <ul className={`space-y-2 pt-2 text-sm text-gray-300 ${isEven ? 'text-left' : 'md:inline-block text-left md:text-right'}`}>
                      {step.bullets.map((bullet, bIdx) => (
                        <li key={bIdx} className={`flex items-center gap-2 ${isEven ? 'justify-start' : 'md:justify-end'}`}>
                          {!isEven && <CheckCircle2 className="w-4 h-4 text-blue-500 hidden md:inline shrink-0" />}
                          <span>{bullet}</span>
                          {(isEven || window.innerWidth < 768) && <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Right Side: Visual on Odd, Text Description on Even */}
                <div className={`col-start-2 ${isEven ? 'md:col-start-1 md:order-1' : 'md:col-start-2'} pl-4 md:pl-0 md:px-12`}>
                  <div className="timeline-visual">
                    {renderVisual(step.visualType)}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
