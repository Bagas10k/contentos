// src/components/layout/DynamicIsland.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Laptop, Smartphone, Tablet, Monitor, ChevronRight, Bell, X, Folder, ListTodo } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';
import { toast } from '../ui/Toast';
import { logActivity } from '../../lib/auditLogger';
import type { WorkspaceNote } from '../../types';
import { showNativeNotification } from '../../lib/notifications';

interface ActiveDevice {
  deviceId: string;
  deviceName: string;
  userAgent: string;
  ip: string;
  lastSeen: number;
  username?: string;
}

interface UserTask {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  createdBy: string;
  status: 'pending' | 'completed';
  deadline?: string;
  createdAt: string;
  completedAt?: string;
}

interface SharedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

interface ActivityLog {
  id: string;
  username: string;
  action: string;
  targetName: string;
  details: string;
  timestamp: string;
  restoreData?: string;
}

export function DynamicIsland() {
  const notes = useAppStore(useShallow((state) => (state.notes ?? []).filter((n) => n.workspaceId === state.activeWorkspaceId)));
  const markNotesAsRead = useAppStore((state) => state.markNotesAsRead);
  const unreadNotes = notes.filter((n) => !n.isRead);
  const unreadCount = unreadNotes.length;

  const [devices, setDevices] = useState<ActiveDevice[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [latestLogNotification, setLatestLogNotification] = useState<ActivityLog | null>(null);
  const lastLogIdRef = useRef<string | null>(null);
  const [latestNoteNotification, setLatestNoteNotification] = useState<WorkspaceNote | null>(null);
  const lastUnreadNoteIdRef = useRef<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [myDeviceId, setMyDeviceId] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'network' | 'notifications' | 'logs' | 'tasks'>('network');
  const navigate = useNavigate();
  const islandRef = useRef<HTMLDivElement>(null);

  const fetchTasks = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data || []);
      }
    } catch (e) {
      console.warn('[DynamicIsland] Gagal mengambil tugas:', e);
    }
  };



  const getDeadlineLabel = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const deadline = new Date(deadlineStr);
      const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
      
      const diffTime = deadlineDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return { text: 'Terlewat', color: '#ff453a' };
      } else if (diffDays === 0) {
        return { text: 'Hari Ini', color: '#ffcc00' };
      } else if (diffDays === 1) {
        return { text: 'Besok', color: '#ff9500' };
      }
      return null;
    } catch {
      return null;
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const allTasksForDisplay = [...pendingTasks, ...tasks.filter((t) => t.status === 'completed')].slice(0, 6);
  const criticalTasks = pendingTasks.filter((t) => {
    const lbl = getDeadlineLabel(t.deadline);
    return lbl && (lbl.text === 'Terlewat' || lbl.text === 'Hari Ini');
  });

  // Close island on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (islandRef.current && !islandRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Monitor announcements to trigger temporary 5-second notification in Dynamic Island
  useEffect(() => {
    if (unreadNotes.length > 0) {
      const latest = unreadNotes[0];
      if (lastUnreadNoteIdRef.current && lastUnreadNoteIdRef.current !== latest.id) {
        setLatestNoteNotification(latest);
        
        // Trigger native browser notification
        showNativeNotification(
          `Pengumuman Baru: ${latest.title}`,
          latest.content || 'Ada pemberitahuan penting dari Admin.',
          `note-${latest.id}`
        );

        const timer = setTimeout(() => {
          setLatestNoteNotification(null);
        }, 5000);
        return () => clearTimeout(timer);
      }
      lastUnreadNoteIdRef.current = latest.id;
    } else {
      setLatestNoteNotification(null);
      lastUnreadNoteIdRef.current = null;
    }
  }, [unreadNotes]);

  // Monitor tasks for new tasks or approaching deadlines
  useEffect(() => {
    if (tasks.length > 0) {
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      if (!currentUser) return;

      const myPendingTasks = tasks.filter(
        (t) => t.assignedTo === currentUser.username && t.status === 'pending'
      );

      for (const t of myPendingTasks) {
        // 1. Alert for new task assigned (created in the last 15 seconds)
        const createdTime = new Date(t.createdAt).getTime();
        const diffMs = Date.now() - createdTime;
        if (diffMs > 0 && diffMs < 15000) {
          showNativeNotification(
            'Tugas Baru Ditugaskan',
            `Anda ditugaskan: "${t.title}" oleh @${t.createdBy}`,
            `task-new-${t.id}`
          );
        }

        // 2. Alert for upcoming deadlines (Today/Tomorrow)
        const lbl = getDeadlineLabel(t.deadline);
        if (lbl && (lbl.text === 'Hari Ini' || lbl.text === 'Besok')) {
          showNativeNotification(
            `Tenggat Tugas: ${t.title}`,
            `Tugas ini jatuh tempo ${lbl.text.toLowerCase()}. Silakan selesaikan segera.`,
            `task-deadline-${t.id}-${lbl.text.toLowerCase()}`
          );
        }
      }
    }
  }, [tasks]);

  // Parse user token and authenticate
  useEffect(() => {
    const token = localStorage.getItem('token');
    const deviceId = localStorage.getItem('contentos_device_id') || '';
    setMyDeviceId(deviceId);
    setIsAuthenticated(!!token);

    const handleAuthChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };
    window.addEventListener('contentos-login-change', handleAuthChange);
    return () => window.removeEventListener('contentos-login-change', handleAuthChange);
  }, []);

  // Fetch active devices, shared files, and activity logs
  const fetchDevices = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/network/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data || []);
      }
    } catch (e) {
      console.warn('[DynamicIsland] Gagal mengambil perangkat:', e);
    }
  };

  const fetchSharedFiles = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/network/shared-files', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSharedFiles(data || []);
      }
    } catch (e) {
      console.warn('[DynamicIsland] Gagal mengambil berkas:', e);
    }
  };

  const fetchLogs = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/network/activity-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const freshLogs = data || [];
        setLogs(freshLogs.slice(0, 5));

        // Check for new activity logs to trigger 3-second temporary notification
        if (freshLogs.length > 0) {
          const latest = freshLogs[0];
          if (lastLogIdRef.current && lastLogIdRef.current !== latest.id) {
            setLatestLogNotification(latest);
            setTimeout(() => {
              setLatestLogNotification(null);
            }, 3000);
          }
          lastLogIdRef.current = latest.id;
        }
      }
    } catch (e) {
      console.warn('[DynamicIsland] Gagal mengambil log:', e);
    }
  };

  const handleRestore = async (log: ActivityLog) => {
    if (!log.restoreData) return;
    const success = await useAppStore.getState().restoreActivity(log.restoreData);
    if (success) {
      toast.success('Berhasil memulihkan data');
      logActivity(
        'Memulihkan Konten',
        log.targetName,
        `Memulihkan dari aksi: ${log.action}`
      );
      setTimeout(() => {
        fetchLogs();
      }, 500);
    } else {
      toast.error('Gagal memulihkan data');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchDevices();
    fetchSharedFiles();
    fetchLogs();
    fetchTasks();

    // Poll everything every 6 seconds (including tasks for real-time updates)
    const interval = setInterval(() => {
      fetchDevices();
      fetchSharedFiles();
      fetchLogs();
      fetchTasks();
    }, 6000);

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Set default tab on mount or when count changes
  const otherDevicesCount = devices.length > 1 ? devices.length - 1 : 0;
  const filesCount = sharedFiles.length;

  useEffect(() => {
    if (pendingTasks.length > 0) {
      setActiveTab('tasks');
    } else if (unreadCount > 0 && otherDevicesCount === 0 && filesCount === 0) {
      setActiveTab('notifications');
    } else {
      setActiveTab('network');
    }
  }, [unreadCount, otherDevicesCount, filesCount, pendingTasks.length]);

  // Dynamic Island is visible if there are unread notes, other online devices, shared files, recent logs, or pending tasks
  const hasContent = unreadCount > 0 || otherDevicesCount > 0 || filesCount > 0 || logs.length > 0 || pendingTasks.length > 0;

  useEffect(() => {
    if (isAuthenticated && hasContent) {
      document.body.classList.add('has-dynamic-island');
    } else {
      document.body.classList.remove('has-dynamic-island');
    }
    return () => {
      document.body.classList.remove('has-dynamic-island');
    };
  }, [isAuthenticated, hasContent]);

  if (!isAuthenticated || !hasContent) {
    return null;
  }

  const getDeviceIcon = (ua: string) => {
    const uaLower = ua.toLowerCase();
    if (uaLower.includes('mobi') || uaLower.includes('phone') || uaLower.includes('android')) {
      return Smartphone;
    }
    if (uaLower.includes('tablet') || uaLower.includes('ipad')) {
      return Tablet;
    }
    if (uaLower.includes('smarttv') || uaLower.includes('appletv')) {
      return Monitor;
    }
    return Laptop;
  };

  const getDevicePlatform = (ua: string) => {
    const uaLower = ua.toLowerCase();
    if (uaLower.includes('iphone') || uaLower.includes('ipad')) return 'iOS';
    if (uaLower.includes('android')) return 'Android';
    if (uaLower.includes('macintosh') || uaLower.includes('mac os')) return 'macOS';
    if (uaLower.includes('windows')) return 'Windows';
    if (uaLower.includes('linux')) return 'Linux';
    return 'OS';
  };

  const handleNavigateToShare = () => {
    setIsExpanded(false);
    navigate('/network');
  };

  const formatLogTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Compact state UI renderer
  const renderCompactContent = () => {
    if (criticalTasks.length > 0) {
      return (
        <div className="compact-content animate-fade-in">
          <div className="dynamic-island-pulse-red" />
          <span className="text-[10.5px] font-bold text-white tracking-tight truncate max-w-[220px]">
            Batas Tugas: {criticalTasks[0].title}
          </span>
        </div>
      );
    }

    if (latestNoteNotification) {
      return (
        <div className="compact-content animate-fade-in">
          <div className="dynamic-island-pulse-red" />
          <span className="text-[10.5px] font-semibold text-white tracking-tight truncate max-w-[220px]" title={latestNoteNotification.title}>
            Admin: {latestNoteNotification.title}
          </span>
        </div>
      );
    }

    if (latestLogNotification) {
      return (
        <div className="compact-content animate-fade-in">
          <div className="dynamic-island-pulse-orange" />
          <span className="text-[10.5px] font-semibold text-white tracking-tight truncate max-w-[220px]" title={`${latestLogNotification.username}: ${latestLogNotification.action}`}>
            @{latestLogNotification.username}: {latestLogNotification.action}
          </span>
        </div>
      );
    }

    if (pendingTasks.length > 0) {
      return (
        <div className="compact-content">
          <div className="dynamic-island-pulse-orange" />
          <ListTodo size={11} className="text-[#ff9500]" />
          <span className="text-[11px] font-bold text-white tracking-tight">
            Tugas: {pendingTasks.length}
          </span>
        </div>
      );
    }

    if (unreadCount > 0 && otherDevicesCount === 0 && filesCount === 0) {
      return (
        <div className="compact-content">
          <div className="dynamic-island-pulse-red" />
          <Bell size={11} className="text-[#ff453a]" />
          <span className="text-[11px] font-bold text-white tracking-tight">
            {unreadCount} Pengumuman
          </span>
        </div>
      );
    }

    if (otherDevicesCount > 0 && unreadCount === 0) {
      return (
        <div className="compact-content">
          <div className="dynamic-island-pulse-green" />
          <Wifi size={11} className="text-[#30d158]" />
          <span className="text-[11px] font-bold text-white tracking-tight">
            {otherDevicesCount} Online
          </span>
        </div>
      );
    }

    return (
      <div className="compact-content">
        <div className="dynamic-island-pulse-blue" />
        <Wifi size={11} className="text-[#0a84ff]" />
        <span className="text-[11px] font-bold text-white tracking-tight">
          WiFi Share {unreadCount > 0 ? `· ${unreadCount}` : ''}
        </span>
      </div>
    );
  };

  return (
    <div className="dynamic-island-container">
      <style>{islandStyles}</style>
      
      <div 
        ref={islandRef}
        className={`dynamic-island ${isExpanded ? 'expanded' : 'compact'} ${!isExpanded && latestNoteNotification ? 'notification-urgent' : !isExpanded && latestLogNotification ? 'notification' : ''}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        {!isExpanded ? (
          renderCompactContent()
        ) : (
          // EXPANDED VIEW
          <div className="expanded-content">
            {/* Header tab switcher */}
            <div className="flex border-b border-white border-opacity-10 pb-1.5 flex-shrink-0 justify-between items-center">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none pr-1">
                <button 
                  className={`di-tab ${activeTab === 'network' ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setActiveTab('network'); }}
                >
                  WiFi Share
                </button>
                <button 
                  className={`di-tab ${activeTab === 'tasks' ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setActiveTab('tasks'); }}
                >
                  Tugas {pendingTasks.length > 0 ? `(${pendingTasks.length})` : ''}
                </button>
                {unreadCount > 0 && (
                  <button 
                    className={`di-tab ${activeTab === 'notifications' ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActiveTab('notifications'); }}
                  >
                    Notif ({unreadCount})
                  </button>
                )}
                {logs.length > 0 && (
                  <button 
                    className={`di-tab ${activeTab === 'logs' ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActiveTab('logs'); }}
                  >
                    Histori
                  </button>
                )}
              </div>
              <button 
                className="p-1 rounded-full hover:bg-white hover:bg-opacity-10 border-none bg-transparent cursor-pointer flex items-center justify-center text-white text-opacity-70 hover:text-opacity-100 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                title="Tutup"
              >
                <X size={12} />
              </button>
            </div>

            {/* TAB 1 CONTENT: NETWORK SHARING */}
            {activeTab === 'network' && (
              <>
                <div className="device-list scrollbar-thin">
                  {devices.map((dev) => {
                    const DeviceIcon = getDeviceIcon(dev.userAgent);
                    const isMe = dev.deviceId === myDeviceId;
                    
                    return (
                      <div key={dev.deviceId} className="di-device-item">
                        <div className="w-7 h-7 rounded bg-white bg-opacity-10 flex items-center justify-center text-white flex-shrink-0">
                          <DeviceIcon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-semibold text-white truncate block">
                              {dev.username ? `@${dev.username}` : dev.deviceName}
                            </span>
                            {isMe && (
                              <span className="text-[8px] px-1 bg-blue-500 text-white rounded font-bold scale-90">
                                Anda
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-white opacity-60 block truncate">
                            {dev.username ? `${dev.deviceName} · ` : ''}IP: {dev.ip} · {getDevicePlatform(dev.userAgent)}
                          </span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#30d158] flex-shrink-0" />
                      </div>
                    );
                  })}
                  
                  {filesCount > 0 && (
                    <div className="di-device-item" style={{ background: 'rgba(10, 132, 255, 0.08)', border: '1px solid rgba(10, 132, 255, 0.15)' }}>
                      <div className="w-7 h-7 rounded bg-[#0a84ff] bg-opacity-20 flex items-center justify-center text-[#0a84ff] flex-shrink-0">
                        <Folder size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold text-white block">
                          Berkas Terbagi
                        </span>
                        <span className="text-[9px] text-white opacity-85 block">
                          Terdapat {filesCount} file siap diunduh perangkat lokal
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  className="btn-link-share mt-1 flex-shrink-0"
                  onClick={handleNavigateToShare}
                >
                  <span>Buka Local Share</span>
                  <ChevronRight size={12} />
                </button>
              </>
            )}

            {/* TAB 4 CONTENT: USER TASKS */}
            {activeTab === 'tasks' && (
              <>
                <div className="device-list scrollbar-thin">
                  <div className="flex items-center justify-between flex-shrink-0 px-1 mb-1">
                    <span className="text-[9px] uppercase tracking-wider text-white opacity-40 font-bold">Daftar Tugas</span>
                    {tasks.length > 0 && (
                      <span className="text-[9px] text-white opacity-40">{pendingTasks.length} aktif · {tasks.filter(t=>t.status==='completed').length} selesai</span>
                    )}
                  </div>
                  {tasks.length === 0 ? (
                    <p className="text-[10px] text-white opacity-50 text-center py-4">Tidak ada tugas.</p>
                  ) : (
                    allTasksForDisplay.map((task) => {
                      const deadLineInfo = task.status === 'pending' ? getDeadlineLabel(task.deadline) : null;
                      const isCompleted = task.status === 'completed';
                      return (
                        <div
                          key={task.id}
                          className="di-task-item flex items-center justify-between gap-2 p-2 rounded border"
                          style={{
                            background: isCompleted ? 'rgba(48,209,88,0.05)' : 'rgba(255,255,255,0.03)',
                            borderColor: isCompleted ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.05)',
                            opacity: isCompleted ? 0.65 : 1,
                          }}
                        >
                          <div className="flex items-start gap-1.5 flex-1 min-w-0">
                            <span className="flex-shrink-0 mt-0.5" style={{ color: isCompleted ? '#30d158' : '#8E8E93' }}>
                              {isCompleted ? '✓' : '○'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="text-[11px] font-bold text-white truncate max-w-[150px]"
                                  style={{ textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.7 : 1 }}
                                  title={task.title}
                                >
                                  {task.title}
                                </span>
                                {deadLineInfo && (
                                  <span className="text-[8px] font-bold px-1 rounded" style={{ color: deadLineInfo.color, background: 'rgba(255,69,58,0.15)' }}>
                                    {deadLineInfo.text}
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="text-[8px] font-bold px-1 rounded" style={{ color: '#30d158', background: 'rgba(48,209,88,0.15)' }}>
                                    Selesai
                                  </span>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-[9px] text-white opacity-60 line-clamp-1 mt-0.5">{task.description}</p>
                              )}
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {task.deadline && !isCompleted && (
                                  <span className="text-[8px] text-white opacity-50">Batas: {new Date(task.deadline).toLocaleDateString('id-ID')}</span>
                                )}
                                <span className="text-[8px] text-white opacity-40">@{task.assignedTo}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <button
                  className="btn-link-share mt-1 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(false); navigate('/tasks'); }}
                >
                  <span>Lihat Selengkapnya</span>
                  <ChevronRight size={12} />
                </button>
              </>
            )}

            {/* TAB 2 CONTENT: UNREAD ANNOUNCEMENTS */}
            {activeTab === 'notifications' && (
              <>
                <div className="device-list scrollbar-thin">
                  <div className="flex items-center justify-between flex-shrink-0 px-1 mb-1">
                    <span className="text-[9px] uppercase tracking-wider text-white opacity-40 font-bold">Terbaru</span>
                    <button 
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold bg-none border-none cursor-pointer p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        markNotesAsRead();
                        toast.success('Semua pengumuman ditandai dibaca');
                      }}
                    >
                      Tandai Semua Dibaca
                    </button>
                  </div>
                  {unreadNotes.map((note) => (
                    <div key={note.id} className="di-note-item">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate">{note.title}</p>
                        <p className="text-[9px] text-white opacity-60 line-clamp-2 mt-0.5 leading-normal">{note.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* TAB 3 CONTENT: RECENT HISTORI LOGS */}
            {activeTab === 'logs' && (
              <div className="device-list scrollbar-thin">
                <div className="flex items-center justify-between flex-shrink-0 px-1 mb-1">
                  <span className="text-[9px] uppercase tracking-wider text-white opacity-40 font-bold">Histori Singkat</span>
                </div>
                {logs.length === 0 ? (
                  <p className="text-[10px] text-white opacity-50 text-center py-4">Belum ada aktivitas.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="di-log-item">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="flex-1 min-w-0">
                          <div className="di-log-header">
                            <span className="di-log-time">{formatLogTime(log.timestamp)}</span>
                            <span className="di-log-user">@{log.username}</span>
                            <span className="text-white text-opacity-95 font-semibold">{log.action}</span>
                          </div>
                          <p className="di-log-target truncate" title={log.targetName}>{log.targetName}</p>
                        </div>
                        {log.restoreData && (
                          <button
                            className="btn-di-restore"
                            onClick={() => handleRestore(log)}
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

const islandStyles = `
  .dynamic-island-container {
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    pointer-events: none;
    transition: top 0.3s ease;
  }

  .dynamic-island {
    pointer-events: auto;
    background: rgba(10, 10, 12, 0.96);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2);
    color: white;
    transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), 
                height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), 
                border-radius 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), 
                background-color 0.3s ease;
    overflow: hidden;
    display: flex;
    user-select: none;
  }

  /* Compact Mode */
  .dynamic-island.compact {
    width: 130px;
    height: 28px;
    border-radius: 9999px;
    cursor: pointer;
  }
  
  .dynamic-island.compact:hover {
    background: rgba(20, 20, 24, 0.98);
    transform: scale(1.02);
  }

  /* Compact Mode with Notification */
  .dynamic-island.compact.notification {
    width: 250px;
    background: rgba(24, 16, 8, 0.98);
    border: 1px solid rgba(255, 149, 0, 0.35);
    box-shadow: 0 8px 24px rgba(255, 149, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 360px) {
    .dynamic-island.compact.notification {
      width: calc(100vw - 24px);
    }
  }

  /* Compact Mode with Urgent Notification */
  .dynamic-island.compact.notification-urgent {
    width: 250px;
    background: rgba(30, 10, 10, 0.98);
    border: 1px solid rgba(255, 59, 48, 0.35);
    box-shadow: 0 8px 24px rgba(255, 59, 48, 0.15), 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 360px) {
    .dynamic-island.compact.notification-urgent {
      width: calc(100vw - 24px);
    }
  }


  .compact-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 100%;
    animation: di-fade-in 0.2s ease-out forwards;
  }

  /* Expanded Mode */
  .dynamic-island.expanded {
    width: 300px;
    height: 230px;
    border-radius: 20px;
    cursor: default;
  }

  @media (max-width: 480px) {
    .dynamic-island.expanded {
      width: calc(100vw - 32px); /* Responsif lebar layar kecil */
      max-width: 300px;
    }
  }

  .expanded-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    height: 100%;
    padding: 12px;
    animation: di-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
    opacity: 0;
  }

  @keyframes di-fade-in {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }

  .dynamic-island-pulse-green {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: #30d158;
    box-shadow: 0 0 0 0 rgba(48, 209, 88, 0.4);
    animation: di-pulse-green 1.8s infinite;
  }
  
  .dynamic-island-pulse-red {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: #ff453a;
    box-shadow: 0 0 0 0 rgba(255, 69, 58, 0.4);
    animation: di-pulse-red 1.8s infinite;
  }
  
  .dynamic-island-pulse-blue {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: #0a84ff;
    box-shadow: 0 0 0 0 rgba(10, 132, 255, 0.4);
    animation: di-pulse-blue 1.8s infinite;
  }

  .dynamic-island-pulse-orange {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: #ff9500;
    box-shadow: 0 0 0 0 rgba(255, 149, 0, 0.4);
    animation: di-pulse-orange 1.8s infinite;
  }

  @keyframes di-pulse-green {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(48, 209, 88, 0.8); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(48, 209, 88, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(48, 209, 88, 0); }
  }

  @keyframes di-pulse-red {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 69, 58, 0.8); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(255, 69, 58, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 69, 58, 0); }
  }

  @keyframes di-pulse-blue {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(10, 132, 255, 0.8); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(10, 132, 255, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(10, 132, 255, 0); }
  }

  @keyframes di-pulse-orange {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 149, 0, 0.8); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(255, 149, 0, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 149, 0, 0); }
  }

  .device-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    padding-right: 2px;
  }

  .di-device-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.02);
    transition: all 0.2s ease;
  }

  .di-device-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .di-note-item {
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255, 69, 58, 0.06);
    border: 1px solid rgba(255, 69, 58, 0.12);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .di-log-item {
    font-size: 10px;
    padding: 6px 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .btn-di-restore {
    background: rgba(0, 122, 255, 0.15);
    border: 1px solid rgba(0, 122, 255, 0.3);
    color: #0A84FF;
    font-size: 9px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    align-self: center;
    margin-left: 8px;
    flex-shrink: 0;
  }
  .btn-di-restore:hover {
    background: rgba(0, 122, 255, 0.3);
    color: white;
  }
  
  .di-log-header {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  
  .di-log-time {
    color: var(--color-blue);
    font-family: monospace;
    font-weight: 600;
  }
  
  .di-log-user {
    color: var(--color-orange);
    font-weight: 700;
  }
  
  .di-log-target {
    color: white;
    opacity: 0.6;
    padding-left: 32px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .di-tab {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    cursor: pointer;
    border-radius: 9999px;
    transition: all 0.2s;
  }
  
  .di-tab.active {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }

  .btn-link-share {
    width: 100%;
    background: var(--color-blue);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-link-share:hover {
    background: #0062cc;
  }

  .btn-link-share:active {
    transform: scale(0.98);
  }
`;
