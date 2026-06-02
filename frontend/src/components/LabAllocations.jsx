import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function LabAllocations({ token, user }) {
  const canEdit = user?.role === 'maintainer' || user?.role === 'admin';
  const [allocations, setAllocations] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [selectedEq, setSelectedEq] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [assignDate, setAssignDate] = useState('');

  // 1. Fetch Data
  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/departments`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/equipment`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/departments-list`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
    ])
    .then(([allocationsData, eqData, departmentsData]) => {
      setAllocations(allocationsData);
      setEquipmentList(eqData);
      setDeptList(departmentsData);
      setLoading(false);
    })
    .catch(error => {
      console.error("Error fetching allocation data:", error);
      setLoading(false);
    });
  }, []);

  // 2. Form Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    const assignmentData = {
      equipmentId: selectedEq,
      departmentId: selectedDept,
      assignDate: assignDate
    };

    fetch(`${import.meta.env.VITE_API_URL || ''}/api/allocate-equipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(assignmentData)
    })
    .then(response => {
      if(response.ok) {
        alert('Equipment Successfully Allocated to Lab!');
        window.location.reload(); 
      } else {
        alert('Error allocating equipment!');
      }
    })
    .catch(error => console.error('Error:', error));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  // Reusable Glass Input Class
  const inputClass = "w-full bg-white/40 border border-white/60 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:bg-white/70 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]";

  return (
    // FIX: Changed gap and layout parameters for smoother scaling on responsive screens
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Assign Equipment</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5 flex-1">
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Select Equipment</label>
            <select required onChange={(e) => setSelectedEq(e.target.value)} className={inputClass}>
              <option value="">Choose Equipment...</option>
              {equipmentList.map((item, index) => {
                const id = item.EquipmentID || item.id || item.ID || index;
                const name = item.EquipmentName || item.name || item.Name || 'Unnamed';
                return <option key={`eq-${id}`} value={id}>{name}</option>;
              })}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Select Lab / Department</label>
            <select required onChange={(e) => setSelectedDept(e.target.value)} className={inputClass}>
              <option value="">Choose Lab...</option>
              {deptList.map((dept, index) => {
                const deptId = dept.DepartmentID || dept.id || dept.ID || index;
                const deptName = dept.DepartmentName || dept.deptName || dept.Name || 'Unnamed Lab';
                return <option key={`dept-${deptId}`} value={deptId}>{deptName}</option>;
              })}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Assignment Date</label>
            <input 
              type="date" 
              required
              onChange={(e) => setAssignDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="pt-2 lg:pt-4">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              className="w-full py-3 px-4 bg-blue-600/90 backdrop-blur-md hover:bg-blue-600 text-white text-sm rounded-xl font-bold shadow-[0_4px_15px_rgba(37,99,235,0.3)] transition-all border border-blue-500/50"
            >
              Confirm Allocation
            </motion.button>
          </div>
        </form>
      </motion.div>
      ) : null}

      {/* --- DATA DISPLAY PANEL --- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className={`${canEdit ? 'col-span-1 lg:col-span-2' : 'col-span-1'} p-5 sm:p-8 rounded-[1.5rem] lg:rounded-[2rem] border border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full`}
      >
        <div className="flex items-center gap-2 mb-6 border-b border-white/40 pb-4">
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Active Lab Allocations</h3>
        </div>

        {/* LOADING & EMPTY STATES CONTAINER */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-medium">Loading Allocations...</div>
        ) : allocations.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-medium">No Equipment Allocated Yet</div>
        ) : (
          <>
            {/* 1. DESKTOP VIEW: Sleek Table Layout (Hidden on Mobile/Tablet) */}
            <div className="hidden md:block overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/50 text-[11px] uppercase tracking-widest text-slate-500">
                    <th className="pb-4 font-bold px-4">Lab / Dept Name</th>
                    <th className="pb-4 font-bold px-4">Equipment Assigned</th>
                    <th className="pb-4 font-bold px-4">Assignment Date</th>
                  </tr>
                </thead>
                <motion.tbody 
                  variants={containerVariants} 
                  initial="hidden" 
                  animate="show"
                  className="text-sm text-slate-700"
                >
                  {allocations.map((item, index) => {
                    const deptName = item.DepartmentName || item.deptName || 'N/A';
                    const eqName = item.EquipmentName || item.equipmentName || 'N/A';
                    const rawDate = item.AssignDate || item.assignDate;
                    const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

                    return (
                      <motion.tr variants={itemVariants} key={index} className="border-b border-white/30 hover:bg-white/50 transition-colors group">
                        <td className="py-4 px-4 font-extrabold text-slate-800 group-hover:text-emerald-600 transition-colors flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                          {deptName}
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-600">{eqName}</td>
                        <td className="py-4 px-4 text-slate-500 font-mono text-xs">{formattedDate}</td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>

            {/* 2. MOBILE & TABLET VIEW: Fluid Card Stack Layout (Hidden on Desktop) */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="block md:hidden space-y-4 overflow-y-auto max-h-[60vh] pr-1"
            >
              {allocations.map((item, index) => {
                const deptName = item.DepartmentName || item.deptName || 'N/A';
                const eqName = item.EquipmentName || item.equipmentName || 'N/A';
                const rawDate = item.AssignDate || item.assignDate;
                const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

                return (
                  <motion.div 
                    variants={itemVariants}
                    key={index}
                    className="bg-white/50 border border-white/60 p-4 rounded-2xl shadow-sm space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"></div>
                        <span className="font-extrabold text-slate-800 text-sm">{deptName}</span>
                      </div>
                      <span className="text-slate-500 font-mono text-[10px] bg-white/40 border border-white/50 px-2 py-0.5 rounded-md shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">{formattedDate}</span>
                    </div>

                    <div className="border-t border-white/40 pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Equipment Assigned</span>
                      <h4 className="font-bold text-slate-700 text-sm">{eqName}</h4>
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

export default LabAllocations;