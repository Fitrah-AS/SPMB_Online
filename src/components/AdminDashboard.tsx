import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  FileCheck2,
  FolderCheck,
  Award,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  ArrowRight,
  Search,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Plus,
  Edit3,
  Upload,
  Save,
  Send,
  ChevronDown,
  Printer
} from 'lucide-react';
import type {
  AdminStats,
  DokumenPendaftaran,
  FormulirPendaftaran,
  PendaftarRow,
  PengumumanItem,
  SchoolConfig,
  StatusPendaftaran,
  User
} from '../types';
import {
  BrandLogo,
  ConfirmModal,
  DocumentPreviewModal,
  StatusBadge
} from './ui/Illustrations';
import { MobileBottomNav } from './ui/MobileBottomNav';
import { apiFetch, formatTanggalIndonesia, formatUkuranFile } from '../lib/api';
import { downloadLaporanPdf } from '../lib/pdfGenerator';

type AdminMenu =
  | 'dashboard'
  | 'pendaftar'
  | 'verifikasi'
  | 'seleksi'
  | 'pengumuman'
  | 'laporan'
  | 'pengaturan';

interface AdminDashboardProps {
  user: User;
  config: SchoolConfig;
  onConfigUpdated: (config: SchoolConfig) => void;
  onLogout: () => void;
  onBackHome: () => void;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

interface DetailApplicant {
  siswa: PendaftarRow;
  formulir: FormulirPendaftaran;
  dokumen: DokumenPendaftaran[];
  hasil_seleksi: {
    status_seleksi: 'Menunggu' | 'Diterima' | 'Tidak Diterima';
    nomor_surat: string | null;
    catatan_seleksi: string | null;
    dipublikasikan: number;
  };
}

export function AdminDashboard({
  user,
  config,
  onConfigUpdated,
  onLogout,
  onBackHome,
  onNotify
}: AdminDashboardProps) {
  const [activeMenu, setActiveMenu] = useState<AdminMenu>('dashboard');
  const [verifTab, setVerifTab] = useState<'dokumen' | 'formulir'>('dokumen');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [terbaru, setTerbaru] = useState<PendaftarRow[]>([]);
  const [pendaftar, setPendaftar] = useState<PendaftarRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQ, setSearchQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Detail modal with clean progressive tabs
  const [detailData, setDetailData] = useState<DetailApplicant | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'biodata' | 'dokumen' | 'verifikasi'>('biodata');
  const [previewDoc, setPreviewDoc] = useState<DokumenPendaftaran | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PendaftarRow | null>(null);

  // Verification / Status state
  const [statusInput, setStatusInput] = useState<StatusPendaftaran>('Menunggu Verifikasi');
  const [catatanPerbaikan, setCatatanPerbaikan] = useState('');
  const [catatanFormulir, setCatatanFormulir] = useState('');
  const [docNoteMap, setDocNoteMap] = useState<Record<number, string>>({});

  // Selection modal
  const [seleksiTarget, setSeleksiTarget] = useState<PendaftarRow | null>(null);
  const [seleksiStatus, setSeleksiStatus] = useState<'Menunggu' | 'Diterima' | 'Tidak Diterima'>('Menunggu');
  const [seleksiNomorSurat, setSeleksiNomorSurat] = useState('');
  const [seleksiCatatan, setSeleksiCatatan] = useState('');
  const [seleksiPublikasikan, setSeleksiPublikasikan] = useState(false);

  // Confirm modals for important actions
  const [bulkConfirm, setBulkConfirm] = useState<{ publish: boolean } | null>(null);
  const [deleteAnnTarget, setDeleteAnnTarget] = useState<PengumumanItem | null>(null);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);

  // Pengumuman state
  const [announcements, setAnnouncements] = useState<PengumumanItem[]>([]);
  const [annFormOpen, setAnnFormOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<PengumumanItem | null>(null);
  const [annJudul, setAnnJudul] = useState('');
  const [annIsi, setAnnIsi] = useState('');
  const [annTipe, setAnnTipe] = useState<'umum' | 'seleksi' | 'jadwal'>('umum');
  const [annPub, setAnnPub] = useState(true);

  // Laporan state
  const [laporanSummary, setLaporanSummary] = useState<Record<string, number> | null>(null);
  const [laporanRows, setLaporanRows] = useState<PendaftarRow[]>([]);
  const [laporanFilter, setLaporanFilter] = useState('Semua');

  // Config settings state
  const [cfgForm, setCfgForm] = useState<SchoolConfig>(config);
  const [savingCfg, setSavingCfg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    setCfgForm(config);
  }, [config]);

  const loadDashboardOverview = useCallback(async () => {
    try {
      const data = await apiFetch<{ stats: AdminStats; terbaru: PendaftarRow[] }>('/api/admin/dashboard');
      setStats(data.stats);
      setTerbaru(data.terbaru);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memuat ringkasan dashboard.');
    }
  }, [onNotify]);

