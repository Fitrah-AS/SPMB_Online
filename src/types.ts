export type UserRole = 'calon_siswa' | 'admin';

export type StatusPendaftaran =
  | 'Belum Mendaftar'
  | 'Menunggu Verifikasi'
  | 'Perlu Perbaikan'
  | 'Sedang Seleksi'
  | 'Diterima'
  | 'Tidak Diterima';

export type VerifikasiFormulirStatus = 'Belum Diverifikasi' | 'Valid' | 'Perlu Perbaikan';
export type VerifikasiDokumenStatus = 'Menunggu Verifikasi' | 'Valid' | 'Perlu Perbaikan';
export type JenisDokumen =
  | 'kartu_keluarga'
  | 'akta_kelahiran'
  | 'ijazah_skl'
  | 'pas_foto'  
  | 'dokumen_pendukung';

export interface User {
  id: number;
  nama_lengkap: string;
  username: string | null;
  email: string;
  nomor_hp: string;
  role: UserRole;
}

export interface AlurStep {
  step: number;
  judul: string;
  deskripsi: string;
}

export interface FaqItem {
  tanya: string;
  jawab: string;
}

export interface SchoolConfig {
  nama_sekolah: string;
  jenjang: string;
  tahun_ajaran: string;
  alamat_sekolah: string;
  telepon: string;
  email_sekolah: string;
  website: string;
  jam_layanan: string;
  jadwal_pendaftaran: string;
  tanggal_pengumuman: string;
  nama_kepala_sekolah: string;
  nip_kepala_sekolah: string;
  has_custom_logo: boolean;
  logo_url: string | null;
  persyaratan: string[];
  alur: AlurStep[];
  faq: FaqItem[];
}

export interface PengumumanItem {
  id: number;
  judul: string;
  isi: string;
  tipe: 'umum' | 'seleksi' | 'jadwal';
  dipublikasikan: number;
  tanggal_publikasi: string;
}

export interface CalonSiswa {
  id: number;
  user_id: number;
  nomor_pendaftaran: string | null;
  status_pendaftaran: StatusPendaftaran;
  tanggal_pendaftaran: string | null;
  catatan_perbaikan: string | null;
  updated_at: string;
}

export interface FormulirPendaftaran {
  id: number;
  calon_siswa_id: number;
  nama_lengkap: string;
  nik: string;
  nisn: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  agama: string;
  alamat_lengkap: string;
  nomor_hp: string;
  nama_ayah: string;
  nama_ibu: string;
  nama_wali: string;
  pekerjaan_ortu: string;
  nomor_hp_ortu: string;
  alamat_ortu: string;
  nama_sekolah_asal: string;
  npsn_sekolah: string;
  tahun_lulus: string;
  alamat_sekolah: string;
  persetujuan_data: number;
  verifikasi_formulir: VerifikasiFormulirStatus;
  catatan_formulir: string | null;
  submitted_at: string | null;
  updated_at: string;
}

export interface DokumenPendaftaran {
  id: number;
  calon_siswa_id: number;
  jenis_dokumen: JenisDokumen;
  nama_file_asli: string;
  mime_type: string;
  ukuran_file: number;
  status_verifikasi: VerifikasiDokumenStatus;
  catatan: string | null;
  uploaded_at: string;
}

export interface HasilSeleksiSiswa {
  dipublikasikan: boolean;
  status_seleksi: 'Belum Dipublikasikan' | 'Menunggu' | 'Diterima' | 'Tidak Diterima';
  nomor_surat: string | null;
  catatan_seleksi: string | null;
  tanggal_keputusan: string | null;
}

export interface SiswaDashboardBundle {
  calon_siswa: CalonSiswa;
  formulir: FormulirPendaftaran;
  dokumen: DokumenPendaftaran[];
  hasil_seleksi: HasilSeleksiSiswa;
  announcements: PengumumanItem[];
  config: SchoolConfig;
}

export interface AdminStats {
  total_pendaftar: number;
  menunggu_verifikasi: number;
  perlu_perbaikan: number;
  sedang_seleksi: number;
  diterima: number;
  tidak_diterima: number;
  belum_mendaftar: number;
}

export interface PendaftarRow {
  id: number;
  user_id: number;
  nomor_pendaftaran: string | null;
  status_pendaftaran: StatusPendaftaran;
  tanggal_pendaftaran: string | null;
  catatan_perbaikan: string | null;
  nama_lengkap: string;
  email: string;
  nomor_hp: string;
  nik: string;
  nisn: string;
  jenis_kelamin: string;
  nama_sekolah_asal: string;
  tahun_lulus: string;
  verifikasi_formulir: VerifikasiFormulirStatus;
  catatan_formulir: string | null;
  status_seleksi: 'Menunggu' | 'Diterima' | 'Tidak Diterima';
  nomor_surat: string | null;
  catatan_seleksi: string | null;
  dipublikasikan: number;
  tanggal_keputusan: string | null;
  jumlah_dokumen: number;
  dokumen_valid: number;
  dokumen_revisi: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}
