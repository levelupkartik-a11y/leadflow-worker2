import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const statsData = [
  {
    id: "stat-followers",
    target: 5,
    prefix: "",
    suffix: "M",
    label: "[Stat 1 Label — e.g. Followers Online]",
  },
  {
    id: "stat-businesses",
    target: 4,
    prefix: "",
    suffix: "x",
    label: "[Stat 2 Label — e.g. Businesses Built]",
  },
  {
    id: "stat-author",
    target: 3,
    prefix: "",
    suffix: "x",
    label: "[Stat 3 Label — e.g. Books Published]",
  }
];

const narrativeSteps = [
  {
    num: "1.",
    title: "[Narrative 1 Title — e.g. The Early Days]",
    desc: "[Narrative 1 Description detailing background, struggle, or key context of the founder. Explain how the initial stage of the business was built here.]"
  },
  {
    num: "2.",
    title: "[Narrative 2 Title — e.g. From Creator to Founder]",
    desc: "[Narrative 2 Description detailing transition, key challenges faced, and experience gained in scaling different ventures.]"
  },
  {
    num: "3.",
    title: "[Narrative 3 Title — e.g. Helping Others Scale]",
    desc: "[Narrative 3 Description detailing contribution, purpose of the program, and what members gain from the blueprint.]"
  }
];

export default function AuthorityBlock() {
  const sectionRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      // Counter animation for stats
      statsData.forEach((stat) => {
        const el = document.getElementById(stat.id);
        if (!el) return;

        const counter = { val: 0 };
        gsap.to(counter, {
          val: stat.target,
          duration: 1.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
          onUpdate: () => {
            el.textContent = `${stat.prefix}${Math.floor(counter.val)}${stat.suffix}`;
          },
        });
      });

      // Animate narrative elements staggering in
      gsap.fromTo(
        ".narrative-card",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".narrative-container",
            start: "top 80%",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative bg-[#0e0f12] py-24 sm:py-32 px-6 border-b border-white/5 overflow-hidden">
      {/* Subtle background ambient glows */}
      <div className="absolute top-[10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] bg-indigo-900/5 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Top Header Section */}
        <div className="text-center mb-20 space-y-6">
          <h2 className="text-2xl sm:text-[34px] font-extrabold font-display text-white tracking-tight max-w-4xl mx-auto leading-snug">
            [Authority Section Title — State Your Experience & Proof Point Here]
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm max-w-3xl mx-auto leading-relaxed font-semibold uppercase tracking-wider font-mono">
            [Authority Section Subtitle — e.g. Multiple 7-Figure Businesses. Millions Reached. 8-Figures In Revenue.]
          </p>
        </div>

        {/* Stats Flex Row (Progression section with cool counter animation) */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-8 mb-24 text-center max-w-4xl mx-auto">
          {statsData.map((stat, idx) => (
            <React.Fragment key={stat.id}>
              {/* Stat Block */}
              <div className="flex-1 flex flex-col items-center">
                <div 
                  id={stat.id}
                  className="text-5xl sm:text-[72px] font-black font-display text-white tracking-tight leading-none mb-3"
                >
                  0{stat.suffix}
                </div>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest font-mono">
                  {stat.label}
                </p>
              </div>
              
              {/* Divider in between */}
              {idx < statsData.length - 1 && (
                <div className="hidden md:block w-px h-16 bg-white/10 self-center" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Narrative Block Container (Matching layout of Image 1) */}
        <div className="narrative-container grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 pt-16 border-t border-white/5 items-stretch">
          
          {/* Left Column: Stacked Narrative Cards */}
          <div className="flex flex-col gap-6">
            {narrativeSteps.map((step, idx) => (
              <div 
                key={idx}
                className="narrative-card bg-[#0e0f12] border border-white/10 rounded-[15px] p-8 text-center flex flex-col items-center justify-center gap-3 hover:border-blue-500/20 transition-all duration-300"
              >
                {/* Number tag centered */}
                <span className="text-sm font-bold text-blue-500 font-mono tracking-wider">
                  {step.num}
                </span>
                
                {/* Title centered */}
                <h3 className="text-base sm:text-lg font-bold text-white font-display uppercase tracking-wider">
                  {step.title}
                </h3>
                
                {/* Description centered */}
                <p className="text-gray-400 text-xs sm:text-sm font-light leading-relaxed max-w-xl">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Right Column: Tall Image Placeholder */}
          <div className="rounded-[15px] bg-black/60 border border-white/10 flex flex-col items-center justify-center p-8 text-center min-h-[400px] lg:min-h-full relative overflow-hidden group hover:border-blue-500/30 transition-colors">
            <span className="text-xs text-gray-500 font-mono font-bold uppercase tracking-widest">[Founder Image Placeholder]</span>
          </div>

        </div>

      </div>
    </section>
  );
}