  const loadPendaftar = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQ.trim()) params.set('q', searchQ.trim());
      if (filterStatus !== 'Semua') params.set('status', filterStatus);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const data = await apiFetch<{ pendaftar: PendaftarRow[] }>(`/api/admin/pendaftar?${params.toString()}`);
      setPendaftar(data.pendaftar);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memuat data pendaftar.');
    }
  }, [searchQ, filterStatus, dateFrom, dateTo, onNotify]);

  const loadPengumuman = useCallback(async () => {
    try {
      const data = await apiFetch<{ pengumuman: PengumumanItem[] }>('/api/admin/pengumuman');
      setAnnouncements(data.pengumuman);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memuat pengumuman.');
    }
  }, [onNotify]);

  const loadLaporan = useCallback(async () => {
    try {
      const q = laporanFilter !== 'Semua' ? `?status=${encodeURIComponent(laporanFilter)}` : '';
      const data = await apiFetch<{ summary: Record<string, number>; rows: PendaftarRow[] }>(`/api/admin/laporan${q}`);
      setLaporanSummary(data.summary);
      setLaporanRows(data.rows);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memuat laporan.');
    }
  }, [laporanFilter, onNotify]);

  useEffect(() => {
    Promise.all([loadDashboardOverview(), loadPendaftar(), loadPengumuman(), loadLaporan()]).finally(() =>
      setLoading(false)
    );
  }, [loadDashboardOverview, loadPendaftar, loadPengumuman, loadLaporan]);

  const openDetailModal = async (siswaId: number, initialTab: 'biodata' | 'dokumen' | 'verifikasi' = 'biodata') => {
    setDetailTab(initialTab);
    setDetailLoading(true);
    try {
      const data = await apiFetch<DetailApplicant>(`/api/admin/pendaftar/${siswaId}`);
      setDetailData(data);
      setStatusInput(data.siswa.status_pendaftaran);
      setCatatanPerbaikan(data.siswa.catatan_perbaikan || '');
      setCatatanFormulir(data.formulir?.catatan_formulir || '');
      const notes: Record<number, string> = {};
      data.dokumen.forEach((d) => {
        notes[d.id] = d.catatan || '';
      });
      setDocNoteMap(notes);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memuat detail pendaftar.');
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshAllData = async (reopenId?: number) => {
    await Promise.all([loadDashboardOverview(), loadPendaftar(), loadLaporan()]);
    if (reopenId) {
      await openDetailModal(reopenId, detailTab);
    }
  };

  const handleUpdateStatus = async () => {
    if (!detailData) return;
    setStatusConfirmOpen(false);
    try {
      await apiFetch(`/api/admin/pendaftar/${detailData.siswa.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status_pendaftaran: statusInput,
          catatan_perbaikan: catatanPerbaikan
        })
      });
      onNotify('success', 'Status pendaftaran diperbarui.');
      await refreshAllData(detailData.siswa.id);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memperbarui status.');
    }
  };

  const handleVerifFormulir = async (verif: 'Valid' | 'Perlu Perbaikan') => {
    if (!detailData) return;
    if (verif === 'Perlu Perbaikan' && !catatanFormulir.trim()) {
      onNotify('error', 'Tuliskan catatan perbaikan agar siswa mengetahui bagian yang perlu diperbaiki.');
      return;
    }
    try {
      await apiFetch(`/api/admin/pendaftar/${detailData.siswa.id}/verifikasi-formulir`, {
        method: 'PUT',
        body: JSON.stringify({
          verifikasi_formulir: verif,
          catatan_formulir: catatanFormulir
        })
      });
      onNotify('success', `Formulir ditandai ${verif === 'Valid' ? 'Terverifikasi' : 'Perlu Perbaikan'}.`);
      await refreshAllData(detailData.siswa.id);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan verifikasi formulir.');
    }
  };

  const handleVerifDokumen = async (dokId: number, status: 'Valid' | 'Perlu Perbaikan') => {
    if (!detailData) return;
    try {
      await apiFetch(`/api/admin/dokumen/${dokId}/verifikasi`, {
        method: 'PUT',
        body: JSON.stringify({
          status_verifikasi: status,
          catatan: docNoteMap[dokId] || ''
        })
      });
      onNotify('success', `Dokumen ditandai ${status === 'Valid' ? 'Terverifikasi' : 'Perlu Perbaikan'}.`);
      await refreshAllData(detailData.siswa.id);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memverifikasi dokumen.');
    }
  };

  const handleDeletePendaftar = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/admin/pendaftar/${deleteTarget.id}`, { method: 'DELETE' });
      onNotify('info', `Data ${deleteTarget.nama_lengkap} telah dihapus.`);
      setDeleteTarget(null);
      if (detailData?.siswa.id === deleteTarget.id) setDetailData(null);
      await refreshAllData();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menghapus data.');
    }
  };

  const openSeleksiModal = (row: PendaftarRow) => {
    setSeleksiTarget(row);
    setSeleksiStatus(row.status_seleksi || 'Menunggu');
    setSeleksiNomorSurat(row.nomor_surat || '');
    setSeleksiCatatan(row.catatan_seleksi || '');
    setSeleksiPublikasikan(Boolean(row.dipublikasikan));
  };

  const handleSaveSeleksi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seleksiTarget) return;
    try {
      await apiFetch(`/api/admin/seleksi/${seleksiTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status_seleksi: seleksiStatus,
          nomor_surat: seleksiNomorSurat,
          catatan_seleksi: seleksiCatatan,
          dipublikasikan: seleksiPublikasikan
        })
      });
      onNotify('success', 'Keputusan hasil seleksi tersimpan.');
      setSeleksiTarget(null);
      await refreshAllData();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan hasil seleksi.');
    }
  };

  const handleBulkPublish = async (publish: boolean) => {
    setBulkConfirm(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/admin/seleksi/publikasi', {
        method: 'POST',
        body: JSON.stringify({ publish })
      });
      onNotify('success', res.message);
      await refreshAllData();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memperbarui publikasi hasil seleksi.');
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAnn) {
        await apiFetch(`/api/admin/pengumuman/${editingAnn.id}`, {
          method: 'PUT',
          body: JSON.stringify({ judul: annJudul, isi: annIsi, tipe: annTipe, dipublikasikan: annPub })
        });
        onNotify('success', 'Pengumuman diperbarui.');
      } else {
        await apiFetch('/api/admin/pengumuman', {
          method: 'POST',
          body: JSON.stringify({ judul: annJudul, isi: annIsi, tipe: annTipe, dipublikasikan: annPub })
        });
        onNotify('success', 'Pengumuman baru ditambahkan.');
      }
      setAnnFormOpen(false);
      setEditingAnn(null);
      setAnnJudul('');
      setAnnIsi('');
      await loadPengumuman();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan pengumuman.');
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!deleteAnnTarget) return;
    try {
      await apiFetch(`/api/admin/pengumuman/${deleteAnnTarget.id}`, { method: 'DELETE' });
      onNotify('info', 'Pengumuman dihapus.');
      setDeleteAnnTarget(null);
      await loadPengumuman();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menghapus pengumuman.');
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'No',
      'Nomor Pendaftaran',
      'Nama Calon Siswa',
      'NIK',
      'NISN',
      'Jenis Kelamin',
      'Asal Sekolah',
      'Tahun Lulus',
      'Nomor HP',
      'Tanggal Daftar',
      'Status Pendaftaran',
      'Hasil Seleksi'
    ];
    const lines = [
      headers.join(','),
      ...laporanRows.map((r, i) =>
        [
          i + 1,
          r.nomor_pendaftaran || '-',
          `"${(r.nama_lengkap || '').replace(/"/g, '""')}"`,
          `"${r.nik || ''}"`,
          `"${r.nisn || ''}"`,
          r.jenis_kelamin || '-',
          `"${(r.nama_sekolah_asal || '').replace(/"/g, '""')}"`,
          r.tahun_lulus || '-',
          `"${r.nomor_hp || ''}"`,
          formatTanggalIndonesia(r.tanggal_pendaftaran),
          r.status_pendaftaran,
          r.status_seleksi || 'Menunggu'
        ].join(',')
      )
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_SPMB_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('success', 'Laporan CSV berhasil diunduh.');
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCfg(true);
    try {
      const res = await apiFetch<{ message: string; config: SchoolConfig }>('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify(cfgForm)
      });
      onConfigUpdated(res.config);
      onNotify('success', res.message);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSavingCfg(false);
    }
  };

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await apiFetch<{ message: string; config: SchoolConfig }>('/api/admin/config/logo', {
        method: 'POST',
        body: fd
      });
      onConfigUpdated(res.config);
      onNotify('success', res.message);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal mengunggah logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleResetLogo = async () => {
    try {
      const res = await apiFetch<{ message: string; config: SchoolConfig }>('/api/admin/config/logo', {
        method: 'DELETE'
      });
      onConfigUpdated(res.config);
      onNotify('info', res.message);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal mereset logo.');
    }
  };

  const menuItems: Array<{ id: AdminMenu; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'pendaftar', label: 'Data Pendaftar', Icon: Users },
    { id: 'verifikasi', label: 'Verifikasi', Icon: FolderCheck },
    { id: 'seleksi', label: 'Hasil Seleksi', Icon: Award },
    { id: 'pengumuman', label: 'Pengumuman', Icon: Megaphone },
    { id: 'laporan', label: 'Laporan', Icon: BarChart3 },
    { id: 'pengaturan', label: 'Pengaturan', Icon: Settings }
  ];

  const handleNav = (menu: AdminMenu) => {
    setActiveMenu(menu);
    setSidebarOpen(false);
    setAdminMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F4F8FD] flex flex-col lg:flex-row">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Navy Sidebar (#132238) matching Middle-Right Mockup & Section K */}
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

          <nav className="p-4 space-y-1">
            {menuItems.map(({ id, label, Icon }) => {
              const active = activeMenu === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNav(id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
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
            <span>Beranda Publik</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-rose-600/20 hover:text-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Right Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar matching Middle-Right Mockup */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Buka menu admin"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <BrandLogo logoUrl={config.logo_url} schoolName={config.nama_sekolah} size="sm" />
              <span className="font-display font-bold text-slate-900">SPMB</span>
            </div>
            <div className="hidden lg:block text-sm font-medium text-slate-500">
              Panel Admin · <span className="text-slate-900 font-semibold">{config.nama_sekolah}</span>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setAdminMenuOpen((prev) => !prev)}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#132238] text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
                AD
              </div>
              <span className="hidden sm:inline text-sm font-semibold text-slate-800">Admin</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {adminMenuOpen && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50">
                <button
                  type="button"
                  onClick={() => handleNav('pengaturan')}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Pengaturan</span>
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

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28 lg:pb-10 max-w-6xl w-full mx-auto space-y-6 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#1D63ED]" />
              <span className="text-sm font-medium">Memuat data admin...</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMenu}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
              {/* 1. DASHBOARD OVERVIEW matching Middle-Right Mockup & Section K */}
              {activeMenu === 'dashboard' && stats && (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                      Dashboard Admin
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                      Ringkasan data pendaftaran SPMB.
                    </p>
                  </div>

                  {/* 4 Pastel-Tinted Clickable Stat Cards matching Middle-Right Mockup */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterStatus('Semua');
                        handleNav('pendaftar');
                      }}
                      className="bg-[#EFF6FF] rounded-2xl p-5 border border-blue-100 flex flex-col items-center text-center gap-2 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-full bg-[#1D63ED] text-white flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Total Pendaftar</span>
                      <span className="font-display text-3xl font-extrabold text-slate-900 tabular-nums">
                        {stats.total_pendaftar || 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFilterStatus('Menunggu Verifikasi');
                        handleNav('pendaftar');
                      }}
                      className="bg-[#FFF8EB] rounded-2xl p-5 border border-amber-100 flex flex-col items-center text-center gap-2 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-amber-800">Menunggu Verifikasi</span>
                      <span className="font-display text-3xl font-extrabold text-slate-900 tabular-nums">
                        {stats.menunggu_verifikasi || 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFilterStatus('Diterima');
                        handleNav('pendaftar');
                      }}
                      className="bg-[#ECFDF5] rounded-2xl p-5 border border-emerald-100 flex flex-col items-center text-center gap-2 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-emerald-800">Diterima</span>
                      <span className="font-display text-3xl font-extrabold text-slate-900 tabular-nums">
                        {stats.diterima || 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFilterStatus('Tidak Diterima');
                        handleNav('pendaftar');
                      }}
                      className="bg-[#FEF2F2] rounded-2xl p-5 border border-rose-100 flex flex-col items-center text-center gap-2 hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-full bg-rose-600 text-white flex items-center justify-center">
                        <XCircle className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-rose-800">Tidak Diterima</span>
                      <span className="font-display text-3xl font-extrabold text-slate-900 tabular-nums">
                        {stats.tidak_diterima || 0}
                      </span>
                    </button>
                  </div>

                  {/* Pendaftar Terbaru Table (5 Columns exact match to Middle-Right Mockup & Section K) */}
                  <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                      <h2 className="font-display text-lg font-bold text-slate-900">
                        Pendaftar Terbaru
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setFilterStatus('Semua');
                          handleNav('pendaftar');
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D63ED] hover:underline cursor-pointer"
                      >
                        <span>Lihat Semua</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#F8FBFF] text-slate-600 text-xs font-semibold border-b border-slate-200/80">
                          <tr>
                            <th className="px-5 py-3">No</th>
                            <th className="px-5 py-3">Nama</th>
                            <th className="px-5 py-3">Asal Sekolah</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {terbaru.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                                Belum ada data pendaftar.
                              </td>
                            </tr>
                          ) : (
                            terbaru.map((row, i) => (
                              <tr key={row.id} className="hover:bg-slate-50/70">
                                <td className="px-5 py-3.5 text-slate-500 tabular-nums">{i + 1}</td>
                                <td className="px-5 py-3.5 font-semibold text-slate-900">{row.nama_lengkap}</td>
                                <td className="px-5 py-3.5 text-slate-600">{row.nama_sekolah_asal || '-'}</td>
                                <td className="px-5 py-3.5">
                                  <StatusBadge status={row.status_pendaftaran} />
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => openDetailModal(row.id, 'biodata')}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1D63ED] hover:bg-blue-700 transition-colors cursor-pointer"
                                  >
                                    <span>Detail</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. DATA PENDAFTAR */}
              {activeMenu === 'pendaftar' && (
                <div className="space-y-5">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-slate-900">Data Pendaftar</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Kelola seluruh calon siswa, cari data, dan buka detail untuk verifikasi.
                    </p>
                  </div>

                  {/* Filter Bar */}
                  <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder="Cari nama, no. daftar, NISN..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                      />
                    </div>

                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                    >
                      <option value="Semua">Semua Status</option>
                      <option value="Belum Mendaftar">Belum Mendaftar</option>
                      <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                      <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                      <option value="Sedang Seleksi">Sedang Seleksi</option>
                      <option value="Diterima">Diterima</option>
                      <option value="Tidak Diterima">Tidak Diterima</option>
                    </select>

                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      title="Dari tanggal"
                      className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                    />

                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        title="Sampai tanggal"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1D63ED]"
                      />
                      {(searchQ || filterStatus !== 'Semua' || dateFrom || dateTo) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQ('');
                            setFilterStatus('Semua');
                            setDateFrom('');
                            setDateTo('');
                          }}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#F8FBFF] text-slate-600 text-xs font-semibold border-b border-slate-200/80">
                          <tr>
                            <th className="px-5 py-3">No</th>
                            <th className="px-5 py-3">Nama</th>
                            <th className="px-5 py-3">Asal Sekolah</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pendaftar.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                                Tidak ada data pendaftar yang cocok dengan filter.
                              </td>
                            </tr>
                          ) : (
                            pendaftar.map((row, idx) => (
                              <tr key={row.id} className="hover:bg-slate-50/70">
                                <td className="px-5 py-3.5 text-slate-500 tabular-nums">{idx + 1}</td>
                                <td className="px-5 py-3.5">
                                  <div className="font-semibold text-slate-900">{row.nama_lengkap}</div>
                                  <div className="text-xs text-slate-500 font-mono">
                                    {row.nomor_pendaftaran || 'Belum ada nomor'}
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 text-slate-600">{row.nama_sekolah_asal || '-'}</td>
                                <td className="px-5 py-3.5">
                                  <StatusBadge status={row.status_pendaftaran} />
                                </td>
                                <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => openDetailModal(row.id, 'biodata')}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1D63ED] hover:bg-blue-700 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Detail</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(row)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 cursor-pointer"
                                    aria-label={`Hapus ${row.nama_lengkap}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. VERIFIKASI (TABBED: DOKUMEN & FORMULIR) */}
              {activeMenu === 'verifikasi' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="font-display text-2xl font-bold text-slate-900">Verifikasi Pendaftar</h1>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Periksa kelengkapan dokumen dan kesesuaian formulir siswa.
                      </p>
                    </div>

                    <div className="inline-flex p-1 bg-slate-200/70 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setVerifTab('dokumen')}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          verifTab === 'dokumen'
                            ? 'bg-white text-[#1D63ED] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Verifikasi Dokumen
                      </button>
                      <button
                        type="button"
                        onClick={() => setVerifTab('formulir')}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          verifTab === 'formulir'
                            ? 'bg-white text-[#1D63ED] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Verifikasi Formulir
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
                    <div className="overflow-x-auto">
                      {verifTab === 'dokumen' ? (
                        <table className="w-full text-left text-sm">
                          <thead className="bg-[#F8FBFF] text-slate-600 text-xs font-semibold border-b border-slate-200/80">
                            <tr>
                              <th className="px-5 py-3">Nama</th>
                              <th className="px-5 py-3">Asal Sekolah</th>
                              <th className="px-5 py-3">Kelengkapan Berkas</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {pendaftar.map((row) => (
                              <tr key={row.id} className="hover:bg-slate-50/70">
                                <td className="px-5 py-3.5 font-semibold text-slate-900">{row.nama_lengkap}</td>
                                <td className="px-5 py-3.5 text-slate-600">{row.nama_sekolah_asal || '-'}</td>
                                <td className="px-5 py-3.5 tabular-nums text-xs">
                                  <span className="font-semibold text-emerald-700">{row.dokumen_valid}/{row.jumlah_dokumen} Terverifikasi</span>
                                  {row.dokumen_revisi > 0 && (
                                    <span className="text-amber-700 ml-2">({row.dokumen_revisi} Perlu Diperbaiki)</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5">
                                  <StatusBadge status={row.status_pendaftaran} />
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => openDetailModal(row.id, 'dokumen')}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D63ED] text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                                  >
                                    <FolderCheck className="w-3.5 h-3.5" />
                                    <span>Periksa Dokumen</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <table className="w-full text-left text-sm">
                          <thead className="bg-[#F8FBFF] text-slate-600 text-xs font-semibold border-b border-slate-200/80">
                            <tr>
                              <th className="px-5 py-3">Nama</th>
                              <th className="px-5 py-3">NISN / NIK</th>
                              <th className="px-5 py-3">Asal Sekolah</th>
                              <th className="px-5 py-3">Status Formulir</th>
                              <th className="px-5 py-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {pendaftar.map((row) => (
                              <tr key={row.id} className="hover:bg-slate-50/70">
                                <td className="px-5 py-3.5 font-semibold text-slate-900">{row.nama_lengkap}</td>
                                <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                                  {row.nisn || '-'} / {row.nik || '-'}
                                </td>
                                <td className="px-5 py-3.5 text-slate-600">{row.nama_sekolah_asal || '-'}</td>
                                <td className="px-5 py-3.5">
                                  <StatusBadge status={row.verifikasi_formulir || 'Belum Diverifikasi'} />
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => openDetailModal(row.id, 'verifikasi')}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D63ED] text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                                  >
                                    <FileCheck2 className="w-3.5 h-3.5" />
                                    <span>Periksa Formulir</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. HASIL SELEKSI */}
              {activeMenu === 'seleksi' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="font-display text-2xl font-bold text-slate-900">Hasil Seleksi</h1>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Tetapkan status diterima atau tidak diterima lalu publikasikan ke portal siswa.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => setBulkConfirm({ publish: false })}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Tarik Publikasi
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkConfirm({ publish: true })}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-700 cursor-pointer shadow-xs"
                      >
                        <Send className="w-4 h-4" />
                        <span>Publikasikan Semua Hasil</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#F8FBFF] text-slate-600 text-xs font-semibold border-b border-slate-200/80">
                          <tr>
                            <th className="px-5 py-3">No. Pendaftaran</th>
                            <th className="px-5 py-3">Nama</th>
                            <th className="px-5 py-3">Asal Sekolah</th>
                            <th className="px-5 py-3">Keputusan</th>
                            <th className="px-5 py-3">Publikasi</th>
                            <th className="px-5 py-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pendaftar.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50/70">
                              <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">
                                {row.nomor_pendaftaran || '-'}
                              </td>
                              <td className="px-5 py-3.5 font-semibold text-slate-900">{row.nama_lengkap}</td>
                              <td className="px-5 py-3.5 text-slate-600">{row.nama_sekolah_asal || '-'}</td>
                              <td className="px-5 py-3.5">
                                <StatusBadge status={row.status_seleksi || 'Menunggu'} />
                              </td>
                              <td className="px-5 py-3.5 text-xs font-semibold">
                                {row.dipublikasikan ? (
                                  <span className="text-emerald-700">Dipublikasikan</span>
                                ) : (
                                  <span className="text-slate-500">Belum Dipublikasikan</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => openSeleksiModal(row)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D63ED] text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Tetapkan</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. PENGUMUMAN CRUD */}
              {activeMenu === 'pengumuman' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="font-display text-2xl font-bold text-slate-900">Kelola Pengumuman</h1>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Buat atau perbarui informasi resmi yang tampil di beranda dan portal siswa.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAnn(null);
                        setAnnJudul('');
                        setAnnIsi('');
                        setAnnTipe('umum');
                        setAnnPub(true);
                        setAnnFormOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Pengumuman</span>
                    </button>
                  </div>

                  {annFormOpen && (
                    <form
                      onSubmit={handleSaveAnnouncement}
                      className="bg-white rounded-2xl p-6 shadow-xs border border-blue-200 space-y-4"
                    >
                      <h2 className="font-display font-bold text-lg text-slate-900">
                        {editingAnn ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Judul</label>
                          <input
                            type="text"
                            required
                            value={annJudul}
                            onChange={(e) => setAnnJudul(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                          <select
                            value={annTipe}
                            onChange={(e) => setAnnTipe(e.target.value as 'umum' | 'seleksi' | 'jadwal')}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                          >
                            <option value="umum">Umum</option>
                            <option value="jadwal">Jadwal</option>
                            <option value="seleksi">Seleksi</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Isi Pengumuman</label>
                        <textarea
                          rows={4}
                          required
                          value={annIsi}
                          onChange={(e) => setAnnIsi(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={annPub}
                          onChange={(e) => setAnnPub(e.target.checked)}
                          className="w-4 h-4 accent-[#1D63ED]"
                        />
                        <span>Publikasikan sekarang</span>
                      </label>
                      <div className="flex gap-2.5">
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                        >
                          Simpan Pengumuman
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnnFormOpen(false)}
                          className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-3">
                    {announcements.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-[#1D63ED] capitalize">{item.tipe}</span>
                            <span>·</span>
                            <span>{formatTanggalIndonesia(item.tanggal_publikasi)}</span>
                            <span>·</span>
                            <span className={item.dipublikasikan ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                              {item.dipublikasikan ? 'Dipublikasikan' : 'Draf'}
                            </span>
                          </div>
                          <h3 className="font-display font-bold text-slate-900 text-base">{item.judul}</h3>
                          <p className="text-sm text-slate-600 leading-relaxed">{item.isi}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAnn(item);
                              setAnnJudul(item.judul);
                              setAnnIsi(item.isi);
                              setAnnTipe(item.tipe);
                              setAnnPub(Boolean(item.dipublikasikan));
                              setAnnFormOpen(true);
                            }}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                            aria-label="Edit pengumuman"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteAnnTarget(item)}
                            className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            aria-label="Hapus pengumuman"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. LAPORAN */}
              {activeMenu === 'laporan' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="font-display text-2xl font-bold text-slate-900">Laporan Pendaftaran</h1>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Rekapitulasi data pendaftar untuk dicetak atau diekspor.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2.5 no-print">
                      <select
                        value={laporanFilter}
                        onChange={(e) => setLaporanFilter(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
                      >
                        <option value="Semua">Semua Status</option>
                        <option value="Diterima">Diterima</option>
                        <option value="Tidak Diterima">Tidak Diterima</option>
                        <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                        <option value="Sedang Seleksi">Sedang Seleksi</option>
                        <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Cetak</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportCsv}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Ekspor CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadLaporanPdf(config, laporanRows, laporanFilter)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh PDF</span>
                      </button>
                    </div>
                  </div>

                  {laporanSummary && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Total Pendaftar', val: laporanSummary.total },
                        { label: 'Diterima', val: laporanSummary.diterima },
                        { label: 'Siswa Laki-laki', val: laporanSummary.laki_laki },
                        { label: 'Siswa Perempuan', val: laporanSummary.perempuan }
                      ].map((item) => (
                        <div key={item.label} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                          <div className="text-xs text-slate-500">{item.label}</div>
                          <div className="font-display text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                            {item.val || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#F8FBFF] text-slate-600 text-xs font-semibold border-b border-slate-200/80">
                          <tr>
                            <th className="px-5 py-3">No</th>
                            <th className="px-5 py-3">No. Pendaftaran</th>
                            <th className="px-5 py-3">Nama</th>
                            <th className="px-5 py-3">NISN</th>
                            <th className="px-5 py-3">Asal Sekolah</th>
                            <th className="px-5 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {laporanRows.map((r, i) => (
                            <tr key={`${r.nomor_pendaftaran}-${i}`}>
                              <td className="px-5 py-3 tabular-nums text-slate-500">{i + 1}</td>
                              <td className="px-5 py-3 font-mono text-xs font-semibold">{r.nomor_pendaftaran || '-'}</td>
                              <td className="px-5 py-3 font-semibold text-slate-900">{r.nama_lengkap}</td>
                              <td className="px-5 py-3 font-mono text-xs">{r.nisn || '-'}</td>
                              <td className="px-5 py-3 text-slate-600">{r.nama_sekolah_asal || '-'}</td>
                              <td className="px-5 py-3">
                                <StatusBadge status={r.status_pendaftaran} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. PENGATURAN SEKOLAH */}
              {activeMenu === 'pengaturan' && (
                <div className="space-y-6 max-w-4xl">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-slate-900">Pengaturan Sekolah</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Sesuaikan identitas sekolah, logo, jadwal pendaftaran, dan tanggal pengumuman.
                    </p>
                  </div>

                  {/* Logo Card */}
                  <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <BrandLogo logoUrl={config.logo_url} schoolName={config.nama_sekolah} size="lg" />
                      <div>
                        <h2 className="font-display font-bold text-base text-slate-900">Logo Sekolah</h2>
                        <p className="text-xs text-slate-500">Tampil pada header, bukti pendaftaran, dan surat hasil seleksi.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.has_custom_logo && (
                        <button
                          type="button"
                          onClick={handleResetLogo}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Reset Logo
                        </button>
                      )}
                      <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1D63ED] text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer">
                        {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span>Unggah Logo Baru</span>
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.svg,.webp"
                          className="hidden"
                          onChange={(e) => {
                            handleLogoUpload(e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Config Form */}
                  <form
                    onSubmit={handleSaveConfig}
                    className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/80 space-y-5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Sekolah *</label>
                        <input
                          type="text"
                          required
                          value={cfgForm.nama_sekolah}
                          onChange={(e) => setCfgForm({ ...cfgForm, nama_sekolah: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Jenjang Pendidikan</label>
                        <input
                          type="text"
                          value={cfgForm.jenjang}
                          onChange={(e) => setCfgForm({ ...cfgForm, jenjang: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                        <input
                          type="text"
                          value={cfgForm.tahun_ajaran}
                          onChange={(e) => setCfgForm({ ...cfgForm, tahun_ajaran: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Jadwal Pendaftaran *</label>
                        <input
                          type="text"
                          required
                          value={cfgForm.jadwal_pendaftaran}
                          onChange={(e) => setCfgForm({ ...cfgForm, jadwal_pendaftaran: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Pengumuman *</label>
                        <input
                          type="text"
                          required
                          value={cfgForm.tanggal_pengumuman}
                          onChange={(e) => setCfgForm({ ...cfgForm, tanggal_pengumuman: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Jam Layanan</label>
                        <input
                          type="text"
                          value={cfgForm.jam_layanan}
                          onChange={(e) => setCfgForm({ ...cfgForm, jam_layanan: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Telepon</label>
                        <input
                          type="text"
                          value={cfgForm.telepon}
                          onChange={(e) => setCfgForm({ ...cfgForm, telepon: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Sekolah</label>
                        <input
                          type="email"
                          value={cfgForm.email_sekolah}
                          onChange={(e) => setCfgForm({ ...cfgForm, email_sekolah: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                        <input
                          type="text"
                          value={cfgForm.website}
                          onChange={(e) => setCfgForm({ ...cfgForm, website: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Sekolah</label>
                        <textarea
                          rows={2}
                          value={cfgForm.alamat_sekolah}
                          onChange={(e) => setCfgForm({ ...cfgForm, alamat_sekolah: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Kepala Sekolah</label>
                        <input
                          type="text"
                          value={cfgForm.nama_kepala_sekolah}
                          onChange={(e) => setCfgForm({ ...cfgForm, nama_kepala_sekolah: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">NIP Kepala Sekolah</label>
                        <input
                          type="text"
                          value={cfgForm.nip_kepala_sekolah}
                          onChange={(e) => setCfgForm({ ...cfgForm, nip_kepala_sekolah: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingCfg}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                    >
                      {savingCfg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Simpan Pengaturan</span>
                    </button>
                  </form>
                </div>
              )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* DETAIL PENDAFTAR MODAL (TABBED FOR PROGRESSIVE DISCLOSURE) */}
      <AnimatePresence>
        {(detailData || detailLoading) && (
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
            >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {detailLoading ? 'Memuat Detail...' : detailData?.siswa.nama_lengkap}
                </h2>
                {detailData && (
                  <p className="text-xs text-slate-500 font-mono">
                    {detailData.siswa.nomor_pendaftaran || 'Belum Ada Nomor Pendaftaran'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailData(null)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading || !detailData ? (
              <div className="p-12 flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-[#1D63ED]" />
                <span>Mengambil data siswa...</span>
              </div>
            ) : (
              <>
                {/* Tab Switcher inside Detail Modal (Progressive Disclosure) */}
                <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-4 bg-[#F8FBFF]">
                  {[
                    { id: 'biodata' as const, label: 'Data Siswa' },
                    { id: 'dokumen' as const, label: `Dokumen (${detailData.dokumen.length})` },
                    { id: 'verifikasi' as const, label: 'Verifikasi & Status' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDetailTab(tab.id)}
                      className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                        detailTab === tab.id
                          ? 'border-[#1D63ED] text-[#1D63ED]'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-6 overflow-y-auto space-y-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={detailTab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                  {detailTab === 'biodata' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Status Pendaftaran</span>
                        <StatusBadge status={detailData.siswa.status_pendaftaran} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm bg-[#F8FBFF] p-4 rounded-xl border border-blue-100">
                        <div><span className="text-slate-500 block text-xs">Nama Lengkap</span><strong>{detailData.formulir?.nama_lengkap || '-'}</strong></div>
                        <div><span className="text-slate-500 block text-xs">NIK / NISN</span><strong className="font-mono">{detailData.formulir?.nik || '-'} / {detailData.formulir?.nisn || '-'}</strong></div>
                        <div><span className="text-slate-500 block text-xs">Tempat, Tanggal Lahir</span><strong>{detailData.formulir?.tempat_lahir || '-'}, {formatTanggalIndonesia(detailData.formulir?.tanggal_lahir)}</strong></div>
                        <div><span className="text-slate-500 block text-xs">Jenis Kelamin / Agama</span><strong>{detailData.formulir?.jenis_kelamin || '-'} · {detailData.formulir?.agama || '-'}</strong></div>
                        <div><span className="text-slate-500 block text-xs">Nomor HP</span><strong>{detailData.formulir?.nomor_hp || '-'}</strong></div>
                        <div><span className="text-slate-500 block text-xs">Alamat</span><strong>{detailData.formulir?.alamat_lengkap || '-'}</strong></div>
                        <div><span className="text-slate-500 block text-xs">Orang Tua (Ayah / Ibu)</span><strong>{detailData.formulir?.nama_ayah || '-'} / {detailData.formulir?.nama_ibu || '-'}</strong></div>
                        <div><span className="text-slate-500 block text-xs">Pekerjaan & HP Ortu</span><strong>{detailData.formulir?.pekerjaan_ortu || '-'} ({detailData.formulir?.nomor_hp_ortu || '-'})</strong></div>
                        <div><span className="text-slate-500 block text-xs">Sekolah Asal</span><strong>{detailData.formulir?.nama_sekolah_asal || '-'} (NPSN: {detailData.formulir?.npsn_sekolah || '-'})</strong></div>
                        <div><span className="text-slate-500 block text-xs">Tahun Lulus</span><strong>{detailData.formulir?.tahun_lulus || '-'}</strong></div>
                      </div>
                    </div>
                  )}

                  {detailTab === 'dokumen' && (
                    <div className="space-y-3">
                      {detailData.dokumen.length === 0 ? (
                        <p className="text-sm text-slate-500">Siswa belum mengunggah dokumen.</p>
                      ) : (
                        detailData.dokumen.map((d) => (
                          <div key={d.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="font-semibold text-sm text-slate-900 capitalize">
                                  {d.jenis_dokumen.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-slate-500 ml-2">
                                  ({d.nama_file_asli} · {formatUkuranFile(d.ukuran_file)})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={d.status_verifikasi} />
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(d)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Lihat</span>
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="text"
                                value={docNoteMap[d.id] || ''}
                                onChange={(e) => setDocNoteMap({ ...docNoteMap, [d.id]: e.target.value })}
                                placeholder="Catatan perbaikan dokumen..."
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                              />
                              <div className="flex gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleVerifDokumen(d.id, 'Valid')}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                                >
                                  Setujui
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleVerifDokumen(d.id, 'Perlu Perbaikan')}
                                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer"
                                >
                                  Minta Perbaikan
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailTab === 'verifikasi' && (
                    <div className="space-y-5">
                      {/* Verifikasi Formulir */}
                      <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display font-bold text-sm text-slate-900">Verifikasi Formulir</h3>
                          <StatusBadge status={detailData.formulir?.verifikasi_formulir || 'Belum Diverifikasi'} />
                        </div>
                        <input
                          type="text"
                          value={catatanFormulir}
                          onChange={(e) => setCatatanFormulir(e.target.value)}
                          placeholder="Catatan verifikasi formulir..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleVerifFormulir('Valid')}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                          >
                            Setujui Formulir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifFormulir('Perlu Perbaikan')}
                            className="px-3.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer"
                          >
                            Minta Perbaikan
                          </button>
                        </div>
                      </div>

                      {/* Ubah Status Keseluruhan */}
                      <div className="p-4 rounded-xl bg-[#F8FBFF] border border-blue-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display font-bold text-sm text-slate-900">Status Pendaftaran Keseluruhan</h3>
                          <StatusBadge status={detailData.siswa.status_pendaftaran} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <select
                            value={statusInput}
                            onChange={(e) => setStatusInput(e.target.value as StatusPendaftaran)}
                            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm"
                          >
                            <option value="Belum Mendaftar">Belum Mendaftar</option>
                            <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                            <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                            <option value="Sedang Seleksi">Sedang Seleksi</option>
                            <option value="Diterima">Diterima</option>
                            <option value="Tidak Diterima">Tidak Diterima</option>
                          </select>
                          <input
                            type="text"
                            value={catatanPerbaikan}
                            onChange={(e) => setCatatanPerbaikan(e.target.value)}
                            placeholder="Catatan untuk siswa..."
                            className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setStatusConfirmOpen(true)}
                          className="px-4 py-2 rounded-xl bg-[#1D63ED] text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                        >
                          Simpan Perubahan Status
                        </button>
                      </div>
                    </div>
                  )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </>
            )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SELEKSI MODAL */}
      <AnimatePresence>
        {seleksiTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handleSaveSeleksi}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 border border-slate-200"
            >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Tetapkan Hasil Seleksi — {seleksiTarget.nama_lengkap}
              </h3>
              <button
                type="button"
                onClick={() => setSeleksiTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Keputusan Seleksi</label>
              <select
                value={seleksiStatus}
                onChange={(e) => setSeleksiStatus(e.target.value as 'Menunggu' | 'Diterima' | 'Tidak Diterima')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Menunggu">Menunggu</option>
                <option value="Diterima">Diterima</option>
                <option value="Tidak Diterima">Tidak Diterima</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Surat Keterangan</label>
              <input
                type="text"
                value={seleksiNomorSurat}
                onChange={(e) => setSeleksiNomorSurat(e.target.value)}
                placeholder="Kosongkan untuk generate otomatis"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Catatan Hasil Seleksi</label>
              <textarea
                rows={3}
                value={seleksiCatatan}
                onChange={(e) => setSeleksiCatatan(e.target.value)}
                placeholder="Catatan untuk dicantumkan di surat..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={seleksiPublikasikan}
                onChange={(e) => setSeleksiPublikasikan(e.target.checked)}
                className="w-4 h-4 accent-[#1D63ED]"
              />
              <span>Publikasikan langsung ke portal siswa</span>
            </label>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSeleksiTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#1D63ED] text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
              >
                Simpan Keputusan
              </button>
            </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION MODALS FOR IMPORTANT ACTIONS */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus Data Pendaftar?"
        message={
          deleteTarget
            ? `Data pendaftaran, formulir, dan berkas milik ${deleteTarget.nama_lengkap} akan dihapus permanen.`
            : ''
        }
        confirmLabel="Ya, Hapus Permanen"
        variant="danger"
        onConfirm={handleDeletePendaftar}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={Boolean(deleteAnnTarget)}
        title="Hapus Pengumuman?"
        message={deleteAnnTarget ? `Pengumuman "${deleteAnnTarget.judul}" akan dihapus.` : ''}
        confirmLabel="Ya, Hapus"
        variant="danger"
        onConfirm={handleDeleteAnnouncement}
        onCancel={() => setDeleteAnnTarget(null)}
      />

      <ConfirmModal
        open={Boolean(bulkConfirm)}
        title={bulkConfirm?.publish ? 'Publikasikan Semua Hasil Seleksi?' : 'Tarik Publikasi Hasil Seleksi?'}
        message={
          bulkConfirm?.publish
            ? 'Hasil seleksi yang telah ditetapkan (Diterima / Tidak Diterima) akan langsung terlihat oleh calon siswa.'
            : 'Hasil seleksi akan disembunyikan sementara dari portal calon siswa.'
        }
        confirmLabel={bulkConfirm?.publish ? 'Ya, Publikasikan' : 'Ya, Tarik Publikasi'}
        variant={bulkConfirm?.publish ? 'success' : 'primary'}
        onConfirm={() => bulkConfirm && handleBulkPublish(bulkConfirm.publish)}
        onCancel={() => setBulkConfirm(null)}
      />

      <ConfirmModal
        open={statusConfirmOpen}
        title="Simpan Perubahan Status?"
        message={`Status pendaftaran siswa akan diubah menjadi "${statusInput}".`}
        confirmLabel="Ya, Simpan Status"
        variant="primary"
        onConfirm={handleUpdateStatus}
        onCancel={() => setStatusConfirmOpen(false)}
      />

      <MobileBottomNav
        breakpoint="lg"
        ariaLabel="Navigasi cepat admin"
        leftItems={[
          {
            id: 'dashboard',
            label: 'Beranda',
            Icon: LayoutDashboard,
            active: activeMenu === 'dashboard',
            onClick: () => handleNav('dashboard')
          },
          {
            id: 'pendaftar',
            label: 'Pendaftar',
            Icon: Users,
            active: activeMenu === 'pendaftar',
            onClick: () => handleNav('pendaftar')
          }
        ]}
        centerItem={{
          id: 'verifikasi',
          label: 'Verifikasi',
          Icon: FolderCheck,
          active: activeMenu === 'verifikasi',
          onClick: () => handleNav('verifikasi')
        }}
        rightItems={[
          {
            id: 'seleksi',
            label: 'Seleksi',
            Icon: Award,
            active: activeMenu === 'seleksi',
            onClick: () => handleNav('seleksi')
          },
          {
            id: 'menu',
            label: 'Lainnya',
            Icon: Menu,
            active: ['pengumuman', 'laporan', 'pengaturan'].includes(activeMenu),
            onClick: () => setSidebarOpen(true)
          }
        ]}
      />

      <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}
