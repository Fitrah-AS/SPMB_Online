import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase, DOKUMEN_DIR, LOGO_DIR } from './server/db.ts';
import {
  requireAuth,
  requireRole,
  signAuthToken,
  type AuthRequest
} from './server/auth.ts';

initDatabase();

function resolveServerPort(): number {
  const portFlagIdx = process.argv.indexOf('--port');
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const parsed = Number(process.argv[portFlagIdx + 1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const envPort = process.env.PORT ? Number(process.env.PORT) : NaN;
  const nginxPort = process.env.NGINX_PORT ? Number(process.env.NGINX_PORT) : NaN;
  if (Number.isFinite(envPort) && envPort > 0 && envPort !== nginxPort) {
    return envPort;
  }
  const defaultAppPort = process.env.DEFAULT_APP_PORT ? Number(process.env.DEFAULT_APP_PORT) : NaN;
  if (Number.isFinite(defaultAppPort) && defaultAppPort > 0) {
    return defaultAppPort;
  }
  return 3000;
}

const app = express();
const PORT = resolveServerPort();

app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

const ALLOWED_DOC_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_LOGO_MIMES = new Set(['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']);
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

const docUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, DOKUMEN_DIR),
    filename: (req, file, cb) => {
      const authReq = req as AuthRequest;
      const ext = path.extname(file.originalname).toLowerCase() || '.bin';
      const safeExt = ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.bin';
      cb(null, `user_${authReq.user?.id || 'x'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${safeExt}`);
    }
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_DOC_MIMES.has(file.mimetype)) {
      cb(new Error('Format file harus PDF, JPG, atau PNG.'));
      return;
    }
    cb(null, true);
  }
});

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, LOGO_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `school_logo_${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_LOGO_MIMES.has(file.mimetype)) {
      cb(new Error('Format logo harus PNG, JPG, WEBP, atau SVG.'));
      return;
    }
    cb(null, true);
  }
});

function getSchoolConfig() {
  const row = db.prepare('SELECT * FROM konfigurasi_sekolah WHERE id = 1').get() as Record<string, unknown>;
  return {
    nama_sekolah: String(row.nama_sekolah || ''),
    jenjang: String(row.jenjang || ''),
    tahun_ajaran: String(row.tahun_ajaran || ''),
    alamat_sekolah: String(row.alamat_sekolah || ''),
    telepon: String(row.telepon || ''),
    email_sekolah: String(row.email_sekolah || ''),
    website: String(row.website || ''),
    jam_layanan: String(row.jam_layanan || ''),
    jadwal_pendaftaran: String(row.jadwal_pendaftaran || ''),
    tanggal_pengumuman: String(row.tanggal_pengumuman || ''),
    nama_kepala_sekolah: String(row.nama_kepala_sekolah || ''),
    nip_kepala_sekolah: String(row.nip_kepala_sekolah || ''),
    has_custom_logo: Boolean(row.logo_path),
    logo_url: row.logo_path ? `/api/config/logo?v=${encodeURIComponent(String(row.logo_path))}` : null,
    persyaratan: JSON.parse(String(row.persyaratan_json || '[]')),
    alur: JSON.parse(String(row.alur_json || '[]')),
    faq: JSON.parse(String(row.faq_json || '[]'))
  };
}

function generateNomorPendaftaran(): string {
  const year = new Date().getFullYear();
  const row = db.prepare(
    "SELECT COUNT(*) as total FROM calon_siswa WHERE nomor_pendaftaran IS NOT NULL"
  ).get() as { total: number };
  let seq = Number(row.total) + 1;
  while (true) {
    const candidate = `SPMB-${year}-${String(seq).padStart(4, '0')}`;
    const exists = db.prepare('SELECT id FROM calon_siswa WHERE nomor_pendaftaran = ?').get(candidate);
    if (!exists) return candidate;
    seq += 1;
  }
}

function generateNomorSurat(siswaId: number): string {
  const year = new Date().getFullYear();
  return `421.3/${String(100 + siswaId).padStart(3, '0')}/SPMB/${year}`;
}

// ==========================================
// PUBLIC ROUTES
// ==========================================
app.get('/api/public/config', (_req, res) => {
  const config = getSchoolConfig();
  const announcements = db.prepare(`
    SELECT id, judul, isi, tipe, tanggal_publikasi
    FROM pengumuman
    WHERE dipublikasikan = 1
    ORDER BY tanggal_publikasi DESC, id DESC
  `).all();
  res.json({ config, announcements });
});

app.get('/api/config/logo', (_req, res) => {
  const row = db.prepare('SELECT logo_path FROM konfigurasi_sekolah WHERE id = 1').get() as { logo_path: string | null } | undefined;
  if (!row?.logo_path) {
    res.status(404).json({ error: 'Logo belum dikonfigurasi.' });
    return;
  }
  const safePath = path.join(LOGO_DIR, path.basename(row.logo_path));
  if (!fs.existsSync(safePath)) {
    res.status(404).json({ error: 'File logo tidak ditemukan.' });
    return;
  }
  res.sendFile(safePath);
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
app.post('/api/auth/register', (req, res) => {
  const { nama_lengkap, email, nomor_hp, password, konfirmasi_password } = req.body || {};

  if (!nama_lengkap || String(nama_lengkap).trim().length < 3) {
    res.status(400).json({ error: 'Nama lengkap minimal 3 karakter.' });
    return;
  }
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    res.status(400).json({ error: 'Format alamat email tidak valid.' });
    return;
  }
  const cleanHp = String(nomor_hp || '').replace(/\s+/g, '');
  if (!/^[0-9+]{10,15}$/.test(cleanHp)) {
    res.status(400).json({ error: 'Nomor HP harus terdiri dari 10 hingga 15 digit angka.' });
    return;
  }
  if (!password || String(password).length < 6) {
    res.status(400).json({ error: 'Password minimal terdiri dari 6 karakter.' });
    return;
  }
  if (password !== konfirmasi_password) {
    res.status(400).json({ error: 'Konfirmasi password tidak cocok.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    res.status(409).json({ error: 'Email tersebut sudah terdaftar. Silakan login.' });
    return;
  }

  const passwordHash = bcrypt.hashSync(String(password), 10);
  const baseUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '') || 'siswa';
  const username = `${baseUsername}_${Date.now().toString().slice(-4)}`;

  try {
    db.exec('BEGIN');
    const userResult = db.prepare(`
      INSERT INTO users (nama_lengkap, username, email, nomor_hp, password_hash, role)
      VALUES (?, ?, ?, ?, ?, 'calon_siswa')
    `).run(String(nama_lengkap).trim(), username, cleanEmail, cleanHp, passwordHash);

    const userId = Number(userResult.lastInsertRowid);
    const siswaResult = db.prepare(`
      INSERT INTO calon_siswa (user_id, status_pendaftaran)
      VALUES (?, 'Belum Mendaftar')
    `).run(userId);
    const siswaId = Number(siswaResult.lastInsertRowid);

    db.prepare(`
      INSERT INTO formulir_pendaftaran (calon_siswa_id, nama_lengkap, nomor_hp)
      VALUES (?, ?, ?)
    `).run(siswaId, String(nama_lengkap).trim(), cleanHp);

    db.prepare(`
      INSERT INTO hasil_seleksi (calon_siswa_id, status_seleksi, dipublikasikan)
      VALUES (?, 'Menunggu', 0)
    `).run(siswaId);

    db.exec('COMMIT');

    const token = signAuthToken({ id: userId, role: 'calon_siswa', email: cleanEmail });
    res.cookie('spmb_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: 'Registrasi akun berhasil. Selamat datang di SPMB Online!',
      token,
      user: {
        id: userId,
        nama_lengkap: String(nama_lengkap).trim(),
        username,
        email: cleanEmail,
        nomor_hp: cleanHp,
        role: 'calon_siswa'
      }
    });
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Register error:', err);
    res.status(500).json({ error: 'Gagal memproses registrasi akun.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { identifier, password, role: requestedRole } = req.body || {};
  const cleanId = String(identifier || '').trim().toLowerCase();

  if (!cleanId || !password) {
    res.status(400).json({ error: 'Email/username dan password wajib diisi.' });
    return;
  }

  const user = db.prepare(`
    SELECT id, nama_lengkap, username, email, nomor_hp, password_hash, role
    FROM users
    WHERE LOWER(email) = ? OR LOWER(username) = ?
  `).get(cleanId, cleanId) as {
    id: number;
    nama_lengkap: string;
    username: string | null;
    email: string;
    nomor_hp: string;
    password_hash: string;
    role: 'calon_siswa' | 'admin';
  } | undefined;

  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    res.status(401).json({ error: 'Email/username atau password salah.' });
    return;
  }

  if (requestedRole && user.role !== requestedRole) {
    res.status(403).json({
      error: requestedRole === 'admin'
        ? 'Akun ini bukan akun Admin. Silakan masuk melalui tab Login Calon Siswa.'
        : 'Akun ini adalah akun Admin. Silakan masuk melalui tab Login Admin.'
    });
    return;
  }

  const token = signAuthToken({ id: user.id, role: user.role, email: user.email });
  res.cookie('spmb_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    message: 'Login berhasil.',
    token,
    user: {
      id: user.id,
      nama_lengkap: user.nama_lengkap,
      username: user.username,
      email: user.email,
      nomor_hp: user.nomor_hp,
      role: user.role
    }
  });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('spmb_token');
  res.json({ message: 'Anda telah keluar dari sistem.' });
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

// ==========================================
// CALON SISWA ROUTES
// ==========================================
function getSiswaBundle(userId: number) {
  const siswa = db.prepare('SELECT * FROM calon_siswa WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  if (!siswa) return null;
  const siswaId = Number(siswa.id);

  const formulir = db.prepare('SELECT * FROM formulir_pendaftaran WHERE calon_siswa_id = ?').get(siswaId) as Record<string, unknown> | undefined;
  const dokumen = db.prepare(`
    SELECT id, calon_siswa_id, jenis_dokumen, nama_file_asli, mime_type, ukuran_file, status_verifikasi, catatan, uploaded_at
    FROM dokumen_pendaftaran
    WHERE calon_siswa_id = ?
    ORDER BY id ASC
  `).all(siswaId);

  const rawHasil = db.prepare('SELECT * FROM hasil_seleksi WHERE calon_siswa_id = ?').get(siswaId) as Record<string, unknown> | undefined;
  const isPublished = rawHasil && Number(rawHasil.dipublikasikan) === 1;

  // Strictly hide unpublished selection outcome from student
  const safeStatusPendaftaran =
    !isPublished && (siswa.status_pendaftaran === 'Diterima' || siswa.status_pendaftaran === 'Tidak Diterima')
      ? 'Sedang Seleksi'
      : siswa.status_pendaftaran;

  const hasil_seleksi = isPublished
    ? {
        dipublikasikan: true,
        status_seleksi: rawHasil.status_seleksi,
        nomor_surat: rawHasil.nomor_surat,
        catatan_seleksi: rawHasil.catatan_seleksi,
        tanggal_keputusan: rawHasil.tanggal_keputusan
      }
    : {
        dipublikasikan: false,
        status_seleksi: 'Belum Dipublikasikan',
        nomor_surat: null,
        catatan_seleksi: null,
        tanggal_keputusan: null
      };

  const announcements = db.prepare(`
    SELECT id, judul, isi, tipe, tanggal_publikasi
    FROM pengumuman
    WHERE dipublikasikan = 1
    ORDER BY tanggal_publikasi DESC, id DESC
  `).all();

  return {
    calon_siswa: {
      ...siswa,
      status_pendaftaran: safeStatusPendaftaran
    },
    formulir,
    dokumen,
    hasil_seleksi,
    announcements,
    config: getSchoolConfig()
  };
}

app.get('/api/siswa/dashboard', requireAuth, requireRole('calon_siswa'), (req: AuthRequest, res) => {
  const bundle = getSiswaBundle(req.user!.id);
  if (!bundle) {
    res.status(404).json({ error: 'Data calon siswa tidak ditemukan.' });
    return;
  }
  res.json(bundle);
});

app.put('/api/siswa/profil', requireAuth, requireRole('calon_siswa'), (req: AuthRequest, res) => {
  const { nama_lengkap, nomor_hp, password_lama, password_baru, konfirmasi_password_baru } = req.body || {};

  if (!nama_lengkap || String(nama_lengkap).trim().length < 3) {
    res.status(400).json({ error: 'Nama lengkap minimal 3 karakter.' });
    return;
  }
  const cleanHp = String(nomor_hp || '').replace(/\s+/g, '');
  if (!/^[0-9+]{10,15}$/.test(cleanHp)) {
    res.status(400).json({ error: 'Nomor HP harus 10 hingga 15 digit angka.' });
    return;
  }

  if (password_baru) {
    if (!password_lama) {
      res.status(400).json({ error: 'Masukkan password lama untuk mengubah password.' });
      return;
    }
    const uRow = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as { password_hash: string };
    if (!bcrypt.compareSync(String(password_lama), uRow.password_hash)) {
      res.status(400).json({ error: 'Password lama tidak sesuai.' });
      return;
    }
    if (String(password_baru).length < 6) {
      res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
      return;
    }
    if (password_baru !== konfirmasi_password_baru) {
      res.status(400).json({ error: 'Konfirmasi password baru tidak cocok.' });
      return;
    }
    const newHash = bcrypt.hashSync(String(password_baru), 10);
    db.prepare('UPDATE users SET nama_lengkap = ?, nomor_hp = ?, password_hash = ? WHERE id = ?')
      .run(String(nama_lengkap).trim(), cleanHp, newHash, req.user!.id);
  } else {
    db.prepare('UPDATE users SET nama_lengkap = ?, nomor_hp = ? WHERE id = ?')
      .run(String(nama_lengkap).trim(), cleanHp, req.user!.id);
  }

  const updated = db.prepare('SELECT id, nama_lengkap, username, email, nomor_hp, role FROM users WHERE id = ?').get(req.user!.id);
  res.json({ message: 'Profil berhasil diperbarui.', user: updated });
});

app.put('/api/siswa/formulir/draft', requireAuth, requireRole('calon_siswa'), (req: AuthRequest, res) => {
  const siswa = db.prepare('SELECT id FROM calon_siswa WHERE user_id = ?').get(req.user!.id) as { id: number } | undefined;
  if (!siswa) {
    res.status(404).json({ error: 'Data calon siswa tidak ditemukan.' });
    return;
  }

  const d = req.body || {};
  db.prepare(`
    UPDATE formulir_pendaftaran SET
      nama_lengkap = COALESCE(?, nama_lengkap),
      nik = COALESCE(?, nik),
      nisn = COALESCE(?, nisn),
      tempat_lahir = COALESCE(?, tempat_lahir),
      tanggal_lahir = COALESCE(?, tanggal_lahir),
      jenis_kelamin = COALESCE(?, jenis_kelamin),
      agama = COALESCE(?, agama),
      alamat_lengkap = COALESCE(?, alamat_lengkap),
      nomor_hp = COALESCE(?, nomor_hp),
      nama_ayah = COALESCE(?, nama_ayah),
      nama_ibu = COALESCE(?, nama_ibu),
      nama_wali = COALESCE(?, nama_wali),
      pekerjaan_ortu = COALESCE(?, pekerjaan_ortu),
      nomor_hp_ortu = COALESCE(?, nomor_hp_ortu),
      alamat_ortu = COALESCE(?, alamat_ortu),
      nama_sekolah_asal = COALESCE(?, nama_sekolah_asal),
      npsn_sekolah = COALESCE(?, npsn_sekolah),
      tahun_lulus = COALESCE(?, tahun_lulus),
      alamat_sekolah = COALESCE(?, alamat_sekolah),
      persetujuan_data = COALESCE(?, persetujuan_data),
      updated_at = datetime('now')
    WHERE calon_siswa_id = ?
  `).run(
    d.nama_lengkap ?? null,
    d.nik ?? null,
    d.nisn ?? null,
    d.tempat_lahir ?? null,
    d.tanggal_lahir ?? null,
    d.jenis_kelamin ?? null,
    d.agama ?? null,
    d.alamat_lengkap ?? null,
    d.nomor_hp ?? null,
    d.nama_ayah ?? null,
    d.nama_ibu ?? null,
    d.nama_wali ?? null,
    d.pekerjaan_ortu ?? null,
    d.nomor_hp_ortu ?? null,
    d.alamat_ortu ?? null,
    d.nama_sekolah_asal ?? null,
    d.npsn_sekolah ?? null,
    d.tahun_lulus ?? null,
    d.alamat_sekolah ?? null,
    typeof d.persetujuan_data === 'boolean' ? (d.persetujuan_data ? 1 : 0) : null,
    siswa.id
  );

  const formulir = db.prepare('SELECT * FROM formulir_pendaftaran WHERE calon_siswa_id = ?').get(siswa.id);
  res.json({ message: 'Draft formulir tersimpan.', formulir });
});

app.post('/api/siswa/formulir/submit', requireAuth, requireRole('calon_siswa'), (req: AuthRequest, res) => {
  const siswa = db.prepare('SELECT * FROM calon_siswa WHERE user_id = ?').get(req.user!.id) as {
    id: number;
    nomor_pendaftaran: string | null;
    tanggal_pendaftaran: string | null;
    status_pendaftaran: string;
  } | undefined;

  if (!siswa) {
    res.status(404).json({ error: 'Data calon siswa tidak ditemukan.' });
    return;
  }

  const d = req.body || {};

  // Server-side validation of all required registration fields
  const requiredFields: Array<[string, string]> = [
    ['nama_lengkap', 'Nama lengkap'],
    ['nik', 'NIK'],
    ['nisn', 'NISN'],
    ['tempat_lahir', 'Tempat lahir'],
    ['tanggal_lahir', 'Tanggal lahir'],
    ['jenis_kelamin', 'Jenis kelamin'],
    ['agama', 'Agama'],
    ['alamat_lengkap', 'Alamat lengkap'],
    ['nomor_hp', 'Nomor HP'],
    ['nama_ayah', 'Nama ayah'],
    ['nama_ibu', 'Nama ibu'],
    ['pekerjaan_ortu', 'Pekerjaan orang tua'],
    ['nomor_hp_ortu', 'Nomor HP orang tua'],
    ['alamat_ortu', 'Alamat orang tua'],
    ['nama_sekolah_asal', 'Nama sekolah asal'],
    ['npsn_sekolah', 'NPSN sekolah'],
    ['tahun_lulus', 'Tahun lulus'],
    ['alamat_sekolah', 'Alamat sekolah']
  ];

  for (const [key, label] of requiredFields) {
    if (!d[key] || String(d[key]).trim() === '') {
      res.status(400).json({ error: `${label} wajib diisi.` });
      return;
    }
  }

  if (!/^\d{16}$/.test(String(d.nik).trim())) {
    res.status(400).json({ error: 'NIK harus terdiri dari tepat 16 digit angka.' });
    return;
  }
  if (!/^\d{10}$/.test(String(d.nisn).trim())) {
    res.status(400).json({ error: 'NISN harus terdiri dari tepat 10 digit angka.' });
    return;
  }
  if (!/^\d{8}$/.test(String(d.npsn_sekolah).trim())) {
    res.status(400).json({ error: 'NPSN sekolah harus terdiri dari 8 digit angka.' });
    return;
  }
  if (!d.persetujuan_data) {
    res.status(400).json({ error: 'Anda harus menyetujui pernyataan kebenaran data.' });
    return;
  }

  const uploadedDocs = db.prepare(
    'SELECT jenis_dokumen FROM dokumen_pendaftaran WHERE calon_siswa_id = ?'
  ).all(siswa.id) as Array<{ jenis_dokumen: string }>;
  const uploadedTypes = new Set(uploadedDocs.map((item) => item.jenis_dokumen));
  const mandatoryDocs = [
    ['kartu_keluarga', 'Kartu Keluarga'],
    ['akta_kelahiran', 'Akta Kelahiran'],
    ['ijazah_skl', 'Ijazah atau SKL'],
    ['pas_foto', 'Pas Foto']
  ];
  for (const [docKey, docLabel] of mandatoryDocs) {
    if (!uploadedTypes.has(docKey)) {
      res.status(400).json({ error: `Dokumen wajib "${docLabel}" belum diunggah.` });
      return;
    }
  }

  const nomorPendaftaran = siswa.nomor_pendaftaran || generateNomorPendaftaran();
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const tanggalDaftar = siswa.tanggal_pendaftaran || nowStr;

  try {
    db.exec('BEGIN');
    db.prepare(`
      UPDATE formulir_pendaftaran SET
        nama_lengkap = ?, nik = ?, nisn = ?, tempat_lahir = ?, tanggal_lahir = ?,
        jenis_kelamin = ?, agama = ?, alamat_lengkap = ?, nomor_hp = ?,
        nama_ayah = ?, nama_ibu = ?, nama_wali = ?, pekerjaan_ortu = ?, nomor_hp_ortu = ?, alamat_ortu = ?,
        nama_sekolah_asal = ?, npsn_sekolah = ?, tahun_lulus = ?, alamat_sekolah = ?,
        persetujuan_data = 1,
        verifikasi_formulir = CASE WHEN verifikasi_formulir = 'Perlu Perbaikan' THEN 'Belum Diverifikasi' ELSE verifikasi_formulir END,
        submitted_at = COALESCE(submitted_at, ?),
        updated_at = datetime('now')
      WHERE calon_siswa_id = ?
    `).run(
      String(d.nama_lengkap).trim(),
      String(d.nik).trim(),
      String(d.nisn).trim(),
      String(d.tempat_lahir).trim(),
      String(d.tanggal_lahir).trim(),
      String(d.jenis_kelamin).trim(),
      String(d.agama).trim(),
      String(d.alamat_lengkap).trim(),
      String(d.nomor_hp).trim(),
      String(d.nama_ayah).trim(),
      String(d.nama_ibu).trim(),
      String(d.nama_wali || '').trim(),
      String(d.pekerjaan_ortu).trim(),
      String(d.nomor_hp_ortu).trim(),
      String(d.alamat_ortu).trim(),
      String(d.nama_sekolah_asal).trim(),
      String(d.npsn_sekolah).trim(),
      String(d.tahun_lulus).trim(),
      String(d.alamat_sekolah).trim(),
      nowStr,
      siswa.id
    );

    db.prepare(`
      UPDATE calon_siswa SET
        nomor_pendaftaran = ?,
        tanggal_pendaftaran = ?,
        status_pendaftaran = 'Menunggu Verifikasi',
        catatan_perbaikan = NULL,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(nomorPendaftaran, tanggalDaftar, siswa.id);

    db.prepare('UPDATE users SET nama_lengkap = ? WHERE id = ?').run(String(d.nama_lengkap).trim(), req.user!.id);
    db.exec('COMMIT');

    res.json({
      message: 'Pendaftaran berhasil dikirim! Nomor pendaftaran Anda telah dibuat.',
      nomor_pendaftaran: nomorPendaftaran,
      bundle: getSiswaBundle(req.user!.id)
    });
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Submit formulir error:', err);
    res.status(500).json({ error: 'Gagal mengirim formulir pendaftaran.' });
  }
});

