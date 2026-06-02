import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function Maintenance({ token, user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Maintenance Data
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/maintenance`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching maintenance logs:", error);
        setLoading(false);
      });
  }, [token]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="w-full pb-10">
      {/* --- MAINTENANCE LOGS PANEL (Glassmorphism) --- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="p-5 sm:p-8 rounded-[1.5rem] lg:rounded-[2rem] border border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full"
      >
        <div className="flex items-center justify-between mb-6 border-b border-white/40 pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Historical Repair Logs</h3>
          </div>
          
          <span className="bg-white/60 text-slate-700 px-3 py-1.5 rounded-xl border border-white text-[11px] font-extrabold shadow-sm tracking-wider">
            TOTAL RECORDS: {logs.length}
          </span>
        </div>

        {/* LOADING & EMPTY STATES */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-medium">Fetching Logs from Database...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-medium">No Maintenance History Found.</div>
        ) : (
          <>
            {/* 1. DESKTOP VIEW: Sleek Table (Hidden on Mobile/Tablet) */}
            <div className="hidden md:block overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/50 text-[11px] uppercase tracking-widest text-slate-500">
                    <th className="pb-4 font-bold px-4">Log ID</th>
                    <th className="pb-4 font-bold px-4">Equipment</th>
                    <th className="pb-4 font-bold px-4">Issue Reported</th>
                    <th className="pb-4 font-bold px-4">Repair Date</th>
                    <th className="pb-4 font-bold px-4 text-right">Cost (PKR)</th>
                  </tr>
                </thead>
                <motion.tbody 
                  variants={containerVariants} 
                  initial="hidden" 
                  animate="show"
                  className="text-sm text-slate-700"
                >
                  {logs.map((item, index) => {
                    const logId = item.MaintenanceID || item.id || `#M${index + 1}`;
                    const eqName = item.EquipmentName || item.equipmentName || 'Unknown Device';
                    const description = item.IssueDescription || item.description || 'No description provided';
                    const cost = item.RepairCost || item.cost || '0';
                    const rawDate = item.RepairDate || item.date;
                    const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending';

                    return (
                      <motion.tr variants={itemVariants} key={index} className="border-b border-white/30 hover:bg-white/50 transition-colors group">
                        <td className="py-4 px-4 font-mono text-xs text-slate-400 font-bold">#{logId}</td>
                        <td className="py-4 px-4 font-extrabold text-slate-800">{eqName}</td>
                        <td className="py-4 px-4 text-slate-600 max-w-xs truncate" title={description}>{description}</td>
                        <td className="py-4 px-4 font-mono text-xs text-slate-500 font-bold flex items-center gap-2">
                           <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                           {formattedDate}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="inline-block bg-rose-500/10 text-rose-700 border border-rose-500/20 px-3 py-1.5 rounded-lg text-xs font-mono font-bold shadow-[0_2px_10px_rgba(244,63,94,0.05)]">
                            {parseInt(cost).toLocaleString()}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>

            {/* 2. MOBILE & TABLET VIEW: Premium Fluid Cards Stack (Hidden on Desktop) */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="block md:hidden space-y-4 overflow-y-auto max-h-[65vh] pr-1"
            >
              {logs.map((item, index) => {
                const logId = item.MaintenanceID || item.id || `M${index + 1}`;
                const eqName = item.EquipmentName || item.equipmentName || 'Unknown Device';
                const description = item.IssueDescription || item.description || 'No description provided';
                const cost = item.RepairCost || item.cost || '0';
                const rawDate = item.RepairDate || item.date;
                const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending';

                return (
                  <motion.div 
                    variants={itemVariants}
                    key={index}
                    className="bg-white/50 border border-white/60 p-4 rounded-2xl shadow-sm space-y-3 relative overflow-hidden"
                  >
                    {/* Upper Metadata Area */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 font-mono block">LOG ID: #{logId}</span>
                        <h4 className="font-extrabold text-slate-800 text-base mt-0.5">{eqName}</h4>
                      </div>
                      
                      <span className="bg-rose-500/10 text-rose-700 border border-rose-500/20 px-2.5 py-1 rounded-lg text-xs font-mono font-bold whitespace-nowrap shadow-[0_2px_8px_rgba(244,63,94,0.03)]">
                        PKR {parseInt(cost).toLocaleString()}
                      </span>
                    </div>

                    {/* Description Text Area */}
                    <div className="bg-white/30 border border-white/40 p-2.5 rounded-xl text-xs text-slate-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                      <span className="font-bold text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Issue Logged</span>
                      {description}
                    </div>

                    {/* Footer Date Stamp */}
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium pt-1">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Repair Date:</span>
                      <span className="font-mono text-slate-600 font-bold">{formattedDate}</span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default Maintenance;