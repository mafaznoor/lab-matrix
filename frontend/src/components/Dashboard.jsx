import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

function Dashboard({ token, user }) {
  const canEdit = user?.role === 'maintainer' || user?.role === 'admin';
  const [stats, setStats] = useState({
    totalEquipment: 0,
    underRepair: 0,
    totalLabs: 0,
    recentMaintenance: []
  });

  // Raw data from API (unfiltered)
  const [rawEquipment, setRawEquipment] = useState([]);
  const [rawMaintenance, setRawMaintenance] = useState([]);

  const [chartsData, setChartsData] = useState({
    equipmentPrices: [],
    maintenanceTrends: []
  });

  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all');

  const [eqForm, setEqForm] = useState({
    name: '', category: '', brand: '', model: '', serial: '', purchaseDate: '', price: '', status: 'Working'
  });
  const [labForm, setLabForm] = useState({ deptName: '', location: '' });

  // Fetch data from API
  const fetchData = useCallback(() => {
    Promise.all([
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/equipment`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/departments-list`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/maintenance`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
    ])
    .then(([equipmentData, deptData, maintenanceData]) => {
      const eqArr = Array.isArray(equipmentData) ? equipmentData : [];
      const maintArr = Array.isArray(maintenanceData) ? maintenanceData : [];
      const deptArr = Array.isArray(deptData) ? deptData : [];

      const repairingCount = eqArr.filter(eq => {
        const status = eq.Status || eq.status || '';
        return status.toString().toLowerCase().includes('repair');
      }).length;

      setStats({
        totalEquipment: eqArr.length,
        underRepair: repairingCount,
        totalLabs: deptArr.length,
        recentMaintenance: maintArr.slice(0, 5)
      });

      setRawEquipment(eqArr);
      setRawMaintenance(maintArr);
      setLoading(false);
    })
    .catch(error => {
      console.error("Dashboard Data Error:", error);
      setLoading(false);
    });
  }, [token]);

  // Fetch on mount + poll every 30s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filter + build chart data when raw data or filter changes
  useEffect(() => {
    const filterByDate = (items, dateField) => {
      if (timeFilter === 'all') return items;
      const now = new Date();
      const days = { '7d': 7, '30d': 30, '90d': 90 }[timeFilter] || 0;
      if (!days) return items;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      return items.filter(item => {
        const d = new Date(item[dateField]);
        return !isNaN(d) && d >= cutoff;
      });
    };

    const filteredEq = filterByDate(rawEquipment, 'PurchaseDate');
    const filteredMaint = filterByDate(rawMaintenance, 'RepairDate');

    const eqPrices = filteredEq.slice(0, 8).map(eq => ({
      name: (eq.EquipmentName || eq.name || 'Unknown').substring(0, 10) + (((eq.EquipmentName || eq.name || '').length > 10) ? '…' : ''),
      price: parseInt(eq.Price || eq.price || 0),
      purchaseDate: eq.PurchaseDate
    }));

    const maintCosts = filteredMaint.slice(0, 10).map((m, index) => ({
      name: `Log ${m.MaintenanceID || index}`,
      cost: parseInt(m.RepairCost || m.cost || 0),
      equipment: m.EquipmentName,
      repairDate: m.RepairDate
    })).reverse();

    setChartsData({ equipmentPrices: eqPrices, maintenanceTrends: maintCosts });
  }, [rawEquipment, rawMaintenance, timeFilter]);

  const handleAddEquipment = (e) => {
    e.preventDefault();
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/add-equipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(eqForm)
    }).then(res => {
      if(res.ok) { alert('Equipment Registered!'); fetchData(); setEqForm({ name: '', category: '', brand: '', model: '', serial: '', purchaseDate: '', price: '', status: 'Working' }); }
    });
  };

  const handleAddLab = (e) => {
    e.preventDefault();
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/add-department`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(labForm)
    }).then(res => {
      if(res.ok) { alert('Lab Added!'); fetchData(); setLabForm({ deptName: '', location: '' }); }
    });
  };

  const cardVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] text-sm">
          <p className="font-extrabold text-slate-800 mb-1">{label}</p>
          <p className="text-blue-600 font-mono font-bold">PKR {payload[0].value.toLocaleString()}</p>
          {payload[0].payload.equipment && <p className="text-slate-500 text-xs mt-1 font-medium">{payload[0].payload.equipment}</p>}
        </div>
      );
    }
    return null;
  };

  const timeFilters = [
    { id: 'all', label: 'All Time' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' },
  ];

  if (loading) return <div className="flex h-full items-center justify-center text-slate-500">Loading Analytics...</div>;

  const inputClass = "w-full bg-white/40 border border-white/60 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white/70 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]";

  return (
    <div className="space-y-6 lg:space-y-8 pb-10">
      
      {/* --- TOP SUMMARY CARDS (Responsive Grid) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <motion.div variants={cardVariants} initial="hidden" animate="show" transition={{ duration: 0.4 }} 
          className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4 lg:gap-5">
          <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-white/60 text-blue-600 flex items-center justify-center border border-white shadow-sm shrink-0">
            <svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
          </div>
          <div>
            <p className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5 lg:mb-1">Total Equipment</p>
            <h4 className="text-3xl lg:text-4xl font-black text-slate-800 drop-shadow-sm">{stats.totalEquipment}</h4>
          </div>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate="show" transition={{ duration: 0.4, delay: 0.1 }} 
          className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4 lg:gap-5">
          <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-white/60 text-rose-500 flex items-center justify-center border border-white shadow-sm shrink-0">
             <svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <p className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5 lg:mb-1">Under Repair</p>
            <h4 className="text-3xl lg:text-4xl font-black text-slate-800 drop-shadow-sm">{stats.underRepair}</h4>
          </div>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate="show" transition={{ duration: 0.4, delay: 0.2 }} 
          className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4 lg:gap-5 sm:col-span-2 lg:col-span-1">
          <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-white/60 text-emerald-600 flex items-center justify-center border border-white shadow-sm shrink-0">
            <svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <div>
            <p className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5 lg:mb-1">Active Labs</p>
            <h4 className="text-3xl lg:text-4xl font-black text-slate-800 drop-shadow-sm">{stats.totalLabs}</h4>
          </div>
        </motion.div>
      </div>

      {/* --- TIME FILTER BAR --- */}
      <div className="flex items-center gap-2 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-2xl p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-fit">
        {timeFilters.map((f) => (
          <button key={f.id} onClick={() => setTimeFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              timeFilter === f.id
                ? 'bg-blue-600/90 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
            }`}>
            {f.label}
          </button>
        ))}
        <div className="ml-1 px-2 py-1 text-[9px] text-slate-400 font-medium">
          Auto-refresh 30s
        </div>
      </div>

      {/* --- GRAPHS SECTION (Responsive Grid) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Equipment Asset Value Chart */}
        <motion.div variants={cardVariants} initial="hidden" animate="show" transition={{ duration: 0.5, delay: 0.3 }} 
          className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Equipment Asset Value
            <span className="ml-auto text-[9px] text-slate-400 font-medium normal-case tracking-normal">{chartsData.equipmentPrices.length} items</span>
          </h3>
          <div className="h-64 w-full">
            {chartsData.equipmentPrices.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData.equipmentPrices} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(value) => `Rs${value/1000}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.3)'}} />
                <Bar dataKey="price" fill="url(#blueGradient)" radius={[6, 6, 0, 0]} barSize={24} />
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data for selected period</div>
            )}
          </div>
        </motion.div>

        {/* Maintenance Cost Trends Chart */}
        <motion.div variants={cardVariants} initial="hidden" animate="show" transition={{ duration: 0.5, delay: 0.4 }} 
          className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            Maintenance Cost Trends
            <span className="ml-auto text-[9px] text-slate-400 font-medium normal-case tracking-normal">{chartsData.maintenanceTrends.length} logs</span>
          </h3>
          <div className="h-64 w-full">
            {chartsData.maintenanceTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartsData.maintenanceTrends} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="cost" stroke="#f43f5e" strokeWidth={3} fill="url(#roseGradient)" />
              </AreaChart>
            </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data for selected period</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* --- DATA ENTRY FORMS (Responsive Grid) --- */}
      {canEdit ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Register Equipment Form */}
        <motion.div variants={cardVariants} initial="hidden" animate="show" transition={{ duration: 0.4, delay: 0.5 }} 
          className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 lg:p-8 rounded-[1.5rem] lg:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-6 border-b border-white/40 pb-4">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Register Equipment</h3>
          </div>
          <form onSubmit={handleAddEquipment} className="space-y-4">
            {/* Input grid fields go stack on mobile, 2 columns on tablet/desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input required type="text" placeholder="Name" value={eqForm.name} onChange={e => setEqForm({...eqForm, name: e.target.value})} className={inputClass} />
              <input required type="text" placeholder="Category" value={eqForm.category} onChange={e => setEqForm({...eqForm, category: e.target.value})} className={inputClass} />
              <input required type="text" placeholder="Brand" value={eqForm.brand} onChange={e => setEqForm({...eqForm, brand: e.target.value})} className={inputClass} />
              <input required type="text" placeholder="Model" value={eqForm.model} onChange={e => setEqForm({...eqForm, model: e.target.value})} className={inputClass} />
              <input required type="text" placeholder="Serial No." value={eqForm.serial} onChange={e => setEqForm({...eqForm, serial: e.target.value})} className={inputClass} />
              <input required type="date" value={eqForm.purchaseDate} onChange={e => setEqForm({...eqForm, purchaseDate: e.target.value})} className={inputClass} />
              <input required type="number" placeholder="Price (PKR)" value={eqForm.price} onChange={e => setEqForm({...eqForm, price: e.target.value})} className={inputClass} />
              <select value={eqForm.status} onChange={e => setEqForm({...eqForm, status: e.target.value})} className={inputClass}>
                <option value="Working">Working</option>
                <option value="Under Repair">Under Repair</option>
              </select>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" 
              className="w-full mt-4 py-3 px-4 bg-blue-600/90 backdrop-blur-md hover:bg-blue-600 text-white text-sm rounded-xl font-bold shadow-[0_4px_15px_rgba(37,99,235,0.3)] transition-all">
              Add New Equipment
            </motion.button>
          </form>
        </motion.div>

        {/* Register New Lab Form */}
        <motion.div variants={cardVariants} initial="hidden" animate="show" transition={{ duration: 0.4, delay: 0.6 }} 
          className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 lg:p-8 rounded-[1.5rem] lg:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-fit">
          <div className="flex items-center gap-2 mb-6 border-b border-white/40 pb-4">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Register New Lab</h3>
          </div>
          <form onSubmit={handleAddLab} className="space-y-4">
            <input required type="text" placeholder="Department / Lab Name" value={labForm.deptName} onChange={e => setLabForm({...labForm, deptName: e.target.value})} className={inputClass} />
            <input required type="text" placeholder="Location / Room No." value={labForm.location} onChange={e => setLabForm({...labForm, location: e.target.value})} className={inputClass} />
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" 
              className="w-full mt-2 py-3 px-4 bg-emerald-500/90 backdrop-blur-md hover:bg-emerald-500 text-white text-sm rounded-xl font-bold shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all">
              Create Lab
            </motion.button>
          </form>
        </motion.div>
      </div>
      ) : (
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center">
          <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">View-only access</p>
          <p className="text-slate-400 text-[11px] mt-1">Contact admin for edit permissions</p>
        </div>
      )}

    </div>
  );
}

export default Dashboard;