app.post('/api/siswa/dokumen', requireAuth, requireRole('calon_siswa'), (req: AuthRequest, res) => {
  docUpload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Ukuran file maksimal adalah 2 MB.' });
        return;
      }
      res.status(400).json({ error: err.message || 'Gagal mengunggah file.' });
      return;
    }

    const jenisDokumen = String(req.body?.jenis_dokumen || '');
    const allowedJenis = ['kartu_keluarga', 'akta_kelahiran', 'ijazah_skl', 'pas_foto', 'dokumen_pendukung'];
    if (!allowedJenis.includes(jenisDokumen)) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(400).json({ error: 'Jenis dokumen tidak valid.' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'File dokumen wajib dipilih.' });
      return;
    }

    const siswa = db.prepare('SELECT id, status_pendaftaran FROM calon_siswa WHERE user_id = ?').get(req.user!.id) as {
      id: number;
      status_pendaftaran: string;
    } | undefined;

    if (!siswa) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(404).json({ error: 'Data calon siswa tidak ditemukan.' });
      return;
    }

    const prev = db.prepare(
      'SELECT id, path_penyimpanan FROM dokumen_pendaftaran WHERE calon_siswa_id = ? AND jenis_dokumen = ?'
    ).get(siswa.id, jenisDokumen) as { id: number; path_penyimpanan: string } | undefined;

    if (prev) {
      const oldPath = path.join(DOKUMEN_DIR, path.basename(prev.path_penyimpanan));
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
      }
      db.prepare(`
        UPDATE dokumen_pendaftaran SET
          nama_file_asli = ?,
          path_penyimpanan = ?,
          mime_type = ?,
          ukuran_file = ?,
          status_verifikasi = 'Menunggu Verifikasi',
          catatan = NULL,
          uploaded_at = datetime('now')
        WHERE id = ?
      `).run(
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.size,
        prev.id
      );
    } else {
      db.prepare(`
        INSERT INTO dokumen_pendaftaran (
          calon_siswa_id, jenis_dokumen, nama_file_asli, path_penyimpanan,
          mime_type, ukuran_file, status_verifikasi
        ) VALUES (?, ?, ?, ?, ?, ?, 'Menunggu Verifikasi')
      `).run(
        siswa.id,
        jenisDokumen,
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.size
      );
    }

    // If student was in 'Perlu Perbaikan', move back to 'Menunggu Verifikasi' when re-uploading
    if (siswa.status_pendaftaran === 'Perlu Perbaikan') {
      db.prepare(`
        UPDATE calon_siswa SET status_pendaftaran = 'Menunggu Verifikasi', updated_at = datetime('now') WHERE id = ?
      `).run(siswa.id);
    }

    const saved = db.prepare(
      'SELECT id, calon_siswa_id, jenis_dokumen, nama_file_asli, mime_type, ukuran_file, status_verifikasi, catatan, uploaded_at FROM dokumen_pendaftaran WHERE calon_siswa_id = ? AND jenis_dokumen = ?'
    ).get(siswa.id, jenisDokumen);

    res.json({ message: 'Dokumen berhasil diunggah.', dokumen: saved });
  });
});

