import React, { useState } from 'react';

function Sidebar({ activeTab, setActiveTab, user }) {
  const menuItems = [
    'Dashboard', 'Equipment', 'Lab Allocations', 'Maintenance',
    ...(user?.role === 'admin' ? ['Admin Panel'] : []),
    'Profile'
  ];
  // Mobile menu ko open/close karne ke liye state
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 1. MOBILE HEADER & HAMBURGER (Sirf Phone/Tablet par dikhega) */}
      <div className="lg:hidden w-full bg-white/60 backdrop-blur-md border-b border-white/60 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <h1 className="font-extrabold text-xl tracking-tight text-slate-800 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]"></span>
          LAB MATRIX
        </h1>
        
        {/* Hamburger Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-xl bg-white/80 border border-white shadow-sm text-slate-700 hover:text-blue-600 transition-all focus:outline-none"
        >
          {isOpen ? (
            // Close Icon (X)
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            // Hamburger Icon (☰)
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* 2. BACKGROUND OVERLAY (Sirf mobile par tab dikhega jab menu open ho, click karne par close ho jayega) */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-10"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 3. MAIN SIDEBAR COMPONENT */}
      <aside className={`
        /* Base positioning & Liquid Glass Styling */
        bg-white/40 backdrop-blur-2xl border-r border-white/60 shadow-[4px_0_24px_rgba(0,0,0,0.03)] flex flex-col z-20 transition-all duration-300
        
        /* Desktop & Laptop Rules */
        lg:static lg:w-64 lg:h-full lg:translate-x-0
        
        /* Mobile & Tablet Rules (Fixed Drawer Appereance) */
        fixed top-0 left-0 h-screen w-72 max-w-[80vw] 
        ${isOpen ? 'translate-x-0 shadow-[20px_0_40px_rgba(0,0,0,0.1)]' : '-translate-x-full'}
      `}>
        
        {/* Brand Logo & Team Members */}
        <div className="p-6 mt-2">
          <h1 className="font-extrabold text-2xl tracking-tight text-slate-800 flex items-center gap-3 drop-shadow-sm">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]"></span>
            LAB MATRIX
          </h1>
          
          {/* Team Names List */}
          <div className="mt-4 space-y-1">
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Team Members:</p>
            <p className="text-[11px] text-slate-600 font-semibold">• Mafaz Noor</p>
            <p className="text-[11px] text-slate-600 font-semibold">• Khadija Batool</p>
            <p className="text-[11px] text-slate-600 font-semibold">• Saman Rafique</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 mt-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item}
              onClick={() => {
                setActiveTab(item);
                setIsOpen(false); // Mobile par click karte hi menu automatic band ho jaye
              }}
              className={`w-full flex items-center px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                activeTab === item
                  ? 'bg-white/80 text-blue-600 border border-white shadow-[0_4px_15px_rgba(0,0,0,0.04)] translate-x-1'
                  : 'text-slate-500 hover:bg-white/50 hover:text-slate-800 border border-transparent hover:translate-x-1'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        {/* Bottom Status Glass Badge */}
        <div className="p-6 border-t border-white/40 bg-white/10">
          <div className="flex items-center gap-3 bg-white/60 border border-white px-4 py-3 rounded-2xl shadow-sm backdrop-blur-md">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></div>
             <span className="text-xs text-slate-700 font-bold tracking-wider uppercase">System Online</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;