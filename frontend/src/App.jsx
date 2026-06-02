import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import EquipmentPanel from './components/EquipmentPanel';
import LabAllocations from './components/LabAllocations';
import Maintenance from './components/Maintenance';
import LoadingScreen from './components/LoadingScreen';
import LoginScreen from './components/LoginScreen';
import ProfilePanel from './components/ProfilePanel';
import IssueReporter from './components/IssueReporter';
import AdminPanel from './components/AdminPanel';
import CursorTracker from './components/CursorTracker';

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isBooting, setIsBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const BASE_URL = (import.meta.env.VITE_API_URL || '');

  useEffect(() => {
    const savedToken = localStorage.getItem('lm_token');
    const savedUser = localStorage.getItem('lm_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Sync user when ProfilePanel updates it
  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleLoginSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('lm_token');
    localStorage.removeItem('lm_user');
    setUser(null);
    setToken(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard': return <Dashboard token={token} user={user} />;
      case 'Equipment': return <EquipmentPanel token={token} user={user} />;
      case 'Lab Allocations': return <LabAllocations token={token} user={user} />;
      case 'Maintenance': return <Maintenance token={token} user={user} />;
      case 'Admin Panel': return <AdminPanel token={token} user={user} />;
      case 'Profile': return <ProfilePanel user={user} token={token} onUserUpdate={handleUserUpdate} />;
      default: return <Dashboard token={token} user={user} />;
    }
  };

  if (isBooting) return <LoadingScreen onComplete={() => setIsBooting(false)} />;
  if (!user) return <LoginScreen onLoginSuccess={handleLoginSuccess} />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="flex flex-col lg:flex-row h-screen bg-slate-50/50 text-slate-900 overflow-hidden font-sans antialiased relative z-0"
    >
      <CursorTracker />

      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-300/30 blur-[120px] animate-[pulse_8s_ease-in-out_infinite] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-emerald-200/30 blur-[150px] animate-[pulse_10s_ease-in-out_infinite_alternate] -z-10 pointer-events-none"></div>
      <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-purple-200/20 blur-[100px] animate-[pulse_12s_ease-in-out_infinite] -z-10 pointer-events-none"></div>

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-10">
        <motion.header
          key={activeTab + "-header"}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6 lg:mb-10 flex items-start justify-between"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3 drop-shadow-sm">
              {activeTab}
            </h2>
            <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1 sm:mt-2">Enterprise Lab Operations System / 2026</p>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2">
            {/* Issue Reporter */}
            <IssueReporter token={token} user={user} />

            {/* User badge — click to go to Profile */}
            <div
            onClick={() => setActiveTab('Profile')}
            className="flex items-center gap-3 bg-white/60 border border-white/60 px-4 py-2 rounded-2xl shadow-sm backdrop-blur-md cursor-pointer hover:bg-white/80 transition-all"
          >
            {/* Avatar or Initial */}
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
              {user?.profilePic ? (
                <img src={`${BASE_URL}${user.profilePic}`} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xs uppercase">{user.username?.[0]}</span>
                </div>
              )}
            </div>

            <div className="hidden sm:block">
              <p className="text-xs font-bold text-slate-700">{user.username}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{user.role}</p>
            </div>

            {/* Logout button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleLogout(); }}
              className="ml-1 text-slate-400 hover:text-rose-500 transition-colors"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
          </div>
        </motion.header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </motion.div>
  );
}

export default App;
