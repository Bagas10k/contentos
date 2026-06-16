import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, NavLink } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { ToastProvider, toast } from './components/ui/Toast';
import { useAppStore } from './store/appStore';
import LoginPage from './components/auth/LoginPage';
import Dashboard from './pages/Dashboard';
import ContentBank from './pages/ContentBank';
import KanbanBoard from './pages/KanbanBoard';
import EditorialCalendar from './pages/EditorialCalendar';
import Import from './pages/Import';
import Settings from './pages/Settings';
import LocalNetwork from './pages/LocalNetwork';
import Tasks from './pages/Tasks';
import { DynamicIsland } from './components/layout/DynamicIsland';
import { AnnouncementModal } from './components/content/AnnouncementModal';
import { WifiOff, LayoutDashboard, Library, Kanban, Calendar, ClipboardList } from 'lucide-react';
import { requestNotificationPermission } from './lib/notifications';

function TitleUpdater() {
  const location = useLocation();
  const ws = useAppStore((state) => state.workspaces.find((w) => w.id === state.activeWorkspaceId));

  useEffect(() => {
    const routeTitles: Record<string, string> = {
      '/': 'Dashboard',
      '/planner': 'Content Bank',
      '/bank': 'Content Bank',
      '/kanban': 'Kanban Board',
      '/calendar': 'Editorial Calendar',
      '/import': 'Import Data',
      '/settings': 'Settings',
      '/network': 'Local Share',
      '/tasks': 'Manajemen Tugas',
    };

    const pageTitle = routeTitles[location.pathname] || 'Workspace';
    const wsName = ws?.name ? ` · ${ws.name}` : '';
    document.title = `${pageTitle}${wsName} · ContentOS`;
  }, [location.pathname, ws]);

  return null;
}

