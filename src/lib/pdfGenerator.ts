import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type {
  CalonSiswa,
  FormulirPendaftaran,
  HasilSeleksiSiswa,
  PendaftarRow,
  SchoolConfig
} from '../types';
import { formatTanggalIndonesia } from './api';

export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 220,
    margin: 1,
    color: { dark: '#0F172A', light: '#FFFFFF' }
  });
}

export async function downloadBuktiPendaftaranPdf(params: {
  config: SchoolConfig;
  siswa: CalonSiswa;
  formulir: FormulirPendaftaran;
}) {
  const { config, siswa, formulir } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Header Banner
  doc.setFillColor(29, 99, 237);
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(config.nama_sekolah.toUpperCase(), 18, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`${config.alamat_sekolah} | Telp: ${config.telepon}`, 18, 22);
  doc.text(`Email: ${config.email_sekolah} | Tahun Ajaran ${config.tahun_ajaran}`, 18, 27.5);

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('BUKTI PENDAFTARAN SPMB ONLINE', pageWidth / 2, 48, { align: 'center' });

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(18, 53, pageWidth - 18, 53);

  // Registration Number Highlight Box
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(18, 59, pageWidth - 36, 22, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text('NOMOR PENDAFTARAN', 24, 67);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(29, 78, 216);
  doc.text(siswa.nomor_pendaftaran || '-', 24, 75);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text('STATUS PENDAFTARAN', pageWidth - 76, 67);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(siswa.status_pendaftaran, pageWidth - 76, 75);

  // Student Details Table
  const rows: Array<[string, string]> = [
    ['Nama Calon Siswa', formulir.nama_lengkap || '-'],
    ['NIK', formulir.nik || '-'],
    ['NISN', formulir.nisn || '-'],
    ['Tempat, Tanggal Lahir', `${formulir.tempat_lahir || '-'}, ${formatTanggalIndonesia(formulir.tanggal_lahir)}`],
    ['Jenis Kelamin', formulir.jenis_kelamin || '-'],
    ['Asal Sekolah', formulir.nama_sekolah_asal || '-'],
    ['NPSN Sekolah Asal', formulir.npsn_sekolah || '-'],
    ['Nomor HP', formulir.nomor_hp || '-'],
    ['Tanggal Pendaftaran', formatTanggalIndonesia(siswa.tanggal_pendaftaran)],
    ['Jadwal Pengumuman', config.tanggal_pengumuman]
  ];

  let y = 92;
  doc.setFontSize(10.5);
  for (const [label, val] of rows) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(label, 20, y);
    doc.text(':', 72, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const wrapped = doc.splitTextToSize(val, 105);
    doc.text(wrapped, 76, y);
    y += Math.max(8.5, wrapped.length * 5.5 + 2.5);
    doc.setDrawColor(241, 245, 249);
    doc.line(20, y - 3, pageWidth - 20, y - 3);
  }

  // QR Verification Box
  const qrPayload = `SPMB|${siswa.nomor_pendaftaran || ''}|${formulir.nisn}|${formulir.nama_lengkap}|${siswa.status_pendaftaran}`;
  const qrDataUrl = await generateQrDataUrl(qrPayload);
  doc.addImage(qrDataUrl, 'PNG', 20, y + 6, 32, 32);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Kode Verifikasi Digital', 58, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Simpan bukti pendaftaran ini sebagai tanda bukti sah keikutsertaan', 58, y + 20);
  doc.text('seleksi SPMB Online. Pantau status verifikasi melalui dashboard siswa.', 58, y + 25.5);
  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 58, y + 33);

  doc.save(`Bukti_Pendaftaran_${siswa.nomor_pendaftaran || 'SPMB'}.pdf`);
}

