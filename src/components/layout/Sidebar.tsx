// src/components/layout/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Library, Kanban, Calendar,
  Settings, Plus, ChevronDown, LogOut, Globe, Check, ClipboardList
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/bank',     icon: Library,         label: 'Content Bank' },
  { to: '/kanban',   icon: Kanban,          label: 'Kanban Board' },
  { to: '/calendar', icon: Calendar,        label: 'Kalender'     },
  { to: '/tasks',    icon: ClipboardList,   label: 'Tugas'        },
  { to: '/network',  icon: Globe,           label: 'Local Share'  },
  { to: '/settings', icon: Settings,        label: 'Settings'     },
];

export function Sidebar() {
  const workspaces       = useAppStore((state) => state.workspaces);
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const setActiveWorkspace = useAppStore((state) => state.setActiveWorkspace);
  const isSidebarOpen    = useAppStore((state) => state.isSidebarOpen);
  const setSidebarOpen   = useAppStore((state) => state.setSidebarOpen);
  const activeWs         = workspaces.find((w) => w.id === activeWorkspaceId);

  const [wsOpen, setWsOpen]   = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.role === 'admin');
        setUsername(user.username || '');
      } catch (e) {
        console.error('Failed to parse user profile in sidebar:', e);
      }
    }
  }, []);

  const wsColor = activeWs?.color || '#0A84FF';

  return (
    <>
      {isSidebarOpen && (
        <div
          className="sidebar-overlay md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={cn('sidebar', isSidebarOpen && 'open')}>

        {/* ── Logo ── */}
        <div className="px-4 py-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-9 h-9 rounded-[10px] object-cover flex-shrink-0"
              style={{
                boxShadow: 'var(--glow-blue)',
              }}
            />
            <div>
              <div
                className="font-bold text-sm"
                style={{ color: 'var(--text-primary)', letterSpacing: '-0.3px' }}
              >
                ContentOS
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-quaternary)' }}>
                Creator Workspace
              </div>
            </div>
          </div>
        </div>

        {/* ── Workspace Switcher ── */}
        <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-2 px-2"
            style={{ color: 'var(--text-quaternary)' }}
          >
            Workspace
          </p>
          <button
            className="w-full flex items-center gap-2.5 p-2.5 rounded-[10px] transition-all text-left"
            style={{ background: `${wsColor}10`, border: `1px solid ${wsColor}20` }}
            onClick={() => setWsOpen(!wsOpen)}
          >
            <div
              className="w-8 h-8 rounded-[9px] flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: `${wsColor}20`, color: wsColor }}
            >
              {activeWs?.name ? activeWs.name.substring(0, 1).toUpperCase() : 'W'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {activeWs?.name ?? 'Pilih Workspace'}
              </div>
            </div>
            <ChevronDown
              className="chevron-down flex-shrink-0"
              size={13}
              style={{
                color: 'var(--text-quaternary)',
                transform: wsOpen ? 'rotate(180deg)' : '',
                transition: 'transform 0.25s var(--ease-smooth)',
              }}
            />
          </button>

          {wsOpen && (
            <div className="dropdown-menu mt-1.5">
              {workspaces.map((ws) => {
                const color = ws.color || '#0A84FF';
                const isActive = ws.id === activeWorkspaceId;
                return (
                  <button
                    key={ws.id}
                    className="dropdown-item"
                    style={{
                      background: isActive ? `${color}12` : undefined,
                    }}
                    onClick={() => {
                      setActiveWorkspace(ws.id);
                      setWsOpen(false);
                      setSidebarOpen(false);
                      navigate('/');
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-[8px] flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: `${color}20`, color }}
                    >
                      {ws.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-semibold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {ws.name}
                      </div>
                    </div>
                    {isActive && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: color }}
                      >
                        <Check size={11} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
              {isAdmin && (
                <div className="dropdown-divider" />
              )}
              {isAdmin && (
                <NavLink
                  to="/settings"
                  className="dropdown-item"
                  style={{ color: 'var(--color-blue)' }}
                  onClick={() => { setWsOpen(false); setSidebarOpen(false); }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(10, 132, 255, 0.12)' }}
                  >
                    <Plus size={11} style={{ color: 'var(--color-blue)' }} />
                  </div>
                  <span className="font-semibold">Tambah Workspace</span>
                </NavLink>
              )}
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-2 px-2"
            style={{ color: 'var(--text-quaternary)' }}
          >
            Menu
          </p>
          <div className="flex flex-col gap-0.5">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => cn('nav-item', isActive && 'active')}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={17} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* ── Bottom User Info ── */}
        <div
          className="px-4 py-4 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--glow-blue)' }}
              >
                {username ? username.substring(0, 1).toUpperCase() : (activeWs?.name ? activeWs.name.substring(0, 1).toUpperCase() : 'C')}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-xs font-semibold truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {username || activeWs?.name || 'ContentOS'}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
                  {isAdmin ? '• Admin' : '• Creator'}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.reload();
              }}
              className="p-2 rounded-[10px] transition-all border-none bg-transparent cursor-pointer flex-shrink-0"
              style={{ color: 'var(--color-red)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover-danger)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              title="Keluar / Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