function BottomNav() {
  const navItems = [
    { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/bank',     icon: Library,         label: 'Bank'      },
    { to: '/kanban',   icon: Kanban,          label: 'Kanban'    },
    { to: '/calendar', icon: Calendar,        label: 'Kalender'  },
    { to: '/tasks',    icon: ClipboardList,   label: 'Tugas'     },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <Icon size={20} className="bottom-nav-icon" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  const loadStateFromServer = useAppStore((state) => state.loadStateFromServer);
  const isLoading = useAppStore((state) => state.isLoading);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isServerOffline, setIsServerOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Capture PWA install prompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredInstallPrompt = e;
      window.dispatchEvent(new CustomEvent('pwa-install-available'));
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadStateFromServer();
      requestNotificationPermission();
    }
  }, [loadStateFromServer, isAuthenticated]);

  // Listen for offline status events
  useEffect(() => {
    const handleOffline = () => setIsServerOffline(true);
    window.addEventListener('contentos-offline', handleOffline);
    return () => window.removeEventListener('contentos-offline', handleOffline);
  }, []);

  const checkConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/state', {
        method: 'HEAD',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      if (res.ok || res.status === 401) {
        setIsServerOffline(false);
        return true;
      }
    } catch (err) {
      // ignore
    }
    setIsServerOffline(true);
    return false;
  };

  const handleCheckConnection = async () => {
    setIsChecking(true);
    const ok = await checkConnection();
    setIsChecking(false);
    if (ok) {
      toast.success('Koneksi terhubung kembali!');
    } else {
      toast.error('Gagal menghubungkan. Pastikan server lokal aktif.');
    }
  };

  // Listen for logout event (token expired) — tampilkan login tanpa reload
  useEffect(() => {
    const handleLogout = () => {
      setIsAuthenticated(false);
      toast.error('Sesi login Anda telah berakhir. Silakan masuk kembali.');
    };
    window.addEventListener('contentos-logout', handleLogout);
    return () => window.removeEventListener('contentos-logout', handleLogout);
  }, []);

  // Load and apply appearance settings from localStorage on mount
  useEffect(() => {
    const applyAppearance = () => {
      try {
        const stored = localStorage.getItem('contentos_appearance');
        const config = stored ? JSON.parse(stored) : {
          theme: 'auto',
          density: 'standard',
          font: 'inter',
          sidebar: 'standard',
          mobileNav: 'drawer',
        };

        const root = document.documentElement;
        
        // Theme
        if (config.theme === 'dark') {
          root.setAttribute('data-theme', 'dark');
        } else if (config.theme === 'light') {
          root.setAttribute('data-theme', 'light');
        } else {
          root.removeAttribute('data-theme');
        }

        // Density
        root.setAttribute('data-density', config.density || 'standard');

        // Font
        root.setAttribute('data-font', config.font || 'inter');

        // Sidebar style
        root.setAttribute('data-sidebar', config.sidebar || 'standard');

        // Mobile Nav style
        root.setAttribute('data-mobile-nav', config.mobileNav || 'drawer');
      } catch (e) {
        console.error('Failed to apply appearance settings:', e);
      }
    };

    applyAppearance();
    window.addEventListener('contentos-appearance-changed', applyAppearance);
    return () => window.removeEventListener('contentos-appearance-changed', applyAppearance);
  }, []);

  // Initialize/retrieve deviceId and deviceName for Local Sharing
  useEffect(() => {
    let deviceId = localStorage.getItem('contentos_device_id');
    if (!deviceId) {
      deviceId = 'dev-' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem('contentos_device_id', deviceId);
    }
    
    let deviceName = localStorage.getItem('contentos_device_name');
    if (!deviceName) {
      const ua = navigator.userAgent;
      let os = 'Unknown OS';
      if (ua.indexOf('Win') !== -1) os = 'Windows';
      else if (ua.indexOf('Mac') !== -1) os = 'macOS';
      else if (ua.indexOf('X11') !== -1) os = 'Linux';
      else if (ua.indexOf('Android') !== -1) os = 'Android';
      else if (ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) os = 'iOS';
      
      let browser = 'Browser';
      if (ua.indexOf('Chrome') !== -1) browser = 'Chrome';
      else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
      else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
      else if (ua.indexOf('Edge') !== -1) browser = 'Edge';
      
      deviceName = `${os} (${browser})`;
      localStorage.setItem('contentos_device_name', deviceName);
    }
  }, []);

  // Send periodic heartbeat to backend every 12 seconds when logged in
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const sendHeartbeat = async () => {
      const deviceId = localStorage.getItem('contentos_device_id');
      const deviceName = localStorage.getItem('contentos_device_name') || 'Perangkat Tanpa Nama';
      const token = localStorage.getItem('token');
      if (!deviceId || !token) return;
      
      try {
        const res = await fetch('/api/network/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            deviceId,
            deviceName,
            userAgent: navigator.userAgent
          })
        });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.dispatchEvent(new CustomEvent('contentos-logout'));
          return;
        }
        if (res.ok) {
          setIsServerOffline(false);
        }
      } catch (error) {
        console.warn('[Heartbeat] Gagal mengirim detak jantung:', error);
        setIsServerOffline(true);
      }
    };
    
    // Initial heatbeat
    sendHeartbeat();
    
    const interval = setInterval(sendHeartbeat, 12000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);


  // Daily Auto-Sync for saved Instagram platforms
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const runAutoSync = async () => {
      // Avoid multiple runs in the same react/mount session
      if ((window as any).__igAutoSynced) return;
      (window as any).__igAutoSynced = true;

      const state = useAppStore.getState();
      const plats = state.platforms || [];
      const token = localStorage.getItem('token');
      if (!token) return;

      // Filter all platforms of type Instagram with a valid instagramUsername
      const igPlats = plats.filter(
        (p) => p.name === 'Instagram' && p.instagramUsername?.trim()
      );

      if (igPlats.length === 0) return;

      const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (matches rate limit format)

      for (const plat of igPlats) {
        const username = plat.instagramUsername?.trim();
        if (!username) continue;

        // Check if there is already an analytics snapshot for this platform and date in this workspace
        const alreadySynced = (state.analyticsHistory || []).some(
          (a) =>
            a.workspaceId === plat.workspaceId &&
            a.platform === 'Instagram' &&
            a.date === todayStr
        );

        if (alreadySynced) {
          console.log(`[Auto-Sync] Instagram @${username} already synced for date ${todayStr}.`);
          continue;
        }

        console.log(`[Auto-Sync] Starting auto-sync for @${username}...`);
        try {
          const res = await fetch(`/api/analyze-instagram/${username}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              const followers = data.followersCount;
              
              // Get the last snapshot to carry over totalViews and ER if needed
              const platformSnaps = (state.analyticsHistory || [])
                .filter((a) => a.workspaceId === plat.workspaceId && a.platform === 'Instagram')
                .sort((a, b) => b.date.localeCompare(a.date));
              const lastPlatformSnap = platformSnaps.length > 0 ? platformSnaps[0] : null;

              // Add analytics snapshot to state
              state.addAnalyticsSnapshot({
                workspaceId: plat.workspaceId,
                platform: 'Instagram',
                date: todayStr,
                followers: followers,
                totalViews: lastPlatformSnap?.totalViews ?? 0,
                avgEngagementRate: lastPlatformSnap?.avgEngagementRate ?? undefined,
              });

              toast.success(`[Otomatis] Followers Instagram @${username} berhasil diperbarui: ${followers.toLocaleString()}`);
            } else {
              console.warn(`[Auto-Sync] Scraper returned failure for @${username}:`, data.message);
            }
          } else {
            console.warn(`[Auto-Sync] Request failed for @${username} with status: ${res.status}`);
          }
        } catch (error) {
          console.error(`[Auto-Sync] Network error syncing @${username}:`, error);
        }
      }
    };

    runAutoSync();
  }, [isLoading, isAuthenticated]);

  // Periodic Silent Auto-Refetch (Soft Sync) every 15 seconds
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const interval = setInterval(async () => {
      // Only refetch if the tab/window is active/focused to save server resources
      if (document.visibilityState !== 'visible') return;

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('/api/state', {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.dispatchEvent(new CustomEvent('contentos-logout'));
          return;
        }

        if (res.ok) {
          setIsServerOffline(false);
          const loaded = await res.json();
          if (loaded && loaded.workspaces && loaded.workspaces.length > 0) {
            // Update the store state silently in the background
            useAppStore.setState({
              workspaces: loaded.workspaces,
              categories: loaded.categories,
              platforms: loaded.platforms,
              contentItems: loaded.contentItems,
              analyticsHistory: loaded.analyticsHistory,
              notes: loaded.notes || [],
            });
          }
        }
      } catch (e) {
        console.error('[Soft-Refetch] Failed to sync data in background:', e);
        setIsServerOffline(true);
      }
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [isLoading, isAuthenticated]);

  const handleLoginSuccess = (token: string, user: { username: string; role: string }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        <ToastProvider />
      </>
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Logo */}
          <img
            src="/logo.png"
            alt="Logo"
            className="w-14 h-14 rounded-[16px] object-cover"
            style={{ boxShadow: '0 4px 20px rgba(0,122,255,0.35)' }}
          />
          {/* Spinner */}
          <div
            className="animate-spin rounded-full h-7 w-7 border-2"
            style={{ borderColor: 'var(--color-blue)', borderTopColor: 'transparent' }}
          />
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>ContentOS</p>
            <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>Memuat data dari server...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <TitleUpdater />
      <div className="app-layout">
        <Sidebar />
        <main className="main-area">
            <DynamicIsland />
            <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/planner"   element={<ContentBank />} />
            <Route path="/bank"      element={<ContentBank />} />
            <Route path="/kanban"    element={<KanbanBoard />} />
            <Route path="/calendar"  element={<EditorialCalendar />} />
            <Route path="/import"    element={<Import />} />
            <Route path="/settings"  element={<Settings />} />
            <Route path="/network"   element={<LocalNetwork />} />
            <Route path="/tasks"     element={<Tasks />} />
          </Routes>
        </main>
        <BottomNav />
      </div>

      <AnnouncementModal />
      <ToastProvider />

      {isServerOffline && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center animate-fade-in" style={{ zIndex: 100000 }}>
          <div className="bg-[var(--bg-surface-elevated)] p-6 rounded-[20px] max-w-[90vw] w-[360px] text-center shadow-ios-lg border border-[var(--border-color)]">
            <div className="w-12 h-12 rounded-full bg-[rgba(255,69,58,0.12)] flex items-center justify-center mx-auto mb-4 animate-pulse">
              <WifiOff className="text-[var(--color-red)]" size={24} />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Koneksi Server Terputus</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-5">
              Sistem tidak dapat menjangkau server lokal (LAN). Silakan periksa koneksi Wi-Fi/LAN Anda, pastikan server aktif, lalu segarkan halaman.
            </p>
            <div className="flex flex-col gap-2">
              <button 
                className="btn btn-primary w-full justify-center py-2 text-xs" 
                onClick={handleCheckConnection}
                disabled={isChecking}
              >
                {isChecking ? 'Menghubungkan...' : 'Hubungkan Kembali'}
              </button>
              <button 
                className="btn btn-secondary w-full justify-center py-2 text-xs" 
                onClick={() => window.location.reload()}
              >
                Refresh Halaman
              </button>
            </div>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}