export async function downloadHasilSeleksiPdf(params: {
  config: SchoolConfig;
  siswa: CalonSiswa;
  formulir: FormulirPendaftaran;
  hasil: HasilSeleksiSiswa;
}) {
  const { config, siswa, formulir, hasil } = params;
  if (!hasil.dipublikasikan) {
    throw new Error('Hasil seleksi belum dipublikasikan oleh panitia.');
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Kop Surat Sekolah
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`PANITIA PENERIMAAN MURID BARU (SPMB)`, pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(16);
  doc.setTextColor(29, 78, 216);
  doc.text(config.nama_sekolah.toUpperCase(), pageWidth / 2, 25, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(config.alamat_sekolah, pageWidth / 2, 31, { align: 'center' });
  doc.text(`Telp: ${config.telepon} · Email: ${config.email_sekolah}`, pageWidth / 2, 36, { align: 'center' });

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.line(18, 41, pageWidth - 18, 41);
  doc.setLineWidth(0.25);
  doc.line(18, 42.5, pageWidth - 18, 42.5);

  // Title & Nomor Surat
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text('SURAT KETERANGAN HASIL SELEKSI SPMB', pageWidth / 2, 54, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(`Nomor: ${hasil.nomor_surat || '-'}`, pageWidth / 2, 60.5, { align: 'center' });

  // Intro
  doc.setFontSize(10.5);
  const intro = `Berdasarkan hasil verifikasi administrasi dan rapat penetapan Panitia Sistem Penerimaan Murid Baru (SPMB) ${config.nama_sekolah} Tahun Ajaran ${config.tahun_ajaran}, dengan ini menerangkan bahwa:`;
  const introLines = doc.splitTextToSize(intro, pageWidth - 36);
  doc.text(introLines, 18, 72);

  // Student Identity
  let y = 92;
  const identity: Array<[string, string]> = [
    ['Nomor Pendaftaran', siswa.nomor_pendaftaran || '-'],
    ['Tanggal Pendaftaran', formatTanggalIndonesia(siswa.tanggal_pendaftaran)],
    ['Nama Lengkap', formulir.nama_lengkap || '-'],
    ['NISN / NIK', `${formulir.nisn || '-'} / ${formulir.nik || '-'}`],
    ['Tempat, Tanggal Lahir', `${formulir.tempat_lahir || '-'}, ${formatTanggalIndonesia(formulir.tanggal_lahir)}`],
    ['Asal Sekolah', formulir.nama_sekolah_asal || '-']
  ];

  for (const [k, v] of identity) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(k, 24, y);
    doc.text(':', 72, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(v, 76, y);
    y += 8;
  }

  // Decision Box
  y += 6;
  const isAccepted = hasil.status_seleksi === 'Diterima';
  if (isAccepted) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
  } else {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
  }
  doc.setLineWidth(0.6);
  doc.roundedRect(18, y, pageWidth - 36, 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text('DINYATAKAN:', pageWidth / 2, y + 8.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  if (isAccepted) {
    doc.setTextColor(4, 120, 87);
  } else {
    doc.setTextColor(185, 28, 28);
  }
  doc.text(hasil.status_seleksi.toUpperCase(), pageWidth / 2, y + 18.5, { align: 'center' });

  y += 35;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);

  if (hasil.catatan_seleksi) {
    const noteLines = doc.splitTextToSize(`Catatan Panitia: ${hasil.catatan_seleksi}`, pageWidth - 36);
    doc.text(noteLines, 18, y);
    y += noteLines.length * 5.5 + 6;
  }

  const closing = isAccepted
    ? `Calon murid yang dinyatakan DITERIMA diwajibkan melakukan daftar ulang sesuai jadwal yang ditetapkan oleh pihak sekolah dengan membawa dokumen asli.`
    : `Terima kasih atas partisipasi Anda dalam seleksi SPMB ${config.nama_sekolah}. Tetap semangat dalam menempuh pendidikan selanjutnya.`;
  const closingLines = doc.splitTextToSize(closing, pageWidth - 36);
  doc.text(closingLines, 18, y);
  y += closingLines.length * 5.5 + 12;

  // QR & Principal Signature
  const qrPayload = `SK-SPMB|${hasil.nomor_surat || ''}|${siswa.nomor_pendaftaran || ''}|${hasil.status_seleksi}`;
  const qrDataUrl = await generateQrDataUrl(qrPayload);
  doc.addImage(qrDataUrl, 'PNG', 20, y + 4, 28, 28);
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Verifikasi QR Resmi', 20, y + 37);

  const signX = pageWidth - 82;
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Ditetapkan pada: ${config.tanggal_pengumuman}`, signX, y + 4);
  doc.text('Kepala Sekolah,', signX, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.text(config.nama_kepala_sekolah, signX, y + 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`NIP. ${config.nip_kepala_sekolah}`, signX, y + 39.5);

  doc.save(`Surat_Hasil_Seleksi_${siswa.nomor_pendaftaran || 'SPMB'}.pdf`);
}

export function downloadLaporanPdf(config: SchoolConfig, rows: PendaftarRow[], filterStatus: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`LAPORAN DATA PENDAFTAR SPMB ONLINE — ${config.nama_sekolah}`, 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Tahun Ajaran: ${config.tahun_ajaran} | Filter Status: ${filterStatus} | Total Data: ${rows.length} | Dicetak: ${new Date().toLocaleString('id-ID')}`,
    14,
    22
  );

  let y = 32;
  const cols = [
    { label: 'No', x: 14, w: 10 },
    { label: 'No. Pendaftaran', x: 24, w: 36 },
    { label: 'Nama Calon Siswa', x: 60, w: 54 },
    { label: 'NISN', x: 114, w: 28 },
    { label: 'Asal Sekolah', x: 142, w: 58 },
    { label: 'Tanggal Daftar', x: 200, w: 38 },
    { label: 'Status', x: 238, w: 45 }
  ];

  const drawHeader = (posY: number) => {
    doc.setFillColor(29, 99, 237);
    doc.rect(14, posY - 5, pageWidth - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    for (const col of cols) {
      doc.text(col.label, col.x + 1.5, posY);
    }
  };

  drawHeader(y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  rows.forEach((row, index) => {
    if (y > 192) {
      doc.addPage();
      y = 20;
      drawHeader(y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
    }
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4.5, pageWidth - 28, 7, 'F');
    }
    doc.setTextColor(15, 23, 42);
    doc.text(String(index + 1), cols[0].x + 1.5, y);
    doc.text(row.nomor_pendaftaran || '-', cols[1].x + 1.5, y);
    doc.text((row.nama_lengkap || '-').slice(0, 28), cols[2].x + 1.5, y);
    doc.text(row.nisn || '-', cols[3].x + 1.5, y);
    doc.text((row.nama_sekolah_asal || '-').slice(0, 30), cols[4].x + 1.5, y);
    doc.text(formatTanggalIndonesia(row.tanggal_pendaftaran), cols[5].x + 1.5, y);
    doc.text(row.status_pendaftaran, cols[6].x + 1.5, y);
    y += 7;
  });

  doc.save(`Laporan_SPMB_${new Date().toISOString().slice(0, 10)}.pdf`);
}
