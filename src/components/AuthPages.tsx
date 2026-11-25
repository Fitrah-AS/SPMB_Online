import React, { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  X,
  HelpCircle
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { SchoolConfig, User } from '../types';
import {
  BrandLogo,
  FormChecklistIllustration,
  LoginLaptopIllustration,
  SchoolBuildingBackdrop
} from './ui/Illustrations';
import { apiFetch, setStoredToken } from '../lib/api';

export type AuthMode = 'login_siswa' | 'register_siswa' | 'login_admin';

interface AuthPagesProps {
  config: SchoolConfig;
  initialMode: AuthMode;
  onBackHome: () => void;
  onAuthSuccess: (user: User) => void;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

export function AuthPages({
  config,
  initialMode,
  onBackHome,
  onAuthSuccess,
  onNotify
}: AuthPagesProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Login state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register state
  const [namaLengkap, setNamaLengkap] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [nomorHp, setNomorHp] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrorMsg('');
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim() || !password) {
      setErrorMsg('Email atau username dan password wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{ message: string; token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: identifier.trim(),
          password
        })
      });
      setStoredToken(data.token);
      onNotify('success', `Selamat datang, ${data.user.nama_lengkap}!`);
      onAuthSuccess(data.user);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Email/username atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (namaLengkap.trim().length < 3) {
      setErrorMsg('Nama lengkap minimal 3 karakter.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setErrorMsg('Format alamat email tidak valid.');
      return;
    }
    const cleanHp = nomorHp.replace(/\s+/g, '');
    if (!/^[0-9+]{10,15}$/.test(cleanHp)) {
      setErrorMsg('Nomor HP harus terdiri dari 10 hingga 15 digit angka.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password minimal terdiri dari 6 karakter.');
      return;
    }
    if (regPassword !== konfirmasiPassword) {
      setErrorMsg('Konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{ message: string; token: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          nama_lengkap: namaLengkap.trim(),
          email: regEmail.trim(),
          nomor_hp: cleanHp,
          password: regPassword,
          konfirmasi_password: konfirmasiPassword
        })
      });
      setStoredToken(data.token);
      onNotify('success', data.message);
      onAuthSuccess(data.user);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mendaftarkan akun.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (type: 'siswa' | 'admin') => {
    setErrorMsg('');
    if (type === 'siswa') {
      setMode('login_siswa');
      setIdentifier('ahmad.fauzi@contoh.id');
      setPassword('siswa123');
    } else {
      setMode('login_admin');
      setIdentifier('admin@spmb.sch.id');
      setPassword('admin123');
    }
  };

  const isRegister = mode === 'register_siswa';

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#DBEAFE] via-[#EFF6FF] to-[#F8FBFF] flex flex-col">
      {/* Left School Building Backdrop matching Bottom-Right Mockup */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-[44%] pointer-events-none select-none overflow-hidden">
        <SchoolBuildingBackdrop />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#EFF6FF]/95" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200/80 text-sm font-semibold text-slate-700 hover:text-[#1D63ED] shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>
      </header>

      {/* Center White Sweeping Card matching Bottom-Right Mockup */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-white/80 p-6 sm:p-10 lg:p-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Intro & Illustration */}
            <div className="lg:col-span-5 text-center lg:text-left space-y-4">
              <div className="inline-flex items-center gap-2.5">
                <BrandLogo logoUrl={config.logo_url} schoolName={config.nama_sekolah} />
                <span className="font-display text-xl font-extrabold text-[#1D63ED]">SPMB</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={isRegister ? 'intro-reg' : 'intro-login'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                      {isRegister ? 'Daftar Akun Baru' : 'Masuk ke Akun Anda'}
                    </h1>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {isRegister
                        ? 'Buat akun calon siswa untuk mengisi formulir dan memantau seleksi.'
                        : 'Untuk melanjutkan pendaftaran, silakan login terlebih dahulu.'}
                    </p>
                  </div>

                  <div className="pt-2">
                    {isRegister ? <FormChecklistIllustration /> : <LoginLaptopIllustration />}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right Clean Form */}
            <div className="lg:col-span-7 space-y-5">
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={isRegister ? 'form-reg' : 'form-login'}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
              {isRegister ? (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nama Lengkap
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={namaLengkap}
                        onChange={(e) => setNamaLengkap(e.target.value)}
                        placeholder="Nama lengkap sesuai akta kelahiran"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="nama@email.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Nomor HP
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          value={nomorHp}
                          onChange={(e) => setNomorHp(e.target.value)}
                          placeholder="081234567890"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          aria-label="Lihat password"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Konfirmasi Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={konfirmasiPassword}
                          onChange={(e) => setKonfirmasiPassword(e.target.value)}
                          placeholder="Ulangi password"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-[#1D63ED] text-white font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-sm"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Daftar</span>
                  </button>

                  <p className="text-center text-sm text-slate-600 pt-1">
                    Sudah punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login_siswa')}
                      className="font-semibold text-[#1D63ED] hover:underline cursor-pointer"
                    >
                      Login
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Email atau Username
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Email atau Username"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/70 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-600">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotSent(false);
                          setForgotOpen(true);
                        }}
                        className="text-xs font-semibold text-[#1D63ED] hover:underline cursor-pointer"
                      >
                        Lupa Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/70 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label="Lihat password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-[#1D63ED] text-white font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-sm"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Login</span>
                  </button>

                  <p className="text-center text-sm text-slate-600">
                    Belum punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register_siswa')}
                      className="font-semibold text-[#1D63ED] hover:underline cursor-pointer"
                    >
                      Daftar Sekarang
                    </button>
                  </p>

                  {/* Demo Quick-Fill Helper */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>Akun demonstrasi:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fillDemoCredentials('siswa')}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#1D63ED] font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        Demo Siswa
                      </button>
                      <button
                        type="button"
                        onClick={() => fillDemoCredentials('admin')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Demo Admin
                      </button>
                    </div>
                  </div>
                </form>
              )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Lupa Password Modal */}
      <AnimatePresence>
        {forgotOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[#1D63ED]" />
                  <h3 className="font-display font-bold text-slate-900">Bantuan Lupa Password</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {forgotSent ? (
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                    Permintaan pemulihan untuk <strong>{forgotEmail}</strong> telah dicatat. Silakan hubungi panitia SPMB ({config.telepon}) dengan menyertakan NISN/email terdaftar untuk verifikasi reset kata sandi.
                  </div>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(false)}
                    className="w-full py-2.5 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                  >
                    Kembali ke Login
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!forgotEmail.trim()) return;
                    setForgotSent(true);
                  }}
                  className="space-y-3"
                >
                  <p className="text-sm text-slate-600">
                    Masukkan alamat email yang Anda gunakan saat mendaftar akun SPMB.
                  </p>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                    >
                      Kirim Permintaan
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
