import React, { useState, useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Calendar, CheckCircle2, ChevronDown, Clock } from 'lucide-react';
import Hero from './components/Hero';
import TimelineSection from './components/TimelineSection';
import AuthorityBlock from './components/AuthorityBlock';
import Footer from './components/Footer';
import LeadCaptureModal from './components/LeadCaptureModal';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  // 1. Live Countdown Timer State
  const [timeLeft, setTimeLeft] = useState({ days: 13, hours: 3, minutes: 20, seconds: 10 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        clearInterval(timer);
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Initialize Lenis Smooth Scroll & GSAP Scroll Trigger Animations
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      smooth: true,
      smoothTouch: false,
    });

    let animationFrameId;
    function raf(time) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }
    animationFrameId = requestAnimationFrame(raf);

    // Setup GSAP Scroll animations
    const ctx = gsap.context(() => {
      // Testimonials stagger reveal
      gsap.fromTo(".testimonial-cell",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".testimonial-grid-trigger",
            start: "top 80%",
            toggleActions: "play none none none"
          }
        }
      );

      // Team cards stagger reveal
      gsap.fromTo(".team-card",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".team-grid-trigger",
            start: "top 80%",
            toggleActions: "play none none none"
          }
        }
      );

      // Schedule cards stagger reveal
      gsap.fromTo(".schedule-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".schedule-grid-trigger",
            start: "top 80%",
            toggleActions: "play none none none"
          }
        }
      );

      // AI Summary Bonus card scale reveal
      gsap.fromTo(".ai-bonus-card",
        { scale: 0.96, opacity: 0, y: 30 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 1.0,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".ai-bonus-card",
            start: "top 85%",
            toggleActions: "play none none none"
          }
        }
      );

      // Pricing cards stagger reveal
      gsap.fromTo(".pricing-card",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".pricing-grid-trigger",
            start: "top 80%",
            toggleActions: "play none none none"
          }
        }
      );

      // FAQs stagger reveal
      gsap.fromTo(".faq-item-animate",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".faq-list-trigger",
            start: "top 85%",
            toggleActions: "play none none none"
          }
        }
      );

      // Marquee Section reveal
      gsap.fromTo(".marquee-section-trigger",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".marquee-section-trigger",
            start: "top 80%",
            toggleActions: "play none none none"
          }
        }
      );
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
      ctx.revert();
    };
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // FAQ Accordion Data
  const faqs = [
    {
      q: "[FAQ Question 1 — e.g. Who is this program for?]",
      a: "[FAQ Answer 1 — Explain the target audience, baseline requirements, and fit parameters here in detail.]"
    },
    {
      q: "[FAQ Question 2 — e.g. How much time is required?]",
      a: "[FAQ Answer 2 — Detail weekly commitments, video courses, live session options, and execution duration.]"
    },
    {
      q: "[FAQ Question 3 — e.g. Is there a performance guarantee?]",
      a: "[FAQ Answer 3 — Describe program guarantees, refunds, contract terms, or performance conditions here.]"
    },
    {
      q: "[FAQ Question 4 — e.g. Do I get direct support?]",
      a: "[FAQ Answer 4 — Outline support systems, Slack channels, weekly feedback loops, call frequency, and review processes.]"
    }
  ];

  return (
    <main className="relative min-h-screen bg-[#0e0f12] text-white selection:bg-[#1f58d0] selection:text-white overflow-x-hidden">
      
      {/* ================= 1. ANNOUNCEMENT COUNTDOWN BAR ================= */}
      <div className="w-full bg-[#234934] py-3.5 px-6 text-center text-xs font-mono font-bold uppercase tracking-wider relative z-40 flex flex-col sm:flex-row items-center justify-center gap-3">
        <div className="flex items-center gap-1.5 text-white/95">
          <span>[Countdown Banner Label — e.g. COHORT ENROLLMENT ENDING IN:]</span>
        </div>
        <div className="flex items-center gap-2 text-white bg-black/40 px-3 py-1 rounded-md border border-white/5 font-sans font-bold">
          <span>{timeLeft.days}d</span>:
          <span>{timeLeft.hours}h</span>:
          <span>{timeLeft.minutes}m</span>:
          <span>{timeLeft.seconds}s</span>
        </div>
      </div>

      {/* ================= 2. HERO SECTION ================= */}
      <Hero onOpenModal={openModal} />

      {/* ================= 3. TESTIMONIALS CELL BORDER GRID ================= */}
      <section className="relative bg-[#0e0f12] py-24 sm:py-32 px-6 border-b border-white/5 testimonial-grid-trigger">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight max-w-3xl mx-auto leading-tight">
              [Testimonials Section Title — State The Primary Result/Transformation]
            </h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              [Testimonials Section Subtitle — e.g. Real results from our active business community members]
            </p>
          </div>

          {/* Custom Cell Testimonial Grid matching Image 2 formatting */}
          <div className="grid grid-cols-1 md:grid-cols-2 border border-white/10 rounded-2xl overflow-hidden bg-[#0a0b0d]">
            
            {/* Cell 1 */}
            <div className="testimonial-cell testimonial-cell-1 p-8 flex flex-col justify-between text-left gap-6">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[10px] text-gray-500 font-mono font-bold uppercase select-none">
                  [Avatar]
                </div>
                <p className="text-gray-400 text-sm font-light leading-relaxed">
                  "[Placeholder Testimonial Quote — Insert a brief story about client struggles, implementation steps, and eventual success here...]"
                </p>
                <h3 className="text-2xl sm:text-[34px] font-black font-display text-[#1f58d0] tracking-tight leading-none">
                  [Testimonial Result 1 — e.g. From 9-5 to $61k]
                </h3>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white">[Client Name 1]</h4>
                  <p className="text-xs text-gray-500 font-mono">[Client Role 1]</p>
                </div>
              </div>
            </div>

            {/* Cell 2 */}
            <div className="testimonial-cell testimonial-cell-2 p-8 flex flex-col justify-between text-left gap-6">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[10px] text-gray-500 font-mono font-bold uppercase select-none">
                  [Avatar]
                </div>
                <p className="text-gray-400 text-sm font-light leading-relaxed">
                  "[Placeholder Testimonial Quote — Insert a client quote detailing specific community growth, workflow changes, or asset optimization...]"
                </p>
                <h3 className="text-2xl sm:text-[34px] font-black font-display text-[#1f58d0] tracking-tight leading-none">
                  [Testimonial Result 2 — e.g. From 5 → 40 clients]
                </h3>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white">[Client Name 2]</h4>
                  <p className="text-xs text-gray-500 font-mono">[Client Role 2]</p>
                </div>
              </div>
            </div>

            {/* Cell 3 */}
            <div className="testimonial-cell testimonial-cell-3 p-8 flex flex-col justify-between text-left gap-6">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[10px] text-gray-500 font-mono font-bold uppercase select-none">
                  [Avatar]
                </div>
                <p className="text-gray-400 text-sm font-light leading-relaxed">
                  "[Placeholder Testimonial Quote — Detail the transition timelines, confidence on camera, or conversion numbers before/after...]"
                </p>
                <h3 className="text-2xl sm:text-[34px] font-black font-display text-[#1f58d0] tracking-tight leading-none">
                  [Testimonial Result 3 — e.g. 3× Income In 12 Months]
                </h3>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white">[Client Name 3]</h4>
                  <p className="text-xs text-gray-500 font-mono">[Client Role 3]</p>
                </div>
              </div>
            </div>

            {/* Cell 4 */}
            <div className="testimonial-cell testimonial-cell-4 p-8 flex flex-col justify-between text-left gap-6">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[10px] text-gray-500 font-mono font-bold uppercase select-none">
                  [Avatar]
                </div>
                <p className="text-gray-400 text-sm font-light leading-relaxed">
                  "[Placeholder Testimonial Quote — Insert a client's narrative regarding scaling, setting up email automations, or audience growth...]"
                </p>
                <h3 className="text-2xl sm:text-[34px] font-black font-display text-[#1f58d0] tracking-tight leading-none">
                  [Testimonial Result 4 — e.g. Added 50k Followers]
                </h3>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white">[Client Name 4]</h4>
                  <p className="text-xs text-gray-500 font-mono">[Client Role 4]</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= 4. NARRATIVE EXPERIENCE & STATS ================= */}
      <AuthorityBlock />

      {/* ================= 5. THE PROCESS (TIMELINE SLIDER SECTION) ================= */}
      <TimelineSection />

      {/* ================= 6. EXPERT TEAM & WEEKLY CALENDARS ================= */}
      <section className="relative bg-[#0e0f12] py-24 sm:py-32 px-6 border-b border-white/5 team-grid-trigger">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight max-w-3xl mx-auto leading-tight">
              [Team Section Title — e.g. Meet My Personal Team Of Digital Experts]
            </h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              [Team Section Subtitle — Describe who the experts are and how they assist members in scaling.]
            </p>
          </div>

          {/* Team Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
            
            {/* Member 1 */}
            <div className="team-card resource-card text-left">
              <div className="w-20 h-20 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-xs text-gray-500 font-mono font-bold uppercase mb-4 select-none">
                [Avatar]
              </div>
              <h3 className="text-lg font-bold text-white tracking-wider font-display">[Team Member 1 Name]</h3>
              <p className="text-gray-400 text-xs font-light leading-relaxed">
                [Team Member 1 Description — Focus areas, professional background, expertise, and contribution to client workflows.]
              </p>
              <ul className="space-y-1.5 mt-4 pt-4 border-t border-white/5 text-[11px] text-gray-300 font-mono">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" /> [Focus Area 1]</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" /> [Focus Area 2]</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" /> [Focus Area 3]</li>
              </ul>
            </div>

            {/* Member 2 */}
            <div className="team-card resource-card text-left">
              <div className="w-20 h-20 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-xs text-gray-500 font-mono font-bold uppercase mb-4 select-none">
                [Avatar]
              </div>
              <h3 className="text-lg font-bold text-white tracking-wider font-display">[Team Member 2 Name]</h3>
              <p className="text-gray-400 text-xs font-light leading-relaxed">
                [Team Member 2 Description — Focus areas, system audits, client offer packaging, or video scaling strategies.]
              </p>
              <ul className="space-y-1.5 mt-4 pt-4 border-t border-white/5 text-[11px] text-gray-300 font-mono">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" /> [Focus Area 1]</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" /> [Focus Area 2]</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" /> [Focus Area 3]</li>
              </ul>
            </div>

            {/* Member 3 */}
            <div className="team-card resource-card text-left">
              <div className="w-20 h-20 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-xs text-gray-500 font-mono font-bold uppercase mb-4 select-none">
                [Avatar]
              </div>
              <h3 className="text-lg font-bold text-white tracking-wider font-display">[Team Member 3 Name]</h3>
              <p className="text-gray-400 text-xs font-light leading-relaxed">
                [Team Member 3 Description — Coaching conversion optimization, target DMs, or attention funnel structures.]
              </p>
              <ul className="space-y-1.5 mt-4 pt-4 border-t border-white/5 text-[11px] text-gray-300 font-mono">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" /> [Focus Area 1]</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" /> [Focus Area 2]</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" /> [Focus Area 3]</li>
              </ul>
            </div>

          </div>

          {/* Weekly Q&A Schedule */}
          <div className="text-center mb-10 schedule-grid-trigger">
            <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-white uppercase tracking-wider mb-2">
              [Schedule Banner Headline — e.g. Join live sessions weekly for feedback]
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Schedule 1 */}
            <div className="schedule-card resource-card text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <h4 className="text-lg font-bold text-white font-display">[Schedule 1 Title — e.g. Weekly Business Q&A]</h4>
                  <p className="text-xs text-blue-500 font-mono font-bold mt-0.5">[Schedule 1 Day & Host — e.g. Tuesdays • Host Name]</p>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 text-xs font-mono">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>[Schedule 1 Time — e.g. 8:30 AM GMT]</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm font-light leading-relaxed mb-6">
                [Schedule 1 Description — Explain the focus of the session, what items are reviewed, and how it resolves bottleneck structures.]
              </p>
              <ul className="space-y-2 mt-auto border-t border-white/5 pt-4 text-xs text-gray-300 font-mono">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Schedule 1 Bullet 1]</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Schedule 1 Bullet 2]</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Schedule 1 Bullet 3]</li>
              </ul>
            </div>

            {/* Schedule 2 */}
            <div className="schedule-card resource-card text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <h4 className="text-lg font-bold text-white font-display">[Schedule 2 Title — e.g. Weekly Marketing Q&A]</h4>
                  <p className="text-xs text-blue-500 font-mono font-bold mt-0.5">[Schedule 2 Day & Host — e.g. Wednesdays • Host Name]</p>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 text-xs font-mono">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>[Schedule 2 Time — e.g. 8:30 AM GMT]</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm font-light leading-relaxed mb-6">
                [Schedule 2 Description — Detail session targets, email campaigns, copywriting reviews, or social funnels optimized.]
              </p>
              <ul className="space-y-2 mt-auto border-t border-white/5 pt-4 text-xs text-gray-300 font-mono">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Schedule 2 Bullet 1]</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Schedule 2 Bullet 2]</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Schedule 2 Bullet 3]</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ================= EXTRA: HORIZONTAL MOVING TESTIMONIALS (TICKER MARQUEE) ================= */}
      <section className="relative bg-[#0e0f12] py-20 border-b border-white/5 overflow-hidden marquee-section-trigger">
        <div className="max-w-6xl mx-auto px-6 text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-[#0e0f12]/50 text-[10px] uppercase tracking-[0.2em] font-semibold text-blue-500 mb-4 font-mono">
            [Pill — e.g. Community Reviews]
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-white tracking-tight leading-tight">
            [Reviews Header — e.g. What are Other Business Owners Saying?]
          </h2>
        </div>

        {/* Full-bleed Scrolling Wrapper */}
        <div className="flex flex-col gap-6 w-full relative z-10">
          
          {/* Left & Right Viewport Edge Fade Gradients (Fading into page background color #0e0f12) */}
          <div className="absolute top-0 bottom-0 left-0 w-24 sm:w-64 bg-gradient-to-r from-[#0e0f12] to-transparent z-20 pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-24 sm:w-64 bg-gradient-to-l from-[#0e0f12] to-transparent z-20 pointer-events-none" />
          
          {/* Row 1: Scrolling Left (Contains 6 cards repeated to prevent zoom gaps) */}
          <div className="w-full overflow-hidden flex select-none">
            <div className="animate-marquee flex gap-6">
              {[...Array(2)].map((_, loopIdx) => (
                <React.Fragment key={loopIdx}>
                  {/* Card 1 */}
                  <div className="w-[360px] flex-shrink-0 bg-[#121318] border border-white/10 rounded-[12px] p-6 text-left flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[8px] text-gray-500 font-mono font-bold select-none">
                        [Avatar]
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">[Username 1]</h4>
                        <p className="text-[10px] text-gray-500 font-mono">[Date 1]</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      "[Placeholder Review Message — e.g. Just hit our biggest month ever using these content blueprints! Our organic reach grew by 3x...]"
                    </p>
                    <div className="w-full bg-black/40 border border-white/5 rounded-lg py-3 px-4 text-center text-[10px] text-gray-500 font-mono select-none">
                      [Review Attachment Placeholder]
                    </div>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">🔥 [Count]</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">❤️ [Count]</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">👍 [Count]</span>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="w-[360px] flex-shrink-0 bg-[#121318] border border-white/10 rounded-[12px] p-6 text-left flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[8px] text-gray-500 font-mono font-bold select-none">
                        [Avatar]
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">[Username 2]</h4>
                        <p className="text-[10px] text-gray-500 font-mono">[Date 2]</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      "[Placeholder Review Message — e.g. Managed to reduce my active working hours while increasing MRR by booking calls on autopilot...]"
                    </p>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">🔥 [Count]</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">👍 [Count]</span>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="w-[360px] flex-shrink-0 bg-[#121318] border border-white/10 rounded-[12px] p-6 text-left flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[8px] text-gray-500 font-mono font-bold select-none">
                        [Avatar]
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">[Username 3]</h4>
                        <p className="text-[10px] text-gray-500 font-mono">[Date 3]</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      "[Placeholder Review Message — e.g. Built and launched our online asset page in 3 days. Already had 5 applications come in...]"
                    </p>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">👍 [Count]</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">❤️ [Count]</span>
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="w-[360px] flex-shrink-0 bg-[#121318] border border-white/10 rounded-[12px] p-6 text-left flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[8px] text-gray-500 font-mono font-bold select-none">
                        [Avatar]
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">[Username 4]</h4>
                        <p className="text-[10px] text-gray-500 font-mono">[Date 4]</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      "[Placeholder Review Message — e.g. The automated scheduling setup is incredibly smooth. Saved me 10+ hours this week alone...]"
                    </p>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">👍 [Count]</span>
                    </div>
                  </div>

                  {/* Card 5 */}
                  <div className="w-[360px] flex-shrink-0 bg-[#121318] border border-white/10 rounded-[12px] p-6 text-left flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[8px] text-gray-500 font-mono font-bold select-none">
                        [Avatar]
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">[Username 5]</h4>
                        <p className="text-[10px] text-gray-500 font-mono">[Date 5]</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      "[Placeholder Review Message — e.g. Community call templates helped us restructure our high-ticket group offer effortlessly...]"
                    </p>
                    <div className="w-full bg-black/40 border border-white/5 rounded-lg py-3 px-4 text-center text-[10px] text-gray-500 font-mono select-none">
                      [Review Attachment Placeholder]
                    </div>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">🔥 [Count]</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">👍 [Count]</span>
                    </div>
                  </div>

                  {/* Card 6 */}
                  <div className="w-[360px] flex-shrink-0 bg-[#121318] border border-white/10 rounded-[12px] p-6 text-left flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[8px] text-gray-500 font-mono font-bold select-none">
                        [Avatar]
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">[Username 6]</h4>
                        <p className="text-[10px] text-gray-500 font-mono">[Date 6]</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      "[Placeholder Review Message — e.g. Replaced my 9-5 job income in less than 6 months of launching our sales funnel templates...]"
                    </p>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">❤️ [Count]</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">👍 [Count]</span>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Row 2: Scrolling Right (Contains same 6 cards, different order, repeated) */}
          <div className="w-full overflow-hidden flex select-none">
            <div className="animate-marquee-reverse flex gap-6">
              {[...Array(2)].map((_, loopIdx) => (
                <React.Fragment key={loopIdx}>
                  {/* Card 4 */}
                  <div className="w-[360px] flex-shrink-0 bg-[#121318] border border-white/10 rounded-[12px] p-6 text-left flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[8px] text-gray-500 font-mono font-bold select-none">
                        [Avatar]
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">[Username 4]</h4>
                        <p className="text-[10px] text-gray-500 font-mono">[Date 4]</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      "[Placeholder Review Message — e.g. The automated scheduling setup is incredibly smooth. Saved me 10+ hours this week alone...]"
                    </p>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">👍 [Count]</span>
                    </div>
                  </div>

                  {/* Card 5 */}
                  <div className="w-[360px] flex-shrink-0 bg-[#121318] border border-white/10 rounded-[12px] p-6 text-left flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[8px] text-gray-500 font-mono font-bold select-none">
                        [Avatar]
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">[Username 5]</h4>
                        <p className="text-[10px] text-gray-500 font-mono">[Date 5]</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      "[Placeholder Review Message — e.g. Community call templates helped us restructure our high-ticket group offer effortlessly...]"
                    </p>
                    <div className="w-full bg-black/40 border border-white/5 rounded-lg py-3 px-4 text-center text-[10px] text-gray-500 font-mono select-none">
                      [Review Attachment Placeholder]
                    </div>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">🔥 [Count]</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">👍 [Count]</span>
                    </div>
                  </div>

                  {/* Card 6 */}
                  <div className="w-[360px] flex-shrink-0 bg-[#121318] border border-white/10 rounded-[12px] p-6 text-left flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[8px] text-gray-500 font-mono font-bold select-none">
                        [Avatar]
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">[Username 6]</h4>
                        <p className="text-[10px] text-gray-500 font-mono">[Date 6]</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      "[Placeholder Review Message — e.g. Replaced my 9-5 job income in less than 6 months of launching our sales funnel templates...]"
                    </p>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">❤️ [Count]</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">👍 [Count]</span>
                    </div>
                  </div>

                  {/* Card 1 */}
                  <div className="w-[360px] flex-shrink-0 bg-[#121318] border border-white/10 rounded-[12px] p-6 text-left flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[8px] text-gray-500 font-mono font-bold select-none">
                        [Avatar]
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">[Username 1]</h4>
                        <p className="text-[10px] text-gray-500 font-mono">[Date 1]</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      "[Placeholder Review Message — e.g. Just hit our biggest month ever using these content blueprints! Our organic reach grew by 3x...]"
                    </p>
                    <div className="w-full bg-black/40 border border-white/5 rounded-lg py-3 px-4 text-center text-[10px] text-gray-500 font-mono select-none">
                      [Review Attachment Placeholder]
                    </div>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">🔥 [Count]</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">❤️ [Count]</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">👍 [Count]</span>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="w-[360px] flex-shrink-0 bg-[#121318] border border-white/10 rounded-[12px] p-6 text-left flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[8px] text-gray-500 font-mono font-bold select-none">
                        [Avatar]
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">[Username 2]</h4>
                        <p className="text-[10px] text-gray-500 font-mono">[Date 2]</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      "[Placeholder Review Message — e.g. Managed to reduce my active working hours while increasing MRR by booking calls on autopilot...]"
                    </p>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">🔥 [Count]</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">👍 [Count]</span>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="w-[360px] flex-shrink-0 bg-[#121318] border border-white/10 rounded-[12px] p-6 text-left flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center text-[8px] text-gray-500 font-mono font-bold select-none">
                        [Avatar]
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">[Username 3]</h4>
                        <p className="text-[10px] text-gray-500 font-mono">[Date 3]</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      "[Placeholder Review Message — e.g. Built and launched our online asset page in 3 days. Already had 5 applications come in...]"
                    </p>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">👍 [Count]</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">❤️ [Count]</span>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ================= 7. AI SUMMARY BONUS MODULE ================= */}
      <section className="relative bg-[#0e0f12] py-24 sm:py-32 px-6 border-b border-white/5">
        <div className="max-w-4xl mx-auto ai-bonus-card resource-card text-center p-8 sm:p-12 relative overflow-hidden">
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-1 bg-[#1f58d0]/10 border border-[#1f58d0]/20 px-3 py-1 rounded-full text-[10px] text-blue-500 font-bold uppercase tracking-widest font-mono">
              [Bonus Tag — e.g. EXCLUSIVE COHORT BONUS]
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-white leading-none">
              [Bonus Section Title — e.g. FREE BONUS: Learn with AI summaries]
            </h2>
            <div className="flex items-center justify-center gap-3 py-3">
              <span className="text-gray-500 font-bold uppercase tracking-wider line-through text-lg sm:text-xl">[Bonus Value — e.g. $996 VALUE]</span>
              <span className="text-blue-500 font-black tracking-widest text-2xl sm:text-3xl font-display">[Bonus Cost — e.g. FREE]</span>
            </div>
            <p className="text-gray-400 text-sm sm:text-base font-light leading-relaxed">
              [Bonus Section description — Explain what data the AI is trained on, who gets access, and how it helps answer operational queries.]
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-left">
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex gap-2.5 items-start">
                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">[Bonus Card 1 Title]</h4>
                  <p className="text-[10px] text-gray-500 mt-1">[Bonus Card 1 Description]</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex gap-2.5 items-start">
                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">[Bonus Card 2 Title]</h4>
                  <p className="text-[10px] text-gray-500 mt-1">[Bonus Card 2 Description]</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex gap-2.5 items-start">
                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">[Bonus Card 3 Title]</h4>
                  <p className="text-[10px] text-gray-500 mt-1">[Bonus Card 3 Description]</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 8. PRICING TIER TRACKS ================= */}
      <section className="relative bg-[#0e0f12] py-24 sm:py-32 px-6 border-b border-white/5" id="pricing-plans">
        <div className="max-w-6xl mx-auto pricing-grid-trigger">
          {/* Header */}
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight max-w-3xl mx-auto leading-tight">
              [Pricing Section Title — e.g. Select Your Scaling Track]
            </h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              [Pricing Section Subtitle — Detail program timelines, baseline guarantees, or execution objectives here.]
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Tier 1 */}
            <div className="pricing-card resource-card text-left justify-between relative">
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold tracking-wider font-display text-white">[Tier 1 Name — e.g. Business Mentorship]</h3>
                    <p className="text-xs text-gray-500 mt-1 font-mono">[Tier 1 Subtitle — e.g. Scale MRR & Brand Authority]</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-gray-400 uppercase tracking-widest">[Access Model — e.g. Lifetime Access]</span>
                </div>
                
                <div className="py-4 border-y border-white/5">
                  <span className="text-4xl font-extrabold font-display text-white">[Tier 1 Price]</span>
                  <span className="text-xs text-gray-500 font-mono ml-2">ONE-TIME FEE</span>
                  <p className="text-[11px] text-blue-500 uppercase tracking-wider font-semibold font-mono mt-1">[Tier 1 Installment Option]</p>
                </div>

                <ul className="space-y-3.5 text-xs text-gray-300 font-mono">
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Tier 1 Bullet Point 1]</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Tier 1 Bullet Point 2]</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Tier 1 Bullet Point 3]</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Tier 1 Bullet Point 4]</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Tier 1 Bullet Point 5]</li>
                </ul>
              </div>

              <div className="pt-8">
                <button
                  onClick={openModal}
                  className="w-full button-blue"
                >
                  [Tier 1 CTA Button]
                </button>
              </div>
            </div>

            {/* Tier 2 */}
            <div className="pricing-card resource-card text-left justify-between relative bg-white/[0.02]">
              <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 rounded-full text-[9px] text-white font-black uppercase tracking-widest font-mono shadow-md animate-pulse">
                [Tier 2 Highlight Tag]
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold tracking-wider font-display text-white">[Tier 2 Name — e.g. Elite 1-1 Mastermind]</h3>
                    <p className="text-xs text-gray-500 mt-1 font-mono">[Tier 2 Subtitle — e.g. Exclusive Acceleration Track]</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-blue-600/20 border border-blue-600/30 text-[9px] font-mono text-blue-500 font-bold uppercase tracking-widest">[Duration Model — e.g. 10 WEEKS]</span>
                </div>

                <div className="py-4 border-y border-white/5">
                  <span className="text-4xl font-extrabold font-display text-white">[Tier 2 Price]</span>
                  <span className="text-xs text-gray-500 font-mono ml-2">ONE-TIME FEE</span>
                  <p className="text-[11px] text-blue-500 uppercase tracking-wider font-semibold font-mono mt-1">[Tier 2 Requirement Option]</p>
                </div>

                <ul className="space-y-3.5 text-xs text-gray-300 font-mono">
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Tier 2 Bullet Point 1]</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Tier 2 Bullet Point 2]</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Tier 2 Bullet Point 3]</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Tier 2 Bullet Point 4]</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> [Tier 2 Bullet Point 5]</li>
                </ul>
              </div>

              <div className="pt-8">
                <button
                  onClick={openModal}
                  className="w-full button-blue"
                >
                  [Tier 2 CTA Button]
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= 9. FAQ ACCORDION ================= */}
      <section className="relative bg-[#0e0f12] py-24 sm:py-32 px-6">
        <div className="max-w-3xl mx-auto faq-list-trigger">
          {/* Header */}
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight">
              [FAQ Section Title — e.g. Have Any Questions?]
            </h2>
          </div>

          {/* Accordion list */}
          <div className="space-y-4 text-left">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx}
                  className="faq-item-animate bg-[#0e0f12] rounded-xl border border-white/10 overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full py-5 px-6 flex items-center justify-between text-left focus:outline-none cursor-pointer group hover:bg-white/5 transition-colors"
                  >
                    <span className="font-bold text-white text-sm sm:text-base tracking-wide font-display">
                      {faq.q}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-500 group-hover:text-blue-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[300px] border-t border-white/10 bg-[#14161f]/50' : 'max-h-0'}`}>
                    <p className="p-6 text-gray-400 text-sm font-light leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 10. FOOTER ================= */}
      <Footer onOpenModal={openModal} />

      {/* ================= 11. LEAD modal ================= */}
      <LeadCaptureModal isOpen={isModalOpen} onClose={closeModal} />

    </main>
  );
}
