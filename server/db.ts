import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const DOKUMEN_DIR = path.resolve(process.cwd(), 'storage', 'dokumen');
export const LOGO_DIR = path.resolve(process.cwd(), 'storage', 'logo');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(DOKUMEN_DIR, { recursive: true });
fs.mkdirSync(LOGO_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'spmb.db');
export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_lengkap TEXT NOT NULL,
      username TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE,
      nomor_hp TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('calon_siswa', 'admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS calon_siswa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      nomor_pendaftaran TEXT UNIQUE,
      status_pendaftaran TEXT NOT NULL DEFAULT 'Belum Mendaftar' CHECK(
        status_pendaftaran IN (
          'Belum Mendaftar',
          'Menunggu Verifikasi',
          'Perlu Perbaikan',
          'Sedang Seleksi',
          'Diterima',
          'Tidak Diterima'
        )
      ),
      tanggal_pendaftaran TEXT,
      catatan_perbaikan TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS formulir_pendaftaran (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      calon_siswa_id INTEGER NOT NULL UNIQUE REFERENCES calon_siswa(id) ON DELETE CASCADE,
      nama_lengkap TEXT NOT NULL DEFAULT '',
      nik TEXT NOT NULL DEFAULT '',
      nisn TEXT NOT NULL DEFAULT '',
      tempat_lahir TEXT NOT NULL DEFAULT '',
      tanggal_lahir TEXT NOT NULL DEFAULT '',
      jenis_kelamin TEXT NOT NULL DEFAULT '',
      agama TEXT NOT NULL DEFAULT '',
      alamat_lengkap TEXT NOT NULL DEFAULT '',
      nomor_hp TEXT NOT NULL DEFAULT '',
      nama_ayah TEXT NOT NULL DEFAULT '',
      nama_ibu TEXT NOT NULL DEFAULT '',
      nama_wali TEXT NOT NULL DEFAULT '',
      pekerjaan_ortu TEXT NOT NULL DEFAULT '',
      nomor_hp_ortu TEXT NOT NULL DEFAULT '',
      alamat_ortu TEXT NOT NULL DEFAULT '',
      nama_sekolah_asal TEXT NOT NULL DEFAULT '',
      npsn_sekolah TEXT NOT NULL DEFAULT '',
      tahun_lulus TEXT NOT NULL DEFAULT '',
      alamat_sekolah TEXT NOT NULL DEFAULT '',
      persetujuan_data INTEGER NOT NULL DEFAULT 0,
      verifikasi_formulir TEXT NOT NULL DEFAULT 'Belum Diverifikasi' CHECK(
        verifikasi_formulir IN ('Belum Diverifikasi', 'Valid', 'Perlu Perbaikan')
      ),
      catatan_formulir TEXT,
      submitted_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dokumen_pendaftaran (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      calon_siswa_id INTEGER NOT NULL REFERENCES calon_siswa(id) ON DELETE CASCADE,
      jenis_dokumen TEXT NOT NULL CHECK(
        jenis_dokumen IN (
          'kartu_keluarga',
          'akta_kelahiran',
          'ijazah_skl',
          'pas_foto',
          'dokumen_pendukung'
        )
      ),
      nama_file_asli TEXT NOT NULL,
      path_penyimpanan TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      ukuran_file INTEGER NOT NULL,
      status_verifikasi TEXT NOT NULL DEFAULT 'Menunggu Verifikasi' CHECK(
        status_verifikasi IN ('Menunggu Verifikasi', 'Valid', 'Perlu Perbaikan')
      ),
      catatan TEXT,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(calon_siswa_id, jenis_dokumen)
    );

    CREATE TABLE IF NOT EXISTS hasil_seleksi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      calon_siswa_id INTEGER NOT NULL UNIQUE REFERENCES calon_siswa(id) ON DELETE CASCADE,
      status_seleksi TEXT NOT NULL DEFAULT 'Menunggu' CHECK(
        status_seleksi IN ('Menunggu', 'Diterima', 'Tidak Diterima')
      ),
      nomor_surat TEXT,
      catatan_seleksi TEXT,
      dipublikasikan INTEGER NOT NULL DEFAULT 0,
      tanggal_keputusan TEXT,
      ditetapkan_oleh INTEGER REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS pengumuman (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judul TEXT NOT NULL,
      isi TEXT NOT NULL,
      tipe TEXT NOT NULL DEFAULT 'umum' CHECK(tipe IN ('umum', 'seleksi', 'jadwal')),
      dipublikasikan INTEGER NOT NULL DEFAULT 1,
      tanggal_publikasi TEXT NOT NULL DEFAULT (datetime('now')),
      dibuat_oleh INTEGER REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS konfigurasi_sekolah (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      nama_sekolah TEXT NOT NULL,
      jenjang TEXT NOT NULL,
      tahun_ajaran TEXT NOT NULL,
      alamat_sekolah TEXT NOT NULL,
      telepon TEXT NOT NULL,
      email_sekolah TEXT NOT NULL,
      website TEXT NOT NULL,
      jam_layanan TEXT NOT NULL,
      jadwal_pendaftaran TEXT NOT NULL,
      tanggal_pengumuman TEXT NOT NULL,
      nama_kepala_sekolah TEXT NOT NULL,
      nip_kepala_sekolah TEXT NOT NULL,
      logo_path TEXT,
      persyaratan_json TEXT NOT NULL,
      alur_json TEXT NOT NULL,
      faq_json TEXT NOT NULL
    );
  `);

  seedInitialData();
}

function createSampleSvgDoc(title: string, subtitle: string): Buffer {
  const safeTitle = title.replace(/[<>&]/g, '');
  const safeSub = subtitle.replace(/[<>&]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
    <rect width="800" height="520" fill="#F8FAFC"/>
    <rect x="32" y="32" width="736" height="456" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
    <rect x="32" y="32" width="736" height="72" rx="16" fill="#1D63ED"/>
    <text x="64" y="76" font-family="sans-serif" font-size="22" font-weight="bold" fill="#FFFFFF">${safeTitle}</text>
    <text x="64" y="150" font-family="sans-serif" font-size="18" font-weight="600" fill="#0F172A">${safeSub}</text>
    <text x="64" y="185" font-family="sans-serif" font-size="14" fill="#64748B">Dokumen contoh untuk keperluan demonstrasi verifikasi SPMB Online.</text>
    <rect x="64" y="220" width="672" height="16" rx="4" fill="#E2E8F0"/>
    <rect x="64" y="252" width="540" height="16" rx="4" fill="#E2E8F0"/>
    <rect x="64" y="284" width="600" height="16" rx="4" fill="#E2E8F0"/>
    <rect x="64" y="340" width="220" height="90" rx="10" fill="#EFF6FF" stroke="#BFDBFE"/>
    <text x="84" y="390" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1D4ED8">TERLAMPIR (DEMO)</text>
  </svg>`;
  return Buffer.from(svg, 'utf-8');
}

function seedInitialData() {
  const existingConfig = db.prepare('SELECT id FROM konfigurasi_sekolah WHERE id = 1').get();
  if (!existingConfig) {
    const defaultPersyaratan = [
      'Mengisi formulir pendaftaran online dengan data yang valid dan sesuai dokumen resmi.',
      'Fotokopi / Scan Kartu Keluarga (KK) terbaru dalam format PDF atau JPG/PNG (maks. 2 MB).',
      'Fotokopi / Scan Akta Kelahiran calon murid baru.',
      'Scan Ijazah atau Surat Keterangan Lulus (SKL) dari sekolah asal.',
      'Pas foto formal terbaru latar belakang biru atau merah ukuran 3x4.',
      'Nomor Induk Siswa Nasional (NISN) yang aktif dan terdaftar di Dapodik.'
    ];
    const defaultAlur = [
      {
        step: 1,
        judul: 'Registrasi Akun',
        deskripsi: 'Buat akun calon siswa menggunakan nama lengkap, email aktif, dan nomor HP.'
      },
      {
        step: 2,
        judul: 'Isi Formulir Online',
        deskripsi: 'Lengkapi data diri, data orang tua/wali, serta data sekolah asal secara bertahap.'
      },
      {
        step: 3,
        judul: 'Upload Dokumen',
        deskripsi: 'Unggah Kartu Keluarga, Akta Kelahiran, Ijazah/SKL, dan Pas Foto resmi.'
      },
      {
        step: 4,
        judul: 'Verifikasi Panitia',
        deskripsi: 'Admin panitia memeriksa kelengkapan formulir serta keabsahan dokumen yang diunggah.'
      },
      {
        step: 5,
        judul: 'Pengumuman & Unduh Surat',
        deskripsi: 'Pantau hasil seleksi secara real-time dan unduh Bukti Pendaftaran serta Surat Hasil Seleksi.'
      }
    ];
    const defaultFaq = [
      {
        tanya: 'Bagaimana cara mendaftar SPMB Online?',
        jawab: 'Klik tombol Daftar Sekarang di beranda, buat akun calon siswa terlebih dahulu, lalu masuk ke dashboard untuk mengisi formulir 5 tahap dan mengunggah dokumen persyaratan.'
      },
      {
        tanya: 'Format dan ukuran file dokumen apa saja yang diterima?',
        jawab: 'Sistem menerima dokumen berformat PDF, JPG, atau PNG dengan ukuran maksimal 2 MB per file agar mudah terbaca saat proses verifikasi.'
      },
      {
        tanya: 'Bagaimana jika ada kesalahan data setelah dikirim?',
        jawab: 'Jika panitia menemukan ketidaksesuaian, status pendaftaran akan berubah menjadi Perlu Perbaikan disertai catatan. Anda dapat memperbaikinya langsung melalui dashboard siswa.'
      },
      {
        tanya: 'Kapan saya bisa mengunduh Surat Keterangan Hasil Seleksi?',
        jawab: 'Surat Keterangan Hasil Seleksi dalam format PDF dapat diunduh melalui menu Pengumuman setelah panitia admin mempublikasikan hasil seleksi resmi.'
      }
    ];

    db.prepare(`
      INSERT INTO konfigurasi_sekolah (
        id, nama_sekolah, jenjang, tahun_ajaran, alamat_sekolah, telepon,
        email_sekolah, website, jam_layanan, jadwal_pendaftaran, tanggal_pengumuman,
        nama_kepala_sekolah, nip_kepala_sekolah, logo_path,
        persyaratan_json, alur_json, faq_json
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
    `).run(
      'SMA Negeri Nusantara (Contoh Konfigurasi)',
      'SMA / Sederajat',
      '2025/2026',
      'Jl. Pendidikan No. 45, Kota Harapan (Dapat diubah di Pengaturan Admin)',
      '(021) 555-0192',
      'panitia@spmb-sekolah.sch.id',
      'https://spmb-sekolah.sch.id',
      '08.00 – 16.00 WIB',
      '1 – 30 Juni 2025',
      '5 Juli 2025',
      'Drs. H. Hendrawan Wijaya, M.Pd.',
      '19680412 199403 1 008',
      JSON.stringify(defaultPersyaratan),
      JSON.stringify(defaultAlur),
      JSON.stringify(defaultFaq)
    );
  }

  const userCount = db.prepare('SELECT COUNT(*) as total FROM users').get() as { total: number };
  if (userCount.total > 0) return;

  const adminPass = bcrypt.hashSync('admin123', 10);
  const siswaPass = bcrypt.hashSync('siswa123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (nama_lengkap, username, email, nomor_hp, password_hash, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const adminRes = insertUser.run(
    'Panitia Admin SPMB',
    'admin',
    'admin@spmb.sch.id',
    '081200000001',
    adminPass,
    'admin'
  );
  const adminId = Number(adminRes.lastInsertRowid);

  const demoApplicants = [
    {
      nama: 'Ahmad Fauzi',
      username: 'ahmadfauzi',
      email: 'ahmad.fauzi@contoh.id',
      hp: '081234567890',
      nomor: 'SPMB-2025-0001',
      status: 'Menunggu Verifikasi',
      tanggal: '2025-06-20 09:15:00',
      nik: '3275011205090001',
      nisn: '0094827161',
      tempat: 'Bandung',
      tglLahir: '2009-05-12',
      jk: 'Laki-laki',
      agama: 'Islam',
      alamat: 'Jl. Melati Indah No. 14, Kec. Sukajadi',
      ayah: 'Heri Santoso',
      ibu: 'Siti Aminah',
      pekerjaan: 'Pegawai Swasta',
      hpOrtu: '081234567800',
      sekolah: 'SMP Negeri 1 Harapan',
      npsn: '20219401',
      tahun: '2025',
      alamatSekolah: 'Jl. Merdeka No. 10',
      verifForm: 'Belum Diverifikasi',
      verifDok: 'Menunggu Verifikasi',
      seleksi: 'Menunggu',
      pub: 0,
      catatanSeleksi: ''
    },
    {
      nama: 'Siti Nurhaliza',
      username: 'sitinurhaliza',
      email: 'siti.nurhaliza@contoh.id',
      hp: '081234567891',
      nomor: 'SPMB-2025-0002',
      status: 'Menunggu Verifikasi',
      tanggal: '2025-06-20 10:42:00',
      nik: '3275014508090002',
      nisn: '0094827162',
      tempat: 'Bekasi',
      tglLahir: '2009-08-05',
      jk: 'Perempuan',
      agama: 'Islam',
      alamat: 'Perum Griya Asri Blok B3 No. 9',
      ayah: 'Bambang Sudrajat',
      ibu: 'Ratna Sari',
      pekerjaan: 'Wiraswasta',
      hpOrtu: '081234567801',
      sekolah: 'SMP Negeri 3 Nusantara',
      npsn: '20219403',
      tahun: '2025',
      alamatSekolah: 'Jl. Ahmad Yani No. 22',
      verifForm: 'Valid',
      verifDok: 'Menunggu Verifikasi',
      seleksi: 'Menunggu',
      pub: 0,
      catatanSeleksi: ''
    },
    {
      nama: 'Muhammad Rizki',
      username: 'mrizki',
      email: 'muhammad.rizki@contoh.id',
      hp: '081234567892',
      nomor: 'SPMB-2025-0003',
      status: 'Diterima',
      tanggal: '2025-06-19 14:20:00',
      nik: '3275011903090003',
      nisn: '0094827163',
      tempat: 'Bogor',
      tglLahir: '2009-03-19',
      jk: 'Laki-laki',
      agama: 'Islam',
      alamat: 'Jl. Kenanga Raya No. 7, Kec. Tanah Sareal',
      ayah: 'Dedi Kurniawan',
      ibu: 'Nurhayati',
      pekerjaan: 'PNS / ASN',
      hpOrtu: '081234567802',
      sekolah: 'MTs Negeri 1 Kota',
      npsn: '20219405',
      tahun: '2025',
      alamatSekolah: 'Jl. Pajajaran No. 55',
      verifForm: 'Valid',
      verifDok: 'Valid',
      seleksi: 'Diterima',
      pub: 1,
      catatanSeleksi: 'Memenuhi seluruh persyaratan administrasi dan seleksi akademik.'
    },
    {
      nama: 'Dewi Lestari',
      username: 'dewilestari',
      email: 'dewi.lestari@contoh.id',
      hp: '081234567893',
      nomor: 'SPMB-2025-0004',
      status: 'Perlu Perbaikan',
      tanggal: '2025-06-18 11:05:00',
      nik: '3275016211090004',
      nisn: '0094827164',
      tempat: 'Depok',
      tglLahir: '2009-11-22',
      jk: 'Perempuan',
      agama: 'Kristen',
      alamat: 'Jl. Margonda Raya Gg. Damai No. 18',
      ayah: 'Yohanes Pratama',
      ibu: 'Maria Magdalena',
      pekerjaan: 'Karyawan BUMN',
      hpOrtu: '081234567803',
      sekolah: 'SMP Tunas Bangsa',
      npsn: '20219408',
      tahun: '2025',
      alamatSekolah: 'Jl. Kartini No. 8',
      verifForm: 'Valid',
      verifDok: 'Perlu Perbaikan',
      seleksi: 'Menunggu',
      pub: 0,
      catatanSeleksi: ''
    },
    {
      nama: 'Bagas Pratama',
      username: 'bagaspratama',
      email: 'bagas.pratama@contoh.id',
      hp: '081234567894',
      nomor: 'SPMB-2025-0005',
      status: 'Tidak Diterima',
      tanggal: '2025-06-17 08:50:00',
      nik: '3275010901090005',
      nisn: '0094827165',
      tempat: 'Tangerang',
      tglLahir: '2009-01-09',
      jk: 'Laki-laki',
      agama: 'Islam',
      alamat: 'Jl. Veteran No. 31, Kel. Babakan',
      ayah: 'Agus Salim',
      ibu: 'Wulandari',
      pekerjaan: 'Pedagang',
      hpOrtu: '081234567804',
      sekolah: 'SMP Harapan Jaya',
      npsn: '20219412',
      tahun: '2025',
      alamatSekolah: 'Jl. Sudirman No. 112',
      verifForm: 'Valid',
      verifDok: 'Valid',
      seleksi: 'Tidak Diterima',
      pub: 1,
      catatanSeleksi: 'Kuota jalur reguler telah terpenuhi pada periode seleksi ini.'
    }
  ];

  const insertSiswa = db.prepare(`
    INSERT INTO calon_siswa (user_id, nomor_pendaftaran, status_pendaftaran, tanggal_pendaftaran, catatan_perbaikan)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertFormulir = db.prepare(`
    INSERT INTO formulir_pendaftaran (
      calon_siswa_id, nama_lengkap, nik, nisn, tempat_lahir, tanggal_lahir,
      jenis_kelamin, agama, alamat_lengkap, nomor_hp,
      nama_ayah, nama_ibu, nama_wali, pekerjaan_ortu, nomor_hp_ortu, alamat_ortu,
      nama_sekolah_asal, npsn_sekolah, tahun_lulus, alamat_sekolah,
      persetujuan_data, verifikasi_formulir, catatan_formulir, submitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `);

  const insertDokumen = db.prepare(`
    INSERT INTO dokumen_pendaftaran (
      calon_siswa_id, jenis_dokumen, nama_file_asli, path_penyimpanan,
      mime_type, ukuran_file, status_verifikasi, catatan
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSeleksi = db.prepare(`
    INSERT INTO hasil_seleksi (
      calon_siswa_id, status_seleksi, nomor_surat, catatan_seleksi,
      dipublikasikan, tanggal_keputusan, ditetapkan_oleh
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const docTypes = [
    { key: 'kartu_keluarga', label: 'Kartu Keluarga' },
    { key: 'akta_kelahiran', label: 'Akta Kelahiran' },
    { key: 'ijazah_skl', label: 'Ijazah / SKL' },
    { key: 'pas_foto', label: 'Pas Foto 3x4' }
  ];

  demoApplicants.forEach((app, idx) => {
    const uRes = insertUser.run(app.nama, app.username, app.email, app.hp, siswaPass, 'calon_siswa');
    const userId = Number(uRes.lastInsertRowid);

    const catatanPerbaikan = app.status === 'Perlu Perbaikan'
      ? 'Mohon unggah ulang scan Ijazah/SKL yang lebih jelas dan tidak terpotong.'
      : null;

    const sRes = insertSiswa.run(userId, app.nomor, app.status, app.tanggal, catatanPerbaikan);
    const siswaId = Number(sRes.lastInsertRowid);

    insertFormulir.run(
      siswaId,
      app.nama,
      app.nik,
      app.nisn,
      app.tempat,
      app.tglLahir,
      app.jk,
      app.agama,
      app.alamat,
      app.hp,
      app.ayah,
      app.ibu,
      app.pekerjaan,
      app.hpOrtu,
      app.alamat,
      app.sekolah,
      app.npsn,
      app.tahun,
      app.alamatSekolah,
      app.verifForm,
      null,
      app.tanggal
    );

    docTypes.forEach((dt) => {
      const filename = `demo_${siswaId}_${dt.key}.svg`;
      const filePath = path.join(DOKUMEN_DIR, filename);
      const buf = createSampleSvgDoc(`${dt.label} — ${app.nama}`, `Nomor Pendaftaran: ${app.nomor} · NISN: ${app.nisn}`);
      fs.writeFileSync(filePath, buf);

      const docVerif = app.status === 'Perlu Perbaikan' && dt.key === 'ijazah_skl'
        ? 'Perlu Perbaikan'
        : app.verifDok;
      const docNote = docVerif === 'Perlu Perbaikan' ? 'Hasil scan buram, mohon unggah ulang.' : null;

      insertDokumen.run(
        siswaId,
        dt.key,
        `${dt.label.replace(/[^a-zA-Z0-9]/g, '_')}_${app.username}.svg`,
        filename,
        'image/svg+xml',
        buf.length,
        docVerif,
        docNote
      );
    });

    const nomorSurat = app.seleksi !== 'Menunggu'
      ? `421.3/${100 + idx}/SPMB/2025`
      : null;

    insertSeleksi.run(
      siswaId,
      app.seleksi,
      nomorSurat,
      app.catatanSeleksi || null,
      app.pub,
      app.pub ? '2025-07-05 08:00:00' : null,
      app.pub ? adminId : null
    );
  });

  const insertAnnouncement = db.prepare(`
    INSERT INTO pengumuman (judul, isi, tipe, dipublikasikan, tanggal_publikasi, dibuat_oleh)
    VALUES (?, ?, ?, 1, ?, ?)
  `);

  insertAnnouncement.run(
    'Pembukaan Pendaftaran SPMB Online Tahun Ajaran 2025/2026',
    'Pendaftaran murid baru dilaksanakan secara online melalui portal SPMB. Calon siswa diharap melengkapi seluruh formulir 5 tahap dan mengunggah dokumen asli yang terbaca jelas sebelum batas waktu pendaftaran berakhir.',
    'jadwal',
    '2025-06-01 08:00:00',
    adminId
  );

  insertAnnouncement.run(
    'Informasi Verifikasi Berkas dan Pengumuman Hasil Seleksi',
    'Setelah mengirimkan formulir, pantau menu Status Pendaftaran secara berkala. Apabila terdapat catatan perbaikan dari panitia, segera perbarui berkas Anda. Surat Keterangan Hasil Seleksi resmi akan tersedia untuk diunduh setelah tanggal pengumuman.',
    'umum',
    '2025-06-15 09:00:00',
    adminId
  );
}
