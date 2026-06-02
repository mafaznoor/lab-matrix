import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function AdminPanel({ token, user }) {
    const [activeSection, setActiveSection] = useState('users');
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [roleRequests, setRoleRequests] = useState([]);
    const [issueReports, setIssueReports] = useState([]);
    const [logs, setLogs] = useState([]);
    const [statsLoading, setStatsLoading] = useState(true);
    const [stats, setStats] = useState({ totalUsers: 0, pendingRequests: 0, openIssues: 0, totalLogs: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [toast, setToast] = useState({ msg: '', type: '' });

    const BASE_URL = (import.meta.env.VITE_API_URL || '');
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast({ msg: '', type: '' }), 3000);
    };

    // Fetch stats on mount
    useEffect(() => {
        if (user?.role !== 'admin') return;
        setStatsLoading(true);
        Promise.all([
            fetch(`${BASE_URL}/api/admin/users`, { headers }).then(r => r.json()),
            fetch(`${BASE_URL}/api/admin/role-requests`, { headers }).then(r => r.json()),
            fetch(`${BASE_URL}/api/admin/issue-reports`, { headers }).then(r => r.json()),
            fetch(`${BASE_URL}/api/admin/logs`, { headers }).then(r => r.json()),
        ]).then(([u, rq, ir, lg]) => {
            const usersArr = Array.isArray(u) ? u : [];
            const reqArr = Array.isArray(rq) ? rq : [];
            const repArr = Array.isArray(ir) ? ir : [];
            const logArr = Array.isArray(lg) ? lg : [];
            setStats({
                totalUsers: usersArr.length,
                pendingRequests: reqArr.filter(r => r.Status === 'pending').length,
                openIssues: repArr.filter(r => r.Status === 'open').length,
                totalLogs: logArr.length,
            });
            setStatsLoading(false);
        }).catch(() => setStatsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch section data
    useEffect(() => {
        if (user?.role !== 'admin') return;
        setLoading(true);
        const endpoints = {
            users: '/api/admin/users',
            requests: '/api/admin/role-requests',
            reports: '/api/admin/issue-reports',
            logs: '/api/admin/logs'
        };
        fetch(`${BASE_URL}${endpoints[activeSection]}`, { headers })
            .then(res => res.json())
            .then(data => {
                if (activeSection === 'users') setUsers(Array.isArray(data) ? data : []);
                else if (activeSection === 'requests') setRoleRequests(Array.isArray(data) ? data : []);
                else if (activeSection === 'reports') setIssueReports(Array.isArray(data) ? data : []);
                else if (activeSection === 'logs') setLogs(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection]);

    const handleRoleChange = async (userId, newRole) => {
        try {
            const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/role`, {
                method: 'PUT', headers, body: JSON.stringify({ role: newRole })
            });
            const data = await res.json();
            if (res.ok) {
                setUsers(users.map(u => u.UserID === userId ? { ...u, Role: newRole } : u));
                showToast(data.message || 'Role updated.');
            } else showToast(data.error || 'Failed.', 'error');
        } catch { showToast('Connection error.', 'error'); }
    };

    const handleDeleteUser = async (userId, username) => {
        if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
        try {
            const res = await fetch(`${BASE_URL}/api/admin/users/${userId}`, { method: 'DELETE', headers });
            const data = await res.json();
            if (res.ok) {
                setUsers(users.filter(u => u.UserID !== userId));
                setStats(s => ({ ...s, totalUsers: s.totalUsers - 1 }));
                showToast(data.message || 'User deleted.');
            } else showToast(data.error || 'Failed.', 'error');
        } catch { showToast('Connection error.', 'error'); }
    };

    const handleRoleRequest = async (requestId, action) => {
        try {
            const res = await fetch(`${BASE_URL}/api/admin/role-requests/${requestId}`, {
                method: 'PUT', headers, body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (res.ok) {
                setRoleRequests(roleRequests.filter(r => r.ID !== requestId));
                setStats(s => ({ ...s, pendingRequests: Math.max(0, s.pendingRequests - 1) }));
                showToast(data.message || `Request ${action}d.`);
            } else showToast(data.error || 'Failed.', 'error');
        } catch { showToast('Connection error.', 'error'); }
    };

    const handleReportStatus = async (reportId, newStatus) => {
        try {
            const res = await fetch(`${BASE_URL}/api/admin/issue-reports/${reportId}/status`, {
                method: 'PUT', headers, body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (res.ok) {
                setIssueReports(issueReports.map(r => r.ID === reportId ? { ...r, Status: newStatus } : r));
                if (newStatus === 'resolved') setStats(s => ({ ...s, openIssues: Math.max(0, s.openIssues - 1) }));
                showToast(data.message || 'Status updated.');
            } else showToast(data.error || 'Failed.', 'error');
        } catch { showToast('Connection error.', 'error'); }
    };

    const filteredUsers = users.filter(u => {
        const q = searchQuery.toLowerCase();
        return (u.Username || '').toLowerCase().includes(q) || (u.Email || '').toLowerCase().includes(q);
    });

    const sections = [
        { id: 'users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197', count: users.length },
        { id: 'requests', label: 'Requests', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', count: roleRequests.length },
        { id: 'reports', label: 'Reports', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', count: issueReports.length },
        { id: 'logs', label: 'Activity', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', count: logs.length },
    ];

    const roleBadge = (role) => {
        const colors = { admin: 'text-purple-600 bg-purple-500/10 border-purple-500/20', maintainer: 'text-blue-600 bg-blue-500/10 border-blue-500/20', viewer: 'text-slate-600 bg-slate-500/10 border-slate-500/20' };
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${colors[role] || colors.viewer}`}>{role}</span>;
    };

    const statusBadge = (status) => {
        const colors = { open: 'text-rose-600 bg-rose-500/10 border-rose-500/20', in_progress: 'text-amber-600 bg-amber-500/10 border-amber-500/20', resolved: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' };
        const labels = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved' };
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[status] || colors.open}`}>{labels[status] || status}</span>;
    };

    const typeBadge = (type) => {
        const colors = { bug: 'text-rose-600 bg-rose-500/10 border-rose-500/20', lab: 'text-blue-600 bg-blue-500/10 border-blue-500/20', equipment: 'text-amber-600 bg-amber-500/10 border-amber-500/20' };
        const labels = { bug: '🐛 Bug', lab: '🏢 Lab', equipment: '⚙️ Equip' };
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[type] || ''}`}>{labels[type] || type}</span>;
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

    const cardClass = "bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[1.5rem] lg:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 lg:p-8";
    const selectClass = "bg-white/40 border border-white/60 rounded-lg px-2 py-1 text-xs text-slate-700 font-bold outline-none cursor-pointer focus:ring-2 focus:ring-blue-400/30";

    if (user?.role !== 'admin') {
        return <div className={`${cardClass} text-center py-12`}><p className="text-slate-400 font-bold">⛔ Admin access required.</p></div>;
    }

    const statCards = [
        { label: 'Total Users', value: stats.totalUsers, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197', color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/20' },
        { label: 'Pending Requests', value: stats.pendingRequests, icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'text-purple-600', bg: 'bg-purple-500/10 border-purple-500/20' },
        { label: 'Open Issues', value: stats.openIssues, icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'text-rose-600', bg: 'bg-rose-500/10 border-rose-500/20' },
        { label: 'Actions Logged', value: stats.totalLogs, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    ];

    return (
        <div className="space-y-6 pb-10">

            {/* --- STATS CARDS --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((s, i) => (
                    <motion.div key={s.label}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.07 }}
                        className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 lg:p-6 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${s.bg}`}>
                            <svg className={`w-5 h-5 ${s.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
                            <h4 className="text-2xl lg:text-3xl font-black text-slate-800 drop-shadow-sm">
                                {statsLoading ? <span className="text-slate-300">—</span> : s.value}
                            </h4>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast.msg && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`${toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'} border rounded-2xl px-5 py-3 text-sm font-medium`}>
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Section Tabs */}
            <div className="flex gap-2 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-2xl p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-x-auto">
                {sections.map((s) => (
                    <button key={s.id} onClick={() => setActiveSection(s.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeSection === s.id ? 'bg-white text-blue-600 shadow-sm border border-white' : 'text-slate-500 hover:text-slate-700'}`}>
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                        </svg>
                        <span className="hidden sm:inline">{s.label}</span>
                        {s.count > 0 && <span className="ml-1 bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded-md text-[9px] font-bold">{s.count}</span>}
                    </button>
                ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${cardClass} text-center py-12`}>
                        <p className="text-slate-400 font-medium">Loading...</p>
                    </motion.div>
                ) : (
                    <>
                        {/* USERS */}
                        {activeSection === 'users' && (
                            <motion.div key="users" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className={cardClass}>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 border-b border-white/40 pb-4">
                                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" /></svg>
                                        Users ({filteredUsers.length})
                                    </h3>
                                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search users..." className="bg-white/40 border border-white/60 rounded-xl px-4 py-2 text-xs text-slate-700 w-full sm:w-56 outline-none focus:ring-2 focus:ring-blue-400/30 placeholder-slate-400" />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[600px]">
                                        <thead>
                                            <tr className="border-b border-white/50 text-[10px] uppercase tracking-widest text-slate-500">
                                                <th className="pb-3 font-bold px-3">ID</th>
                                                <th className="pb-3 font-bold px-3">Username</th>
                                                <th className="pb-3 font-bold px-3">Email</th>
                                                <th className="pb-3 font-bold px-3">Role</th>
                                                <th className="pb-3 font-bold px-3">Verified</th>
                                                <th className="pb-3 font-bold px-3">Joined</th>
                                                <th className="pb-3 font-bold px-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs text-slate-700">
                                            {filteredUsers.map((u) => (
                                                <tr key={u.UserID} className="border-b border-white/30 hover:bg-white/50 transition-colors">
                                                    <td className="py-3 px-3 font-mono text-slate-400">{u.UserID}</td>
                                                    <td className="py-3 px-3 font-bold text-slate-800">{u.Username}</td>
                                                    <td className="py-3 px-3 text-slate-500">{u.Email}</td>
                                                    <td className="py-3 px-3">
                                                        <select value={u.Role} onChange={(e) => handleRoleChange(u.UserID, e.target.value)} className={selectClass}
                                                            disabled={u.UserID === user?.id}>
                                                            <option value="viewer">viewer</option>
                                                            <option value="maintainer">maintainer</option>
                                                            <option value="admin">admin</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        {u.IsVerified ? <span className="text-emerald-500 font-bold">✓</span> : <span className="text-slate-300">✗</span>}
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-slate-400 text-[10px]">{formatDate(u.CreatedAt)}</td>
                                                    <td className="py-3 px-3 text-right">
                                                        {u.UserID !== user?.id && (
                                                            <button onClick={() => handleDeleteUser(u.UserID, u.Username)}
                                                                className="text-rose-400 hover:text-rose-600 transition-colors text-[10px] font-bold uppercase tracking-wider">
                                                                Delete
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {filteredUsers.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No users found.</p>}
                                </div>
                            </motion.div>
                        )}

                        {/* ROLE REQUESTS */}
                        {activeSection === 'requests' && (
                            <motion.div key="requests" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className={cardClass}>
                                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-white/40 pb-4">
                                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                    Role Requests ({roleRequests.length})
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[500px]">
                                        <thead>
                                            <tr className="border-b border-white/50 text-[10px] uppercase tracking-widest text-slate-500">
                                                <th className="pb-3 font-bold px-3">User</th>
                                                <th className="pb-3 font-bold px-3">Message</th>
                                                <th className="pb-3 font-bold px-3">Status</th>
                                                <th className="pb-3 font-bold px-3">Date</th>
                                                <th className="pb-3 font-bold px-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs text-slate-700">
                                            {roleRequests.map((r) => (
                                                <tr key={r.ID} className="border-b border-white/30 hover:bg-white/50 transition-colors">
                                                    <td className="py-3 px-3 font-bold text-slate-800">{r.Username || `User #${r.UserID}`}</td>
                                                    <td className="py-3 px-3 text-slate-500 max-w-[200px] truncate" title={r.Message}>{r.Message}</td>
                                                    <td className="py-3 px-3">{statusBadge(r.Status === 'pending' ? 'open' : r.Status === 'approved' ? 'resolved' : 'open')}</td>
                                                    <td className="py-3 px-3 font-mono text-slate-400 text-[10px]">{formatDate(r.CreatedAt)}</td>
                                                    <td className="py-3 px-3 text-right">
                                                        {r.Status === 'pending' && (
                                                            <div className="flex gap-2 justify-end">
                                                                <button onClick={() => handleRoleRequest(r.ID, 'approve')}
                                                                    className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg text-[10px] font-bold hover:bg-emerald-500/20 transition-colors">
                                                                    Approve
                                                                </button>
                                                                <button onClick={() => handleRoleRequest(r.ID, 'reject')}
                                                                    className="px-2.5 py-1 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-lg text-[10px] font-bold hover:bg-rose-500/20 transition-colors">
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {roleRequests.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No pending requests.</p>}
                                </div>
                            </motion.div>
                        )}

                        {/* ISSUE REPORTS */}
                        {activeSection === 'reports' && (
                            <motion.div key="reports" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className={cardClass}>
                                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-white/40 pb-4">
                                    <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    Issue Reports ({issueReports.length})
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[600px]">
                                        <thead>
                                            <tr className="border-b border-white/50 text-[10px] uppercase tracking-widest text-slate-500">
                                                <th className="pb-3 font-bold px-3">Reporter</th>
                                                <th className="pb-3 font-bold px-3">Type</th>
                                                <th className="pb-3 font-bold px-3">Title</th>
                                                <th className="pb-3 font-bold px-3">Description</th>
                                                <th className="pb-3 font-bold px-3">Status</th>
                                                <th className="pb-3 font-bold px-3">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs text-slate-700">
                                            {issueReports.map((r) => (
                                                <tr key={r.ID} className="border-b border-white/30 hover:bg-white/50 transition-colors">
                                                    <td className="py-3 px-3 font-bold text-slate-800">{r.ReporterName}</td>
                                                    <td className="py-3 px-3">{typeBadge(r.Type)}</td>
                                                    <td className="py-3 px-3 font-semibold text-slate-700 max-w-[150px] truncate" title={r.Title}>{r.Title}</td>
                                                    <td className="py-3 px-3 text-slate-500 max-w-[150px] truncate" title={r.Description}>{r.Description || '—'}</td>
                                                    <td className="py-3 px-3">
                                                        <select value={r.Status} onChange={(e) => handleReportStatus(r.ID, e.target.value)} className={selectClass}>
                                                            <option value="open">Open</option>
                                                            <option value="in_progress">In Progress</option>
                                                            <option value="resolved">Resolved</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-slate-400 text-[10px]">{formatDate(r.CreatedAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {issueReports.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No reports yet.</p>}
                                </div>
                            </motion.div>
                        )}

                        {/* ACTIVITY LOGS */}
                        {activeSection === 'logs' && (
                            <motion.div key="logs" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className={cardClass}>
                                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-white/40 pb-4">
                                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    Activity Log ({logs.length})
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[500px]">
                                        <thead>
                                            <tr className="border-b border-white/50 text-[10px] uppercase tracking-widest text-slate-500">
                                                <th className="pb-3 font-bold px-3">Action</th>
                                                <th className="pb-3 font-bold px-3">Target</th>
                                                <th className="pb-3 font-bold px-3">By</th>
                                                <th className="pb-3 font-bold px-3">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs text-slate-700">
                                            {logs.map((l, i) => (
                                                <tr key={l.ID || i} className="border-b border-white/30 hover:bg-white/50 transition-colors">
                                                    <td className="py-3 px-3 font-semibold text-slate-700">{l.Action}</td>
                                                    <td className="py-3 px-3 text-slate-500">{l.TargetUsername || `User #${l.TargetUserID || '—'}`}</td>
                                                    <td className="py-3 px-3 font-bold text-blue-600">{l.AdminName}</td>
                                                    <td className="py-3 px-3 font-mono text-slate-400 text-[10px]">{formatDate(l.CreatedAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {logs.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No activity logged yet.</p>}
                                </div>
                            </motion.div>
                        )}
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export default AdminPanel;