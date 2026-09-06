import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Play } from 'lucide-react';

export default function Hero({ onOpenModal }) {
  const heroRef = useRef(null);
  const videoContainerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.hero-fade-in',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', stagger: 0.1, delay: 0.1 }
      );

      gsap.fromTo(
        videoContainerRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.0, ease: 'power2.out', delay: 0.4 }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const handleScrollToPricing = () => {
    const pricingSection = document.getElementById('pricing-plans');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen w-full flex flex-col justify-center items-center px-6 pt-36 pb-20 overflow-hidden border-b border-white/5 bg-[#090b10]"
    >
      {/* Subtle Radial Glows for Premium Ambiance */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Floating Navbar Pill */}
      <header className="w-[90%] max-w-5xl bg-[#0f111a]/85 backdrop-blur-md border border-white/10 rounded-[20px] px-6 py-4 flex items-center justify-between z-30 absolute top-6 left-1/2 -translate-x-1/2 shadow-lg">
        <div className="flex items-center gap-2">
          {/* Logo matching the reference image */}
          <span className="text-xl font-extrabold text-white tracking-tight font-display lowercase flex items-center gap-1.5 select-none">
            [LOGO]
          </span>
        </div>
        <button
          onClick={handleScrollToPricing}
          className="px-5 py-2.5 rounded-[12px] bg-[#1f58d0] hover:bg-[#112b5d] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95"
        >
          [Nav CTA]
        </button>
      </header>

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center mt-6">
        
        {/* Avatars Social Proof Pill */}
        <div className="hero-fade-in inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-[#0f111a]/90 shadow-md mb-8">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="w-5.5 h-5.5 rounded-full border border-[#090b10] bg-neutral-800 flex items-center justify-center text-[7px] text-gray-500 font-mono font-bold uppercase select-none"
              >
                U{i}
              </div>
            ))}
          </div>
          <span className="text-xs text-gray-400 font-medium">
            [Social Proof Badge — e.g. Join 12,000+ members]
          </span>
        </div>

        {/* Eyebrow Label */}
        <div className="hero-fade-in text-gray-400 uppercase tracking-[0.2em] text-xs font-semibold mb-4 font-sans">
          [Eyebrow Label — e.g. The Step By Step How To Guide]
        </div>

        {/* Headline with Clean Typography (Sentence Case Montserrat) */}
        <h1 className="hero-fade-in text-3xl sm:text-5xl lg:text-[46px] font-extrabold font-display tracking-tight leading-[1.2] text-white max-w-3xl mb-6">
          [Placeholder Hero Headline — State Your Big Promise Here]
        </h1>

        {/* Subtitle / Description */}
        <div className="hero-fade-in max-w-2xl space-y-4 mb-10">
          <p className="text-sm sm:text-base font-light text-gray-400 leading-relaxed">
            [Placeholder hero subheadline. Describe the pain you remove and the outcome you deliver in one or two sentences.]
          </p>
          <p className="text-sm sm:text-base font-medium text-gray-300">
            [Placeholder watch note — e.g. Watch the video below before you do anything else.]
          </p>
        </div>

        {/* Video Placeholder Box (Blank styled container with play icon & blue glow) */}
        <div ref={videoContainerRef} className="relative w-full max-w-3xl mb-10 group">
          {/* Blue background glow behind the video player */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[24px] blur-[32px] opacity-30 group-hover:opacity-45 transition-opacity duration-300 pointer-events-none -z-10" />
          
          <div 
            className="relative w-full aspect-video rounded-[20px] bg-black/75 border border-white/10 shadow-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors"
            onClick={onOpenModal}
          >
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/20 flex items-center justify-center group-hover:scale-105 group-hover:border-blue-500 group-hover:bg-blue-600/10 transition-all duration-350">
              <Play className="w-6 h-6 text-white group-hover:text-blue-500 transition-colors fill-white/10" />
            </div>
            <span className="text-xs text-gray-500 font-mono font-bold uppercase mt-4 tracking-widest">[Video Placeholder]</span>
          </div>
        </div>

        {/* Hero CTA Button */}
        <div className="hero-fade-in flex flex-col items-center">
          <button
            onClick={onOpenModal}
            className="button-blue uppercase tracking-widest text-xs sm:text-sm font-extrabold animate-pulse"
          >
            [Main Hero CTA Button]
          </button>
        </div>

      </div>
    </section>
  );
}
