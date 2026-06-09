// src/components/layout/NotesDrawer.tsx
import { useState } from 'react';
import { X, Plus, Trash2, StickyNote } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';
import { formatDate } from '../../lib/utils';
import { toast } from '../ui/Toast';

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotesDrawer({ isOpen, onClose }: NotesDrawerProps) {
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const notes = useAppStore(useShallow((state) => (state.notes ?? []).filter((n) => n.workspaceId === state.activeWorkspaceId)));
  const addNote = useAppStore((state) => state.addNote);
  const deleteNote = useAppStore((state) => state.deleteNote);

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');


  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Judul catatan tidak boleh kosong');
      return;
    }
    if (!content.trim()) {
      toast.error('Isi catatan tidak boleh kosong');
      return;
    }

    addNote({
      workspaceId: activeWorkspaceId!,
      title: title.trim(),
      content: content.trim(),
    });

    setTitle('');
    setContent('');
    setIsAdding(false);
    toast.success('Catatan berhasil disimpan');
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{ 
        zIndex: 1000, 
        justifyContent: 'flex-end', 
        padding: 0,
        background: 'rgba(0,0,0,0.15)'
      }}
    >
      <div 
        className="h-screen w-full max-w-[400px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.06)',
          animation: 'slideLeft 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <StickyNote size={18} style={{ color: 'var(--color-blue)' }} />
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Catatan & Panduan
            </h2>
            <span className="badge text-xs" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {notes.length}
            </span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ padding: 4 }}>
            <X size={18} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          
          {/* Add Note Button or Inline Form */}
          {!isAdding ? (
            <button 
              className="btn btn-secondary w-full justify-center py-2"
              onClick={() => setIsAdding(true)}
              style={{ borderRadius: 10, fontSize: 13, fontWeight: 600 }}
            >
              <Plus size={15} />
              Tambah Catatan Baru
            </button>
          ) : (
            <form onSubmit={handleSave} className="card p-4 flex flex-col gap-3" style={{ borderStyle: 'solid', borderColor: 'var(--border-color)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Catatan Baru
              </h3>
              <div className="form-group">
                <input
                  className="input py-1.5 text-xs"
                  placeholder="Judul catatan..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <textarea
                  className="input py-1.5 text-xs"
                  placeholder="Isi catatan / detail panduan..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  style={{ resize: 'none' }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setIsAdding(false);
                    setTitle('');
                    setContent('');
                  }}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Simpan
                </button>
              </div>
            </form>
          )}

          {/* Notes List */}
          <div className="flex flex-col gap-3">
            {notes.map((note) => (
              <div 
                key={note.id} 
                className="card p-4 flex flex-col gap-2 relative group"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
              >
                <div className="flex justify-between items-start gap-4">
                  <h4 className="text-sm font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {note.title}
                  </h4>
                  <button 
                    className="btn btn-ghost btn-icon text-red-500 hover-bg-danger"
                    style={{ padding: 4, color: 'var(--color-red)' }}
                    onClick={() => {
                      deleteNote(note.id);
                      toast.success('Catatan dihapus');
                    }}
                    title="Hapus Catatan"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <p 
                  className="text-xs leading-relaxed" 
                  style={{ 
                    color: 'var(--text-secondary)', 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {note.content}
                </p>
                  <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-quaternary)' }}>
                    <span style={{ fontSize: 9 }}>●</span> {formatDate(note.createdAt, 'd MMM yyyy, HH:mm')}
                </span>
              </div>
            ))}

            {notes.length === 0 && (
              <div className="text-center py-12 flex flex-col items-center gap-2">
                <StickyNote size={32} style={{ color: 'var(--text-quaternary)' }} />
                <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                  Tidak ada catatan di workspace ini
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
