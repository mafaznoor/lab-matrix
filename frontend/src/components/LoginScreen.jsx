import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CursorTracker from './CursorTracker';

function LoginScreen({ onLoginSuccess }) {
    const [mode, setMode] = useState('login'); // 'login' | 'register' | 'otp'
    const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [pendingEmail, setPendingEmail] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [serverError, setServerError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const BASE_URL = (import.meta.env.VITE_API_URL || '');

    const validatePassword = (password) => {
        const rules = [];
        if (password.length < 8 || password.length > 16) rules.push('8-16 characters');
        if (!/[A-Z]/.test(password)) rules.push('one uppercase letter');
        if (!/[a-z]/.test(password)) rules.push('one lowercase letter');
        if (!/[0-9]/.test(password)) rules.push('one number');
        if (!/@/.test(password)) rules.push('@ symbol');
        return rules;
    };

    const getPasswordStrength = (password) => {
        const failed = validatePassword(password).length;
        if (password.length === 0) return { label: '', color: '', width: '0%' };
        if (failed === 0) return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
        if (failed <= 2) return { label: 'Medium', color: 'bg-amber-500', width: '60%' };
        return { label: 'Weak', color: 'bg-rose-500', width: '30%' };
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setErrors({ ...errors, [e.target.name]: '' });
        setServerError('');
    };

    // OTP input handler
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        setServerError('');
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otp];
        for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || '';
        setOtp(newOtp);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        setSuccessMsg('');
        const newErrors = {};

        if (mode === 'login') {
            if (!form.username) newErrors.username = 'Required';
            if (!form.password) newErrors.password = 'Required';
            if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
            setLoading(true);
            try {
                const res = await fetch(`${BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: form.username, password: form.password })
                });
                const data = await res.json();
                if (!res.ok) { setServerError(data.error || 'Login failed.'); }
                else {
                    localStorage.setItem('lm_token', data.token);
                    localStorage.setItem('lm_user', JSON.stringify(data.user));
                    onLoginSuccess(data.user, data.token);
                }
            } catch { setServerError('Cannot connect to server.'); }
            finally { setLoading(false); }
        }

        if (mode === 'register') {
            if (!form.username) newErrors.username = 'Required';
            if (!form.email) newErrors.email = 'Required';
            const passErrors = validatePassword(form.password);
            if (passErrors.length > 0) newErrors.password = `Must include: ${passErrors.join(', ')}`;
            if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
            if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
            setLoading(true);
            try {
                const res = await fetch(`${BASE_URL}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: form.username, email: form.email, password: form.password })
                });
                const data = await res.json();
                if (!res.ok) { setServerError(data.error || 'Registration failed.'); }
                else {
                    setPendingEmail(form.email);
                    setMode('otp');
                }
            } catch { setServerError('Cannot connect to server.'); }
            finally { setLoading(false); }
        }
    };

    const handleVerifyOtp = async () => {
        const otpValue = otp.join('');
        if (otpValue.length < 6) { setServerError('Enter all 6 digits.'); return; }
        setLoading(true);
        setServerError('');
        try {
            const res = await fetch(`${BASE_URL}/api/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: pendingEmail, otp: otpValue })
            });
            const data = await res.json();
            if (!res.ok) { setServerError(data.error || 'Verification failed.'); }
            else {
                setSuccessMsg('Account verified! Please sign in.');
                setOtp(['', '', '', '', '', '']);
                setForm({ username: form.username, email: '', password: '', confirmPassword: '' });
                setTimeout(() => { setMode('login'); setSuccessMsg(''); }, 1500);
            }
        } catch { setServerError('Cannot connect to server.'); }
        finally { setLoading(false); }
    };

    const handleResendOtp = async () => {
        setLoading(true);
        setServerError('');
        try {
            const res = await fetch(`${BASE_URL}/api/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: pendingEmail })
            });
            const data = await res.json();
            if (!res.ok) setServerError(data.error);
            else setSuccessMsg('New OTP sent!');
        } catch { setServerError('Cannot connect to server.'); }
        finally { setLoading(false); }
    };

    const strength = getPasswordStrength(form.password);
    const passRules = [
        { label: '8-16 characters', pass: form.password.length >= 8 && form.password.length <= 16 },
        { label: 'Uppercase letter', pass: /[A-Z]/.test(form.password) },
        { label: 'Lowercase letter', pass: /[a-z]/.test(form.password) },
        { label: 'Number (0-9)', pass: /[0-9]/.test(form.password) },
        { label: '@ symbol', pass: /@/.test(form.password) },
    ];

    const inputClass = (field) => `w-full bg-white/40 border ${errors[field] ? 'border-rose-400/60' : 'border-white/60'} rounded-xl px-4 py-3 text-sm text-slate-800 focus:bg-white/70 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all placeholder-slate-400`;

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50/50 relative overflow-hidden">
            <CursorTracker />
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-300/30 blur-[120px] animate-pulse -z-10"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-emerald-200/30 blur-[150px] -z-10"></div>
            <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-purple-200/20 blur-[100px] -z-10"></div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="w-full max-w-md mx-4"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]"></span>
                        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">LAB MATRIX</h1>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Enterprise Lab Operations System / 2026</p>
                </div>

                {/* Card */}
                <div className="p-8 rounded-[2rem] border border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)]">

                    {/* ===== OTP SCREEN ===== */}
                    <AnimatePresence mode="wait">
                        {mode === 'otp' ? (
                            <motion.div
                                key="otp"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="text-center mb-6">
                                    <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-extrabold text-slate-800 mb-1">Verify Your Email</h3>
                                    <p className="text-slate-500 text-sm">6-digit code sent to</p>
                                    <p className="text-blue-600 font-bold text-sm">{pendingEmail}</p>
                                </div>

                                {/* OTP Input boxes */}
                                <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            id={`otp-${i}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            className="w-11 h-14 text-center text-xl font-bold bg-white/40 border border-white/60 rounded-xl text-slate-800 focus:bg-white/70 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all"
                                        />
                                    ))}
                                </div>

                                {serverError && (
                                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-600 text-sm font-medium mb-4">
                                        {serverError}
                                    </div>
                                )}
                                {successMsg && (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-600 text-sm font-medium mb-4">
                                        {successMsg}
                                    </div>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleVerifyOtp}
                                    disabled={loading}
                                    className="w-full py-3 px-4 bg-blue-600/90 hover:bg-blue-600 text-white text-sm rounded-xl font-bold shadow-[0_4px_15px_rgba(37,99,235,0.3)] transition-all border border-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
                                >
                                    {loading ? (
                                        <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Verifying...</>
                                    ) : 'Verify & Activate Account'}
                                </motion.button>

                                <div className="flex items-center justify-between text-xs">
                                    <button onClick={handleResendOtp} disabled={loading} className="text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50">
                                        Resend OTP
                                    </button>
                                    <button onClick={() => { setMode('register'); setServerError(''); }} className="text-slate-400 hover:text-slate-600">
                                        ← Back
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="auth"
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 30 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* ===== LOGIN / REGISTER ===== */}
                                <div className="flex bg-white/50 border border-white/60 rounded-2xl p-1 mb-8">
                                    {['login', 'register'].map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => { setMode(m); setErrors({}); setServerError(''); setSuccessMsg(''); }}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${mode === m ? 'bg-white text-blue-600 shadow-sm border border-white' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {m === 'login' ? 'Sign In' : 'Register'}
                                        </button>
                                    ))}
                                </div>

                                {successMsg && (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-600 text-sm font-medium mb-4">
                                        {successMsg}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                            {mode === 'login' ? 'Username or Email' : 'Username'}
                                        </label>
                                        <input type="text" name="username" value={form.username} onChange={handleChange}
                                            placeholder={mode === 'login' ? 'Enter username or email' : 'Choose a username'}
                                            className={inputClass('username')} />
                                        {errors.username && <p className="text-rose-500 text-xs font-medium">{errors.username}</p>}
                                    </div>

                                    <AnimatePresence>
                                        {mode === 'register' && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5 overflow-hidden">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Email</label>
                                                <input type="email" name="email" value={form.email} onChange={handleChange}
                                                    placeholder="your@email.com" className={inputClass('email')} />
                                                {errors.email && <p className="text-rose-500 text-xs font-medium">{errors.email}</p>}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                                        <div className="relative">
                                            <input type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                                                placeholder="Enter password" className={`${inputClass('password')} pr-12`} />
                                            <button type="button" onClick={() => setShowPass(!showPass)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                                {showPass ? (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                )}
                                            </button>
                                        </div>
                                        {errors.password && <p className="text-rose-500 text-xs font-medium">{errors.password}</p>}

                                        <AnimatePresence>
                                            {mode === 'register' && form.password.length > 0 && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                    <div className="mt-2 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.width }}></div>
                                                            </div>
                                                            <span className={`text-[10px] font-bold ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-1">
                                                            {passRules.map((rule) => (
                                                                <div key={rule.label} className="flex items-center gap-1.5">
                                                                    <span className={`w-3 h-3 rounded-full flex items-center justify-center ${rule.pass ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                                                        {rule.pass && <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                                                    </span>
                                                                    <span className={`text-[10px] font-medium ${rule.pass ? 'text-emerald-600' : 'text-slate-400'}`}>{rule.label}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <AnimatePresence>
                                        {mode === 'register' && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5 overflow-hidden">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Confirm Password</label>
                                                <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                                                    placeholder="Repeat password" className={inputClass('confirmPassword')} />
                                                {errors.confirmPassword && <p className="text-rose-500 text-xs font-medium">{errors.confirmPassword}</p>}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {serverError && (
                                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-600 text-sm font-medium">
                                            {serverError}
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                                            className="w-full py-3 px-4 bg-blue-600/90 backdrop-blur-md hover:bg-blue-600 text-white text-sm rounded-xl font-bold shadow-[0_4px_15px_rgba(37,99,235,0.3)] transition-all border border-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                            {loading ? (
                                                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{mode === 'login' ? 'Signing in...' : 'Sending OTP...'}</>
                                            ) : (
                                                mode === 'login' ? 'Sign In to Lab Matrix' : 'Send Verification Code'
                                            )}
                                        </motion.button>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}

export default LoginScreen;