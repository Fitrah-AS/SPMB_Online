import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  User as UserIcon,
  FileText,
  Upload,
  ClipboardCheck,
  Bell,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  Eye,
  Download,
  Printer,
  AlertCircle,
  Loader2,
  Trash2,
  Megaphone,
  Award,
  Clock,
  XCircle,
  ChevronDown,
  MapPin,
  Hash,
  Phone,
  Image as ImageIcon,
  FileCheck,
  HelpCircle,
  Home
} from 'lucide-react';
import type {
  DokumenPendaftaran,
  FormulirPendaftaran,
  JenisDokumen,
  SiswaDashboardBundle,
  StatusPendaftaran,
  User
} from '../types';
import {
  BrandLogo,
  ConfirmModal,
  DashboardWelcomeIllustration,
  DocumentPreviewModal,
  FormChecklistIllustration,
  NextStepClockIllustration,
  StatusBadge
} from './ui/Illustrations';
import { MobileBottomNav } from './ui/MobileBottomNav';
import { apiFetch, formatTanggalIndonesia, formatUkuranFile } from '../lib/api';
import {
  downloadBuktiPendaftaranPdf,
  downloadHasilSeleksiPdf,
  generateQrDataUrl
} from '../lib/pdfGenerator';

type SiswaMenu = 'dashboard' | 'profil' | 'formulir' | 'dokumen' | 'status' | 'pengumuman';