app.delete('/api/siswa/dokumen/:jenis', requireAuth, requireRole('calon_siswa'), (req: AuthRequest, res) => {
  const siswa = db.prepare('SELECT id FROM calon_siswa WHERE user_id = ?').get(req.user!.id) as { id: number } | undefined;
  if (!siswa) {
    res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
    return;
  }
  const existing = db.prepare(
    'SELECT id, path_penyimpanan FROM dokumen_pendaftaran WHERE calon_siswa_id = ? AND jenis_dokumen = ?'
  ).get(siswa.id, req.params.jenis) as { id: number; path_penyimpanan: string } | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Dokumen tidak ditemukan.' });
    return;
  }
  const fullPath = path.join(DOKUMEN_DIR, path.basename(existing.path_penyimpanan));
  if (fs.existsSync(fullPath)) {
    try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
  }
  db.prepare('DELETE FROM dokumen_pendaftaran WHERE id = ?').run(existing.id);
  res.json({ message: 'Dokumen berhasil dihapus.' });
});

// ==========================================
// SECURE DOCUMENT VIEW / DOWNLOAD (RBAC)
// ==========================================
app.get('/api/dokumen/:id/file', requireAuth, (req: AuthRequest, res) => {
  const doc = db.prepare('SELECT * FROM dokumen_pendaftaran WHERE id = ?').get(Number(req.params.id)) as {
    id: number;
    calon_siswa_id: number;
    nama_file_asli: string;
    path_penyimpanan: string;
    mime_type: string;
  } | undefined;

  if (!doc) {
    res.status(404).json({ error: 'Dokumen tidak ditemukan.' });
    return;
  }

  if (req.user!.role === 'calon_siswa') {
    const siswa = db.prepare('SELECT id FROM calon_siswa WHERE user_id = ?').get(req.user!.id) as { id: number } | undefined;
    if (!siswa || siswa.id !== doc.calon_siswa_id) {
      res.status(403).json({ error: 'Akses ditolak. Anda tidak berhak mengakses dokumen siswa lain.' });
      return;
    }
  }

  const filePath = path.join(DOKUMEN_DIR, path.basename(doc.path_penyimpanan));
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Berkas fisik tidak ditemukan di penyimpanan.' });
    return;
  }

  res.setHeader('Content-Type', doc.mime_type);
  const disposition = req.query.download === '1' ? 'attachment' : 'inline';
  res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.nama_file_asli)}"`);
  res.sendFile(filePath);
});

