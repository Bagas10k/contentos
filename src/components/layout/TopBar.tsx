// src/components/layout/TopBar.tsx
import { Plus, Bell, Share2, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';
import { ContentModal } from '../content/ContentModal';
import { NotesDrawer } from './NotesDrawer';
import { ShareModal } from './ShareModal';

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const ws            = useAppStore((state) => state.workspaces.find((w) => w.id === state.activeWorkspaceId));
  const notes         = useAppStore(useShallow((state) => (state.notes ?? []).filter((n) => n.workspaceId === state.activeWorkspaceId)));
  const markNotesAsRead = useAppStore((state) => state.markNotesAsRead);
  const isSidebarOpen = useAppStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const hasUnread     = notes.some((n) => !n.isRead);

  const [addOpen, setAddOpen]     = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Connection Status polling
  const [connStatus, setConnStatus] = useState<'online' | 'offline' | 'checking'>('online');

  useEffect(() => {
    let active = true;
    const checkConnection = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/state', {
          method: 'HEAD',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        });
        if (active) {
          if (res.ok || res.status === 401) {
            setConnStatus('online');
          } else {
            setConnStatus('offline');
          }
        }
      } catch (err) {
        if (active) setConnStatus('offline');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000);

    const handleOnline = () => setConnStatus('online');
    const handleOffline = () => setConnStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleOpenNotes = () => {
    setNotesOpen(true);
    markNotesAsRead();
  };

  const wsColor = ws?.color || '#0A84FF';

  return (
    <>
      <header className="topbar">
        {/* Left: Mobile Menu + Title */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <button
            className="btn btn-ghost btn-icon md:hidden flex-shrink-0"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            title="Menu Sidebar"
          >
            <Menu size={18} style={{ color: 'var(--text-tertiary)' }} />
          </button>
          <div className="min-w-0">
            <h1
              className="text-base md:text-lg font-bold truncate"
              style={{
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.4px',
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className="text-[11px] hidden md:block truncate"
                style={{ color: 'var(--text-quaternary)' }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Connection Status Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: connStatus === 'online' 
                ? 'rgba(48, 209, 88, 0.12)' 
                : 'rgba(255, 69, 58, 0.12)',
              color: connStatus === 'online' 
                ? 'var(--color-green)' 
                : 'var(--color-red)',
              border: `1px solid ${connStatus === 'online' ? 'rgba(48, 209, 88, 0.2)' : 'rgba(255, 69, 58, 0.2)'}`,
            }}
            title={connStatus === 'online' ? 'Terkoneksi ke server lokal' : 'Koneksi ke server terputus'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connStatus === 'online' ? 'animate-pulse' : 'animate-ping'}`}
              style={{ 
                backgroundColor: connStatus === 'online' ? 'var(--color-green)' : 'var(--color-red)',
              }}
            />
            <span className="hidden sm:inline">
              {connStatus === 'online' ? 'LAN Online' : 'LAN Offline'}
            </span>
          </div>

          {/* Workspace pill */}
          {ws && (
            <div
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: `${wsColor}15`,
                color: wsColor,
                border: `1px solid ${wsColor}25`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: wsColor }}
              />
              <span className="truncate max-w-[120px]">{ws.name}</span>
            </div>
          )}

          {/* Share button */}
          <button
            className="btn btn-ghost btn-icon hidden md:inline-flex"
            onClick={() => setShareOpen(true)}
            title="Bagikan Akses Jaringan"
          >
            <Share2 size={17} style={{ color: 'var(--text-tertiary)' }} />
          </button>

          {/* Bell / Notifications */}
          <button
            className="btn btn-ghost btn-icon relative"
            onClick={handleOpenNotes}
            title="Catatan & Panduan"
          >
            <Bell
              size={17}
              style={{
                color: hasUnread ? 'var(--color-orange)' : 'var(--text-tertiary)',
                transition: 'color 0.2s',
              }}
            />
            {hasUnread && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{
                  background: 'var(--color-red)',
                  boxShadow: '0 0 0 2px var(--bg-surface)',
                  animation: 'pulse-blue 2s infinite',
                }}
              />
            )}
          </button>

          {/* Add Content CTA */}
          <button
            className="btn btn-primary btn-sm px-2.5 md:px-4"
            onClick={() => setAddOpen(true)}
            title="Tambah Konten"
            style={{ borderRadius: '10px' }}
          >
            <Plus size={15} />
            <span className="hidden md:inline font-semibold">Tambah Konten</span>
          </button>
        </div>
      </header>

      {addOpen && <ContentModal onClose={() => setAddOpen(false)} />}
      <NotesDrawer isOpen={notesOpen} onClose={() => setNotesOpen(false)} />
      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  );
}
