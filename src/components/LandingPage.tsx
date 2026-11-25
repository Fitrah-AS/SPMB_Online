import React, { useState } from 'react';
import {
  Calendar,
  Megaphone,
  FileText,
  User as UserIcon,
  CheckCircle2,
  X,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Clock,
  Home,
  ListChecks,
  LogIn,
  UserPlus,
  LayoutDashboard
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { PengumumanItem, SchoolConfig, User } from '../types';
import { BrandLogo } from './ui/Illustrations';
import { MobileBottomNav } from './ui/MobileBottomNav';
import { formatTanggalIndonesia } from '../lib/api';

const HERO_IMAGE_PATH = '/src/assets/images/';

interface LandingPageProps {
  config: SchoolConfig;
  announcements: PengumumanItem[];
  currentUser: User | null;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onNavigateDashboard: () => void;
}

type InfoModalType = 'jadwal' | 'pengumuman' | 'persyaratan' | null;

export function LandingPage({
  config,
  announcements,
  currentUser,
  onNavigateLogin,
  onNavigateRegister,
  onNavigateDashboard
}: LandingPageProps) {
  const [heroImgError, setHeroImgError] = useState(false);
  const [activeNav, setActiveNav] = useState<'beranda' | 'informasi' | 'alur'>('beranda');
  const [infoModal, setInfoModal] = useState<InfoModalType>(null);
  const [selectedAnn, setSelectedAnn] = useState<PengumumanItem | null>(null);
  const [activeAlurStep, setActiveAlurStep] = useState<number>(1);

  const handleDaftarClick = () => {
    if (currentUser) {
      onNavigateDashboard();
    } else {
      onNavigateRegister();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F8FD] text-slate-900">
      {/* Top Bar Contract (3 zones) matching Top-Left Mockup */}
      <header className="md:sticky md:top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-8">
          <a
            href="#beranda"
            onClick={() => setActiveNav('beranda')}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0"
          >
            <BrandLogo logoUrl={config.logo_url} schoolName={config.nama_sekolah} />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              SPMB
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            {[
              { id: 'beranda' as const, href: '#beranda', label: 'Beranda' },
              { id: 'informasi' as const, href: '#informasi', label: 'Informasi' },
              { id: 'alur' as const, href: '#alur', label: 'Alur Pendaftaran' }
            ].map((item) => {
              const isActive = activeNav === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setActiveNav(item.id)}
                  className={`relative py-5 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-[#1D63ED] font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#1D63ED] after:rounded-full'
                      : 'hover:text-[#1D63ED]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={onNavigateDashboard}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onNavigateLogin}
                className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-[#1D63ED] text-white text-xs md:text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserIcon className="w-4 h-4" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section matching Top-Left & Bottom-Left Mockup */}
      <section
        id="beranda"
        className="relative overflow-hidden bg-gradient-to-br from-[#F8FBFF] via-[#EFF6FF] to-[#DBEAFE] pt-8 pb-12 lg:pt-12 lg:pb-16"
      >
        <svg
          viewBox="0 0 1440 360"
          className="absolute right-0 top-0 h-full w-auto opacity-50 pointer-events-none select-none"
          aria-hidden="true"
        >
          <path
            fill="#CFE2FF"
            d="M780,0 C860,130 1000,240 1440,280 L1440,0 Z"
          />
        </svg>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Hero Copy */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 space-y-5 text-center lg:text-left"
            >
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[46px] font-extrabold tracking-tight text-[#0F172A] leading-[1.15] [text-wrap:balance]">
                Selamat Datang di{' '}
                <span className="block text-[#1D63ED]">SPMB Online</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Daftar sekolah kini lebih mudah, cepat, dan transparan.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleDaftarClick}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 cursor-pointer whitespace-nowrap"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>{currentUser ? 'Buka Dashboard' : 'Daftar Sekarang'}</span>
                </button>
                <a
                  href="#alur"
                  onClick={() => setActiveNav('alur')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white text-slate-800 border border-slate-200 text-sm font-semibold hover:border-blue-300 hover:text-[#1D63ED] transition-colors shadow-xs whitespace-nowrap"
                >
                  <span>Lihat Alur Pendaftaran</span>
                </a>
              </div>
            </motion.div>

            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.46, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6"
            >
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-100 to-white border-2 border-white shadow-xl aspect-[4/3] max-w-xl mx-auto">
                {!heroImgError ? (
                  <img
                    src={HERO_IMAGE_PATH}
                    alt="Siswa-siswi peserta Sistem Penerimaan Murid Baru"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-blue-50 to-indigo-100">
                    <BrandLogo logoUrl={config.logo_url} schoolName={config.nama_sekolah} size="lg" />
                    <p className="mt-4 font-display font-bold text-slate-800">{config.nama_sekolah}</p>
                    <p className="text-sm text-slate-600">Portal Resmi SPMB Online</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* 3 Clickable Summary Cards directly below Hero matching Top-Left Mockup */}
          <div className="mt-8 lg:mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => setInfoModal('jadwal')}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/70 flex items-center gap-4 text-left hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1D63ED] flex items-center justify-center shrink-0 group-hover:bg-[#1D63ED] group-hover:text-white transition-colors">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500">Pendaftaran</p>
                <p className="font-display text-base font-bold text-slate-900 truncate tabular-nums mt-0.5">
                  {config.jadwal_pendaftaran}
                </p>
              </div>
            </motion.button>

            <motion.button
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => setInfoModal('pengumuman')}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/70 flex items-center gap-4 text-left hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1D63ED] flex items-center justify-center shrink-0 group-hover:bg-[#1D63ED] group-hover:text-white transition-colors">
                <Megaphone className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500">Pengumuman</p>
                <p className="font-display text-base font-bold text-slate-900 truncate tabular-nums mt-0.5">
                  {config.tanggal_pengumuman}
                </p>
              </div>
            </motion.button>

            <motion.button
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => setInfoModal('persyaratan')}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/70 flex items-center gap-4 text-left hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1D63ED] flex items-center justify-center shrink-0 group-hover:bg-[#1D63ED] group-hover:text-white transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500">Persyaratan</p>
                <p className="font-display text-base font-bold text-slate-900 truncate mt-0.5">
                  Kartu Keluarga, Ijazah
                </p>
              </div>
            </motion.button>
          </div>
        </div>
      </section>

      {/* Informasi & Persyaratan Pendaftaran (Clean Progressive Disclosure) */}
      <section id="informasi" className="py-14 lg:py-18 bg-white border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mb-9"
          >
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Informasi & Persyaratan
            </h2>
            <p className="text-slate-600 mt-1.5 text-sm sm:text-base">
              Siapkan dokumen utama di bawah ini sebelum memulai pendaftaran di {config.nama_sekolah}.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Persyaratan Singkat */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 bg-[#F8FBFF] rounded-2xl p-6 border border-blue-100 space-y-4"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Persyaratan Pendaftaran
                </h3>
                <span className="text-xs font-semibold text-[#1D63ED]">{config.jenjang}</span>
              </div>

              <ul className="space-y-3">
                {config.persyaratan.slice(0, 5).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#1D63ED] shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>

              {config.persyaratan.length > 5 && (
                <button
                  type="button"
                  onClick={() => setInfoModal('persyaratan')}
                  className="text-xs font-semibold text-[#1D63ED] hover:underline cursor-pointer"
                >
                  Lihat seluruh persyaratan ({config.persyaratan.length}) →
                </button>
              )}

              <div className="pt-4 border-t border-blue-100 flex flex-wrap items-center justify-between gap-4 text-sm">
                <span className="text-slate-600">
                  Tahun Ajaran <strong className="text-slate-900">{config.tahun_ajaran}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleDaftarClick}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#1D63ED] hover:text-blue-800 cursor-pointer"
                >
                  <span>Mulai Pendaftaran</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>

            {/* Pengumuman Terbaru (Clickable cards for details) */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.38, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-slate-900">Pengumuman Terbaru</h3>
                <span className="text-xs text-slate-500">Klik untuk detail</span>
              </div>

              {announcements.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-sm text-slate-500">
                  Belum ada pengumuman terbaru.
                </div>
              ) : (
                announcements.slice(0, 3).map((ann) => (
                  <button
                    key={ann.id}
                    type="button"
                    onClick={() => setSelectedAnn(ann)}
                    className="w-full text-left bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-[#1D63ED] capitalize">{ann.tipe}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatTanggalIndonesia(ann.tanggal_publikasi)}</span>
                    </div>
                    <h4 className="font-display font-bold text-slate-900 text-sm sm:text-base leading-snug">
                      {ann.judul}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {ann.isi}
                    </p>
                  </button>
                ))
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Alur Pendaftaran (5 Langkah Sederhana) */}
      <section id="alur" className="py-14 lg:py-18 bg-[#F4F8FD]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-xl mx-auto mb-10"
          >
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Alur Pendaftaran
            </h2>
            <p className="text-slate-600 mt-1.5 text-sm sm:text-base">
              Lima langkah sederhana pendaftaran murid baru secara online.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {config.alur.map((step, idx) => {
              const isSelected = activeAlurStep === step.step;
              return (
                <motion.button
                  key={step.step}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.34, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => setActiveAlurStep(step.step)}
                  className={`text-left rounded-2xl p-5 border transition-all flex flex-col cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#1D63ED] shadow-md'
                      : 'bg-white border-slate-200/80 hover:border-blue-200 shadow-xs'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl font-display font-bold flex items-center justify-center text-sm mb-3.5 tabular-nums ${
                      isSelected ? 'bg-[#1D63ED] text-white' : 'bg-blue-50 text-[#1D63ED]'
                    }`}
                  >
                    {step.step}
                  </div>
                  <h3 className="font-display font-bold text-slate-900 text-base mb-1.5">{step.judul}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{step.deskripsi}</p>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Compact Footer */}
      <footer className="bg-[#132238] text-slate-300 mt-auto pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 space-y-2.5">
              <div className="flex items-center gap-2.5 text-white">
                <BrandLogo logoUrl={config.logo_url} schoolName={config.nama_sekolah} />
                <div>
                  <div className="font-display font-bold text-base">SPMB Online</div>
                  <div className="text-xs text-slate-400">{config.nama_sekolah}</div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Sistem Penerimaan Murid Baru Tahun Ajaran {config.tahun_ajaran}.
              </p>
            </div>

            <div className="md:col-span-4 space-y-2 text-xs sm:text-sm">
              <div className="font-display font-semibold text-white mb-1.5">Kontak Panitia</div>
              <div className="flex items-start gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>{config.alamat_sekolah}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{config.telepon}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{config.email_sekolah}</span>
              </div>
            </div>

            <div className="md:col-span-3 space-y-2 text-xs sm:text-sm">
              <div className="font-display font-semibold text-white mb-1.5">Menu</div>
              <a href="#beranda" className="block hover:text-white transition-colors">Beranda</a>
              <a href="#informasi" className="block hover:text-white transition-colors">Informasi</a>
              <a href="#alur" className="block hover:text-white transition-colors">Alur Pendaftaran</a>
              <button
                type="button"
                onClick={onNavigateLogin}
                className="block text-left text-blue-300 hover:text-white transition-colors cursor-pointer"
              >
                Login Portal
              </button>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} {config.nama_sekolah}</p>
            <p className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Layanan: {config.jam_layanan}</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Progressive Disclosure Modals for Hero Info Cards & Announcements */}
      <AnimatePresence>
        {infoModal && (
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 border border-slate-200"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {infoModal === 'jadwal' && 'Jadwal Pendaftaran SPMB'}
                  {infoModal === 'pengumuman' && 'Jadwal Pengumuman Seleksi'}
                  {infoModal === 'persyaratan' && 'Persyaratan Pendaftaran'}
                </h3>
                <button
                  type="button"
                  onClick={() => setInfoModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                  aria-label="Tutup modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {infoModal === 'jadwal' && (
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="text-xs text-slate-500">Periode Pendaftaran Online</div>
                    <div className="font-display font-bold text-lg text-[#1D63ED] mt-0.5">
                      {config.jadwal_pendaftaran}
                    </div>
                  </div>
                  <p>
                    Calon siswa dapat membuat akun, mengisi formulir 5 tahap, dan mengunggah dokumen persyaratan selama periode pendaftaran dibuka.
                  </p>
                  <p className="text-xs text-slate-500">Jam layanan bantuan panitia: {config.jam_layanan}</p>
                </div>
              )}

              {infoModal === 'pengumuman' && (
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="text-xs text-slate-500">Tanggal Pengumuman Resmi</div>
                    <div className="font-display font-bold text-lg text-[#1D63ED] mt-0.5">
                      {config.tanggal_pengumuman}
                    </div>
                  </div>
                  <p>
                    Hasil seleksi dapat dilihat langsung melalui menu Pengumuman di dashboard calon siswa. Surat Keterangan Hasil Seleksi tersedia dalam format PDF.
                  </p>
                </div>
              )}

              {infoModal === 'persyaratan' && (
                <ul className="space-y-2.5 text-sm text-slate-700 max-h-72 overflow-y-auto pr-1">
                  {config.persyaratan.map((p, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#1D63ED] shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setInfoModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInfoModal(null);
                    handleDaftarClick();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                >
                  {currentUser ? 'Buka Dashboard' : 'Daftar Sekarang'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAnn && (
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 border border-slate-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-[#1D63ED] capitalize">{selectedAnn.tipe}</span>
                    <span>·</span>
                    <span>{formatTanggalIndonesia(selectedAnn.tanggal_publikasi)}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900">{selectedAnn.judul}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAnn(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selectedAnn.isi}</p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedAnn(null)}
                  className="px-4 py-2 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                >
                  Mengerti
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <MobileBottomNav
        breakpoint="md"
        ariaLabel="Navigasi beranda mobile"
        leftItems={[
          {
            id: 'beranda',
            label: 'Beranda',
            href: '#beranda',
            Icon: Home,
            active: activeNav === 'beranda',
            onClick: () => setActiveNav('beranda')
          },
          {
            id: 'informasi',
            label: 'Informasi',
            href: '#informasi',
            Icon: FileText,
            active: activeNav === 'informasi',
            onClick: () => setActiveNav('informasi')
          }
        ]}
        centerItem={
          currentUser
            ? {
                id: 'dashboard',
                label: 'Dashboard',
                Icon: LayoutDashboard,
                active: true,
                onClick: onNavigateDashboard
              }
            : {
                id: 'daftar',
                label: 'Daftar',
                Icon: UserPlus,
                active: true,
                onClick: onNavigateRegister
              }
        }
        rightItems={[
          {
            id: 'alur',
            label: 'Alur',
            href: '#alur',
            Icon: ListChecks,
            active: activeNav === 'alur',
            onClick: () => setActiveNav('alur')
          },
          currentUser
            ? {
                id: 'akun',
                label: 'Akun',
                Icon: UserIcon,
                onClick: onNavigateDashboard
              }
            : {
                id: 'login',
                label: 'Login',
                Icon: LogIn,
                onClick: onNavigateLogin
              }
        ]}
      />
    </div>
  );
}