// ==========================================
// ADMIN ROUTES
// ==========================================
app.get('/api/admin/dashboard', requireAuth, requireRole('admin'), (_req: AuthRequest, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_pendaftar,
      SUM(CASE WHEN status_pendaftaran = 'Menunggu Verifikasi' THEN 1 ELSE 0 END) as menunggu_verifikasi,
      SUM(CASE WHEN status_pendaftaran = 'Perlu Perbaikan' THEN 1 ELSE 0 END) as perlu_perbaikan,
      SUM(CASE WHEN status_pendaftaran = 'Sedang Seleksi' THEN 1 ELSE 0 END) as sedang_seleksi,
      SUM(CASE WHEN status_pendaftaran = 'Diterima' THEN 1 ELSE 0 END) as diterima,
      SUM(CASE WHEN status_pendaftaran = 'Tidak Diterima' THEN 1 ELSE 0 END) as tidak_diterima,
      SUM(CASE WHEN status_pendaftaran = 'Belum Mendaftar' THEN 1 ELSE 0 END) as belum_mendaftar
    FROM calon_siswa
  `).get();

  const terbaru = db.prepare(`
    SELECT
      cs.id,
      cs.nomor_pendaftaran,
      u.nama_lengkap,
      fp.nama_sekolah_asal,
      cs.tanggal_pendaftaran,
      cs.status_pendaftaran,
      fp.verifikasi_formulir
    FROM calon_siswa cs
    JOIN users u ON u.id = cs.user_id
    LEFT JOIN formulir_pendaftaran fp ON fp.calon_siswa_id = cs.id
    ORDER BY COALESCE(cs.tanggal_pendaftaran, cs.updated_at) DESC, cs.id DESC
    LIMIT 10
  `).all();

  res.json({ stats, terbaru });
});

app.get('/api/admin/pendaftar', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const status = String(req.query.status || '').trim();
  const dateFrom = String(req.query.dateFrom || '').trim();
  const dateTo = String(req.query.dateTo || '').trim();

  let sql = `
    SELECT
      cs.id,
      cs.user_id,
      cs.nomor_pendaftaran,
      cs.status_pendaftaran,
      cs.tanggal_pendaftaran,
      cs.catatan_perbaikan,
      u.nama_lengkap,
      u.email,
      u.nomor_hp,
      fp.nik,
      fp.nisn,
      fp.jenis_kelamin,
      fp.nama_sekolah_asal,
      fp.tahun_lulus,
      fp.verifikasi_formulir,
      fp.catatan_formulir,
      hs.status_seleksi,
      hs.nomor_surat,
      hs.catatan_seleksi,
      hs.dipublikasikan,
      hs.tanggal_keputusan,
      (SELECT COUNT(*) FROM dokumen_pendaftaran dp WHERE dp.calon_siswa_id = cs.id) as jumlah_dokumen,
      (SELECT COUNT(*) FROM dokumen_pendaftaran dp WHERE dp.calon_siswa_id = cs.id AND dp.status_verifikasi = 'Valid') as dokumen_valid,
      (SELECT COUNT(*) FROM dokumen_pendaftaran dp WHERE dp.calon_siswa_id = cs.id AND dp.status_verifikasi = 'Perlu Perbaikan') as dokumen_revisi
    FROM calon_siswa cs
    JOIN users u ON u.id = cs.user_id
    LEFT JOIN formulir_pendaftaran fp ON fp.calon_siswa_id = cs.id
    LEFT JOIN hasil_seleksi hs ON hs.calon_siswa_id = cs.id
    WHERE 1=1
  `;

  const params: Array<string> = [];
  if (q) {
    sql += ` AND (LOWER(u.nama_lengkap) LIKE ? OR LOWER(COALESCE(cs.nomor_pendaftaran, '')) LIKE ? OR LOWER(COALESCE(fp.nisn, '')) LIKE ? OR LOWER(COALESCE(fp.nama_sekolah_asal, '')) LIKE ?)`;
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (status && status !== 'Semua') {
    sql += ` AND cs.status_pendaftaran = ?`;
    params.push(status);
  }
  if (dateFrom) {
    sql += ` AND DATE(COALESCE(cs.tanggal_pendaftaran, cs.updated_at)) >= DATE(?)`;
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ` AND DATE(COALESCE(cs.tanggal_pendaftaran, cs.updated_at)) <= DATE(?)`;
    params.push(dateTo);
  }

  sql += ` ORDER BY COALESCE(cs.tanggal_pendaftaran, cs.updated_at) DESC, cs.id DESC`;

  const rows = db.prepare(sql).all(...params);
  res.json({ pendaftar: rows });
});

app.get('/api/admin/pendaftar/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const siswa = db.prepare(`
    SELECT cs.*, u.nama_lengkap, u.username, u.email, u.nomor_hp
    FROM calon_siswa cs
    JOIN users u ON u.id = cs.user_id
    WHERE cs.id = ?
  `).get(id);

  if (!siswa) {
    res.status(404).json({ error: 'Data pendaftar tidak ditemukan.' });
    return;
  }

  const formulir = db.prepare('SELECT * FROM formulir_pendaftaran WHERE calon_siswa_id = ?').get(id);
  const dokumen = db.prepare(`
    SELECT id, calon_siswa_id, jenis_dokumen, nama_file_asli, mime_type, ukuran_file, status_verifikasi, catatan, uploaded_at
    FROM dokumen_pendaftaran
    WHERE calon_siswa_id = ?
    ORDER BY id ASC
  `).all(id);
  const hasil_seleksi = db.prepare('SELECT * FROM hasil_seleksi WHERE calon_siswa_id = ?').get(id);

  res.json({ siswa, formulir, dokumen, hasil_seleksi });
});

app.delete('/api/admin/pendaftar/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const siswa = db.prepare('SELECT id, user_id FROM calon_siswa WHERE id = ?').get(id) as { id: number; user_id: number } | undefined;
  if (!siswa) {
    res.status(404).json({ error: 'Data pendaftar tidak ditemukan.' });
    return;
  }

  const docs = db.prepare('SELECT path_penyimpanan FROM dokumen_pendaftaran WHERE calon_siswa_id = ?').all(id) as Array<{ path_penyimpanan: string }>;
  for (const d of docs) {
    const fp = path.join(DOKUMEN_DIR, path.basename(d.path_penyimpanan));
    if (fs.existsSync(fp)) {
      try { fs.unlinkSync(fp); } catch { /* ignore */ }
    }
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(siswa.user_id);
  res.json({ message: 'Data pendaftar berhasil dihapus.' });
});

app.put('/api/admin/pendaftar/:id/status', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { status_pendaftaran, catatan_perbaikan } = req.body || {};
  const allowed = ['Belum Mendaftar', 'Menunggu Verifikasi', 'Perlu Perbaikan', 'Sedang Seleksi', 'Diterima', 'Tidak Diterima'];
  if (!allowed.includes(status_pendaftaran)) {
    res.status(400).json({ error: 'Status pendaftaran tidak valid.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM calon_siswa WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Calon siswa tidak ditemukan.' });
    return;
  }

  db.prepare(`
    UPDATE calon_siswa SET status_pendaftaran = ?, catatan_perbaikan = ?, updated_at = datetime('now') WHERE id = ?
  `).run(status_pendaftaran, catatan_perbaikan || null, id);

  if (status_pendaftaran === 'Diterima' || status_pendaftaran === 'Tidak Diterima') {
    db.prepare(`
      UPDATE hasil_seleksi SET
        status_seleksi = ?,
        nomor_surat = COALESCE(nomor_surat, ?),
        ditetapkan_oleh = ?
      WHERE calon_siswa_id = ?
    `).run(status_pendaftaran, generateNomorSurat(id), req.user!.id, id);
  }

  res.json({ message: 'Status pendaftaran berhasil diperbarui.' });
});

app.put('/api/admin/pendaftar/:id/verifikasi-formulir', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { verifikasi_formulir, catatan_formulir } = req.body || {};
  if (!['Belum Diverifikasi', 'Valid', 'Perlu Perbaikan'].includes(verifikasi_formulir)) {
    res.status(400).json({ error: 'Status verifikasi formulir tidak valid.' });
    return;
  }

  db.prepare(`
    UPDATE formulir_pendaftaran SET verifikasi_formulir = ?, catatan_formulir = ?, updated_at = datetime('now')
    WHERE calon_siswa_id = ?
  `).run(verifikasi_formulir, catatan_formulir || null, id);

  if (verifikasi_formulir === 'Perlu Perbaikan') {
    db.prepare(`
      UPDATE calon_siswa SET status_pendaftaran = 'Perlu Perbaikan', catatan_perbaikan = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(catatan_formulir || 'Formulir memerlukan perbaikan data.', id);
  } else if (verifikasi_formulir === 'Valid') {
    const pendingDocs = db.prepare(
      "SELECT COUNT(*) as total FROM dokumen_pendaftaran WHERE calon_siswa_id = ? AND status_verifikasi != 'Valid'"
    ).get(id) as { total: number };
    const totalDocs = db.prepare(
      "SELECT COUNT(*) as total FROM dokumen_pendaftaran WHERE calon_siswa_id = ? AND jenis_dokumen != 'dokumen_pendukung'"
    ).get(id) as { total: number };
    if (totalDocs.total >= 4 && pendingDocs.total === 0) {
      db.prepare(`
        UPDATE calon_siswa SET status_pendaftaran = 'Sedang Seleksi', catatan_perbaikan = NULL, updated_at = datetime('now')
        WHERE id = ? AND status_pendaftaran IN ('Menunggu Verifikasi', 'Perlu Perbaikan')
      `).run(id);
    }
  }

  res.json({ message: 'Verifikasi formulir berhasil disimpan.' });
});

