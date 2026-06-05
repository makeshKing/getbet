import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  isLoading: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  const [step, setStep] = useState(0);
  const [shouldRender, setShouldRender] = useState(isLoading);
  const [fadeAway, setFadeAway] = useState(false);

  const loadingSteps = [
    'Securing connection to PredictKit...',
    'Authenticating your session...',
    'Fetching premium market data...',
    'Analyzing order books...',
    'Readying trading cockpit...',
  ];

  useEffect(() => {
    if (isLoading) {
      setShouldRender(true);
      setFadeAway(false);
      // Cycle through steps for interactive feel
      const interval = setInterval(() => {
        setStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 700);
      return () => clearInterval(interval);
    } else {
      // Start fade-out animation
      setFadeAway(true);
      const timeout = setTimeout(() => {
        setShouldRender(false);
      }, 500); // match duration-500
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#08090f] dark:via-[#0f111a] dark:to-[#171a26] transition-all duration-500 ease-out-expo ${
        fadeAway ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Decorative Glowing Elements */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full filter blur-[80px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full filter blur-[100px] animate-pulse delay-75" />

      {/* Main Glassmorphic Container */}
      <div className="relative z-10 flex flex-col items-center max-w-sm px-8 py-10 mx-4 text-center rounded-3xl border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-[#1a1d26]/70 backdrop-blur-xl shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
        {/* Glow behind the spinner */}
        <div className="absolute top-10 w-24 h-24 bg-gradient-to-tr from-indigo-500 to-emerald-500 rounded-full filter blur-[30px] opacity-20 dark:opacity-30 animate-pulse" />

        {/* Visual Spinner/Progress Indicator */}
        <div className="relative w-24 h-24 mb-8">
          {/* Inner ring */}
          <div className="absolute inset-2 rounded-full border-2 border-slate-200 dark:border-slate-800" />
          {/* Middle Glowing ring */}
          <div className="absolute inset-1 rounded-full border-t-2 border-r-2 border-emerald-500 animate-spin" style={{ animationDuration: '1.5s' }} />
          {/* Outer Glowing ring */}
          <div className="absolute inset-0 rounded-full border-b-2 border-l-2 border-indigo-600 animate-spin" style={{ animationDuration: '1s', animationDirection: 'reverse' }} />
          
          {/* Center Pulsing Logo Icon Placeholder */}
          <div className="absolute inset-4 flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-full shadow-inner">
            <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500 dark:from-white dark:to-slate-300 mb-2">
          PredictKit
        </h1>
        <p className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold mb-6">
          Premium Prediction Markets
        </p>

        {/* Dynamic Loading Step Text */}
        <div className="h-6 flex items-center justify-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 animate-pulse transition-all duration-300">
            {loadingSteps[step]}
          </p>
        </div>

        {/* Premium Subtle Progress Indicator */}
        <div className="w-48 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-6 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / loadingSteps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
