// src/components/content/AnnouncementModal.tsx
import { useEffect, useState } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';

export function AnnouncementModal() {
  const activeNotes = useAppStore(useShallow((state) => (state.notes ?? []).filter((n) => n.workspaceId === state.activeWorkspaceId)));
  const markNoteAsRead = useAppStore((state) => state.markNoteAsRead);
  const unreadNotes = activeNotes.filter((n) => !n.isRead);

  const [secondsLeft, setSecondsLeft] = useState(5);

  const currentNote = unreadNotes[0];

  // Reset timer whenever the active unread announcement changes
  useEffect(() => {
    if (currentNote) {
      setSecondsLeft(5);
    }
  }, [currentNote?.id]);

  // Handle countdown interval
  useEffect(() => {
    if (!currentNote || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentNote, secondsLeft]);

  if (!currentNote) return null;

  const handleClose = () => {
    if (secondsLeft > 0) return;
    markNoteAsRead(currentNote.id);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in"
      style={{
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div 
        className="w-full max-w-lg rounded-ios border overflow-hidden shadow-lg animate-slide-up flex flex-col"
        style={{
          background: 'var(--bg-surface-translucent)',
          borderColor: 'var(--border-color)',
          maxHeight: '85vh',
        }}
      >
        {/* Header banner */}
        <div 
          className="p-5 flex items-center gap-3 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div 
            className="w-9 h-9 rounded-ios flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-indigo), var(--color-purple))' }}
          >
            <Bell size={18} />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Pengumuman Baru
            </h2>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              Harap baca informasi penting di bawah ini
            </p>
          </div>
          {unreadNotes.length > 1 && (
            <span className="badge text-[10px]" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {unreadNotes.length} Pesan
            </span>
          )}
        </div>

        {/* Content Area */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-3">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            {currentNote.title}
          </h3>
          <p className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
            Diterbitkan pada: {new Date(currentNote.createdAt).toLocaleString('id-ID')}
          </p>
          <div 
            className="text-xs leading-relaxed whitespace-pre-wrap p-3.5 rounded-lg border bg-opacity-30"
            style={{ 
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-color)',
              background: 'var(--bg-secondary)',
            }}
          >
            {currentNote.content}
          </div>
        </div>

        {/* Footer actions */}
        <div 
          className="p-4 border-t flex justify-end items-center gap-3"
          style={{ 
            borderColor: 'var(--border-color)',
            background: 'var(--bg-hover-subtle)'
          }}
        >
          {unreadNotes.length > 1 && (
            <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
              Pesan berikutnya <ChevronRight size={13} />
            </span>
          )}
          <button
            onClick={handleClose}
            disabled={secondsLeft > 0}
            className={`btn px-5 font-semibold text-xs min-h-[36px] flex items-center justify-center transition-all ${
              secondsLeft > 0 
                ? 'opacity-60 cursor-not-allowed bg-gray-300 text-gray-500' 
                : 'btn-primary'
            }`}
            style={{
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {secondsLeft > 0 ? `Tutup (${secondsLeft}s)` : 'Tutup Pengumuman'}
          </button>
        </div>
      </div>
    </div>
  );
}