app.put('/api/admin/dokumen/:dokumenId/verifikasi', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  const dokumenId = Number(req.params.dokumenId);
  const { status_verifikasi, catatan } = req.body || {};
  if (!['Menunggu Verifikasi', 'Valid', 'Perlu Perbaikan'].includes(status_verifikasi)) {
    res.status(400).json({ error: 'Status verifikasi dokumen tidak valid.' });
    return;
  }

  const doc = db.prepare('SELECT id, calon_siswa_id FROM dokumen_pendaftaran WHERE id = ?').get(dokumenId) as {
    id: number;
    calon_siswa_id: number;
  } | undefined;
  if (!doc) {
    res.status(404).json({ error: 'Dokumen tidak ditemukan.' });
    return;
  }

  db.prepare(`
    UPDATE dokumen_pendaftaran SET status_verifikasi = ?, catatan = ? WHERE id = ?
  `).run(status_verifikasi, catatan || null, dokumenId);

  if (status_verifikasi === 'Perlu Perbaikan') {
    db.prepare(`
      UPDATE calon_siswa SET status_pendaftaran = 'Perlu Perbaikan', catatan_perbaikan = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(catatan || 'Terdapat dokumen yang perlu diperbaiki.', doc.calon_siswa_id);
  } else if (status_verifikasi === 'Valid') {
    const form = db.prepare('SELECT verifikasi_formulir FROM formulir_pendaftaran WHERE calon_siswa_id = ?').get(doc.calon_siswa_id) as { verifikasi_formulir: string } | undefined;
    const unverifiedMandatory = db.prepare(
      "SELECT COUNT(*) as total FROM dokumen_pendaftaran WHERE calon_siswa_id = ? AND jenis_dokumen != 'dokumen_pendukung' AND status_verifikasi != 'Valid'"
    ).get(doc.calon_siswa_id) as { total: number };
    const totalMandatory = db.prepare(
      "SELECT COUNT(*) as total FROM dokumen_pendaftaran WHERE calon_siswa_id = ? AND jenis_dokumen != 'dokumen_pendukung'"
    ).get(doc.calon_siswa_id) as { total: number };

    if (form?.verifikasi_formulir === 'Valid' && totalMandatory.total >= 4 && unverifiedMandatory.total === 0) {
      db.prepare(`
        UPDATE calon_siswa SET status_pendaftaran = 'Sedang Seleksi', catatan_perbaikan = NULL, updated_at = datetime('now')
        WHERE id = ? AND status_pendaftaran IN ('Menunggu Verifikasi', 'Perlu Perbaikan')
      `).run(doc.calon_siswa_id);
    }
  }

  res.json({ message: 'Status verifikasi dokumen berhasil diperbarui.' });
});

app.put('/api/admin/seleksi/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { status_seleksi, nomor_surat, catatan_seleksi, dipublikasikan } = req.body || {};
  if (!['Menunggu', 'Diterima', 'Tidak Diterima'].includes(status_seleksi)) {
    res.status(400).json({ error: 'Status hasil seleksi tidak valid.' });
    return;
  }

  const siswa = db.prepare('SELECT id, status_pendaftaran FROM calon_siswa WHERE id = ?').get(id) as {
    id: number;
    status_pendaftaran: string;
  } | undefined;
  if (!siswa) {
    res.status(404).json({ error: 'Calon siswa tidak ditemukan.' });
    return;
  }

  const finalNomorSurat = status_seleksi === 'Menunggu'
    ? null
    : (nomor_surat && String(nomor_surat).trim()) || generateNomorSurat(id);
  const pubFlag = dipublikasikan ? 1 : 0;
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

  db.prepare(`
    UPDATE hasil_seleksi SET
      status_seleksi = ?,
      nomor_surat = ?,
      catatan_seleksi = ?,
      dipublikasikan = ?,
      tanggal_keputusan = CASE WHEN ? = 1 THEN COALESCE(tanggal_keputusan, ?) ELSE tanggal_keputusan END,
      ditetapkan_oleh = ?
    WHERE calon_siswa_id = ?
  `).run(status_seleksi, finalNomorSurat, catatan_seleksi || null, pubFlag, pubFlag, nowStr, req.user!.id, id);

  if (status_seleksi === 'Diterima' || status_seleksi === 'Tidak Diterima') {
    db.prepare(`
      UPDATE calon_siswa SET status_pendaftaran = ?, updated_at = datetime('now') WHERE id = ?
    `).run(status_seleksi, id);
  } else if (siswa.status_pendaftaran === 'Diterima' || siswa.status_pendaftaran === 'Tidak Diterima') {
    db.prepare(`
      UPDATE calon_siswa SET status_pendaftaran = 'Sedang Seleksi', updated_at = datetime('now') WHERE id = ?
    `).run(id);
  }

  res.json({ message: 'Hasil seleksi berhasil disimpan.' });
});

app.post('/api/admin/seleksi/publikasi', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  const { publish = true } = req.body || {};
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const flag = publish ? 1 : 0;

  if (publish) {
    const decided = db.prepare(
      "SELECT calon_siswa_id, status_seleksi, nomor_surat FROM hasil_seleksi WHERE status_seleksi IN ('Diterima', 'Tidak Diterima')"
    ).all() as Array<{ calon_siswa_id: number; status_seleksi: string; nomor_surat: string | null }>;

    for (const row of decided) {
      db.prepare(`
        UPDATE hasil_seleksi SET
          dipublikasikan = 1,
          nomor_surat = COALESCE(nomor_surat, ?),
          tanggal_keputusan = COALESCE(tanggal_keputusan, ?),
          ditetapkan_oleh = ?
        WHERE calon_siswa_id = ?
      `).run(generateNomorSurat(row.calon_siswa_id), nowStr, req.user!.id, row.calon_siswa_id);

      db.prepare(`
        UPDATE calon_siswa SET status_pendaftaran = ?, updated_at = datetime('now') WHERE id = ?
      `).run(row.status_seleksi, row.calon_siswa_id);
    }

    res.json({ message: `${decided.length} hasil seleksi resmi telah dipublikasikan ke portal siswa.` });
  } else {
    db.prepare('UPDATE hasil_seleksi SET dipublikasikan = ?').run(flag);
    res.json({ message: 'Publikasi hasil seleksi ditarik sementara.' });
  }
});

// ==========================================
// ADMIN PENGUMUMAN CRUD
// ==========================================
app.get('/api/admin/pengumuman', requireAuth, requireRole('admin'), (_req, res) => {
  const rows = db.prepare('SELECT * FROM pengumuman ORDER BY tanggal_publikasi DESC, id DESC').all();
  res.json({ pengumuman: rows });
});

app.post('/api/admin/pengumuman', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  const { judul, isi, tipe = 'umum', dipublikasikan = true } = req.body || {};
  if (!judul || String(judul).trim().length < 3 || !isi || String(isi).trim().length < 5) {
    res.status(400).json({ error: 'Judul dan isi pengumuman wajib diisi.' });
    return;
  }
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const result = db.prepare(`
    INSERT INTO pengumuman (judul, isi, tipe, dipublikasikan, tanggal_publikasi, dibuat_oleh)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(String(judul).trim(), String(isi).trim(), tipe, dipublikasikan ? 1 : 0, nowStr, req.user!.id);

  res.status(201).json({ message: 'Pengumuman berhasil ditambahkan.', id: Number(result.lastInsertRowid) });
});

app.put('/api/admin/pengumuman/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { judul, isi, tipe = 'umum', dipublikasikan } = req.body || {};
  if (!judul || !isi) {
    res.status(400).json({ error: 'Judul dan isi pengumuman wajib diisi.' });
    return;
  }
  db.prepare(`
    UPDATE pengumuman SET judul = ?, isi = ?, tipe = ?, dipublikasikan = ? WHERE id = ?
  `).run(String(judul).trim(), String(isi).trim(), tipe, dipublikasikan ? 1 : 0, id);
  res.json({ message: 'Pengumuman berhasil diperbarui.' });
});

