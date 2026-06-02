import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function EquipmentPanel({ token, user }) {
  const canEdit = user?.role === 'maintainer' || user?.role === 'admin';
  const [equipmentData, setEquipmentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [selectedEq, setSelectedEq] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');

  // 1. Fetch Data
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/equipment`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(response => response.json())
      .then(data => {
        setEquipmentData(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
  }, []);

  // 2. Filtered Data
  const filteredData = equipmentData.filter((item) => {
    const name = (item.EquipmentName || item.name || item.Name || '').toLowerCase();
    const serial = (item.SerialNumber || item.serial || item.Serial || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || serial.includes(q);
  });

  // 3. Form Submit
  const handleSubmit = (e) => {
    e.preventDefault();

    const updateData = {
      equipmentId: selectedEq,
      newStatus: newStatus,
      issueDescription: description,
      repairCost: cost || 0
    };

    fetch(`${import.meta.env.VITE_API_URL || ''}/api/update-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(updateData)
    })
      .then(response => {
        if (response.ok) {
          alert('Status Updated Successfully!');
          window.location.reload();
        } else {
          alert('Error updating status!');
        }
      })
      .catch(error => console.error('Error updating:', error));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  const inputClass = "w-full bg-white/40 border border-white/60 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:bg-white/70 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]";

  return (
    <div className={`grid grid-cols-1 ${canEdit ? 'lg:grid-cols-3' : ''} gap-6 lg:gap-8 pb-10`}>

      {/* --- FORM PANEL (only for maintainer/admin) --- */}
      {canEdit ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="col-span-1 p-5 sm:p-8 rounded-[1.5rem] lg:rounded-[2rem] border border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-fit lg:h-full"
      >
        <div className="flex items-center gap-2 mb-6 border-b border-white/40 pb-4">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Change Status & Log</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5 flex-1">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Target Equipment</label>
            <select
              required
              onChange={(e) => setSelectedEq(e.target.value)}
              className={inputClass}
            >
              <option value="">Select Equipment...</option>
              {equipmentData.map((item, index) => {
                const id = item.EquipmentID || item.id || item.ID || index;
                const name = item.EquipmentName || item.name || item.Name || 'Unnamed';
                const serial = item.SerialNumber || item.serial || item.Serial || 'N/A';
                return (
                  <option key={id} value={id}>{name} (S/N: {serial})</option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">New Status</label>
            <select
              required
              onChange={(e) => setNewStatus(e.target.value)}
              className={inputClass}
            >
              <option value="">Select Status...</option>
              <option value="Under Repair">Under Repair - FAULTY</option>
              <option value="Working">Working - ACTIVE</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Description</label>
            <textarea
              onChange={(e) => setDescription(e.target.value)}
              rows="3" placeholder="Explain the fault..."
              className={`${inputClass} resize-none placeholder-slate-400`}
            ></textarea>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Repair Estimate Cost</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">PKR</span>
              <input
                type="number"
                onChange={(e) => setCost(e.target.value)}
                placeholder="3500"
                className={`w-full bg-white/40 border border-white/60 rounded-xl pl-14 pr-4 py-2.5 text-sm text-slate-800 focus:bg-white/70 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] placeholder-slate-400`}
              />
            </div>
          </div>

          <div className="pt-2 lg:pt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-3 px-4 bg-blue-600/90 backdrop-blur-md hover:bg-blue-600 text-white text-sm rounded-xl font-bold shadow-[0_4px_15px_rgba(37,99,235,0.3)] transition-all border border-blue-500/50"
            >
              Apply Changes & Update
            </motion.button>
          </div>
        </form>
      </motion.div>
      ) : null}

      {/* --- TABLE / CARD AUDIT PANEL --- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className={`${canEdit ? 'col-span-1 lg:col-span-2' : 'col-span-1'} p-5 sm:p-8 rounded-[1.5rem] lg:rounded-[2rem] border border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full`}
      >
        <div className="flex items-center gap-2 mb-4 border-b border-white/40 pb-4">
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Specifications Audit</h3>
        </div>

        {/* SEARCH BAR */}
        <div className="relative mb-5">
          <svg className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or serial number..."
            className="w-full bg-white/40 border border-white/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:bg-white/70 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* LOADING & EMPTY STATES */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-medium">Loading Data from MySQL...</div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-medium">
            {searchQuery ? `No results for "${searchQuery}"` : 'No Equipment Found'}
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/50 text-[11px] uppercase tracking-widest text-slate-500">
                    <th className="pb-4 font-bold px-4">ID</th>
                    <th className="pb-4 font-bold px-4">Name</th>
                    <th className="pb-4 font-bold px-4">Serial</th>
                    <th className="pb-4 font-bold px-4 text-right">Status</th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="text-sm text-slate-700"
                >
                  {filteredData.map((item, index) => {
                    const eqId = item.EquipmentID || item.id || item.ID || `#0${index + 1}`;
                    const eqName = item.EquipmentName || item.name || item.Name || 'N/A';
                    const eqSerial = item.SerialNumber || item.serial || item.Serial || 'N/A';
                    const rawStatus = item.Status || item.status || 'working';
                    const isWorking = rawStatus.toString().toLowerCase().includes('work') || rawStatus.toString().toLowerCase().includes('active');

                    return (
                      <motion.tr variants={itemVariants} key={index} className="border-b border-white/30 hover:bg-white/50 transition-colors group">
                        <td className="py-4 px-4 text-slate-500 font-mono text-xs">{eqId}</td>
                        <td className="py-4 px-4 font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{eqName}</td>
                        <td className="py-4 px-4 text-slate-500 font-mono text-xs">{eqSerial}</td>
                        <td className="py-4 px-4 flex justify-end">
                          {isWorking ? (
                            <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-2 w-max shadow-[0_2px_10px_rgba(16,185,129,0.1)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>WORKING
                            </span>
                          ) : (
                            <span className="bg-rose-500/10 text-rose-700 border border-rose-500/20 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-2 w-max shadow-[0_2px_10px_rgba(244,63,94,0.1)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>UNDER REPAIR
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="block md:hidden space-y-4 overflow-y-auto max-h-[60vh] pr-1"
            >
              {filteredData.map((item, index) => {
                const eqId = item.EquipmentID || item.id || item.ID || `#0${index + 1}`;
                const eqName = item.EquipmentName || item.name || item.Name || 'N/A';
                const eqSerial = item.SerialNumber || item.serial || item.Serial || 'N/A';
                const rawStatus = item.Status || item.status || 'working';
                const isWorking = rawStatus.toString().toLowerCase().includes('work') || rawStatus.toString().toLowerCase().includes('active');

                return (
                  <motion.div
                    variants={itemVariants}
                    key={index}
                    className="bg-white/50 border border-white/60 p-4 rounded-2xl shadow-sm space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-mono text-xs">{eqId}</span>
                      {isWorking ? (
                        <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>WORKING
                        </span>
                      ) : (
                        <span className="bg-rose-500/10 text-rose-700 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>REPAIR
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">{eqName}</h4>
                      <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">S/N:</span>
                        <span className="font-mono">{eqSerial}</span>
                      </p>
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

export default EquipmentPanel;
