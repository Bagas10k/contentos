// src/pages/Tasks.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2, Circle, Clock, Plus, Trash2,
  User, AlertCircle, RefreshCw, ClipboardList, Calendar,
  ShieldCheck, Search, ImageIcon, X, Eye
} from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { toast } from '../components/ui/Toast';
import { format, isBefore, parseISO, isToday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// ─── Types ──────────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  createdBy: string;
  status: 'pending' | 'completed';
  deadline?: string;
  createdAt: string;
  completedAt?: string;
  proofPhoto?: string;
}

interface UserAccount {
  username: string;
  role: string;
}

const COMPLETION_MESSAGES = [
  'Gokil! Satu tugas beres lagi. Rehat sejenak yuk, seduh kopi atau teh dulu! ☕',
  'Mantap! Kerja bagus. Kerja kerasmu hari ini keren banget! 🙌',
  'Alhamdulillah, selesai juga! Satu langkah lebih dekat ke santai-santai. 🥳',
  'Keren banget! Tugas selesai dengan mulus. Bangga deh sama kamu! ✨',
  'Boom! Selesai! Kamu luar biasa, yuk tarik napas dalam-dalam dulu. 🍃',
  'Akhirnya kelar juga! Kamu emang bisa diandalkan. Selamat istirahat sejenak! 🌟'
];

