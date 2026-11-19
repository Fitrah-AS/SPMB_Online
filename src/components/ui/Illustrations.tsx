import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileSearch,
  CircleDashed,
  X,
  Download,
  ExternalLink
} from 'lucide-react';
import type { ToastMessage } from '../../types';

export function BrandLogo({
  logoUrl,
  schoolName = 'SPMB',
  size = 'md'
}: {
  logoUrl?: string | null;
  schoolName?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`Logo ${schoolName}`}
        referrerPolicy="no-referrer"
        className={`${dim} rounded-xl object-contain bg-white border border-slate-200 p-0.5 shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shadow-sm shrink-0`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    </div>
  );
}

export function FormChecklistIllustration() {
  return (
    <svg viewBox="0 0 240 200" className="w-40 h-32 md:w-48 md:h-40 mx-auto" fill="none" aria-hidden="true">
      <ellipse cx="120" cy="176" rx="76" ry="12" fill="#DCE8FA" />
      <path d="M44 156 C30 135, 34 108, 52 96 C54 118, 58 140, 56 158 Z" fill="#10B981" opacity="0.85" />
      <path d="M60 160 C48 144, 52 124, 65 115 C67 132, 69 148, 67 160 Z" fill="#059669" opacity="0.9" />
      <rect x="64" y="28" width="104" height="136" rx="14" fill="#D5E5FD" transform="rotate(-6 116 96)" />
      <rect x="74" y="24" width="110" height="142" rx="14" fill="#FFFFFF" stroke="#DBEAFE" strokeWidth="2" />
      <rect x="108" y="16" width="42" height="14" rx="7" fill="#2563EB" />
      <path d="M92 56 L98 62 L110 50" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="118" y="54" width="48" height="8" rx="4" fill="#93C5FD" />
      <path d="M92 84 L98 90 L110 78" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="118" y="82" width="44" height="8" rx="4" fill="#BFDBFE" />
      <path d="M92 112 L98 118 L110 106" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="118" y="110" width="48" height="8" rx="4" fill="#DBEAFE" />
      <circle cx="178" cy="138" r="22" fill="#16A34A" />
      <path d="M168 138 L175 145 L189 131" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DashboardWelcomeIllustration() {
  return (
    <svg viewBox="0 0 180 130" className="w-32 h-24 sm:w-36 sm:h-28 shrink-0" fill="none" aria-hidden="true">
      <ellipse cx="92" cy="116" rx="64" ry="8" fill="#E2EEFE" />
      <rect x="44" y="18" width="84" height="96" rx="12" fill="#EAF2FF" stroke="#BFDBFE" strokeWidth="2" />
      <rect x="68" y="10" width="36" height="14" rx="5" fill="#2563EB" />
      <path d="M56 44 L61 49 L69 40" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="76" y="42" width="38" height="6" rx="3" fill="#93C5FD" />
      <path d="M56 64 L61 69 L69 60" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="76" y="62" width="32" height="6" rx="3" fill="#BFDBFE" />
      <path d="M56 84 L61 89 L69 80" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="76" y="82" width="36" height="6" rx="3" fill="#BFDBFE" />
      <circle cx="126" cy="92" r="20" fill="#16A34A" />
      <path d="M117 92 L123 98 L135 86" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NextStepClockIllustration() {
  return (
    <svg viewBox="0 0 160 130" className="w-28 h-24 sm:w-32 sm:h-28 shrink-0" fill="none" aria-hidden="true">
      <ellipse cx="84" cy="114" rx="54" ry="8" fill="#E2EEFE" />
      <path d="M36 110 C22 92, 24 68, 40 58 C44 76, 46 94, 44 110 Z" fill="#60A5FA" opacity="0.7" />
      <path d="M134 110 C144 96, 142 74, 128 66 C125 82, 124 96, 126 110 Z" fill="#34D399" opacity="0.7" />
      <circle cx="84" cy="64" r="42" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="4" />
      <circle cx="84" cy="64" r="34" fill="#FFFFFF" />
      <path d="M84 42 V64 L98 74" stroke="#1D4ED8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="84" cy="64" r="4" fill="#1D4ED8" />
    </svg>
  );
}

export function LoginLaptopIllustration() {
  return (
    <svg viewBox="0 0 260 170" className="w-52 h-36 mx-auto" fill="none" aria-hidden="true">
      <ellipse cx="138" cy="150" rx="92" ry="12" fill="#DCE8FA" />
      {/* Plant pot on left */}
      <path d="M40 120 C28 102, 32 82, 46 74 C48 92, 50 108, 48 120 Z" fill="#14B8A6" opacity="0.85" />
      <path d="M54 120 C62 106, 62 90, 52 80 C48 94, 48 108, 50 120 Z" fill="#0D9488" opacity="0.9" />
      <path d="M36 120 H60 L56 146 H40 Z" fill="#60A5FA" />
      {/* Laptop Screen */}
      <rect x="78" y="26" width="136" height="92" rx="12" fill="#1D63ED" />
      <rect x="86" y="34" width="120" height="76" rx="6" fill="#EFF6FF" />
      {/* Padlock inside screen */}
      <path d="M134 62 V54 C134 47.4 139.4 42 146 42 C152.6 42 158 47.4 158 54 V62" stroke="#1D63ED" strokeWidth="5" strokeLinecap="round" />
      <rect x="128" y="60" width="36" height="30" rx="6" fill="#1D63ED" />
      <circle cx="146" cy="73" r="3.5" fill="#FFFFFF" />
      <rect x="144.5" y="75" width="3" height="7" rx="1.5" fill="#FFFFFF" />
      {/* Laptop Base */}
      <path d="M62 122 H230 L218 136 H74 Z" fill="#93C5FD" />
      <rect x="128" y="122" width="36" height="4" rx="2" fill="#3B82F6" />
    </svg>
  );
}

export function SchoolBuildingBackdrop() {
  return (
    <svg viewBox="0 0 640 720" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="55%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#EFF6FF" />
        </linearGradient>
      </defs>
      <rect width="640" height="720" fill="url(#skyGrad)" />
      {/* Soft clouds */}
      <ellipse cx="140" cy="110" rx="90" ry="26" fill="#FFFFFF" opacity="0.7" />
      <ellipse cx="190" cy="100" rx="60" ry="22" fill="#FFFFFF" opacity="0.85" />
      <ellipse cx="420" cy="150" rx="100" ry="28" fill="#FFFFFF" opacity="0.65" />
      {/* Lawn & courtyard */}
      <rect y="500" width="640" height="220" fill="#E2E8F0" />
      <rect y="500" width="640" height="45" fill="#86EFAC" opacity="0.45" />
      {/* Main 2-story School Building */}
      <rect x="90" y="250" width="440" height="260" rx="6" fill="#F8FAFC" />
      <rect x="76" y="232" width="468" height="24" rx="4" fill="#1E40AF" />
      <rect x="90" y="370" width="440" height="16" fill="#2563EB" />
      {/* Center Entrance Porch */}
      <rect x="230" y="275" width="160" height="235" fill="#FFFFFF" />
      <rect x="220" y="256" width="180" height="20" fill="#1D4ED8" />
      {/* Upper Windows */}
      {[115, 165, 255, 305, 355, 420, 470].map((x) => (
        <rect key={`u-${x}`} x={x} y="286" width="32" height="58" rx="4" fill="#93C5FD" stroke="#1E40AF" strokeWidth="2" />
      ))}
      {/* Lower Windows */}
      {[115, 165, 420, 470].map((x) => (
        <rect key={`l-${x}`} x={x} y="410" width="32" height="62" rx="4" fill="#93C5FD" stroke="#1E40AF" strokeWidth="2" />
      ))}
      {/* Main Double Door */}
      <rect x="278" y="420" width="64" height="90" rx="4" fill="#1E3A8A" />
      <line x1="310" y1="420" x2="310" y2="510" stroke="#93C5FD" strokeWidth="2" />
      {/* Trees */}
      <rect x="44" y="420" width="16" height="90" fill="#78350F" />
      <circle cx="52" cy="390" r="46" fill="#22C55E" opacity="0.9" />
      <circle cx="76" cy="410" r="34" fill="#16A34A" opacity="0.9" />
      <rect x="556" y="435" width="14" height="75" fill="#78350F" />
      <circle cx="563" cy="410" r="40" fill="#22C55E" opacity="0.85" />
    </svg>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const displayLabel = status === 'Valid' ? 'Terverifikasi' : status;

  const styles: Record<string, { bg: string; text: string; Icon: React.ComponentType<{ className?: string }> }> = {
    'Belum Mendaftar': { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700', Icon: CircleDashed },
    'Belum Diunggah': { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600', Icon: CircleDashed },
    'Menunggu Verifikasi': { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', Icon: Clock },
    'Menunggu': { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', Icon: Clock },
    'Belum Diverifikasi': { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700', Icon: Clock },
    'Perlu Perbaikan': { bg: 'bg-amber-50 border-amber-300', text: 'text-amber-900', Icon: AlertCircle },
    'Perlu Diperbaiki': { bg: 'bg-amber-50 border-amber-300', text: 'text-amber-900', Icon: AlertCircle },
    'Sedang Seleksi': { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', Icon: FileSearch },
    'Valid': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', Icon: CheckCircle2 },
    'Terverifikasi': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', Icon: CheckCircle2 },
    'Diterima': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', Icon: CheckCircle2 },
    'Tidak Diterima': { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-800', Icon: XCircle }
  };

  const cfg = styles[status] || { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700', Icon: CircleDashed };
  const Icon = cfg.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap ${cfg.bg} ${cfg.text}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{displayLabel}</span>
    </span>
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger' | 'success';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const btnStyle =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : variant === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
      : 'bg-[#1D63ED] hover:bg-blue-700 text-white';

  const iconWrap =
    variant === 'danger'
      ? 'bg-rose-50 text-rose-600'
      : variant === 'success'
      ? 'bg-emerald-50 text-emerald-600'
      : 'bg-blue-50 text-[#1D63ED]';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-slate-200">
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconWrap}`}>
            {variant === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 ${btnStyle}`}
          >
            {loading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-20 lg:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 no-print"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-3.5 rounded-xl shadow-lg border bg-white ${
            t.type === 'success'
              ? 'border-emerald-200 text-emerald-900'
              : t.type === 'error'
              ? 'border-rose-200 text-rose-900'
              : 'border-blue-200 text-slate-900'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : t.type === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium flex-1 leading-snug">{t.text}</p>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function DocumentPreviewModal({
  doc,
  onClose
}: {
  doc: { id: number; nama_file_asli: string; mime_type: string } | null;
  onClose: () => void;
}) {
  if (!doc) return null;
  const viewUrl = `/api/dokumen/${doc.id}/file`;
  const downloadUrl = `/api/dokumen/${doc.id}/file?download=1`;
  const isPdf = doc.mime_type === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-200">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{doc.nama_file_asli}</h3>
            <p className="text-xs text-slate-500">Pratinjau Dokumen Terlindungi</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh</span>
            </a>
            <a
              href={viewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Tab Baru</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Tutup pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center min-h-[380px]">
          {isPdf ? (
            <iframe
              src={viewUrl}
              title={doc.nama_file_asli}
              className="w-full h-[68vh] rounded-lg border border-slate-200 bg-white"
            />
          ) : (
            <img
              src={viewUrl}
              alt={doc.nama_file_asli}
              className="max-w-full max-h-[68vh] object-contain rounded-lg shadow-sm bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}