interface SiswaDashboardProps {
  user: User;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
  onBackHome: () => void;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

const DOC_SLOTS: Array<{
  jenis: JenisDokumen;
  label: string;
  required: boolean;
  hint: string;
  kind: 'doc' | 'photo' | 'cert';
}> = [
  {
    jenis: 'kartu_keluarga',
    label: 'Kartu Keluarga (KK)',
    required: true,
    hint: 'Scan atau foto jelas Kartu Keluarga asli.',
    kind: 'doc'
  },
  {
    jenis: 'akta_kelahiran',
    label: 'Akta Kelahiran',
    required: true,
    hint: 'Scan atau foto Akta Kelahiran calon murid baru.',
    kind: 'doc'
  },
  {
    jenis: 'ijazah_skl',
    label: 'Ijazah atau SKL',
    required: true,
    hint: 'Ijazah SMP/MTs atau Surat Keterangan Lulus resmi.',
    kind: 'doc'
  },
  {
    jenis: 'pas_foto',
    label: 'Pas Foto Formal 3x4',
    required: true,
    hint: 'Foto formal terbaru berseragam sekolah asal (JPG/PNG).',
    kind: 'photo'
  },
  {
    jenis: 'dokumen_pendukung',
    label: 'Dokumen Pendukung (Opsional)',
    required: false,
    hint: 'Sertifikat prestasi, KIP, atau surat pendukung lainnya.',
    kind: 'cert'
  }
];

function getStatusVisual(status: StatusPendaftaran) {
  switch (status) {
    case 'Diterima':
      return {
        colorText: 'text-emerald-600',
        cardBg: 'bg-emerald-50/70 border-emerald-200',
        iconWrap: 'bg-emerald-500 text-white',
        Icon: CheckCircle2,
        explanation: 'Selamat! Anda dinyatakan diterima sebagai murid baru. Silakan buka menu Pengumuman untuk mengunduh Surat Hasil Seleksi.'
      };
    case 'Sedang Seleksi':
      return {
        colorText: 'text-emerald-600',
        cardBg: 'bg-white border-slate-200/80',
        iconWrap: 'bg-emerald-500 text-white',
        Icon: CheckCircle2,
        explanation: 'Formulir dan dokumen Anda telah terverifikasi lengkap. Panitia sedang melakukan proses seleksi hingga tanggal pengumuman.'
      };
    case 'Menunggu Verifikasi':
      return {
        colorText: 'text-amber-600',
        cardBg: 'bg-white border-slate-200/80',
        iconWrap: 'bg-amber-500 text-white',
        Icon: Clock,
        explanation: 'Pendaftaran Anda telah diterima oleh sistem. Panitia sedang memeriksa kelengkapan formulir dan keabsahan dokumen.'
      };
    case 'Perlu Perbaikan':
      return {
        colorText: 'text-amber-700',
        cardBg: 'bg-amber-50/60 border-amber-200',
        iconWrap: 'bg-amber-500 text-white',
        Icon: AlertCircle,
        explanation: 'Panitia menemukan data atau berkas yang perlu diperbaiki. Periksa catatan admin lalu klik tombol Perbaiki Sekarang.'
      };
    case 'Tidak Diterima':
      return {
        colorText: 'text-rose-600',
        cardBg: 'bg-rose-50/60 border-rose-200',
        iconWrap: 'bg-rose-500 text-white',
        Icon: XCircle,
        explanation: 'Mohon maaf, Anda belum lolos seleksi pada periode ini. Anda dapat mengunduh surat keterangan resmi di menu Pengumuman.'
      };
    default:
      return {
        colorText: 'text-slate-700',
        cardBg: 'bg-white border-slate-200/80',
        iconWrap: 'bg-slate-400 text-white',
        Icon: FileText,
        explanation: 'Anda belum mengirimkan formulir pendaftaran. Lengkapi formulir 5 tahap dan unggah dokumen wajib untuk mendaftar.'
      };
  }
}

export function SiswaDashboard({
  user,
  onUserUpdated,
  onLogout,
  onBackHome,
  onNotify
}: SiswaDashboardProps) {
  const [activeMenu, setActiveMenu] = useState<SiswaMenu>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [bundle, setBundle] = useState<SiswaDashboardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [formStep, setFormStep] = useState<number>(1);
  const [formData, setFormData] = useState<Partial<FormulirPendaftaran>>({});
  const [agreeTruth, setAgreeTruth] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [uploadingJenis, setUploadingJenis] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DokumenPendaftaran | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [statusHelpOpen, setStatusHelpOpen] = useState(false);
  const [suratModalOpen, setSuratModalOpen] = useState(false);

  // Profile state
  const [profNama, setProfNama] = useState(user.nama_lengkap);
  const [profHp, setProfHp] = useState(user.nomor_hp);
  const [passLama, setPassLama] = useState('');
  const [passBaru, setPassBaru] = useState('');
  const [passKonf, setPassKonf] = useState('');
  const [savingProf, setSavingProf] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await apiFetch<SiswaDashboardBundle>('/api/siswa/dashboard');
      setBundle(data);
      setFormData(data.formulir || {});
      setAgreeTruth(Boolean(data.formulir?.persetujuan_data));
      if (data.calon_siswa?.nomor_pendaftaran) {
        const qrPayload = `SPMB|${data.calon_siswa.nomor_pendaftaran}|${data.formulir?.nisn || ''}|${data.formulir?.nama_lengkap || ''}|${data.calon_siswa.status_pendaftaran}`;
        generateQrDataUrl(qrPayload).then(setQrUrl).catch(() => {});
      }
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memuat data dashboard siswa.');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleNav = (menu: SiswaMenu) => {
    setActiveMenu(menu);
    setSidebarOpen(false);
    setUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateField = (field: keyof FormulirPendaftaran, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = async (silent = false) => {
    setSavingForm(true);
    try {
      await apiFetch('/api/siswa/formulir/draft', {
        method: 'PUT',
        body: JSON.stringify({
          ...formData,
          persetujuan_data: agreeTruth
        })
      });
      if (!silent) {
        onNotify('success', 'Draft formulir berhasil disimpan.');
      }
      await loadDashboard();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan draft.');
    } finally {
      setSavingForm(false);
    }
  };

  const validateStep = (step: number): string | null => {
    if (step === 1) {
      if (!formData.nama_lengkap?.trim()) return 'Nama lengkap wajib diisi.';
      if (!/^\d{16}$/.test((formData.nik || '').trim())) return 'NIK harus terdiri dari tepat 16 digit angka.';
      if (!/^\d{10}$/.test((formData.nisn || '').trim())) return 'NISN harus terdiri dari tepat 10 digit angka.';
      if (!formData.tempat_lahir?.trim()) return 'Tempat lahir wajib diisi.';
      if (!formData.tanggal_lahir?.trim()) return 'Tanggal lahir wajib diisi.';
      if (!formData.jenis_kelamin?.trim()) return 'Jenis kelamin wajib dipilih.';
      if (!formData.agama?.trim()) return 'Agama wajib dipilih.';
      if (!formData.nomor_hp?.trim()) return 'Nomor HP wajib diisi.';
      if (!formData.alamat_lengkap?.trim()) return 'Alamat lengkap wajib diisi.';
    }
    if (step === 2) {
      if (!formData.nama_ayah?.trim()) return 'Nama ayah wajib diisi.';
      if (!formData.nama_ibu?.trim()) return 'Nama ibu wajib diisi.';
      if (!formData.pekerjaan_ortu?.trim()) return 'Pekerjaan orang tua wajib diisi.';
      if (!formData.nomor_hp_ortu?.trim()) return 'Nomor HP orang tua wajib diisi.';
      if (!formData.alamat_ortu?.trim()) return 'Alamat orang tua wajib diisi.';
    }
    if (step === 3) {
      if (!formData.nama_sekolah_asal?.trim()) return 'Nama sekolah asal wajib diisi.';
      if (!/^\d{8}$/.test((formData.npsn_sekolah || '').trim())) return 'NPSN sekolah harus terdiri dari 8 digit angka.';
      if (!formData.tahun_lulus?.trim()) return 'Tahun lulus wajib diisi.';
      if (!formData.alamat_sekolah?.trim()) return 'Alamat sekolah asal wajib diisi.';
    }
    if (step === 4) {
      const uploaded = new Set((bundle?.dokumen || []).map((d) => d.jenis_dokumen));
      for (const slot of DOC_SLOTS.filter((s) => s.required)) {
        if (!uploaded.has(slot.jenis)) {
          return `Dokumen wajib "${slot.label}" belum diunggah.`;
        }
      }
    }
    return null;
  };

  const handleNextStep = async () => {
    const err = validateStep(formStep);
    if (err) {
      onNotify('error', err);
      return;
    }
    if (formStep <= 3) {
      await handleSaveDraft(true);
    }
    setFormStep((s) => Math.min(5, s + 1));
  };

  const requestSubmitFormulir = () => {
    for (let s = 1; s <= 4; s += 1) {
      const err = validateStep(s);
      if (err) {
        onNotify('error', err);
        setFormStep(s);
        return;
      }
    }
    if (!agreeTruth) {
      onNotify('error', 'Centang persetujuan kebenaran data terlebih dahulu.');
      return;
    }
    setSubmitConfirmOpen(true);
  };

  const handleSubmitFormulir = async () => {
    setSubmitConfirmOpen(false);
    setSavingForm(true);
    try {
      const res = await apiFetch<{ message: string; nomor_pendaftaran: string; bundle: SiswaDashboardBundle }>(
        '/api/siswa/formulir/submit',
        {
          method: 'POST',
          body: JSON.stringify({
            ...formData,
            persetujuan_data: true
          })
        }
      );
      setBundle(res.bundle);
      onNotify('success', res.message);
      await loadDashboard();
      setActiveMenu('status');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal mengirim pendaftaran.');
    } finally {
      setSavingForm(false);
    }
  };

  const handleUploadDokumen = async (jenis: JenisDokumen, file: File | undefined) => {
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      onNotify('error', 'Format dokumen harus PDF, JPG, atau PNG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onNotify('error', 'Ukuran file maksimal adalah 2 MB.');
      return;
    }

    setUploadingJenis(jenis);
    try {
      const fd = new FormData();
      fd.append('jenis_dokumen', jenis);
      fd.append('file', file);
      await apiFetch('/api/siswa/dokumen', { method: 'POST', body: fd });
      onNotify('success', 'Dokumen berhasil diunggah.');
      await loadDashboard();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal mengunggah dokumen.');
    } finally {
      setUploadingJenis(null);
    }
  };

  const handleDeleteDokumen = async (jenis: JenisDokumen) => {
    try {
      await apiFetch(`/api/siswa/dokumen/${jenis}`, { method: 'DELETE' });
      onNotify('info', 'Dokumen dihapus.');
      await loadDashboard();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menghapus dokumen.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProf(true);
    try {
      const res = await apiFetch<{ message: string; user: User }>('/api/siswa/profil', {
        method: 'PUT',
        body: JSON.stringify({
          nama_lengkap: profNama,
          nomor_hp: profHp,
          password_lama: passLama || undefined,
          password_baru: passBaru || undefined,
          konfirmasi_password_baru: passKonf || undefined
        })
      });
      onUserUpdated(res.user);
      setPassLama('');
      setPassBaru('');
      setPassKonf('');
      onNotify('success', res.message);
      await loadDashboard();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memperbarui profil.');
    } finally {
      setSavingProf(false);
    }
  };

  const menuItems: Array<{ id: SiswaMenu; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'profil', label: 'Profil Saya', Icon: UserIcon },
    { id: 'formulir', label: 'Pendaftaran', Icon: FileText },
    { id: 'dokumen', label: 'Dokumen', Icon: Upload },
    { id: 'status', label: 'Status Pendaftaran', Icon: ClipboardCheck },
    { id: 'pengumuman', label: 'Pengumuman', Icon: Bell }
  ];

  if (loading || !bundle) {
    return (
      <div className="min-h-screen bg-[#F4F8FD] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-[#1D63ED]" />
          <p className="text-sm font-medium">Memuat dashboard siswa...</p>
        </div>
      </div>
    );
  }

  const { calon_siswa, formulir, dokumen, hasil_seleksi, announcements, config } = bundle;
  const docMap = new Map<JenisDokumen, DokumenPendaftaran>(dokumen.map((d) => [d.jenis_dokumen, d]));
  const statusVis = getStatusVisual(calon_siswa.status_pendaftaran);
  const StatusIcon = statusVis.Icon;

  const isSubmitted = Boolean(calon_siswa.nomor_pendaftaran);
  const docsVerified =
    dokumen.filter((d) => d.jenis_dokumen !== 'dokumen_pendukung' && d.status_verifikasi === 'Valid').length >= 4 &&
    formulir.verifikasi_formulir === 'Valid';
  const isSelectedPhase =
    calon_siswa.status_pendaftaran === 'Sedang Seleksi' ||
    calon_siswa.status_pendaftaran === 'Diterima' ||
    calon_siswa.status_pendaftaran === 'Tidak Diterima';

  const timelineSteps = [
    { label: 'Registrasi Akun', done: true },
    { label: 'Isi Formulir & Upload Dokumen', done: isSubmitted },
    { label: 'Verifikasi Panitia', done: docsVerified || isSelectedPhase },
    { label: 'Proses Seleksi', done: isSelectedPhase },
    { label: 'Pengumuman Hasil', done: hasil_seleksi.dipublikasikan }
  ];

  return (
    <div className="min-h-screen bg-[#F4F8FD] flex flex-col lg:flex-row">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Navy Sidebar (#132238) matching Middle-Left Mockup */}
      <aside
        className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-50 w-64 bg-[#132238] text-slate-300 flex flex-col justify-between transition-transform duration-200 no-print shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-700/50">
            <button
              type="button"
              onClick={onBackHome}
              className="flex items-center gap-2.5 text-white cursor-pointer"
            >
              <BrandLogo logoUrl={config.logo_url} schoolName={config.nama_sekolah} size="sm" />
              <span className="font-display text-lg font-bold tracking-tight">SPMB</span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-4 space-y-1.5">
            {menuItems.map(({ id, label, Icon }) => {
              const active = activeMenu === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNav(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#1D63ED] text-white shadow-sm'
                      : 'text-slate-300 hover:bg-[#1D314F] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-700/50 space-y-1.5">
          <button
            type="button"
            onClick={onBackHome}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-[#1D314F] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Beranda</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:bg-rose-600/20 hover:text-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Right Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar matching Middle-Left & Bottom-Center Mockup */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <BrandLogo logoUrl={config.logo_url} schoolName={config.nama_sekolah} size="sm" />
              <span className="font-display font-bold text-slate-900">SPMB</span>
            </div>
            <div className="hidden lg:block text-sm font-medium text-slate-500">
              Portal Calon Siswa · <span className="text-slate-900 font-semibold">{config.nama_sekolah}</span>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#1D63ED] text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
                {user.nama_lengkap.slice(0, 2).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-sm font-medium text-slate-700 max-w-[160px] truncate">
                Halo, <strong className="text-slate-900">{user.nama_lengkap}</strong>
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50">
                <button
                  type="button"
                  onClick={() => handleNav('profil')}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>Profil Saya</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('status')}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4 text-slate-400" />
                  <span>Status Pendaftaran</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28 lg:pb-10 max-w-5xl w-full mx-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMenu}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
          {/* 1. DASHBOARD HOME matching Middle-Left & Bottom-Center Mockup */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-5">
              {/* Welcome Banner Card */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                    Halo, {user.nama_lengkap} 👋
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600">
                    Selamat datang di dashboard pendaftaran SPMB.
                  </p>
                  {calon_siswa.nomor_pendaftaran && (
                    <p className="text-xs font-medium text-slate-500 pt-1">
                      Nomor Pendaftaran: <span className="font-mono font-bold text-[#1D63ED]">{calon_siswa.nomor_pendaftaran}</span>
                    </p>
                  )}
                </div>
                <div className="hidden sm:block">
                  <DashboardWelcomeIllustration />
                </div>
              </div>

              {/* 2 Clickable Cards Side-by-Side (Status & Tanggal Daftar) matching Mockup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <button
                  type="button"
                  onClick={() => handleNav('status')}
                  className={`rounded-2xl p-5 shadow-xs border flex items-center gap-4 text-left hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer ${statusVis.cardBg}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${statusVis.iconWrap}`}>
                    <StatusIcon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500">Status Pendaftaran</p>
                    <p className={`font-display text-lg sm:text-xl font-bold truncate mt-0.5 ${statusVis.colorText}`}>
                      {calon_siswa.status_pendaftaran}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNav('status')}
                  className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex items-center gap-4 text-left hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1D63ED] flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500">Tanggal Daftar</p>
                    <p className="font-display text-lg sm:text-xl font-bold text-slate-900 truncate tabular-nums mt-0.5">
                      {calon_siswa.tanggal_pendaftaran
                        ? formatTanggalIndonesia(calon_siswa.tanggal_pendaftaran)
                        : 'Belum Mendaftar'}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </div>

              {/* Pengumuman Hasil Seleksi Strip Card matching Middle-Left Mockup */}
              <button
                type="button"
                onClick={() => handleNav('pengumuman')}
                className="w-full bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1D63ED] flex items-center justify-center shrink-0">
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-slate-900 text-base">
                      Pengumuman Hasil Seleksi
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      {hasil_seleksi.dipublikasikan
                        ? `Hasil seleksi telah diumumkan (${hasil_seleksi.status_seleksi}). Klik untuk melihat detail.`
                        : `Akan diumumkan pada ${config.tanggal_pengumuman}`}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 whitespace-nowrap shrink-0">
                  <span>Lihat Detail</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#1D63ED]" />
                </span>
              </button>

              {/* Langkah Berikutnya Card (Concise Actionable Guidance) */}
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <h2 className="font-display text-lg font-bold text-slate-900">Langkah Berikutnya</h2>

                  {calon_siswa.status_pendaftaran === 'Belum Mendaftar' && (
                    <>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Lengkapi formulir pendaftaran 5 tahap dan unggah dokumen persyaratan sebelum periode berakhir.
                      </p>
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleNav('formulir')}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                        >
                          <span>Isi Formulir Pendaftaran</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNav('dokumen')}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                        >
                          <span>Upload Dokumen</span>
                        </button>
                      </div>
                    </>
                  )}

                  {calon_siswa.status_pendaftaran === 'Perlu Perbaikan' && (
                    <>
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
                        <strong>Catatan Admin:</strong>{' '}
                        {calon_siswa.catatan_perbaikan || 'Mohon periksa kembali data formulir atau dokumen yang diunggah.'}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNav('formulir')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                      >
                        <span>Perbaiki Sekarang</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {calon_siswa.status_pendaftaran === 'Menunggu Verifikasi' && (
                    <>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Data Anda sudah masuk antrean verifikasi panitia. Pantau progresnya secara berkala atau unduh Bukti Pendaftaran.
                      </p>
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleNav('status')}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                        >
                          <span>Lihat Bukti Pendaftaran</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNav('dokumen')}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                        >
                          <span>Dokumen Saya</span>
                        </button>
                      </div>
                    </>
                  )}

                  {calon_siswa.status_pendaftaran === 'Sedang Seleksi' && (
                    <>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Seluruh berkas telah terverifikasi valid. Silakan pantau menu Pengumuman pada tanggal {config.tanggal_pengumuman}.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleNav('pengumuman')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                      >
                        <span>Buka Halaman Pengumuman</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {(calon_siswa.status_pendaftaran === 'Diterima' ||
                    calon_siswa.status_pendaftaran === 'Tidak Diterima') && (
                    <>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Pengumuman kelulusan sudah tersedia. Unduh Surat Hasil Seleksi dan Bukti Pendaftaran Anda.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleNav('pengumuman')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                      >
                        <span>Lihat Hasil Seleksi</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                <div className="hidden sm:block">
                  <NextStepClockIllustration />
                </div>
              </div>
            </div>
          )}

          {/* 2. PROFIL SAYA */}
          {activeMenu === 'profil' && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/80 max-w-2xl space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900">Profil Saya</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Perbarui informasi akun dan kata sandi Anda.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Akun</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={profNama}
                      onChange={(e) => setProfNama(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nomor HP</label>
                    <input
                      type="tel"
                      required
                      value={profHp}
                      onChange={(e) => setProfHp(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <h2 className="font-display text-base font-bold text-slate-900 mb-3">
                    Ganti Password (Opsional)
                  </h2>
                  <div className="space-y-3">
                    <input
                      type="password"
                      value={passLama}
                      onChange={(e) => setPassLama(e.target.value)}
                      placeholder="Password saat ini"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="password"
                        value={passBaru}
                        onChange={(e) => setPassBaru(e.target.value)}
                        placeholder="Password baru (min. 6 karakter)"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                      />
                      <input
                        type="password"
                        value={passKonf}
                        onChange={(e) => setPassKonf(e.target.value)}
                        placeholder="Konfirmasi password baru"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingProf}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                >
                  {savingProf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Perubahan</span>
                </button>
              </form>
            </div>
          )}

          {/* 3. MULTI-STEP FORMULIR PENDAFTARAN matching Top-Right Mockup */}
          {activeMenu === 'formulir' && (
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
              {/* Top Stepper Header matching Top-Right Mockup */}
              <div className="px-5 sm:px-8 py-4 bg-[#F8FBFF] border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => handleNav('dashboard')}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D63ED] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>

                {/* 5-Step Progress Indicator at TOP right */}
                <div className="flex-1 max-w-2xl overflow-x-auto">
                  <div className="flex items-center justify-between min-w-[440px] px-2">
                    {[
                      { num: 1, label: 'Data Diri' },
                      { num: 2, label: 'Data Orang Tua' },
                      { num: 3, label: 'Sekolah Asal' },
                      { num: 4, label: 'Upload' },
                      { num: 5, label: 'Konfirmasi' }
                    ].map((s, idx, arr) => {
                      const isDone = formStep > s.num;
                      const isCurrent = formStep === s.num;
                      return (
                        <React.Fragment key={s.num}>
                          <button
                            type="button"
                            onClick={() => setFormStep(s.num)}
                            className="flex flex-col items-center gap-1 cursor-pointer group shrink-0"
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                isCurrent
                                  ? 'bg-[#1D63ED] text-white shadow-xs'
                                  : isDone
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                              }`}
                            >
                              {isDone ? '✓' : s.num}
                            </div>
                            <span
                              className={`text-[11px] font-semibold whitespace-nowrap ${
                                isCurrent ? 'text-[#1D63ED]' : 'text-slate-600'
                              }`}
                            >
                              {s.label}
                            </span>
                          </button>
                          {idx < arr.length - 1 && (
                            <div
                              className={`flex-1 h-0.5 mx-1.5 -mt-4 ${
                                formStep > s.num ? 'bg-emerald-500' : 'bg-slate-200'
                              }`}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* Left Visual Panel matching Top-Right Mockup */}
                <div className="lg:col-span-4 bg-gradient-to-b from-[#F4F8FD] to-[#EBF3FE] p-6 sm:p-8 flex flex-col items-center justify-center text-center border-b lg:border-b-0 lg:border-r border-slate-200/70 space-y-4">
                  <FormChecklistIllustration />
                  <div className="space-y-1.5">
                    <h1 className="font-display text-lg font-extrabold text-slate-900">
                      Langkah Mudah Mendaftar
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
                      Isi data diri, unggah dokumen, dan kirim pendaftaran.
                    </p>
                  </div>

                  {/* Step Indicator Dots */}
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((d) => (
                      <span
                        key={d}
                        className={`h-2 rounded-full transition-all ${
                          formStep === d ? 'w-5 bg-[#1D63ED]' : 'w-2 bg-blue-200'
                        }`}
                      />
                    ))}
                  </div>

                  {formulir.catatan_formulir && (
                    <div className="w-full p-3 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900">
                      <strong>Catatan Verifikasi:</strong> {formulir.catatan_formulir}
                    </div>
                  )}
                </div>

                {/* Right Active Step Form */}
                <div className="lg:col-span-8 p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-[#1D63ED] text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
                        {formStep}
                      </span>
                      <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                        {formStep === 1 && 'Data Diri'}
                        {formStep === 2 && 'Data Orang Tua'}
                        {formStep === 3 && 'Sekolah Asal'}
                        {formStep === 4 && 'Upload Dokumen'}
                        {formStep === 5 && 'Konfirmasi Data'}
                      </h2>
                    </div>

                    {formStep <= 3 && (
                      <button
                        type="button"
                        onClick={() => handleSaveDraft(false)}
                        disabled={savingForm}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan Draft</span>
                      </button>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={formStep}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                  {/* TAHAP 1: DATA DIRI */}
                  {formStep === 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                        <div className="relative">
                          <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={formData.nama_lengkap || ''}
                            onChange={(e) => updateField('nama_lengkap', e.target.value)}
                            placeholder="Nama lengkap sesuai Akta Kelahiran / Ijazah"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">NIK *</label>
                        <div className="relative">
                          <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            maxLength={16}
                            value={formData.nik || ''}
                            onChange={(e) => updateField('nik', e.target.value.replace(/\D/g, ''))}
                            placeholder="16 digit angka (contoh: 3275xxxxxxxxxxxx)"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">NISN *</label>
                        <div className="relative">
                          <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            maxLength={10}
                            value={formData.nisn || ''}
                            onChange={(e) => updateField('nisn', e.target.value.replace(/\D/g, ''))}
                            placeholder="10 digit angka (contoh: 009xxxxxxx)"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tempat Lahir *</label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={formData.tempat_lahir || ''}
                            onChange={(e) => updateField('tempat_lahir', e.target.value)}
                            placeholder="Kota / Kabupaten lahir"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Lahir *</label>
                        <input
                          type="date"
                          value={formData.tanggal_lahir || ''}
                          onChange={(e) => updateField('tanggal_lahir', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin *</label>
                        <select
                          value={formData.jenis_kelamin || ''}
                          onChange={(e) => updateField('jenis_kelamin', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        >
                          <option value="">Pilih Jenis Kelamin</option>
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Agama *</label>
                        <select
                          value={formData.agama || ''}
                          onChange={(e) => updateField('agama', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        >
                          <option value="">Pilih Agama</option>
                          <option value="Islam">Islam</option>
                          <option value="Kristen">Kristen</option>
                          <option value="Katolik">Katolik</option>
                          <option value="Hindu">Hindu</option>
                          <option value="Buddha">Buddha</option>
                          <option value="Konghucu">Konghucu</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor HP *</label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            value={formData.nomor_hp || ''}
                            onChange={(e) => updateField('nomor_hp', e.target.value)}
                            placeholder="Contoh: 081234567890"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap *</label>
                        <textarea
                          rows={2}
                          value={formData.alamat_lengkap || ''}
                          onChange={(e) => updateField('alamat_lengkap', e.target.value)}
                          placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAHAP 2: DATA ORANG TUA */}
                  {formStep === 2 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Ayah *</label>
                        <input
                          type="text"
                          value={formData.nama_ayah || ''}
                          onChange={(e) => updateField('nama_ayah', e.target.value)}
                          placeholder="Nama lengkap ayah"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Ibu *</label>
                        <input
                          type="text"
                          value={formData.nama_ibu || ''}
                          onChange={(e) => updateField('nama_ibu', e.target.value)}
                          placeholder="Nama lengkap ibu"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Wali (Opsional)</label>
                        <input
                          type="text"
                          value={formData.nama_wali || ''}
                          onChange={(e) => updateField('nama_wali', e.target.value)}
                          placeholder="Kosongkan jika bersama orang tua"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Pekerjaan Orang Tua *</label>
                        <input
                          type="text"
                          value={formData.pekerjaan_ortu || ''}
                          onChange={(e) => updateField('pekerjaan_ortu', e.target.value)}
                          placeholder="Contoh: Wiraswasta / PNS / Karyawan"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor HP Orang Tua *</label>
                        <input
                          type="tel"
                          value={formData.nomor_hp_ortu || ''}
                          onChange={(e) => updateField('nomor_hp_ortu', e.target.value)}
                          placeholder="Nomor WhatsApp aktif orang tua/wali"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Orang Tua *</label>
                        <textarea
                          rows={2}
                          value={formData.alamat_ortu || ''}
                          onChange={(e) => updateField('alamat_ortu', e.target.value)}
                          placeholder="Alamat domisili orang tua/wali"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAHAP 3: SEKOLAH ASAL */}
                  {formStep === 3 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Sekolah Asal *</label>
                        <input
                          type="text"
                          value={formData.nama_sekolah_asal || ''}
                          onChange={(e) => updateField('nama_sekolah_asal', e.target.value)}
                          placeholder="Contoh: SMP Negeri 1 Nusantara"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">NPSN (8 Digit) *</label>
                        <input
                          type="text"
                          maxLength={8}
                          value={formData.npsn_sekolah || ''}
                          onChange={(e) => updateField('npsn_sekolah', e.target.value.replace(/\D/g, ''))}
                          placeholder="Contoh: 20219401"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Lulus *</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={formData.tahun_lulus || ''}
                          onChange={(e) => updateField('tahun_lulus', e.target.value.replace(/\D/g, ''))}
                          placeholder="Contoh: 2025"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Sekolah *</label>
                        <textarea
                          rows={2}
                          value={formData.alamat_sekolah || ''}
                          onChange={(e) => updateField('alamat_sekolah', e.target.value)}
                          placeholder="Alamat sekolah asal"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAHAP 4: UPLOAD DOKUMEN */}
                  {formStep === 4 && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-slate-700">
                        Format yang diterima: <strong>PDF, JPG, PNG</strong> · Ukuran maksimal <strong>2 MB</strong> per berkas.
                      </div>
                      {DOC_SLOTS.map((slot) => {
                        const existing = docMap.get(slot.jenis);
                        const isUploading = uploadingJenis === slot.jenis;
                        return (
                          <div
                            key={slot.jenis}
                            className="p-4 rounded-xl border border-slate-200 bg-[#F8FBFF] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-sm text-slate-900">
                                  {slot.label} {slot.required && <span className="text-rose-600">*</span>}
                                </span>
                                <StatusBadge status={existing ? existing.status_verifikasi : 'Belum Diunggah'} />
                              </div>
                              <p className="text-xs text-slate-500">{slot.hint}</p>
                              {existing && (
                                <p className="text-xs text-slate-700 font-medium truncate">
                                  {existing.nama_file_asli} ({formatUkuranFile(existing.ukuran_file)})
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {existing && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(existing)}
                                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Lihat</span>
                                </button>
                              )}
                              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1D63ED] text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer">
                                {isUploading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Upload className="w-3.5 h-3.5" />
                                )}
                                <span>{existing ? 'Ganti' : 'Upload'}</span>
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="hidden"
                                  disabled={isUploading}
                                  onChange={(e) => {
                                    handleUploadDokumen(slot.jenis, e.target.files?.[0]);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TAHAP 5: KONFIRMASI */}
                  {formStep === 5 && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-[#F8FBFF] border border-blue-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display font-bold text-sm text-slate-900">1. Data Diri</h3>
                          <button
                            type="button"
                            onClick={() => setFormStep(1)}
                            className="text-xs font-semibold text-[#1D63ED] hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-700">
                          <div>Nama: <strong>{formData.nama_lengkap}</strong></div>
                          <div>NIK: <strong className="font-mono">{formData.nik}</strong></div>
                          <div>NISN: <strong className="font-mono">{formData.nisn}</strong></div>
                          <div>TTL: <strong>{formData.tempat_lahir}, {formatTanggalIndonesia(formData.tanggal_lahir)}</strong></div>
                          <div>Jenis Kelamin: <strong>{formData.jenis_kelamin}</strong></div>
                          <div>Agama: <strong>{formData.agama}</strong></div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[#F8FBFF] border border-blue-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display font-bold text-sm text-slate-900">2. Data Orang Tua</h3>
                          <button
                            type="button"
                            onClick={() => setFormStep(2)}
                            className="text-xs font-semibold text-[#1D63ED] hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-700">
                          <div>Ayah: <strong>{formData.nama_ayah}</strong></div>
                          <div>Ibu: <strong>{formData.nama_ibu}</strong></div>
                          <div>Pekerjaan: <strong>{formData.pekerjaan_ortu}</strong></div>
                          <div>HP Orang Tua: <strong>{formData.nomor_hp_ortu}</strong></div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[#F8FBFF] border border-blue-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display font-bold text-sm text-slate-900">3. Sekolah Asal & 4. Dokumen</h3>
                          <button
                            type="button"
                            onClick={() => setFormStep(3)}
                            className="text-xs font-semibold text-[#1D63ED] hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-700">
                          <div>Sekolah Asal: <strong>{formData.nama_sekolah_asal}</strong></div>
                          <div>NPSN: <strong className="font-mono">{formData.npsn_sekolah}</strong></div>
                          <div>Tahun Lulus: <strong>{formData.tahun_lulus}</strong></div>
                          <div>Dokumen Terunggah: <strong>{dokumen.length} Berkas</strong></div>
                        </div>
                      </div>

                      <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreeTruth}
                          onChange={(e) => setAgreeTruth(e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-[#1D63ED] rounded"
                        />
                        <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                          Saya menyatakan bahwa seluruh data dan dokumen yang saya isi serta unggah adalah benar dan dapat dipertanggungjawabkan.
                        </span>
                      </label>
                    </div>
                  )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Footer Action Buttons matching Top-Right Mockup */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    {formStep > 1 ? (
                      <button
                        type="button"
                        onClick={() => setFormStep((s) => Math.max(1, s - 1))}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Kembali</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    {formStep < 5 ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        disabled={savingForm}
                        className="flex-1 sm:flex-none sm:min-w-[200px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                      >
                        <span>Selanjutnya</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={requestSubmitFormulir}
                        disabled={savingForm}
                        className="flex-1 sm:flex-none sm:min-w-[200px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
                      >
                        {savingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>Kirim Pendaftaran</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. UPLOAD DOKUMEN */}
          {activeMenu === 'dokumen' && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/80 space-y-5">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900">Upload Dokumen</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Unggah berkas persyaratan yang jelas dan terbaca.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-xs sm:text-sm text-slate-700">
                Ketentuan berkas: Format <strong>PDF, JPG, atau PNG</strong> · Ukuran maksimal <strong>2 MB per file</strong>.
              </div>

              <div className="space-y-3.5">
                {DOC_SLOTS.map((slot) => {
                  const existing = docMap.get(slot.jenis);
                  const isUploading = uploadingJenis === slot.jenis;
                  const DocIcon =
                    slot.kind === 'photo' ? ImageIcon : slot.kind === 'cert' ? FileCheck : FileText;

                  return (
                    <div
                      key={slot.jenis}
                      className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-[#F8FBFF] flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-white border border-blue-100 text-[#1D63ED] flex items-center justify-center shrink-0">
                          <DocIcon className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display font-bold text-sm sm:text-base text-slate-900">
                              {slot.label}
                            </h3>
                            <StatusBadge status={existing ? existing.status_verifikasi : 'Belum Diunggah'} />
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600">{slot.hint}</p>
                          {existing && (
                            <div className="text-xs text-slate-700 font-medium truncate">
                              {existing.nama_file_asli} · {formatUkuranFile(existing.ukuran_file)}
                            </div>
                          )}
                          {existing?.catatan && (
                            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                              <strong>Catatan Admin:</strong> {existing.catatan}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {existing && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(existing)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Lihat</span>
                            </button>
                            {!slot.required && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDokumen(slot.jenis)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-white text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Hapus</span>
                              </button>
                            )}
                          </>
                        )}
                        <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1D63ED] text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer">
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <span>{existing ? 'Ganti' : 'Upload'}</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              handleUploadDokumen(slot.jenis, e.target.files?.[0]);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. STATUS PENDAFTARAN & TIMELINE & BUKTI */}
          {activeMenu === 'status' && (
            <div className="space-y-6">
              {/* Main Large Status Card */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/80 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${statusVis.iconWrap}`}>
                      <StatusIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Status Pendaftaran Anda</p>
                      <h1 className={`font-display text-2xl sm:text-3xl font-extrabold ${statusVis.colorText}`}>
                        {calon_siswa.status_pendaftaran}
                      </h1>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStatusHelpOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer self-start sm:self-center"
                  >
                    <HelpCircle className="w-4 h-4 text-[#1D63ED]" />
                    <span>Arti Status</span>
                  </button>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">{statusVis.explanation}</p>

                {calon_siswa.status_pendaftaran === 'Perlu Perbaikan' && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                    <div className="text-sm text-amber-900">
                      <strong>Catatan Admin:</strong>{' '}
                      {calon_siswa.catatan_perbaikan || 'Mohon periksa kembali data formulir atau dokumen Anda.'}
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleNav('formulir')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1D63ED] text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                      >
                        <span>Perbaiki Sekarang</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNav('dokumen')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs sm:text-sm font-semibold hover:bg-amber-100 cursor-pointer"
                      >
                        <span>Periksa Dokumen</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Simple Registration Timeline */}
                <div className="pt-4 border-t border-slate-100">
                  <h2 className="font-display font-bold text-sm text-slate-900 mb-4">
                    Alur Proses Pendaftaran
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {timelineSteps.map((st, idx) => (
                      <div
                        key={st.label}
                        className={`p-3 rounded-xl border text-left space-y-1.5 ${
                          st.done ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${
                              st.done ? 'bg-[#1D63ED] text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {st.done ? '✓' : idx + 1}
                          </span>
                        </div>
                        <div className={`text-xs font-semibold leading-snug ${st.done ? 'text-slate-900' : 'text-slate-500'}`}>
                          {st.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bukti Pendaftaran Card */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/80 space-y-5">
                {!calon_siswa.nomor_pendaftaran ? (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-slate-600 text-sm">
                      Bukti Pendaftaran tersedia setelah Anda melengkapi dan mengirim Formulir Pendaftaran.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleNav('formulir')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                    >
                      <span>Isi Formulir Sekarang</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 no-print">
                      <div>
                        <h2 className="font-display text-lg font-bold text-slate-900">Bukti Pendaftaran</h2>
                        <p className="text-xs text-slate-500">Simpan atau unduh sebagai tanda bukti resmi.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Cetak</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadBuktiPendaftaranPdf({
                              config,
                              siswa: calon_siswa,
                              formulir
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1D63ED] text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download Bukti Pendaftaran</span>
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-5 sm:p-6 bg-white space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b-2 border-[#1D63ED]">
                        <div className="flex items-center gap-3">
                          <BrandLogo logoUrl={config.logo_url} schoolName={config.nama_sekolah} size="lg" />
                          <div>
                            <div className="font-display font-bold text-base text-slate-900">
                              {config.nama_sekolah}
                            </div>
                            <div className="text-xs text-slate-500">
                              Bukti Pendaftaran SPMB · TA {config.tahun_ajaran}
                            </div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-xs text-slate-500">Nomor Pendaftaran</div>
                          <div className="font-mono font-bold text-base text-[#1D63ED]">
                            {calon_siswa.nomor_pendaftaran}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                        <div className="sm:col-span-8 space-y-2 text-sm">
                          <div className="grid grid-cols-3 gap-2">
                            <span className="text-slate-500">Nama Siswa</span>
                            <span className="col-span-2 font-semibold text-slate-900">{formulir.nama_lengkap}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <span className="text-slate-500">NISN</span>
                            <span className="col-span-2 font-mono font-semibold text-slate-900">{formulir.nisn}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <span className="text-slate-500">Asal Sekolah</span>
                            <span className="col-span-2 font-semibold text-slate-900">{formulir.nama_sekolah_asal}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <span className="text-slate-500">Tanggal Daftar</span>
                            <span className="col-span-2 font-semibold text-slate-900">
                              {formatTanggalIndonesia(calon_siswa.tanggal_pendaftaran)}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 items-center">
                            <span className="text-slate-500">Status</span>
                            <div className="col-span-2">
                              <StatusBadge status={calon_siswa.status_pendaftaran} />
                            </div>
                          </div>
                        </div>

                        <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                          {qrUrl ? (
                            <img src={qrUrl} alt="QR Code Verifikasi" className="w-24 h-24" />
                          ) : (
                            <div className="w-24 h-24 bg-slate-200 rounded-lg animate-pulse" />
                          )}
                          <span className="text-[11px] text-slate-500 mt-1.5 font-medium">
                            Kode Verifikasi
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 6. PENGUMUMAN & HASIL SELEKSI */}
          {activeMenu === 'pengumuman' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/80 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#1D63ED] flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                      Pengumuman Hasil Seleksi
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Jadwal Pengumuman: {config.tanggal_pengumuman}
                    </p>
                  </div>
                </div>

                {!hasil_seleksi.dipublikasikan ? (
                  <div className="p-6 rounded-2xl bg-[#F8FBFF] border border-blue-100 text-center space-y-4">
                    <p className="font-display font-bold text-slate-900 text-base">
                      Hasil seleksi belum diumumkan. Silakan periksa kembali sesuai jadwal.
                    </p>
                    {calon_siswa.nomor_pendaftaran && (
                      <button
                        type="button"
                        onClick={() =>
                          downloadBuktiPendaftaranPdf({
                            config,
                            siswa: calon_siswa,
                            formulir
                          })
                        }
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-[#1D63ED]" />
                        <span>Download Bukti Pendaftaran</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className={`p-6 rounded-2xl border space-y-4 ${
                      hasil_seleksi.status_seleksi === 'Diterima'
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-rose-50/70 border-rose-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-600">
                          Nomor Surat: <span className="font-mono">{hasil_seleksi.nomor_surat || '-'}</span>
                        </div>
                        <div
                          className={`font-display text-2xl sm:text-3xl font-extrabold mt-1 ${
                            hasil_seleksi.status_seleksi === 'Diterima' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {hasil_seleksi.status_seleksi.toUpperCase()}
                        </div>
                      </div>
                      <StatusBadge status={hasil_seleksi.status_seleksi} />
                    </div>

                    {hasil_seleksi.catatan_seleksi && (
                      <p className="text-sm text-slate-700">
                        <strong>Catatan Panitia:</strong> {hasil_seleksi.catatan_seleksi}
                      </p>
                    )}

                    <div className="pt-2 flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSuratModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-[#1D63ED]" />
                        <span>Lihat Hasil Seleksi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadHasilSeleksiPdf({
                            config,
                            siswa: calon_siswa,
                            formulir,
                            hasil: hasil_seleksi
                          }).catch((e) => onNotify('error', e.message))
                        }
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D63ED] text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Surat Hasil Seleksi</span>
                      </button>
                      {calon_siswa.nomor_pendaftaran && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadBuktiPendaftaranPdf({
                              config,
                              siswa: calon_siswa,
                              formulir
                            })
                          }
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download Bukti Pendaftaran</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Informasi Sekolah */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-[#1D63ED]" />
                  <h2 className="font-display text-lg font-bold text-slate-900">Informasi Sekolah</h2>
                </div>

                {announcements.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada pengumuman terbaru.</p>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((item) => (
                      <article key={item.id} className="p-4 rounded-xl border border-slate-200 bg-[#F8FBFF] space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-[#1D63ED] capitalize">{item.tipe}</span>
                          <span>·</span>
                          <span>{formatTanggalIndonesia(item.tanggal_publikasi)}</span>
                        </div>
                        <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">{item.judul}</h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.isi}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Curved-Notch Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        breakpoint="lg"
        ariaLabel="Navigasi cepat siswa"
        leftItems={[
          {
            id: 'dashboard',
            label: 'Beranda',
            Icon: Home,
            active: activeMenu === 'dashboard',
            onClick: () => handleNav('dashboard')
          },
          {
            id: 'dokumen',
            label: 'Dokumen',
            Icon: Upload,
            active: activeMenu === 'dokumen',
            onClick: () => handleNav('dokumen')
          }
        ]}
        centerItem={{
          id: 'formulir',
          label: 'Daftar',
          Icon: FileText,
          active: activeMenu === 'formulir',
          onClick: () => handleNav('formulir')
        }}
        rightItems={[
          {
            id: 'status',
            label: 'Status',
            Icon: ClipboardCheck,
            active: activeMenu === 'status',
            onClick: () => handleNav('status')
          },
          {
            id: 'pengumuman',
            label: 'Info',
            Icon: Bell,
            active: activeMenu === 'pengumuman',
            onClick: () => handleNav('pengumuman')
          }
        ]}
      />

      {/* Confirm Submit Formulir Modal */}
      <ConfirmModal
        open={submitConfirmOpen}
        title="Kirim Formulir Pendaftaran?"
        message="Pastikan seluruh data diri, orang tua, sekolah asal, dan dokumen yang Anda unggah sudah benar sebelum dikirim ke panitia."
        confirmLabel="Ya, Kirim Pendaftaran"
        variant="success"
        loading={savingForm}
        onConfirm={handleSubmitFormulir}
        onCancel={() => setSubmitConfirmOpen(false)}
      />

      {/* Status Explanation Modal */}
      <AnimatePresence>
        {statusHelpOpen && (
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
                <h3 className="font-display font-bold text-slate-900">Penjelasan Status Pendaftaran</h3>
                <button
                  type="button"
                  onClick={() => setStatusHelpOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div><strong className="text-slate-900">Belum Mendaftar:</strong> Formulir belum dikirim ke panitia.</div>
                <div><strong className="text-amber-700">Menunggu Verifikasi:</strong> Pendaftaran masuk, sedang dicek admin.</div>
                <div><strong className="text-amber-700">Perlu Perbaikan:</strong> Ada data/berkas yang perlu diperbaiki.</div>
                <div><strong className="text-[#1D63ED]">Sedang Seleksi:</strong> Berkas valid, menunggu penetapan kelulusan.</div>
                <div><strong className="text-emerald-700">Diterima:</strong> Lolos seleksi penerimaan murid baru.</div>
                <div><strong className="text-rose-700">Tidak Diterima:</strong> Belum lolos seleksi pada periode ini.</div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStatusHelpOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Surat Hasil Seleksi Modal */}
      <AnimatePresence>
        {suratModalOpen && hasil_seleksi.dipublikasikan && (
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5 border border-slate-200"
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-[#1D63ED]">
                <div>
                  <div className="text-xs font-semibold text-[#1D63ED]">SURAT KETERANGAN HASIL SELEKSI</div>
                  <h3 className="font-display font-bold text-lg text-slate-900">{config.nama_sekolah}</h3>
                  <p className="text-xs text-slate-500">Nomor: {hasil_seleksi.nomor_surat || '-'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSuratModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500">No. Pendaftaran</span>
                  <span className="col-span-2 font-mono font-bold text-slate-900">{calon_siswa.nomor_pendaftaran || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500">Tanggal Daftar</span>
                  <span className="col-span-2 font-semibold text-slate-900">{formatTanggalIndonesia(calon_siswa.tanggal_pendaftaran)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500">Nama Siswa</span>
                  <span className="col-span-2 font-semibold text-slate-900">{formulir.nama_lengkap}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500">NISN</span>
                  <span className="col-span-2 font-mono font-semibold text-slate-900">{formulir.nisn}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500">Asal Sekolah</span>
                  <span className="col-span-2 font-semibold text-slate-900">{formulir.nama_sekolah_asal}</span>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border text-center ${
                  hasil_seleksi.status_seleksi === 'Diterima'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="text-xs font-medium">STATUS HASIL SELEKSI</div>
                <div className="font-display text-2xl font-extrabold mt-0.5">
                  {hasil_seleksi.status_seleksi.toUpperCase()}
                </div>
              </div>

              <div className="flex items-end justify-between gap-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <div>Diumumkan pada {config.tanggal_pengumuman}</div>
                <div className="text-right">
                  <div>Kepala Sekolah,</div>
                  <div className="font-bold text-slate-900 mt-6">{config.nama_kepala_sekolah}</div>
                  <div>NIP. {config.nip_kepala_sekolah}</div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSuratModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadHasilSeleksiPdf({
                      config,
                      siswa: calon_siswa,
                      formulir,
                      hasil: hasil_seleksi
                    }).catch((e) => onNotify('error', e.message))
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1D63ED] text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}
