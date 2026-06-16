// src/pages/Settings.tsx
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Download, Upload, RotateCcw, RefreshCw, User, Lock, Shield, Trash, Database, Sun, Moon, Monitor, Maximize2, Minimize2, Type, Columns, Briefcase, Tag, Globe, Palette, Users, Smartphone, ListTodo } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/appStore';
import { TopBar } from '../components/layout/TopBar';
import type { Workspace, Category } from '../types';
import { exportBackup, importBackup } from '../lib/storage';
import { toast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import Import from './Import';
import { logActivity } from '../lib/auditLogger';

const PRESET_COLORS = [
  '#007AFF','#5856D6','#AF52DE','#FF2D55','#FF3B30',
  '#FF9500','#FFCC00','#34C759','#5AC8FA','#32ADE6',
  '#8E8E93','#1C1C1E',
];

type Tab = 'workspace' | 'categories' | 'platforms' | 'import' | 'tampilan' | 'backup' | 'app' | 'users' | 'activity' | 'tasks';

interface WorkspaceFormProps {
  existing?: Workspace;
  wsForm: Partial<Workspace> & { id?: string };
  setWsForm: React.Dispatch<React.SetStateAction<Partial<Workspace> & { id?: string }>>;
  setWsAdd: (val: boolean) => void;
  setWsEdit: (val: string | null) => void;
  handleSaveWorkspace: () => void;
}

function WorkspaceForm({
  existing,
  wsForm,
  setWsForm,
  setWsAdd,
  setWsEdit,
  handleSaveWorkspace,
}: WorkspaceFormProps) {
  return (
    <div className="card p-4 animate-slide-up">
      <h4 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
        {existing ? 'Edit Workspace' : 'Workspace Baru'}
      </h4>
      <div className="flex flex-col gap-3">
        <div className="form-group">
          <label className="form-label">Nama Workspace *</label>
          <input className="input" placeholder="Bisnis Utama" value={wsForm.name ?? ''} onChange={(e) => setWsForm({ ...wsForm, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Warna Aksen</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className="w-8 h-8 rounded-full transition-transform"
                style={{ background: c, transform: wsForm.color === c ? 'scale(1.2)' : 'scale(1)', outline: wsForm.color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
                onClick={() => setWsForm({ ...wsForm, color: c })}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4 justify-end">
        <button className="btn btn-secondary btn-sm" onClick={() => { setWsForm({}); setWsAdd(false); setWsEdit(null); }}>
          <X size={13} /> Batal
        </button>
        <button className="btn btn-primary btn-sm" onClick={handleSaveWorkspace}>
          <Save size={13} /> Simpan
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const workspaces = useAppStore((state) => state.workspaces);
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const cats = useAppStore(useShallow((state) => state.categories.filter((c) => c.workspaceId === state.activeWorkspaceId)));
  const plats = useAppStore(useShallow((state) => (state.platforms ?? []).filter((p) => p.workspaceId === state.activeWorkspaceId)));
  const activeItems = useAppStore(useShallow((state) => state.contentItems.filter((c) => c.workspaceId === state.activeWorkspaceId)));
  const contentItems = useAppStore((state) => state.contentItems);

  const addWorkspace = useAppStore((state) => state.addWorkspace);
  const updateWorkspace = useAppStore((state) => state.updateWorkspace);
  const deleteWorkspace = useAppStore((state) => state.deleteWorkspace);
  const addCategory = useAppStore((state) => state.addCategory);
  const updateCategory = useAppStore((state) => state.updateCategory);
  const deleteCategory = useAppStore((state) => state.deleteCategory);
  const addPlatform = useAppStore((state) => state.addPlatform);
  const updatePlatform = useAppStore((state) => state.updatePlatform);
  const deletePlatform = useAppStore((state) => state.deletePlatform);
  const setActiveWorkspace = useAppStore((state) => state.setActiveWorkspace);
  const restoreBackup = useAppStore((state) => state.restoreBackup);
  const resetAll = useAppStore((state) => state.resetAll);

  const [tab, setTab] = useState<Tab>('workspace');

  // Role detection
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.role === 'admin');
        setCurrentUsername(user.username);
      } catch (e) {
        console.error('Failed to parse user profile:', e);
      }
    }
  }, []);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const triggerConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }) => {
    setConfirmState({
      isOpen: true,
      ...options,
      onConfirm: () => {
        options.onConfirm();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Workspace form
  const [wsForm, setWsForm] = useState<Partial<Workspace> & { id?: string }>({});
  const [wsEdit, setWsEdit] = useState<string | null>(null);
  const [wsAdd, setWsAdd]   = useState(false);

  // Category form
  const [catForm, setCatForm] = useState<Partial<Category>>({ color: PRESET_COLORS[0] });
  const [catEdit, setCatEdit] = useState<string | null>(null);
  const [catAdd, setCatAdd]   = useState(false);

  // Platform form
  const [platForm, setPlatForm] = useState<Partial<import('../types').WorkspacePlatform>>({ color: PRESET_COLORS[0] });
  const [platEdit, setPlatEdit] = useState<string | null>(null);
  const [platAdd, setPlatAdd]   = useState(false);

  // User Management State
  const [users, setUsers] = useState<{ username: string; role: string }[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('employee');
  const [userAddLoading, setUserAddLoading] = useState(false);

  // Server-Side Backups State
  const [serverBackups, setServerBackups] = useState<{ filename: string; size: number; createdAt: string }[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);

  // Activity Log Audit Trail state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityLoading, setActivityLoading] = useState(false);

  // Task Management State
  const [settingsTasks, setSettingsTasks] = useState<any[]>([]);
  const [settingsTasksLoading, setSettingsTasksLoading] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskCreateLoading, setTaskCreateLoading] = useState(false);

  const fetchSettingsTasks = async () => {
    if (!isAdmin) return;
    setSettingsTasksLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettingsTasks(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch settings tasks:', err);
    } finally {
      setSettingsTasksLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskAssignedTo) {
      toast.warning('Judul tugas dan penerima wajib diisi');
      return;
    }

    setTaskCreateLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          assignedTo: taskAssignedTo,
          deadline: taskDeadline
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Tugas tim berhasil dibuat!');
        setTaskTitle('');
        setTaskDescription('');
        setTaskAssignedTo('');
        setTaskDeadline('');
        fetchSettingsTasks();
      } else {
        toast.error(data.message || 'Gagal membuat tugas.');
      }
    } catch (err) {
      console.error('Failed to create task:', err);
      toast.error('Gagal menghubungi server');
    } finally {
      setTaskCreateLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    triggerConfirm({
      title: 'Hapus Tugas Tim?',
      message: `Apakah Anda yakin ingin menghapus tugas "${title}"?`,
      confirmText: 'Hapus',
      type: 'danger',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success('Tugas berhasil dihapus');
            fetchSettingsTasks();
          } else {
            toast.error(data.message || 'Gagal menghapus tugas.');
          }
        } catch (err) {
          console.error(err);
          toast.error('Gagal menghubungi server');
        }
      }
    });
  };

  const fetchActivityLogs = async () => {
    if (!isAdmin) return;
    setActivityLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/activity-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleClearActivityLogs = () => {
    triggerConfirm({
      title: 'Hapus Semua Log Aktivitas?',
      message: 'Tindakan ini akan menghapus seluruh catatan audit histori aktivitas dari database secara permanen. Pengguna tidak akan bisa memulihkan data log yang terhapus.',
      confirmText: 'Hapus Semua',
      type: 'danger',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('/api/admin/activity-logs/clear', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success('Log aktivitas berhasil dibersihkan.');
            fetchActivityLogs();
          } else {
            toast.error(data.message || 'Gagal membersihkan log.');
          }
        } catch (err) {
          console.error(err);
          toast.error('Gagal menghubungi server');
        }
      }
    });
  };

  const handlePruneActivityLogs = () => {
    triggerConfirm({
      title: 'Pangkas Log Lama?',
      message: 'Apakah Anda yakin ingin memangkas log aktivitas lama dan hanya menyisakan 100 catatan log aktivitas terbaru?',
      confirmText: 'Pangkas Log',
      type: 'warning',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('/api/admin/activity-logs/prune', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ keepCount: 100 })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success('Log aktivitas berhasil dipangkas.');
            fetchActivityLogs();
          } else {
            toast.error(data.message || 'Gagal memangkas log.');
          }
        } catch (err) {
          console.error(err);
          toast.error('Gagal menghubungi server');
        }
      }
    });
  };

  // PWA Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>((window as any).deferredInstallPrompt);

  // Appearance state
  const [appearance, setAppearance] = useState(() => {
    const defaults = {
      theme: 'auto',
      density: 'standard',
      font: 'inter',
      sidebar: 'standard',
      mobileNav: 'drawer',
    };
    try {
      const stored = localStorage.getItem('contentos_appearance');
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  });

  const handleUpdateAppearance = (key: string, value: string) => {
    const next = { ...appearance, [key]: value };
    setAppearance(next);
    localStorage.setItem('contentos_appearance', JSON.stringify(next));
    window.dispatchEvent(new Event('contentos-appearance-changed'));
    toast.success('Pengaturan tampilan berhasil diperbarui');
  };

  useEffect(() => {
    const handleInstallAvailable = () => {
      setInstallPrompt((window as any).deferredInstallPrompt);
    };
    window.addEventListener('pwa-install-available', handleInstallAvailable);
    return () => window.removeEventListener('pwa-install-available', handleInstallAvailable);
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = installPrompt;
    if (!promptEvent) return;
    
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to PWA install: ${outcome}`);
    
    (window as any).deferredInstallPrompt = null;
    setInstallPrompt(null);
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchServerBackups = async () => {
    if (!isAdmin) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/backups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setServerBackups(data);
      }
    } catch (err) {
      console.error('Failed to fetch backups:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      if (tab === 'users') {
        fetchUsers();
      } else if (tab === 'backup') {
        fetchServerBackups();
      } else if (tab === 'activity') {
        fetchActivityLogs();
      } else if (tab === 'tasks') {
        fetchUsers();
        fetchSettingsTasks();
      }
    }
  }, [tab, isAdmin]);

  const handleSaveWorkspace = () => {
    if (!isAdmin) { toast.error('Hanya administrator yang dapat membuat or mengedit workspace'); return; }
    if (!wsForm.name?.trim()) { toast.error('Nama workspace tidak boleh kosong'); return; }
    if (wsEdit) {
      updateWorkspace(wsEdit, {
        name:  wsForm.name,
        color: wsForm.color,
        emoji: '',
      });
      logActivity('Mengubah Workspace', wsForm.name, 'Memperbarui nama/tema workspace');
      toast.success('Workspace diperbarui');
    } else {
      addWorkspace({
        name:  wsForm.name!,
        color: wsForm.color ?? '#007AFF',
        emoji: '',
      });
      logActivity('Menambah Workspace', wsForm.name!, 'Workspace baru dibuat');
      toast.success('Workspace baru ditambahkan');
    }
    setWsForm({}); setWsEdit(null); setWsAdd(false);
  };

  const handleSaveCategory = () => {
    if (!catForm.name?.trim()) { toast.error('Nama kategori tidak boleh kosong'); return; }
    if (catEdit) {
      updateCategory(catEdit, catForm);
      logActivity('Mengubah Pilar Konten', catForm.name, 'Memperbarui pilar konten');
      toast.success('Kategori diperbarui');
    } else {
      addCategory({ workspaceId: activeWorkspaceId!, name: catForm.name!, color: catForm.color ?? '#007AFF', description: catForm.description });
      logActivity('Menambah Pilar Konten', catForm.name!, 'Pilar konten baru ditambahkan');
      toast.success('Kategori ditambahkan');
    }
    setCatForm({ color: PRESET_COLORS[0] }); setCatEdit(null); setCatAdd(false);
  };

  const handleSavePlatform = () => {
    if (!platForm.name?.trim()) { toast.error('Nama platform tidak boleh kosong'); return; }
    if (platEdit) {
      updatePlatform(platEdit, platForm);
      logActivity('Mengubah Target Platform', platForm.name, 'Memperbarui data pengikut/target platform');
      toast.success('Platform diperbarui');
    } else {
      addPlatform({ 
        workspaceId: activeWorkspaceId!, 
        name: platForm.name!, 
        color: platForm.color ?? '#636366',
        initialFollowers: platForm.initialFollowers ?? 0,
        followerTarget: platForm.followerTarget ?? 0,
        instagramUsername: platForm.instagramUsername
      });
      logActivity('Menambah Target Platform', platForm.name!, 'Target platform baru ditambahkan');
      toast.success('Platform ditambahkan');
    }
    setPlatForm({ color: PRESET_COLORS[0] }); setPlatEdit(null); setPlatAdd(false);
  };

  const handleRestoreFile = async (file: File) => {
    try {
      const state = await importBackup(file);
      restoreBackup(state);
      logActivity('Pemulihan Data (Lokal)', file.name, 'Memulihkan database dari file backup JSON lokal');
      toast.success('Backup berhasil dipulihkan');
    } catch {
      toast.error('Gagal memulihkan backup');
    }
  };

  const handleResetAll = () => {
    triggerConfirm({
      title: 'Reset Semua Data?',
      message: 'Ini akan menghapus semua data konten, kategori, dan analytics Anda secara permanen dan kembali ke data contoh. Tindakan ini tidak bisa dibatalkan.',
      confirmText: 'Reset',
      type: 'danger',
      onConfirm: () => {
        resetAll();
        logActivity('Reset Database', 'Seluruh Data', 'Data aplikasi direset ke data contoh bawaan');
        toast.warning('Semua data direset ke data contoh');
      },
    });
  };

  // Admin User CRUD Actions
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.warning('Username dan password wajib diisi');
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(newUsername)) {
      toast.error('Username hanya boleh berisi huruf, angka, titik, dan garis bawah.');
      return;
    }

    if (newPassword.length < 4) {
      toast.error('Password minimal 4 karakter');
      return;
    }

    setUserAddLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        logActivity('Menambah Pengguna', newUsername, `Role: ${newRole}`);
        toast.success('User berhasil ditambahkan');
        setNewUsername('');
        setNewPassword('');
        setNewRole('employee');
        fetchUsers();
      } else {
        toast.error(data.message || 'Gagal menambahkan user.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghubungi server');
    } finally {
      setUserAddLoading(false);
    }
  };

  const handleDeleteUser = (username: string) => {
    if (username === currentUsername) {
      toast.error('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }
    triggerConfirm({
      title: 'Hapus Pengguna?',
      message: `Apakah Anda yakin ingin menghapus user "${username}"? Akun ini tidak akan bisa digunakan untuk login lagi.`,
      confirmText: 'Hapus User',
      type: 'danger',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/admin/users/${username}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            logActivity('Menghapus Pengguna', username, 'Menghapus akun pengguna dari database');
            toast.success('User berhasil dihapus');
            fetchUsers();
          } else {
            toast.error(data.message || 'Gagal menghapus user.');
          }
        } catch (err) {
          console.error(err);
          toast.error('Gagal menghubungi server');
        }
      }
    });
  };

  // Server-Side Backups Actions
  const handleCreateServerBackup = async () => {
    setBackupLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        logActivity('Membuat Backup (Server)', data.message.split(': ')[1] || 'database.db', 'Membuat cadangan database manual di server');
        toast.success('Backup server berhasil dibuat');
        fetchServerBackups();
      } else {
        toast.error(data.message || 'Gagal membuat backup di server.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghubungi server');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreServerBackup = (filename: string) => {
    triggerConfirm({
      title: 'Pulihkan Database Server?',
      message: `Apakah Anda yakin ingin memulihkan database ke cadangan "${filename}"? Tindakan ini akan menimpa seluruh data saat ini. Aplikasi akan dimuat ulang otomatis setelah pemulihan selesai.`,
      confirmText: 'Pulihkan Data',
      type: 'warning',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/admin/backups/${filename}/restore`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            logActivity('Pemulihan Database (Server)', filename, 'Memulihkan database server ke titik cadangan');
            toast.success('Database berhasil dipulihkan!');
            setTimeout(() => window.location.reload(), 1500);
          } else {
            toast.error(data.message || 'Gagal memulihkan database.');
          }
        } catch (err) {
          console.error(err);
          toast.error('Gagal memproses pemulihan data.');
        }
      }
    });
  };

  const handleDeleteServerBackup = (filename: string) => {
    triggerConfirm({
      title: 'Hapus File Backup?',
      message: `Apakah Anda yakin ingin menghapus berkas cadangan "${filename}" secara permanen dari penyimpanan server?`,
      confirmText: 'Hapus Berkas',
      type: 'danger',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/admin/backups/${filename}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            logActivity('Menghapus File Backup', filename, 'Menghapus file cadangan biner dari disk server');
            toast.success('File backup dihapus');
            fetchServerBackups();
          } else {
            toast.error(data.message || 'Gagal menghapus backup.');
          }
        } catch (err) {
          console.error(err);
          toast.error('Gagal menghubungi server');
        }
      }
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="page-enter flex flex-col md:h-full md:overflow-hidden">
      <TopBar title="Settings" subtitle="Kelola workspace dan preferensi aplikasi" />
      <div className="page-content max-w-6xl w-full flex-1 md:min-h-0 md:overflow-hidden flex flex-col">
        <div className="flex flex-col md:flex-row gap-8 flex-1 md:min-h-0 md:overflow-hidden">
          {/* Left Navigation Stack (Tabs) */}
          <div className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden pb-3 md:pb-2 md:pr-4 whitespace-nowrap md:whitespace-normal border-b md:border-b-0 md:border-r" style={{ borderColor: 'var(--border-color)' }}>
            {([
              ['workspace', 'Workspace', Briefcase],
              ['categories', 'Content Pillars', Tag],
              ['platforms', 'Target Platforms', Globe],
              ['import', 'Impor Data', Upload],
              ['tampilan', 'Tampilan Web', Palette],
              ['backup', 'Backup & Data', Database],
              ['app', 'Aplikasi PWA', Smartphone],
              ...(isAdmin ? [
                ['tasks', 'Tugas Tim', ListTodo],
                ['users', 'Manajemen User', Users],
                ['activity', 'Log Aktivitas', Shield]
              ] : [])
            ] as [Tab, string, React.ComponentType<any>][]).map(([id, label, Icon]) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer text-left w-auto md:w-full ${
                    active 
                      ? 'bg-[rgba(0,122,255,0.08)] text-[var(--color-blue)] shadow-sm' 
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                  style={{
                    border: 'none',
                    background: active ? 'rgba(0,122,255,0.08)' : 'transparent',
                  }}
                >
                  <Icon size={16} className={active ? 'text-[var(--color-blue)]' : 'text-[var(--text-quaternary)]'} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Right Tab Content Panel */}
          <div className="flex-1 w-full min-w-0 md:overflow-y-auto md:h-full px-4 py-2">
            {/* ── Workspace Tab ── */}
            {tab === 'workspace' && (
          <div className="flex flex-col gap-6 pb-10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Workspace Saya ({workspaces.length})</p>
              {isAdmin && (
                <button className="btn btn-primary btn-sm" onClick={() => { setWsAdd(true); setWsForm({ color: '#007AFF', emoji: '' }); }}>
                  <Plus size={13} /> Tambah
                </button>
              )}
            </div>

            {wsAdd && !wsEdit && (
              <WorkspaceForm
                wsForm={wsForm}
                setWsForm={setWsForm}
                setWsAdd={setWsAdd}
                setWsEdit={setWsEdit}
                handleSaveWorkspace={handleSaveWorkspace}
              />
            )}

            {workspaces.map((ws) => (
              <div key={ws.id}>
                {wsEdit === ws.id ? (
                  <WorkspaceForm
                    existing={ws}
                    wsForm={wsForm}
                    setWsForm={setWsForm}
                    setWsAdd={setWsAdd}
                    setWsEdit={setWsEdit}
                    handleSaveWorkspace={handleSaveWorkspace}
                  />
                ) : (
                  <div className="card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-ios flex items-center justify-center text-sm font-bold" style={{ background: `${ws.color}18`, color: ws.color }}>
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ws.name}</p>
                        {ws.id === activeWorkspaceId && (
                          <span className="badge text-xs" style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--color-blue)' }}>Aktif</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {ws.id !== activeWorkspaceId && (
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setActiveWorkspace(ws.id)} title="Set aktif">
                          <RefreshCw size={14} />
                        </button>
                      )}
                      {isAdmin && (
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setWsEdit(ws.id); setWsAdd(false); setWsForm(ws); }}>
                          <Edit2 size={14} />
                        </button>
                      )}
                      {isAdmin && workspaces.length > 1 && (
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-red)' }}
                          onClick={() => {
                            triggerConfirm({
                              title: 'Hapus Workspace?',
                              message: `Apakah Anda yakin ingin menghapus workspace "${ws.name}"? Semua kategori, platform, dan konten terkait akan ikut terhapus.`,
                              confirmText: 'Hapus Workspace',
                              type: 'danger',
                              onConfirm: () => {
                                deleteWorkspace(ws.id);
                                logActivity('Menghapus Workspace', ws.name, 'Menghapus workspace beserta seluruh konten dan kategori terkait');
                                toast.success('Workspace deleted');
                              },
                            });
                          }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Categories Tab ── */}
        {tab === 'categories' && (
          <div className="flex flex-col gap-6 pb-10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Content Pillars ({cats.length})</p>
              <button className="btn btn-primary btn-sm" onClick={() => { setCatAdd(true); setCatForm({ color: PRESET_COLORS[0] }); }}>
                <Plus size={13} /> Tambah
              </button>
            </div>

            {catAdd && !catEdit && (
              <div className="card p-4 animate-slide-up">
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label">Nama Pillar *</label>
                      <input className="input" placeholder="Edukasi Tech" value={catForm.name ?? ''} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Deskripsi</label>
                      <input className="input" placeholder="Opsional" value={catForm.description ?? ''} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                     <label className="form-label">Warna</label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((c) => (
                        <button key={c} className="w-7 h-7 rounded-full transition-transform"
                          style={{ background: c, transform: catForm.color === c ? 'scale(1.2)' : 'scale(1)', outline: catForm.color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
                          onClick={() => setCatForm({ ...catForm, color: c })} />
                      ))}
                      <input type="color" className="w-7 h-7 rounded-full cursor-pointer border-0" value={catForm.color ?? '#007AFF'} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} title="Custom color" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <button className="btn btn-secondary btn-sm" onClick={() => { setCatAdd(false); setCatEdit(null); setCatForm({ color: PRESET_COLORS[0] }); }}><X size={13}/> Batal</button>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveCategory}><Save size={13}/> Simpan</button>
                </div>
              </div>
            )}

            {cats.map((cat) => (
              <div key={cat.id}>
                {catEdit === cat.id ? (
                  <div className="card p-4 animate-slide-up">
                    <div className="flex flex-col gap-3">
                      <input className="input" value={catForm.name ?? ''} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((c) => (
                          <button key={c} className="w-7 h-7 rounded-full transition-transform"
                            style={{ background: c, transform: catForm.color === c ? 'scale(1.2)' : 'scale(1)', outline: catForm.color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
                            onClick={() => setCatForm({ ...catForm, color: c })} />
                        ))}
                        <input type="color" className="w-7 h-7 rounded-full cursor-pointer border-0" value={catForm.color ?? cat.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 justify-end">
                      <button className="btn btn-secondary btn-sm" onClick={() => setCatEdit(null)}><X size={13}/> Batal</button>
                      <button className="btn btn-primary btn-sm" onClick={handleSaveCategory}><Save size={13}/> Simpan</button>
                    </div>
                  </div>
                ) : (
                  <div className="card p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-ios flex-shrink-0" style={{ background: cat.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{cat.name}</p>
                      {cat.description && <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>{cat.description}</p>}
                      <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                        {activeItems.filter((c) => c.categoryId === cat.id).length} konten
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setCatEdit(cat.id); setCatAdd(false); setCatForm(cat); }}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-red)' }}
                        onClick={() => {
                          const used = activeItems.filter((c) => c.categoryId === cat.id).length;
                          const performDelete = () => {
                            deleteCategory(cat.id);
                            logActivity('Menghapus Pilar Konten', cat.name, `Pilar ID: ${cat.id}`);
                            toast.success('Kategori dihapus');
                          };
                          if (used > 0) {
                            triggerConfirm({
                              title: 'Hapus Content Pillar?',
                              message: `Content pillar "${cat.name}" saat ini digunakan oleh ${used} konten. Menghapusnya tetap dilakukan?`,
                              confirmText: 'Tetap Hapus',
                              type: 'danger',
                              onConfirm: performDelete,
                            });
                          } else {
                            triggerConfirm({
                              title: 'Hapus Content Pillar?',
                              message: `Apakah Anda yakin ingin menghapus content pillar "${cat.name}"?`,
                              confirmText: 'Hapus',
                              type: 'danger',
                              onConfirm: performDelete,
                            });
                          }
                        }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {cats.length === 0 && (
              <div className="card">
                <div className="empty-state">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Belum ada kategori</p>
                  <p className="text-sm" style={{ color: 'var(--text-quaternary)' }}>Buat content pillar pertamamu</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Platforms Tab ── */}
        {tab === 'platforms' && (
          <div className="flex flex-col gap-6 pb-10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Target Platforms ({plats.length})</p>
              <button className="btn btn-primary btn-sm" onClick={() => { setPlatAdd(true); setPlatForm({ color: PRESET_COLORS[0] }); }}>
                <Plus size={13} /> Tambah
              </button>
            </div>

            {platAdd && !platEdit && (
              <div className="card p-4 animate-slide-up">
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label">Nama Platform *</label>
                      <input className="input" placeholder="e.g. TikTok, Pinterest" value={platForm.name ?? ''} onChange={(e) => setPlatForm({ ...platForm, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Warna Aksen</label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((c) => (
                          <button key={c} className="w-7 h-7 rounded-full transition-transform"
                            style={{ background: c, transform: platForm.color === c ? 'scale(1.2)' : 'scale(1)', outline: platForm.color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
                            onClick={() => setPlatForm({ ...platForm, color: c })} />
                        ))}
                        <input type="color" className="w-7 h-7 rounded-full cursor-pointer border-0" value={platForm.color ?? '#636366'} onChange={(e) => setPlatForm({ ...platForm, color: e.target.value })} title="Custom color" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label">Follower Awal (Initial)</label>
                      <input type="number" className="input" placeholder="Contoh: 1000" value={platForm.initialFollowers ?? ''} onChange={(e) => setPlatForm({ ...platForm, initialFollowers: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Target Followers (Goal)</label>
                      <input type="number" className="input" placeholder="Contoh: 5000" value={platForm.followerTarget ?? ''} onChange={(e) => setPlatForm({ ...platForm, followerTarget: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                  {platForm.name === 'Instagram' && (
                    <div className="form-group animate-fade-in">
                      <label className="form-label">Username Instagram (Tarik Otomatis Harian)</label>
                      <input type="text" className="input" placeholder="Contoh: bisnis_saya" value={platForm.instagramUsername ?? ''} onChange={(e) => setPlatForm({ ...platForm, instagramUsername: e.target.value })} />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <button className="btn btn-secondary btn-sm" onClick={() => { setPlatAdd(false); setPlatEdit(null); setPlatForm({ color: PRESET_COLORS[0] }); }}><X size={13}/> Batal</button>
                  <button className="btn btn-primary btn-sm" onClick={handleSavePlatform}><Save size={13}/> Simpan</button>
                </div>
              </div>
            )}

            {plats.map((p) => (
              <div key={p.id}>
                {platEdit === p.id ? (
                  <div className="card p-4 animate-slide-up">
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="form-group">
                          <label className="form-label">Nama Platform *</label>
                          <input className="input" value={platForm.name ?? ''} onChange={(e) => setPlatForm({ ...platForm, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Warna Aksen</label>
                          <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((c) => (
                              <button key={c} className="w-7 h-7 rounded-full transition-transform"
                                style={{ background: c, transform: platForm.color === c ? 'scale(1.2)' : 'scale(1)', outline: platForm.color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
                                onClick={() => setPlatForm({ ...platForm, color: c })} />
                            ))}
                            <input type="color" className="w-7 h-7 rounded-full cursor-pointer border-0" value={platForm.color ?? p.color} onChange={(e) => setPlatForm({ ...platForm, color: e.target.value })} />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="form-group">
                          <label className="form-label">Follower Awal (Initial)</label>
                          <input type="number" className="input" placeholder="Contoh: 1000" value={platForm.initialFollowers ?? ''} onChange={(e) => setPlatForm({ ...platForm, initialFollowers: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="form-group">
                           <label className="form-label">Target Followers (Goal)</label>
                          <input type="number" className="input" placeholder="Contoh: 5000" value={platForm.followerTarget ?? ''} onChange={(e) => setPlatForm({ ...platForm, followerTarget: parseInt(e.target.value) || 0 })} />
                        </div>
                      </div>
                      {platForm.name === 'Instagram' && (
                        <div className="form-group animate-fade-in">
                          <label className="form-label">Username Instagram (Tarik Otomatis Harian)</label>
                          <input type="text" className="input" placeholder="Contoh: bisnis_saya" value={platForm.instagramUsername ?? ''} onChange={(e) => setPlatForm({ ...platForm, instagramUsername: e.target.value })} />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3 justify-end">
                      <button className="btn btn-secondary btn-sm" onClick={() => setPlatEdit(null)}><X size={13}/> Batal</button>
                      <button className="btn btn-primary btn-sm" onClick={handleSavePlatform}><Save size={13}/> Simpan</button>
                    </div>
                  </div>
                ) : (
                  <div className="card p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-ios flex-shrink-0" style={{ background: p.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                        Follower Awal: {(p.initialFollowers ?? 0).toLocaleString()} · Target: {(p.followerTarget ?? 0).toLocaleString()}
                      </p>
                      {p.name === 'Instagram' && p.instagramUsername && (
                        <p className="text-xs font-semibold" style={{ color: '#E1306C', marginTop: 1, marginBottom: 1 }}>
                          Username IG: @{p.instagramUsername}
                        </p>
                      )}
                      <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                        {activeItems.filter((c) => c.platform === p.name).length} konten
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setPlatEdit(p.id); setPlatAdd(false); setPlatForm(p); }}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-red)' }}
                        onClick={() => {
                          const used = activeItems.filter((c) => c.platform === p.name).length;
                          const performDelete = () => {
                            deletePlatform(p.id);
                            logActivity('Menghapus Target Platform', p.name, `Platform ID: ${p.id}`);
                            toast.success('Platform dihapus');
                          };
                          if (used > 0) {
                            triggerConfirm({
                              title: 'Hapus Target Platform?',
                              message: `Platform "${p.name}" saat ini digunakan oleh ${used} konten. Menghapusnya tetap dilakukan?`,
                              confirmText: 'Tetap Hapus',
                              type: 'danger',
                              onConfirm: performDelete,
                            });
                          } else {
                            triggerConfirm({
                              title: 'Hapus Target Platform?',
                              message: `Apakah Anda yakin ingin menghapus platform "${p.name}"?`,
                              confirmText: 'Hapus',
                              type: 'danger',
                              onConfirm: performDelete,
                            });
                          }
                        }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {plats.length === 0 && (
              <div className="card">
                <div className="empty-state">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Belum ada platform</p>
                  <p className="text-sm" style={{ color: 'var(--text-quaternary)' }}>Buat target platform pertamamu</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Import Tab ── */}
        {tab === 'import' && (
          <div className="flex flex-col gap-6 pb-10 animate-fade-in">
            <Import hideTopBar={true} />
          </div>
        )}

        {/* ── Backup Tab ── */}
        {tab === 'backup' && (
          isAdmin ? (
            <div className="flex flex-col lg:flex-row gap-6 pb-10 animate-fade-in items-start w-full">
              {/* Left side: Backups Table (takes up remaining space) */}
              <div className="card p-5 flex flex-col gap-4 flex-1 w-full min-w-0">
                <div className="flex items-center justify-between border-b pb-3 mb-1" style={{ borderColor: 'var(--border-color)' }}>
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Server Database Backups (SQLite)</h3>
                    <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                      Daftar cadangan database biner `.db` yang tersimpan langsung di server (Maksimal 10 cadangan rolling otomatis).
                    </p>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm flex-shrink-0"
                    onClick={handleCreateServerBackup}
                    disabled={backupLoading}
                  >
                    {backupLoading ? <RefreshCw size={13} className="animate-spin" /> : <Database size={13} />}
                    Buat Backup Server
                  </button>
                </div>

                <div className="overflow-auto max-h-[420px] pr-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b sticky top-0 z-10" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
                        <th className="py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500" style={{ color: 'var(--text-quaternary)', backgroundColor: 'var(--bg-surface)' }}>Nama File</th>
                        <th className="py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500" style={{ color: 'var(--text-quaternary)', backgroundColor: 'var(--bg-surface)' }}>Tanggal Pembuatan</th>
                        <th className="py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500" style={{ color: 'var(--text-quaternary)', backgroundColor: 'var(--bg-surface)' }}>Ukuran</th>
                        <th className="py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right" style={{ color: 'var(--text-quaternary)', backgroundColor: 'var(--bg-surface)' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serverBackups.map((b) => (
                        <tr key={b.filename} className="border-b hover-bg-subtle transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                          <td className="py-3 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                            {b.filename}
                            {b.filename.startsWith('auto-') && (
                              <span className="badge text-[9px] py-0.5 px-1.5 ml-2" style={{ background: 'rgba(52,199,89,0.1)', color: 'var(--color-green)' }}>Auto</span>
                            )}
                            {b.filename.startsWith('manual-') && (
                              <span className="badge text-[9px] py-0.5 px-1.5 ml-2" style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--color-blue)' }}>Manual</span>
                            )}
                          </td>
                          <td className="py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {new Date(b.createdAt).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {formatBytes(b.size)}
                          </td>
                          <td className="py-3 text-xs text-right">
                            <div className="flex gap-1 justify-end">
                              <button 
                                className="btn btn-secondary btn-sm" 
                                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '5px' }}
                                onClick={() => handleRestoreServerBackup(b.filename)}
                              >
                                Restore
                              </button>
                              <button 
                                className="btn btn-ghost btn-icon btn-sm" 
                                style={{ color: 'var(--color-red)' }}
                                onClick={() => handleDeleteServerBackup(b.filename)}
                              >
                                <Trash size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {serverBackups.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-xs" style={{ color: 'var(--text-quaternary)' }}>
                            Belum ada file backup biner di server.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right side: Backup Actions stack */}
              <div className="w-full lg:w-80 flex flex-col gap-6 flex-shrink-0">
                {/* Export Backup (JSON) */}
                <div className="card p-5">
                  <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Export Backup (JSON)</h3>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-quaternary)' }}>
                    Download data ke file `.json` lokal.
                  </p>
                  <button className="btn btn-secondary w-full justify-center" onClick={() => { exportBackup(); toast.success('Backup berhasil didownload'); }}>
                    <Download size={15} /> Download Backup
                  </button>
                </div>

                {/* Import Backup (JSON) */}
                <div className="card p-5">
                  <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Import Backup (JSON)</h3>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-quaternary)' }}>
                    Pulihkan data dari file `.json` eksternal.
                  </p>
                  <label className="btn btn-secondary w-full justify-center cursor-pointer">
                    <Upload size={15} /> Pilih File Backup
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleRestoreFile(e.target.files[0])}
                    />
                  </label>
                </div>

                {/* Reset Data */}
                <div className="card p-5" style={{ borderColor: 'rgba(255,59,48,0.2)' }}>
                  <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-red)' }}>Reset Data</h3>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-quaternary)' }}>
                    Hapus konten dan kembali ke data contoh.
                  </p>
                  <button className="btn btn-danger w-full justify-center" onClick={handleResetAll}>
                    <RotateCcw size={15} /> Reset Semua Data
                  </button>
                </div>

                {/* Storage Info */}
                <div className="card p-5" style={{ background: 'var(--bg-secondary)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-quaternary)' }}>INFO PENYIMPANAN</p>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Workspace</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{workspaces.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Konten</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{contentItems.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 pb-10 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Export Backup (JSON)</h3>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-quaternary)' }}>
                    Download semua data sebagai file `.json` lokal ke komputer/flashdisk Anda.
                  </p>
                  <button className="btn btn-secondary w-full justify-center" onClick={() => { exportBackup(); toast.success('Backup berhasil didownload'); }}>
                    <Download size={15} /> Download Backup
                  </button>
                </div>

                <div className="card p-5">
                  <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Import Backup (JSON)</h3>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-quaternary)' }}>
                    Pulihkan data dari file backup `.json` eksternal yang sebelumnya Anda unduh.
                  </p>
                  <label className="btn btn-secondary w-full justify-center cursor-pointer">
                    <Upload size={15} /> Pilih File Backup
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleRestoreFile(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              <div className="card p-5" style={{ borderColor: 'rgba(255,59,48,0.2)' }}>
                <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-red)' }}>Reset Data</h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text-quaternary)' }}>
                  Hapus semua data konten dan kembali ke data contoh. Tindakan ini tidak bisa dibatalkan.
                </p>
                <button className="btn btn-danger" onClick={handleResetAll}>
                  <RotateCcw size={15} /> Reset Semua Data
                </button>
              </div>

              <div className="card p-5" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-quaternary)' }}>INFO PENYIMPANAN</p>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Workspace</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{workspaces.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Konten</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{contentItems.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* ── Admin User Management Tab ── */}
        {tab === 'users' && isAdmin && (
          <div className="flex flex-col gap-6 pb-10 animate-fade-in">
            {/* Add User Form */}
            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Tambah Pengguna Baru</h3>
              <form onSubmit={handleAddUser} className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="form-group col-span-1">
                    <label className="form-label">Username *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-gray-400" style={{ color: 'var(--text-quaternary)' }}>
                        <User size={15} />
                      </span>
                      <input
                        type="text"
                        className="input"
                        style={{ paddingLeft: '32px' }}
                        placeholder="contoh: budi"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        disabled={userAddLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="form-group col-span-1">
                    <label className="form-label">Password *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-gray-400" style={{ color: 'var(--text-quaternary)' }}>
                        <Lock size={15} />
                      </span>
                      <input
                        type="password"
                        className="input"
                        style={{ paddingLeft: '32px' }}
                        placeholder="min. 4 karakter"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={userAddLoading}
                      />
                    </div>
                  </div>

                  <div className="form-group col-span-1">
                    <label className="form-label">Peran (Role) *</label>
                    <select
                      className="input select"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      disabled={userAddLoading}
                    >
                      <option value="employee">Employee (Staf)</option>
                      <option value="admin">Admin (Lengkap)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-sm"
                    disabled={userAddLoading}
                  >
                    {userAddLoading ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                    Daftarkan User
                  </button>
                </div>
              </form>
            </div>

            {/* Users List */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold px-1" style={{ color: 'var(--text-primary)' }}>Daftar Karyawan Terdaftar ({users.length})</p>
              
              {users.map((u) => (
                <div key={u.username} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ 
                        background: u.role === 'admin' ? 'rgba(255,149,0,0.1)' : 'rgba(0,122,255,0.1)', 
                        color: u.role === 'admin' ? 'var(--color-orange)' : 'var(--color-blue)' 
                      }}
                    >
                      {u.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {u.username}
                        {u.username === currentUsername && (
                          <span className="badge text-[9px] py-0.5 px-1.5 ml-2" style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--color-blue)' }}>Anda</span>
                        )}
                      </p>
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-quaternary)' }}>
                        <Shield size={11} style={{ color: u.role === 'admin' ? 'var(--color-orange)' : 'var(--text-quaternary)' }} />
                        {u.role === 'admin' ? 'Administrator' : 'Karyawan / Staff'}
                      </p>
                    </div>
                  </div>

                  {u.username !== currentUsername && (
                    <button 
                      className="btn btn-ghost btn-icon btn-sm text-red-500 hover-bg-danger transition-colors"
                      style={{ color: 'var(--color-red)' }}
                      onClick={() => handleDeleteUser(u.username)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PWA App Tab ── */}
        {tab === 'app' && (
          <div className="flex flex-col gap-6 pb-10 animate-fade-in">
            <div className="card p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b pb-3 mb-1" style={{ borderColor: 'var(--border-color)' }}>
                <img src="/app-icon.png" alt="App Icon" className="w-12 h-12 rounded-ios shadow-sm object-cover" />
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>ContentOS Mobile App</h3>
                  <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                    Instal dasbor ini ke layar utama ponsel atau komputer Anda untuk akses instan dan tampilan penuh layar.
                  </p>
                </div>
              </div>

              {installPrompt ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Perangkat Anda mendukung instalasi cepat satu-klik. Klik tombol di bawah untuk memasang.
                  </p>
                  <button 
                    className="btn btn-primary w-full justify-center py-2.5 font-semibold" 
                    onClick={handleInstallClick}
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  >
                    Instal Aplikasi ContentOS
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-ios border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-blue)' }}>Panduan Instalasi Ponsel</p>
                    
                    <div className="flex flex-col gap-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      <div>
                        <p className="font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Untuk Android (Google Chrome / Edge):</p>
                        <p>Buka menu Chrome (titik tiga di kanan atas) lalu pilih <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Instal Aplikasi"</strong>.</p>
                      </div>
                      <div className="border-t pt-2" style={{ borderColor: 'var(--border-color)' }}>
                        <p className="font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Untuk iPhone / iPad (Safari):</p>
                        <p>Ketuk tombol <strong>Share</strong> (ikon kotak dengan panah ke atas) di bagian bawah layar Safari, lalu pilih <strong>"Tambahkan ke Layar Utama"</strong> (Add to Home Screen).</p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-center" style={{ color: 'var(--text-quaternary)' }}>
                    Aplikasi ini memanfaatkan teknologi Progressive Web App (PWA) untuk memberikan kecepatan dan kinerja maksimal secara offline.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tampilan Web Tab ── */}
        {tab === 'tampilan' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Tema Panel */}
            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Tema Aplikasi</h3>
              <p className="text-xs mb-4" style={{ color: 'var(--text-quaternary)' }}>
                Pilih tema gelap untuk kenyamanan mata di malam hari, atau ikuti preferensi sistem perangkat Anda.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'light', label: 'Terang', icon: Sun, desc: 'Tampilan bersih & kontras tinggi' },
                  { id: 'dark', label: 'Gelap', icon: Moon, desc: 'Lebih teduh untuk mata Anda' },
                  { id: 'auto', label: 'Sistem', icon: Monitor, desc: 'Ikuti setelan perangkat' },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = appearance.theme === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="flex flex-col items-center justify-center p-4 rounded-ios border text-center transition-all hover-bg-subtle"
                      style={{
                        background: active ? 'rgba(0,122,255,0.06)' : 'var(--bg-surface)',
                        borderColor: active ? 'var(--color-blue)' : 'var(--border-color)',
                      }}
                      onClick={() => handleUpdateAppearance('theme', item.id)}
                    >
                      <Icon size={20} className="mb-2" style={{ color: active ? 'var(--color-blue)' : 'var(--text-secondary)' }} />
                      <span className="text-xs font-semibold block mb-0.5" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-quaternary)', lineHeight: 1.2 }}>{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Density Panel */}
            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Kerapatan Tata Letak (Density)</h3>
              <p className="text-xs mb-4" style={{ color: 'var(--text-quaternary)' }}>
                Ubah kerapatan elemen tata letak. Mode ringkas sangat direkomendasikan untuk memaksimalkan area kerja 100vh di layar laptop.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'cozy', label: 'Nyaman', icon: Maximize2, desc: 'Padding longgar & lega' },
                  { id: 'standard', label: 'Standar', icon: Columns, desc: 'Default tata letak sistem' },
                  { id: 'compact', label: 'Ringkas', icon: Minimize2, desc: 'Padding & font hemat ruang' },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = appearance.density === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="flex flex-col items-center justify-center p-4 rounded-ios border text-center transition-all hover-bg-subtle"
                      style={{
                        background: active ? 'rgba(0,122,255,0.06)' : 'var(--bg-surface)',
                        borderColor: active ? 'var(--color-blue)' : 'var(--border-color)',
                      }}
                      onClick={() => handleUpdateAppearance('density', item.id)}
                    >
                      <Icon size={20} className="mb-2" style={{ color: active ? 'var(--color-blue)' : 'var(--text-secondary)' }} />
                      <span className="text-xs font-semibold block mb-0.5" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-quaternary)', lineHeight: 1.2 }}>{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Family Panel */}
            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Gaya Font</h3>
              <p className="text-xs mb-4" style={{ color: 'var(--text-quaternary)' }}>
                Ganti tipe huruf antarmuka web sesuai kesukaan Anda.
              </p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { id: 'inter', label: 'Inter', desc: 'Modern geometric' },
                  { id: 'system', label: 'System UI', desc: 'Bawaan OS Anda' },
                  { id: 'outfit', label: 'Outfit', desc: 'Sleek rounded shape' },
                  { id: 'roboto', label: 'Roboto', desc: 'Clean neo-grotesque' },
                ].map((item) => {
                  const active = appearance.font === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="flex flex-col items-center justify-center p-4 rounded-ios border text-center transition-all hover-bg-subtle"
                      style={{
                        background: active ? 'rgba(0,122,255,0.06)' : 'var(--bg-surface)',
                        borderColor: active ? 'var(--color-blue)' : 'var(--border-color)',
                      }}
                      onClick={() => handleUpdateAppearance('font', item.id)}
                    >
                      <Type size={20} className="mb-2" style={{ color: active ? 'var(--color-blue)' : 'var(--text-secondary)' }} />
                      <span className="text-xs font-semibold block mb-0.5" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-quaternary)', lineHeight: 1.2 }}>{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Style Panel */}
            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Gaya Navigasi Sidebar</h3>
              <p className="text-xs mb-4" style={{ color: 'var(--text-quaternary)' }}>
                Pilih antara sidebar lebar standar atau sidebar ringkas yang hanya menampilkan ikon untuk memperluas ruang fokus konten.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'standard', label: 'Sidebar Standar', desc: 'Lebar penuh dengan teks & ikon lengkap' },
                  { id: 'compact', label: 'Sidebar Ringkas (Ikon)', desc: 'Hanya ikon untuk area kerja lebih luas' },
                ].map((item) => {
                  const active = appearance.sidebar === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="flex flex-col items-center justify-center p-4 rounded-ios border text-center transition-all hover-bg-subtle"
                      style={{
                        background: active ? 'rgba(0,122,255,0.06)' : 'var(--bg-surface)',
                        borderColor: active ? 'var(--color-blue)' : 'var(--border-color)',
                      }}
                      onClick={() => handleUpdateAppearance('sidebar', item.id)}
                    >
                      <Columns size={20} className="mb-2" style={{ color: active ? 'var(--color-blue)' : 'var(--text-secondary)', transform: item.id === 'compact' ? 'scaleX(0.7)' : 'none' }} />
                      <span className="text-xs font-semibold block mb-0.5" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-quaternary)', lineHeight: 1.2 }}>{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Navigation Style Panel */}
            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Gaya Navigasi Mobile</h3>
              <p className="text-xs mb-4" style={{ color: 'var(--text-quaternary)' }}>
                Pilih gaya navigasi saat aplikasi diakses lewat perangkat mobile (HP).
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'drawer', label: 'Laci Geser (Drawer)', desc: 'Menu samping dengan tombol hamburger atas' },
                  { id: 'bottom', label: 'Bilah Bawah (Bottom Bar)', desc: 'Navigasi cepat di bawah seperti Instagram/WA' },
                ].map((item) => {
                  const active = (appearance.mobileNav || 'drawer') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="flex flex-col items-center justify-center p-4 rounded-ios border text-center transition-all hover-bg-subtle"
                      style={{
                        background: active ? 'rgba(0,122,255,0.06)' : 'var(--bg-surface)',
                        borderColor: active ? 'var(--color-blue)' : 'var(--border-color)',
                      }}
                      onClick={() => handleUpdateAppearance('mobileNav', item.id)}
                    >
                      <Smartphone size={20} className="mb-2" style={{ color: active ? 'var(--color-blue)' : 'var(--text-secondary)' }} />
                      <span className="text-xs font-semibold block mb-0.5" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-quaternary)', lineHeight: 1.2 }}>{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Tugas Tim Tab ── */}
        {tab === 'tasks' && isAdmin && (
          <div className="flex flex-col gap-6 pb-10 animate-fade-in w-full min-w-0">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Tugas Tim</h3>
              <p className="text-xs text-[var(--text-tertiary)]">Kelola dan tugaskan pekerjaan ke anggota tim</p>
            </div>

            {/* Form Buat Tugas */}
            <form onSubmit={handleCreateTask} className="card p-5 flex flex-col gap-4 border" style={{ borderColor: 'var(--border-color)' }}>
              <h4 className="font-semibold text-sm text-[var(--text-primary)]">Buat Tugas Baru</h4>
              
              <div className="form-group">
                <label className="form-label text-[11px]">Judul Tugas *</label>
                <input 
                  type="text" 
                  className="input text-xs" 
                  placeholder="Contoh: Edit video Reels pilar Tech" 
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label text-[11px]">Deskripsi / Detail Penugasan</label>
                <textarea 
                  className="input py-2 text-xs" 
                  placeholder="Detail instruksi pekerjaan..." 
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={3}
                  style={{ resize: 'none' }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label text-[11px]">Penerima Tugas *</label>
                  <select 
                    className="input select text-xs"
                    value={taskAssignedTo}
                    onChange={(e) => setTaskAssignedTo(e.target.value)}
                    required
                  >
                    <option value="">Pilih Anggota Tim...</option>
                    {users.map((u) => (
                      <option key={u.username} value={u.username}>
                        @{u.username} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label text-[11px]">Batas Waktu (Deadline)</label>
                  <input 
                    type="date" 
                    className="input text-xs" 
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                  disabled={taskCreateLoading}
                >
                  <Plus size={14} />
                  {taskCreateLoading ? 'Memproses...' : 'Tugaskan Pekerjaan'}
                </button>
              </div>
            </form>

            {/* Daftar Tugas Tim */}
            <div className="flex flex-col gap-3">
              <h4 className="font-semibold text-sm text-[var(--text-primary)]">Daftar Tugas Aktif</h4>
              
              {settingsTasksLoading ? (
                <div className="text-center py-6 text-xs" style={{ color: 'var(--text-quaternary)' }}>
                  Memuat daftar tugas...
                </div>
              ) : settingsTasks.length === 0 ? (
                <div className="card p-6 text-center text-xs" style={{ color: 'var(--text-quaternary)', borderColor: 'var(--border-color)' }}>
                  Belum ada tugas yang dibuat.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {settingsTasks.map((t) => (
                    <div 
                      key={t.id} 
                      className="card p-4 flex items-center justify-between gap-4 border"
                      style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate text-[var(--text-primary)]">
                            {t.title}
                          </p>
                          <span 
                            className="badge text-[10px]" 
                            style={{ 
                              background: t.status === 'completed' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 149, 0, 0.1)', 
                              color: t.status === 'completed' ? 'var(--color-green)' : 'var(--color-orange)',
                              fontWeight: 'bold' 
                            }}
                          >
                            {t.status === 'completed' ? 'Selesai' : 'Pending'}
                          </span>
                        </div>
                        {t.description && (
                          <p className="text-xs mt-1 text-[var(--text-secondary)]">
                            {t.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-quaternary)]">
                          <span>Kepada: <span className="font-medium text-[var(--text-secondary)]">@{t.assignedTo}</span></span>
                          <span>•</span>
                          <span>Oleh: @{t.createdBy}</span>
                          {t.deadline && (
                            <>
                              <span>•</span>
                              <span>Batas: {new Date(t.deadline).toLocaleDateString('id-ID')}</span>
                            </>
                          )}
                          {t.completedAt && (
                            <>
                              <span>•</span>
                              <span style={{ color: 'var(--color-green)' }}>
                                Selesai pada: {new Date(t.completedAt).toLocaleString('id-ID')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        className="btn btn-ghost btn-icon btn-sm text-red-500 hover-bg-danger flex-shrink-0"
                        style={{ color: 'var(--color-red)' }}
                        onClick={() => handleDeleteTask(t.id, t.title)}
                        title="Hapus Tugas"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Admin Activity Audit Logs Tab ── */}
        {tab === 'activity' && isAdmin && (
          <div className="flex flex-col gap-5 pb-10 animate-fade-in w-full min-w-0">
            <div className="card p-5 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3 mb-1" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Log Aktivitas Organisasi (Audit Trail)</h3>
                  <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                    Histori lengkap aktivitas klerikal pengguna di workspace, terurut dari yang terbaru.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    className="input text-xs w-48 py-1.5 px-3"
                    style={{ borderRadius: 8 }}
                    placeholder="Cari user atau tindakan..."
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={fetchActivityLogs}
                    disabled={activityLoading}
                    title="Segarkan Log"
                  >
                    <RefreshCw size={13} className={activityLoading ? 'animate-spin' : ''} />
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--color-orange)', borderColor: 'rgba(255, 149, 0, 0.25)' }}
                    onClick={handlePruneActivityLogs}
                    title="Pangkas log lama dan sisakan 100 terbaru"
                  >
                    Pangkas Log
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--color-red)', borderColor: 'rgba(255, 69, 58, 0.25)' }}
                    onClick={handleClearActivityLogs}
                    title="Hapus seluruh log aktivitas"
                  >
                    Hapus Semua
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-color)', color: 'var(--text-quaternary)' }}>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-wider">Waktu</th>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-wider">Pengguna</th>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-wider">Tindakan</th>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-wider">Target</th>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-wider">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLoading && activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-xs" style={{ color: 'var(--text-quaternary)' }}>
                          Memuat data log...
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const filtered = activityLogs.filter(log => {
                          const query = activitySearch.toLowerCase().trim();
                          if (!query) return true;
                          return (
                            log.username.toLowerCase().includes(query) ||
                            log.action.toLowerCase().includes(query) ||
                            log.targetName.toLowerCase().includes(query) ||
                            (log.details || '').toLowerCase().includes(query)
                          );
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-xs" style={{ color: 'var(--text-quaternary)' }}>
                                Tidak ditemukan data log aktivitas yang cocok.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((log) => {
                          let timeStr = log.timestamp;
                          try {
                            const date = new Date(log.timestamp);
                            timeStr = date.toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          } catch {
                            // Gunakan timestamp mentah jika gagal formatting
                          }

                          return (
                            <tr key={log.id} className="border-b hover-bg-subtle text-xs transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                              <td className="py-2.5 px-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                                {timeStr}
                              </td>
                              <td className="py-2.5 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {log.username}
                              </td>
                              <td className="py-2.5 px-3 font-medium">
                                <span 
                                  className="badge text-[10px] px-2 py-0.5" 
                                  style={{
                                    background: log.action.includes('Hapus') 
                                      ? 'rgba(255,59,48,0.1)' 
                                      : log.action.includes('Tambah')
                                        ? 'rgba(52,199,89,0.1)'
                                        : 'rgba(0,122,255,0.1)',
                                    color: log.action.includes('Hapus') 
                                      ? 'var(--color-red)' 
                                      : log.action.includes('Tambah')
                                        ? 'var(--color-green)'
                                        : 'var(--color-blue)'
                                  }}
                                >
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-semibold truncate max-w-[150px]" style={{ color: 'var(--text-primary)' }}>
                                {log.targetName}
                              </td>
                              <td className="py-2.5 px-3 italic" style={{ color: 'var(--text-quaternary)' }}>
                                {log.details || '-'}
                              </td>
                            </tr>
                          );
                        });
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
