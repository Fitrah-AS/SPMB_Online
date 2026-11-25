/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import type { PengumumanItem, SchoolConfig, ToastMessage, User } from './types';
import { apiFetch, setStoredToken } from './lib/api';
import { LandingPage } from './components/LandingPage';
import { AuthPages, type AuthMode } from './components/AuthPages';
import { SiswaDashboard } from './components/SiswaDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ToastContainer } from './components/ui/Illustrations';

type AppView = 'landing' | 'auth' | 'dashboard';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [authMode, setAuthMode] = useState<AuthMode>('login_siswa');
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [announcements, setAnnouncements] = useState<PengumumanItem[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const loadPublic = useCallback(async () => {
    const pub = await apiFetch<{ config: SchoolConfig; announcements: PengumumanItem[] }>(
      '/api/public/config'
    );
    setConfig(pub.config);
    setAnnouncements(pub.announcements);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        await loadPublic();
        try {
          const me = await apiFetch<{ user: User }>('/api/auth/me');
          setUser(me.user);
        } catch {
          setUser(null);
        }
      } catch (err) {
        notify('error', err instanceof Error ? err.message : 'Gagal memuat konfigurasi aplikasi.');
      } finally {
        setInitializing(false);
      }
    }
    bootstrap();
  }, [loadPublic, notify]);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore logout error
    }
    setStoredToken(null);
    setUser(null);
    setView('landing');
    notify('info', 'Anda telah keluar dari sistem.');
  };

  if (initializing || !config) {
    return (
      <div className="min-h-screen bg-[#F4F8FD] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-[#1D63ED]" />
          <p className="text-sm font-medium">Memuat SPMB Online...</p>
        </div>
      </div>
    );
  }

  const activeViewKey =
    view === 'dashboard' && user
      ? `dashboard_${user.role}`
      : view;

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div
            key={activeViewKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <LandingPage
              config={config}
              announcements={announcements}
              currentUser={user}
              onNavigateLogin={() => {
                setAuthMode('login_siswa');
                setView('auth');
                window.scrollTo(0, 0);
              }}
              onNavigateRegister={() => {
                setAuthMode('register_siswa');
                setView('auth');
                window.scrollTo(0, 0);
              }}
              onNavigateDashboard={() => {
                setView('dashboard');
                window.scrollTo(0, 0);
              }}
            />
          </motion.div>
        )}

        {view === 'auth' && (
          <motion.div
            key={activeViewKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <AuthPages
              config={config}
              initialMode={authMode}
              onBackHome={() => {
                setView('landing');
                window.scrollTo(0, 0);
              }}
              onAuthSuccess={(loggedUser) => {
                setUser(loggedUser);
                setView('dashboard');
                window.scrollTo(0, 0);
              }}
              onNotify={notify}
            />
          </motion.div>
        )}

        {view === 'dashboard' && user?.role === 'calon_siswa' && (
          <motion.div
            key={activeViewKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <SiswaDashboard
              user={user}
              onUserUpdated={setUser}
              onLogout={handleLogout}
              onBackHome={() => {
                loadPublic().catch(() => {});
                setView('landing');
                window.scrollTo(0, 0);
              }}
              onNotify={notify}
            />
          </motion.div>
        )}

        {view === 'dashboard' && user?.role === 'admin' && (
          <motion.div
            key={activeViewKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <AdminDashboard
              user={user}
              config={config}
              onConfigUpdated={(nextCfg) => setConfig(nextCfg)}
              onLogout={handleLogout}
              onBackHome={() => {
                loadPublic().catch(() => {});
                setView('landing');
                window.scrollTo(0, 0);
              }}
              onNotify={notify}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </MotionConfig>
  );
}