app.delete('/api/admin/pengumuman/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  db.prepare('DELETE FROM pengumuman WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'Pengumuman berhasil dihapus.' });
});

// ==========================================
// ADMIN LAPORAN & PENGATURAN SEKOLAH
// ==========================================
app.get('/api/admin/laporan', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  const status = String(req.query.status || '').trim();
  let whereClause = 'WHERE 1=1';
  const params: string[] = [];
  if (status && status !== 'Semua') {
    whereClause += ' AND cs.status_pendaftaran = ?';
    params.push(status);
  }

  const rows = db.prepare(`
    SELECT
      cs.nomor_pendaftaran,
      u.nama_lengkap,
      fp.nik,
      fp.nisn,
      fp.jenis_kelamin,
      fp.nama_sekolah_asal,
      fp.tahun_lulus,
      u.nomor_hp,
      cs.tanggal_pendaftaran,
      cs.status_pendaftaran,
      hs.status_seleksi,
      hs.nomor_surat
    FROM calon_siswa cs
    JOIN users u ON u.id = cs.user_id
    LEFT JOIN formulir_pendaftaran fp ON fp.calon_siswa_id = cs.id
    LEFT JOIN hasil_seleksi hs ON hs.calon_siswa_id = cs.id
    ${whereClause}
    ORDER BY cs.nomor_pendaftaran ASC, cs.id ASC
  `).all(...params);

  const summary = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN cs.status_pendaftaran = 'Diterima' THEN 1 ELSE 0 END) as diterima,
      SUM(CASE WHEN cs.status_pendaftaran = 'Tidak Diterima' THEN 1 ELSE 0 END) as tidak_diterima,
      SUM(CASE WHEN cs.status_pendaftaran = 'Menunggu Verifikasi' THEN 1 ELSE 0 END) as menunggu,
      SUM(CASE WHEN cs.status_pendaftaran = 'Perlu Perbaikan' THEN 1 ELSE 0 END) as perbaikan,
      SUM(CASE WHEN cs.status_pendaftaran = 'Sedang Seleksi' THEN 1 ELSE 0 END) as seleksi,
      SUM(CASE WHEN fp.jenis_kelamin = 'Laki-laki' THEN 1 ELSE 0 END) as laki_laki,
      SUM(CASE WHEN fp.jenis_kelamin = 'Perempuan' THEN 1 ELSE 0 END) as perempuan
    FROM calon_siswa cs
    LEFT JOIN formulir_pendaftaran fp ON fp.calon_siswa_id = cs.id
  `).get();

  res.json({ summary, rows, config: getSchoolConfig() });
});

app.put('/api/admin/config', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  const c = req.body || {};
  if (!c.nama_sekolah || !c.jadwal_pendaftaran || !c.tanggal_pengumuman) {
    res.status(400).json({ error: 'Nama sekolah, jadwal pendaftaran, dan tanggal pengumuman wajib diisi.' });
    return;
  }

  db.prepare(`
    UPDATE konfigurasi_sekolah SET
      nama_sekolah = ?,
      jenjang = ?,
      tahun_ajaran = ?,
      alamat_sekolah = ?,
      telepon = ?,
      email_sekolah = ?,
      website = ?,
      jam_layanan = ?,
      jadwal_pendaftaran = ?,
      tanggal_pengumuman = ?,
      nama_kepala_sekolah = ?,
      nip_kepala_sekolah = ?,
      persyaratan_json = ?,
      alur_json = ?,
      faq_json = ?
    WHERE id = 1
  `).run(
    String(c.nama_sekolah).trim(),
    String(c.jenjang || '').trim(),
    String(c.tahun_ajaran || '').trim(),
    String(c.alamat_sekolah || '').trim(),
    String(c.telepon || '').trim(),
    String(c.email_sekolah || '').trim(),
    String(c.website || '').trim(),
    String(c.jam_layanan || '').trim(),
    String(c.jadwal_pendaftaran).trim(),
    String(c.tanggal_pengumuman).trim(),
    String(c.nama_kepala_sekolah || '').trim(),
    String(c.nip_kepala_sekolah || '').trim(),
    JSON.stringify(Array.isArray(c.persyaratan) ? c.persyaratan : []),
    JSON.stringify(Array.isArray(c.alur) ? c.alur : []),
    JSON.stringify(Array.isArray(c.faq) ? c.faq : [])
  );

  res.json({ message: 'Pengaturan sekolah berhasil disimpan.', config: getSchoolConfig() });
});

app.post('/api/admin/config/logo', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  logoUpload.single('logo')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || 'Gagal mengunggah logo sekolah.' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'File logo wajib dipilih.' });
      return;
    }

    const prev = db.prepare('SELECT logo_path FROM konfigurasi_sekolah WHERE id = 1').get() as { logo_path: string | null } | undefined;
    if (prev?.logo_path) {
      const oldLogo = path.join(LOGO_DIR, path.basename(prev.logo_path));
      if (fs.existsSync(oldLogo)) {
        try { fs.unlinkSync(oldLogo); } catch { /* ignore */ }
      }
    }

    db.prepare('UPDATE konfigurasi_sekolah SET logo_path = ? WHERE id = 1').run(req.file.filename);
    res.json({ message: 'Logo sekolah berhasil diperbarui.', config: getSchoolConfig() });
  });
});

app.delete('/api/admin/config/logo', requireAuth, requireRole('admin'), (_req: AuthRequest, res) => {
  const prev = db.prepare('SELECT logo_path FROM konfigurasi_sekolah WHERE id = 1').get() as { logo_path: string | null } | undefined;
  if (prev?.logo_path) {
    const oldLogo = path.join(LOGO_DIR, path.basename(prev.logo_path));
    if (fs.existsSync(oldLogo)) {
      try { fs.unlinkSync(oldLogo); } catch { /* ignore */ }
    }
  }
  db.prepare('UPDATE konfigurasi_sekolah SET logo_path = NULL WHERE id = 1').run();
  res.json({ message: 'Logo dikembalikan ke ikon bawaan.', config: getSchoolConfig() });
});

// ==========================================
// VITE / STATIC SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: !disableHmr,
        ...(disableHmr ? { ws: false as const } : {})
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SPMB Online server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SPMB Online server:', err);
  process.exit(1);
});
