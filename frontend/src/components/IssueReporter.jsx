import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function IssueReporter({ token, user }) {
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState('bug');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const dropdownRef = useRef(null);

    const BASE_URL = (import.meta.env.VITE_API_URL || '');

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const types = [
        { id: 'bug', label: '🐛 Bug', color: 'text-rose-600 bg-rose-500/10 border-rose-500/20' },
        { id: 'lab', label: '🏢 Lab', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
        { id: 'equipment', label: '⚙️ Equipment', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) { setError('Title is required.'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${BASE_URL}/api/report-issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ type, title, description })
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Submit failed.'); }
            else {
                setSuccess('Report submitted!');
                setTitle('');
                setDescription('');
                setType('bug');
                setTimeout(() => { setIsOpen(false); setSuccess(''); }, 1500);
            }
        } catch { setError('Cannot connect to server.'); }
        finally { setLoading(false); }
    };

    const inputClass = "w-full bg-white/40 border border-white/60 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white/70 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]";

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); setError(''); setSuccess(''); }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shadow-sm ${
                    isOpen
                        ? 'bg-blue-600 text-white border-blue-500 shadow-[0_4px_15px_rgba(37,99,235,0.3)]'
                        : 'bg-white/60 text-slate-500 border-white/60 hover:bg-white/80 hover:text-blue-600'
                }`}
                title="Report an Issue"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute right-0 top-12 w-80 sm:w-96 p-5 rounded-[1.5rem] border border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] z-50"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Report Issue</h3>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Reporter info */}
                        <div className="text-[10px] text-slate-400 font-medium mb-4">
                            Reporting as <span className="text-slate-600 font-bold">{user?.username}</span>
                        </div>

                        {/* Success / Error */}
                        <AnimatePresence>
                            {success && (
                                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-emerald-600 text-xs font-medium mb-3 flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    {success}
                                </motion.div>
                            )}
                            {error && (
                                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5 text-rose-600 text-xs font-medium mb-3">
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            {/* Type Tabs */}
                            <div className="flex gap-1.5 bg-white/50 border border-white/60 rounded-xl p-1">
                                {types.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setType(t.id)}
                                        className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all border ${
                                            type === t.id
                                                ? `${t.color} shadow-sm`
                                                : 'text-slate-400 border-transparent hover:text-slate-600'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Title */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => { setTitle(e.target.value); setError(''); }}
                                    placeholder="Brief summary of the issue"
                                    className={inputClass}
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows="3"
                                    placeholder="Describe the issue in detail..."
                                    className={`${inputClass} resize-none`}
                                />
                            </div>

                            {/* Submit */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-4 bg-blue-600/90 hover:bg-blue-600 text-white text-sm rounded-xl font-bold shadow-[0_4px_15px_rgba(37,99,235,0.3)] transition-all border border-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Submitting...</>
                                ) : 'Submit Report'}
                            </motion.button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default IssueReporter;
