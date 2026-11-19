import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'spmb-online-secret-key-2026-dev';

export interface AuthUser {
  id: number;
  nama_lengkap: string;
  username: string | null;
  email: string;
  nomor_hp: string;
  role: 'calon_siswa' | 'admin';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function signAuthToken(user: { id: number; role: string; email: string }): string {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAuthToken(token: string): { sub: number; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { sub: number; role: string };
    return decoded;
  } catch {
    return null;
  }
}

export function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.spmb_token;
  if (cookieToken && typeof cookieToken === 'string') return cookieToken;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sesi Anda belum aktif. Silakan login terlebih dahulu.' });
    return;
  }

  const decoded = verifyAuthToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Sesi login telah kedaluwarsa. Silakan login kembali.' });
    return;
  }

  const user = db.prepare(
    'SELECT id, nama_lengkap, username, email, nomor_hp, role FROM users WHERE id = ?'
  ).get(decoded.sub) as AuthUser | undefined;

  if (!user) {
    res.status(401).json({ error: 'Akun pengguna tidak ditemukan.' });
    return;
  }

  req.user = user;
  next();
}

export function requireRole(role: 'admin' | 'calon_siswa') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Autentikasi diperlukan.' });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: 'Anda tidak memiliki hak akses untuk fitur ini.' });
      return;
    }
    next();
  };
}
