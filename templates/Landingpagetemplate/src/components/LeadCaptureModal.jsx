import React, { useState, useEffect } from 'react';
import { X, User, Phone, CheckCircle, ArrowRight, MessageSquare, ShieldCheck } from 'lucide-react';

export default function LeadCaptureModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  // Reset modal state when closed or opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('[Placeholder Error — Please fill in all fields]');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleWhatsAppRedirect = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      {/* Modal Container */}
      <div className="relative w-full max-w-lg rounded-3xl p-8 sm:p-10 bg-[#0e0f12] border border-white/10 shadow-2xl text-white overflow-hidden transform transition-all">
        
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-radial from-blue-600/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 1 ? (
          /* STEP 1 */
          <div>
            {/* Step Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-mono uppercase tracking-widest mb-6">
              <span>[Modal Step 1 Badge — e.g. Step 01 of 02]</span>
            </div>

            {/* Title */}
            <h3 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight mb-2">
              [Modal Step 1 Headline — e.g. Book Your Strategy Session]
            </h3>
            <p className="text-gray-400 text-sm font-light mb-8 leading-relaxed">
              [Modal Step 1 Description — Explain why the user is providing their information and what happens next.]
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleStep1Submit} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
                  [Input 1 Label — e.g. Full Name]
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="[Input 1 Placeholder — e.g. John Doe]"
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/40 border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-gray-600 text-sm font-medium transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
                  [Input 2 Label — e.g. Phone Number]
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="[Input 2 Placeholder — e.g. +1 (555) 000-0000]"
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/40 border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-gray-600 text-sm font-medium transition-all outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full button-blue mt-6 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>[Modal Step 1 Submit Button]</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            {/* Trust Footer */}
            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-gray-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>[Modal Security Label — e.g. 256-Bit Encrypted]</span>
            </div>
          </div>
        ) : (
          /* STEP 2 */
          <div className="text-center py-4 animate-fadeIn">
            {/* Success Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 mb-6 mx-auto animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>

            {/* Title */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 text-xs font-mono uppercase tracking-widest mb-4">
              <span>[Modal Step 2 Badge — e.g. Success]</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight mb-3 text-white">
              [Modal Step 2 Headline — e.g. Request Confirmed]
            </h3>
            
            <p className="text-gray-400 text-sm font-light mb-8 leading-relaxed max-w-sm mx-auto">
              [Modal Step 2 Description — Tell the user what happens next or explain redirect parameters.]
            </p>

            {/* Big Action Button */}
            <button
              onClick={handleWhatsAppRedirect}
              className="w-full button-blue flex items-center justify-center gap-3 group cursor-pointer mb-4"
            >
              <MessageSquare className="w-6 h-6 fill-current" />
              <span>[Modal Step 2 Action Button]</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Secondary Option */}
            <button
              onClick={onClose}
              className="text-xs text-gray-500 hover:text-gray-300 underline font-mono uppercase tracking-wider transition-colors"
            >
              [Modal Step 2 Cancel Button]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