// ─── Modal: Konfirmasi Selesai + Upload Bukti ─────────────────
function CompleteTaskModal({
  task,
  onClose,
  onCompleted,
}: {
  task: Task;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const handleFileChange = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.warning('Hanya file gambar (JPG, PNG, WEBP) yang diizinkan.');
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      toast.warning('Ukuran foto maksimal 2 MB.');
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileChange(dropped);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let proofFilename: string | null = null;

      // 1. Upload photo first (if provided)
      if (file) {
        const formData = new FormData();
        formData.append('proof', file);
        const uploadRes = await fetch(`/api/tasks/${task.id}/proof`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          toast.error(uploadData.message || 'Gagal mengunggah foto bukti.');
          setLoading(false);
          return;
        }
        proofFilename = uploadData.filename;
      }

      // 2. Mark as completed with proof filename
      const res = await fetch(`/api/tasks/${task.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'completed', proofPhoto: proofFilename }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const randomMsg = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
        toast.success(randomMsg);
        onCompleted();
        onClose();
      } else {
        toast.error(data.message || 'Gagal menyelesaikan tugas.');
      }
    } catch {
      toast.error('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              ✅ Konfirmasi Penyelesaian
            </h2>
            <p className="text-xs mt-0.5 truncate max-w-[300px]" style={{ color: 'var(--text-quaternary)' }}>
              "{task.title}"
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ fontSize: 20, color: 'var(--text-tertiary)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body flex flex-col gap-4">
          {/* Detail Tugas Utama */}
          <div 
            className="rounded-[14px] p-4 flex flex-col gap-1.5"
            style={{ 
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-color)',
            }}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--color-blue)' }}>
              Tugas Yang Diselesaikan
            </span>
            <h3 className="font-bold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
              {task.title}
            </h3>
            {task.description && (
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-tertiary)', whiteSpace: 'pre-line' }}>
                {task.description}
              </p>
            )}
          </div>

          {/* Photo upload */}
          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <ImageIcon size={13} style={{ color: 'var(--color-blue)' }} />
              Unggah Bukti Foto
              <span className="font-normal text-[11px]" style={{ color: 'var(--text-quaternary)' }}>(Opsional · Maks. 2 MB)</span>
            </label>

            <div
              className="relative rounded-[12px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden"
              style={{
                borderColor: dragOver ? 'var(--color-blue)' : preview ? 'rgba(48,209,88,0.40)' : 'var(--border-color)',
                background: dragOver ? 'rgba(10,132,255,0.05)' : preview ? 'rgba(48,209,88,0.04)' : 'var(--bg-secondary)',
                minHeight: preview ? 160 : 96,
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <>
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full object-contain rounded-[10px]"
                    style={{ maxHeight: 200 }}
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center border-none cursor-pointer"
                    style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
                    onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                    title="Hapus foto"
                  >
                    <X size={12} />
                  </button>
                  <div
                    className="absolute bottom-0 left-0 right-0 text-center py-1 text-[10px] font-medium"
                    style={{ background: 'rgba(0,0,0,0.40)', color: '#fff' }}
                  >
                    {file?.name} · {file ? (file.size / 1024).toFixed(0) + ' KB' : ''}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-5">
                  <ImageIcon size={24} style={{ color: 'var(--text-quaternary)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                    Klik atau tarik foto ke sini
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
                    JPG, PNG, WEBP · Maks. 2 MB
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Batal
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ background: 'linear-gradient(135deg, #30D158, #0A84FF)' }}
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <CheckCircle2 size={15} />
                Konfirmasi Selesai
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Modal: Lihat Bukti Foto ─────────────────────────────────
function ProofPhotoModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const token = localStorage.getItem('token');
  const proofUrl = `/api/tasks/proof/${task.proofPhoto}?token=${token}`;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              📸 Bukti Penyelesaian
            </h2>
            <p className="text-xs mt-0.5 truncate max-w-[300px]" style={{ color: 'var(--text-quaternary)' }}>
              {task.title}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>
        <div className="modal-body">
          <img
            src={proofUrl}
            alt="Bukti penyelesaian"
            className="w-full rounded-[12px] object-contain"
            style={{ maxHeight: 360 }}
          />
          {task.completedAt && (
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-quaternary)' }}>
              Diselesaikan pada {format(new Date(task.completedAt), 'd MMMM yyyy · HH:mm', { locale: idLocale })}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Modal: Buat Tugas Baru (Admin) ──────────────────────────
function CreateTaskModal({
  users, onClose, onCreated,
}: {
  users: UserAccount[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle]         = useState('');
  const [description, setDesc]    = useState('');
  const [assignedTo, setAssigned] = useState(users[0]?.username || '');
  const [deadline, setDeadline]   = useState('');
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignedTo) {
      toast.warning('Judul tugas dan penerima wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description, assignedTo, deadline: deadline || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Tugas berhasil dibuat!');
        onCreated();
        onClose();
      } else {
        toast.error(data.message || 'Gagal membuat tugas.');
      }
    } catch {
      toast.error('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              ✍️ Buat Tugas Baru
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-quaternary)' }}>
              Tugaskan pekerjaan ke anggota tim
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ color: 'var(--text-tertiary)' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Judul Tugas *</label>
              <input
                type="text"
                className="input"
                placeholder="Contoh: Buat konten untuk Instagram minggu ini"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi (opsional)</label>
              <textarea
                className="input"
                placeholder="Tambahkan detail, instruksi, atau referensi..."
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">Ditugaskan ke *</label>
                <select
                  className="input select"
                  value={assignedTo}
                  onChange={(e) => setAssigned(e.target.value)}
                  disabled={loading}
                >
                  {users.map((u) => (
                    <option key={u.username} value={u.username}>
                      {u.username} {u.role === 'admin' ? '(Admin)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Deadline (opsional)</label>
                <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={loading} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <><Plus size={15} />Buat Tugas</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── TaskCard ────────────────────────────────────────────────
function TaskCard({
  task, isAdmin, currentUser, onComplete, onUndo, onDelete, onViewProof,
}: {
  task: Task;
  isAdmin: boolean;
  currentUser: string;
  onComplete: (task: Task) => void;
  onUndo: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  onViewProof: (task: Task) => void;
}) {
  const isCompleted = task.status === 'completed';
  const isOverdue   = task.deadline && !isCompleted && isBefore(parseISO(task.deadline), new Date());
  const isDueToday  = task.deadline && isToday(parseISO(task.deadline));
  const isMine      = task.assignedTo === currentUser;

  const deadlineColor = isOverdue ? 'var(--color-red)' : isDueToday ? 'var(--color-orange)' : 'var(--text-quaternary)';

  return (
    <div
      className="card p-4 transition-all"
      style={{
        opacity: isCompleted ? 0.70 : 1,
        borderLeft: isCompleted
          ? '3px solid var(--color-green)'
          : isOverdue
          ? '3px solid var(--color-red)'
          : isDueToday
          ? '3px solid var(--color-orange)'
          : '3px solid transparent',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className="flex-shrink-0 mt-0.5">
          {isCompleted ? (
            <CheckCircle2 size={22} style={{ color: 'var(--color-green)' }} />
          ) : (
            <Circle size={22} style={{ color: 'var(--text-quaternary)' }} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className="text-sm font-semibold leading-snug"
              style={{
                color: isCompleted ? 'var(--text-quaternary)' : 'var(--text-primary)',
                textDecoration: isCompleted ? 'line-through' : 'none',
                letterSpacing: '-0.2px',
              }}
            >
              {task.title}
            </p>
            {/* Admin delete */}
            {isAdmin && (
              <button
                className="flex-shrink-0 p-1 rounded-lg border-none bg-transparent cursor-pointer transition-all"
                style={{ color: 'var(--text-quaternary)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-red)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover-danger)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-quaternary)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                onClick={() => onDelete(task.id, task.title)}
                title="Hapus tugas"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          {task.description && (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              {task.description}
            </p>
          )}

          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5">
            <div
              className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: isMine ? 'rgba(10,132,255,0.10)' : 'var(--bg-tertiary)', color: isMine ? 'var(--color-blue)' : 'var(--text-tertiary)' }}
            >
              <User size={10} />
              <span>{task.assignedTo}</span>
              {isMine && <span className="font-bold">· Kamu</span>}
            </div>

            {task.deadline && (
              <div className="flex items-center gap-1 text-[11px]" style={{ color: deadlineColor }}>
                {isOverdue ? <AlertCircle size={11} /> : <Calendar size={11} />}
                <span>
                  {isOverdue ? 'Terlambat · ' : isDueToday ? 'Hari ini · ' : ''}
                  {format(parseISO(task.deadline), 'd MMM yyyy', { locale: idLocale })}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-quaternary)' }}>
              <Clock size={10} />
              <span>{format(new Date(task.createdAt), 'd MMM yyyy', { locale: idLocale })}</span>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-quaternary)' }}>
                <ShieldCheck size={10} />
                <span>oleh {task.createdBy}</span>
              </div>
            )}

            {isCompleted && task.completedAt && (
              <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(48,209,88,0.10)', color: 'var(--color-green)' }}>
                <CheckCircle2 size={10} />
                <span>Selesai {format(new Date(task.completedAt), 'd MMM yyyy', { locale: idLocale })}</span>
              </div>
            )}
          </div>

          {/* Action buttons row */}
          <div className="flex items-center gap-2 mt-3">
            {/* User: Mark complete */}
            {!isCompleted && isMine && (
              <button
                className="btn btn-sm"
                style={{
                  background: 'rgba(48,209,88,0.10)',
                  color: 'var(--color-green)',
                  border: '1px solid rgba(48,209,88,0.25)',
                  fontSize: 12,
                }}
                onClick={() => onComplete(task)}
              >
                <CheckCircle2 size={13} />
                Tandai Selesai
              </button>
            )}

            {/* Admin: Undo complete */}
            {isCompleted && isAdmin && (
              <button
                className="btn btn-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-tertiary)',
                  border: '1px solid var(--border-color)',
                  fontSize: 12,
                }}
                onClick={() => onUndo(task.id)}
              >
                <RefreshCw size={12} />
                Buka Kembali
              </button>
            )}

            {/* View proof photo */}
            {task.proofPhoto && (
              <button
                className="btn btn-sm"
                style={{
                  background: 'rgba(10,132,255,0.08)',
                  color: 'var(--color-blue)',
                  border: '1px solid rgba(10,132,255,0.20)',
                  fontSize: 12,
                }}
                onClick={() => onViewProof(task)}
              >
                <Eye size={12} />
                Lihat Bukti Foto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function Tasks() {
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [users, setUsers]               = useState<UserAccount[]>([]);
  const [loading, setLoading]           = useState(true);
  const [createOpen, setCreateOpen]     = useState(false);
  const [completeTask, setCompleteTask] = useState<Task | null>(null);
  const [proofTask, setProofTask]       = useState<Task | null>(null);
  const [filter, setFilter]             = useState<'all' | 'pending' | 'completed'>('all');
  const [search, setSearch]             = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  const userStr     = localStorage.getItem('user');
  const userInfo    = userStr ? JSON.parse(userStr) : null;
  const isAdmin     = userInfo?.role === 'admin';
  const currentUser = userInfo?.username || '';

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setTasks(await res.json());
    } catch {
      if (!silent) toast.error('Gagal memuat tugas.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUsers(await res.json());
    } catch { /* silent */ }
  }, [isAdmin]);

  // Initial load + auto-refresh polling every 10 seconds
  useEffect(() => {
    fetchTasks();
    fetchUsers();
    const interval = setInterval(() => fetchTasks(true), 10000);
    return () => clearInterval(interval);
  }, [fetchTasks, fetchUsers]);

  const handleUndo = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tasks/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'pending' }),
      });
      if (res.ok) {
        setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: 'pending', completedAt: undefined, proofPhoto: undefined } : t));
        toast.success('Tugas dibuka kembali.');
      }
    } catch { toast.error('Gagal membuka kembali tugas.'); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Hapus tugas "${title}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        toast.success('Tugas berhasil dihapus.');
      }
    } catch { toast.error('Gagal menghapus tugas.'); }
  };

  // After completing, re-fetch to get fresh proofPhoto field
  const handleCompleted = () => fetchTasks();

  // Filter & sort
  const filteredTasks = tasks
    .filter((t) => {
      const matchStatus   = filter === 'all' || t.status === filter;
      const matchSearch   = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase()) || t.assignedTo.toLowerCase().includes(search.toLowerCase());
      const matchAssignee = assigneeFilter === 'all' || t.assignedTo === assigneeFilter;
      return matchStatus && matchSearch && matchAssignee;
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });

  const pendingCount   = tasks.filter((t) => t.status === 'pending').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const overdueCount   = tasks.filter((t) => t.status === 'pending' && t.deadline && isBefore(parseISO(t.deadline), new Date())).length;
  const uniqueAssignees = [...new Set(tasks.map((t) => t.assignedTo))];

  return (
    <div className="page-enter flex flex-col h-full overflow-hidden">
      <TopBar
        title="Manajemen Tugas"
        subtitle={isAdmin ? `Admin · ${pendingCount} tugas aktif dari ${tasks.length} total` : `${pendingCount} tugas aktif untukmu`}
      />

      {/* ── Summary Toolbar ── */}
      <div
        className="px-4 md:px-6 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface-translucent)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter pills */}
            {(['all', 'pending', 'completed'] as const).map((f) => {
              const count = f === 'all' ? tasks.length : f === 'pending' ? pendingCount : completedCount;
              const color = f === 'pending' ? 'var(--color-orange)' : f === 'completed' ? 'var(--color-green)' : 'var(--text-primary)';
              const bg    = f === 'pending' ? 'rgba(255,159,10,' : f === 'completed' ? 'rgba(48,209,88,' : undefined;
              const label = f === 'all' ? 'Semua' : f === 'pending' ? 'Aktif' : 'Selesai';
              const Icon  = f === 'pending' ? Circle : f === 'completed' ? CheckCircle2 : ClipboardList;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: filter === f ? (bg ? `${bg}0.12)` : 'var(--bg-tertiary)') : 'transparent',
                    color: filter === f ? color : 'var(--text-tertiary)',
                    border: filter === f ? `1px solid ${bg ? `${bg}0.25)` : 'var(--border-color)'}` : '1px solid transparent',
                  }}
                >
                  <Icon size={12} />
                  {label}
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: bg ? `${bg}0.15)` : 'var(--bg-tertiary)', color: filter === f ? color : 'var(--text-quaternary)' }}>{count}</span>
                </button>
              );
            })}
            {overdueCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,69,58,0.10)', color: 'var(--color-red)', border: '1px solid rgba(255,69,58,0.20)' }}>
                <AlertCircle size={12} />
                {overdueCount} Terlambat
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-icon" onClick={() => fetchTasks()} title="Refresh">
              <RefreshCw size={16} style={{ color: 'var(--text-tertiary)' }} />
            </button>
            {isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} />Buat Tugas
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="page-content flex-1 min-h-0 overflow-y-auto pb-6">
        {/* Search & assignee filter */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-quaternary)' }} />
            <input type="text" className="input" style={{ paddingLeft: 36, height: 36, fontSize: 13 }} placeholder="Cari tugas..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {isAdmin && uniqueAssignees.length > 1 && (
            <select className="input select" style={{ height: 36, fontSize: 13, paddingLeft: 12, paddingRight: 32 }} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
              <option value="all">Semua anggota</option>
              {uniqueAssignees.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          )}
        </div>

        {/* Task List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-blue)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'var(--text-quaternary)' }}>Memuat tugas...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ background: 'rgba(10,132,255,0.08)' }}>
              <ClipboardList size={28} style={{ color: 'var(--color-blue)' }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {tasks.length === 0 ? (isAdmin ? 'Belum ada tugas' : 'Tidak ada tugas untukmu saat ini') : 'Tidak ada tugas yang sesuai filter'}
            </p>
            <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-quaternary)' }}>
              {tasks.length === 0 && isAdmin ? 'Buat tugas baru dan tugaskan ke anggota tim Anda.'
                : tasks.length === 0 ? 'Admin akan menugaskan pekerjaan untukmu di sini.'
                : 'Coba ubah filter atau kata kunci pencarian.'}
            </p>
            {isAdmin && tasks.length === 0 && (
              <button className="btn btn-primary btn-sm mt-2" onClick={() => setCreateOpen(true)}>
                <Plus size={14} />Buat Tugas Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isAdmin={isAdmin}
                currentUser={currentUser}
                onComplete={setCompleteTask}
                onUndo={handleUndo}
                onDelete={handleDelete}
                onViewProof={setProofTask}
              />
            ))}
          </div>
        )}
      </div>

      {createOpen && <CreateTaskModal users={users} onClose={() => setCreateOpen(false)} onCreated={() => fetchTasks()} />}
      {completeTask && <CompleteTaskModal task={completeTask} onClose={() => setCompleteTask(null)} onCompleted={handleCompleted} />}
      {proofTask && <ProofPhotoModal task={proofTask} onClose={() => setProofTask(null)} />}
    </div>
  );
}
