import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function ProfilePanel({ user, token, onUserUpdate }) {
    const [activeSection, setActiveSection] = useState('info');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Forms
    const [infoForm, setInfoForm] = useState({ username: user?.username || '', email: user?.email || '' });
    const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [roleRequestMsg, setRoleRequestMsg] = useState('');
    const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || '');

    // Avatar: only from DB (user.profilePic)
    const getInitialAvatar = () => {
        if (user?.profilePic) return `${BASE_URL}${user.profilePic}`;
        return '';
    };
    const [avatar, setAvatar] = useState(getInitialAvatar);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileRef = useRef();

    const validatePassword = (password) => {
        if (password.length < 8 || password.length > 16) return false;
        if (!/[A-Z]/.test(password)) return false;
        if (!/[a-z]/.test(password)) return false;
        if (!/[0-9]/.test(password)) return false;
        if (!/@/.test(password)) return false;
        return true;
    };

    const showSuccess = (msg) => { setSuccessMsg(msg); setErrorMsg(''); setTimeout(() => setSuccessMsg(''), 3000); };
    const showError = (msg) => { setErrorMsg(msg); setSuccessMsg(''); setTimeout(() => setErrorMsg(''), 4000); };

    // Avatar upload → server
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { showError('Image too large. Max 2MB.'); return; }

        setAvatarUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const res = await fetch(`${BASE_URL}/api/upload-avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) { showError(data.error || 'Upload failed.'); return; }

            const fullPath = `${BASE_URL}${data.path}`;
            setAvatar(fullPath);

            const updatedUser = { ...user, profilePic: data.path };
            localStorage.setItem('lm_user', JSON.stringify(updatedUser));
            if (onUserUpdate) onUserUpdate(updatedUser);
            showSuccess('Profile picture updated!');
        } catch { showError('Cannot connect to server.'); }
        finally { setAvatarUploading(false); }
    };

    const handleRemoveAvatar = async () => {
        setAvatarUploading(true);
        try {
            const res = await fetch(`${BASE_URL}/api/delete-avatar`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) { showError('Failed to remove picture.'); return; }
            setAvatar('');
            const updatedUser = { ...user, profilePic: null };
            localStorage.setItem('lm_user', JSON.stringify(updatedUser));
            if (onUserUpdate) onUserUpdate(updatedUser);
            showSuccess('Profile picture removed.');
        } catch { showError('Cannot connect to server.'); }
        finally { setAvatarUploading(false); }
    };

    // Update username/email
    const handleInfoUpdate = async (e) => {
        e.preventDefault();
        if (!infoForm.username || !infoForm.email) { showError('All fields required.'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/api/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(infoForm)
            });
            const data = await res.json();
            if (!res.ok) showError(data.error || 'Update failed.');
            else {
                showSuccess('Profile updated!');
                const updatedUser = { ...user, username: infoForm.username, email: infoForm.email };
                localStorage.setItem('lm_user', JSON.stringify(updatedUser));
                if (onUserUpdate) onUserUpdate(updatedUser);
            }
        } catch { showError('Cannot connect to server.'); }
        finally { setLoading(false); }
    };

    // Change password
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (!passForm.currentPassword) { showError('Enter current password.'); return; }
        if (!validatePassword(passForm.newPassword)) { showError('New password must be 8-16 chars with uppercase, lowercase, number, @'); return; }
        if (passForm.newPassword !== passForm.confirmPassword) { showError('Passwords do not match.'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/api/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword })
            });
            const data = await res.json();
            if (!res.ok) showError(data.error || 'Password change failed.');
            else { showSuccess('Password changed!'); setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
        } catch { showError('Cannot connect to server.'); }
        finally { setLoading(false); }
    };

    // Role upgrade request
    const handleRoleRequest = async () => {
        if (!roleRequestMsg.trim()) { showError('Please explain why you need Maintainer access.'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/api/role-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message: roleRequestMsg })
            });
            const data = await res.json();
            if (!res.ok) showError(data.error || 'Request failed.');
            else { showSuccess('Request submitted! Admin will review it.'); setRoleRequestMsg(''); }
        } catch { showError('Cannot connect to server.'); }
        finally { setLoading(false); }
    };

    const initials = (user?.username || 'U').slice(0, 2).toUpperCase();
    const roleColor = user?.role === 'admin' ? 'text-purple-600 bg-purple-500/10 border-purple-500/20' :
        user?.role === 'maintainer' ? 'text-blue-600 bg-blue-500/10 border-blue-500/20' :
            'text-slate-600 bg-slate-500/10 border-slate-500/20';

    const inputClass = "w-full bg-white/40 border border-white/60 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:bg-white/70 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]";

    const sections = [
        { id: 'info', label: 'Profile Info', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
        { id: 'password', label: 'Password', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
        { id: 'role', label: 'Role & Access', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    ];

    const cardClass = "bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[1.5rem] lg:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 lg:p-8";

    return (
        <div className="space-y-6 lg:space-y-8 pb-10">

            {/* --- PROFILE HERO CARD --- */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                className={cardClass}
            >
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 lg:gap-8">

                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-4 border-white shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
                            {avatar ? (
                                <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                    <span className="text-white text-2xl lg:text-3xl font-black">{initials}</span>
                                </div>
                            )}
                        </div>
                        {/* Camera button */}
                        <button
                            onClick={() => fileRef.current.click()}
                            disabled={avatarUploading}
                            className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-blue-700 transition-colors disabled:opacity-60"
                        >
                            {avatarUploading ? (
                                <svg className="w-3.5 h-3.5 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                            ) : (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-2xl lg:text-3xl font-black text-slate-800">{user?.username}</h2>
                        <p className="text-slate-500 text-sm mt-1">{user?.email}</p>
                        <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-widest ${roleColor}`}>
                                {user?.role || 'viewer'}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold border text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                                ● Verified
                            </span>
                        </div>
                        {avatar && (
                            <button onClick={handleRemoveAvatar} className="mt-3 text-xs text-rose-500 hover:text-rose-600 font-medium transition-colors">
                                Remove picture
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* --- TOAST MESSAGES --- */}
            <AnimatePresence>
                {successMsg && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-3 text-emerald-700 text-sm font-medium flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {successMsg}
                    </motion.div>
                )}
                {errorMsg && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-5 py-3 text-rose-600 text-sm font-medium flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        {errorMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- SECTION TABS --- */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                className="flex gap-2 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-2xl p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                {sections.map((s) => (
                    <button key={s.id} onClick={() => setActiveSection(s.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${activeSection === s.id ? 'bg-white text-blue-600 shadow-sm border border-white' : 'text-slate-500 hover:text-slate-700'}`}>
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                        </svg>
                        <span className="hidden sm:inline">{s.label}</span>
                    </button>
                ))}
            </motion.div>

            {/* --- SECTION CONTENT --- */}
            <AnimatePresence mode="wait">

                {/* PROFILE INFO */}
                {activeSection === 'info' && (
                    <motion.div key="info" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
                        className={cardClass}>
                        <div className="flex items-center gap-2 mb-6 border-b border-white/40 pb-4">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Edit Profile Info</h3>
                        </div>
                        <form onSubmit={handleInfoUpdate} className="space-y-4 max-w-lg">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Username</label>
                                <input type="text" value={infoForm.username}
                                    onChange={e => setInfoForm({ ...infoForm, username: e.target.value })}
                                    placeholder="Username" className={inputClass} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Email</label>
                                <input type="email" value={infoForm.email}
                                    onChange={e => setInfoForm({ ...infoForm, email: e.target.value })}
                                    placeholder="Email" className={inputClass} />
                            </div>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                                className="w-full py-3 px-4 bg-blue-600/90 hover:bg-blue-600 text-white text-sm rounded-xl font-bold shadow-[0_4px_15px_rgba(37,99,235,0.3)] transition-all border border-blue-500/50 disabled:opacity-60 flex items-center justify-center gap-2">
                                {loading ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Saving...</> : 'Save Changes'}
                            </motion.button>
                        </form>
                    </motion.div>
                )}

                {/* PASSWORD */}
                {activeSection === 'password' && (
                    <motion.div key="password" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
                        className={cardClass}>
                        <div className="flex items-center gap-2 mb-6 border-b border-white/40 pb-4">
                            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Change Password</h3>
                        </div>
                        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Current Password</label>
                                <input type="password" value={passForm.currentPassword}
                                    onChange={e => setPassForm({ ...passForm, currentPassword: e.target.value })}
                                    placeholder="Enter current password" className={inputClass} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">New Password</label>
                                <input type="password" value={passForm.newPassword}
                                    onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })}
                                    placeholder="8-16 chars, uppercase, number, @" className={inputClass} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Confirm New Password</label>
                                <input type="password" value={passForm.confirmPassword}
                                    onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                                    placeholder="Repeat new password" className={inputClass} />
                            </div>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                                className="w-full py-3 px-4 bg-amber-500/90 hover:bg-amber-500 text-white text-sm rounded-xl font-bold shadow-[0_4px_15px_rgba(245,158,11,0.3)] transition-all border border-amber-400/50 disabled:opacity-60 flex items-center justify-center gap-2">
                                {loading ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Updating...</> : 'Update Password'}
                            </motion.button>
                        </form>
                    </motion.div>
                )}

                {/* ROLE & ACCESS */}
                {activeSection === 'role' && (
                    <motion.div key="role" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
                        className={cardClass}>
                        <div className="flex items-center gap-2 mb-6 border-b border-white/40 pb-4">
                            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Role & Access</h3>
                        </div>

                        {/* Current role display */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            {['viewer', 'maintainer', 'admin'].map((r) => (
                                <div key={r} className={`p-4 rounded-2xl border transition-all ${user?.role === r ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/30 border-white/40'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-600">{r}</span>
                                        {user?.role === r && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        {r === 'viewer' && 'Can view all data. Read-only access.'}
                                        {r === 'maintainer' && 'Can log repairs and update equipment status.'}
                                        {r === 'admin' && 'Full access. Manage users and all data.'}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Role upgrade request — only for viewer */}
                        {user?.role === 'viewer' && (
                            <div className="space-y-4 max-w-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                    </svg>
                                    <p className="text-sm font-bold text-slate-700">Request Maintainer Access</p>
                                </div>
                                <textarea value={roleRequestMsg} onChange={e => setRoleRequestMsg(e.target.value)}
                                    rows="3" placeholder="Explain why you need maintainer access..."
                                    className={`${inputClass} resize-none`} />
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={handleRoleRequest} disabled={loading}
                                    className="w-full py-3 px-4 bg-purple-600/90 hover:bg-purple-600 text-white text-sm rounded-xl font-bold shadow-[0_4px_15px_rgba(147,51,234,0.3)] transition-all border border-purple-500/50 disabled:opacity-60 flex items-center justify-center gap-2">
                                    {loading ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Submitting...</> : 'Submit Request'}
                                </motion.button>
                            </div>
                        )}

                        {user?.role !== 'viewer' && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-emerald-700 text-sm font-medium">
                                ✅ You already have elevated access as <strong>{user?.role}</strong>.
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ProfilePanel;