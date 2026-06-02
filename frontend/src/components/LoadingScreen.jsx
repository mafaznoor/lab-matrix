import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function LoadingScreen({ onComplete }) {
  const [loadingText, setLoadingText] = useState("Booting Lab Matrix OS...");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Text badalne ka sequence
    const textSequence = [
      { text: "Waking up system...", time: 0 },
      { text: "Connecting to MySQL Database...", time: 1000 },
      { text: "Engineer checking equipment nodes...", time: 2200 },
      { text: "Applying liquid glass UI...", time: 3400 },
      { text: "System Ready. Welcome!", time: 4200 }
    ];

    textSequence.forEach(({ text, time }) => {
      setTimeout(() => setLoadingText(text), time);
    });

    // Progress bar ko 0 se 100 tak le jane ka logic (Total 4.5 seconds)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2; // Speed of progress bar
      });
    }, 90); 

    // 5 second baad main app par bhej dega
    setTimeout(() => {
      onComplete();
    }, 4800);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 relative overflow-hidden z-50">
      
      {/* Background Liquid Blobs (Same as App.jsx to keep consistency) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-300/30 blur-[120px] animate-[pulse_3s_ease-in-out_infinite] -z-10"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-emerald-200/30 blur-[150px] animate-[pulse_4s_ease-in-out_infinite_alternate] -z-10"></div>

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.1, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        {/* --- ANIMATED ENGINEER & COMPUTER SVG --- */}
        <div className="relative w-48 h-48 mb-8">
          {/* Main Computer Monitor */}
          <motion.svg className="absolute inset-0 w-full h-full text-slate-800 drop-shadow-xl" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </motion.svg>

          {/* Animated Screen Data (Lines moving up and down) */}
          <motion.div 
            animate={{ y: [-5, 5, -5] }} 
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="absolute top-[30%] left-[25%] w-[50%] h-[2px] bg-blue-500 shadow-[0_0_8px_#3b82f6]"
          ></motion.div>
          <motion.div 
            animate={{ y: [5, -5, 5] }} 
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="absolute top-[45%] left-[25%] w-[30%] h-[2px] bg-emerald-500 shadow-[0_0_8px_#10b981]"
          ></motion.div>

          {/* Rotating Gear (Engineer fixing something) */}
          <motion.svg 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="absolute -top-2 -right-4 w-16 h-16 text-blue-600 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </motion.svg>

          {/* Wrench (Pana) animated */}
          <motion.svg 
            animate={{ rotate: [-20, 20, -20] }} 
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="absolute -bottom-2 -left-4 w-14 h-14 text-rose-500 drop-shadow-md origin-bottom-right" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5 5m0 0l-2-2m2 2l2-2" />
          </motion.svg>
        </div>

        {/* --- LOADING TEXT & PROGRESS BAR --- */}
        <div className="w-80 text-center">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-widest mb-1">LAB MATRIX <span className="text-blue-600">OS</span></h1>
          <p className="text-sm font-bold text-slate-500 mb-6 h-5">{loadingText}</p>
          
          {/* Glass Progress Bar Container */}
          <div className="w-full h-2 bg-slate-200/50 backdrop-blur-md rounded-full overflow-hidden shadow-inner border border-white/60">
            {/* The moving bar */}
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400"
              style={{ width: `${progress}%` }}
              layout
            ></motion.div>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-2 font-bold">{progress}%</p>
        </div>
      </motion.div>
    </div>
  );
}

export default LoadingScreen;