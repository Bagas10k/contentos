// src/pages/Dashboard.tsx
import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Users, Eye, FileText,
  ChevronRight, Layers, TrendingUp, Heart, Share2, Bookmark, X, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar, Cell
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/appStore';
import { TopBar } from '../components/layout/TopBar';
import { formatNumber, getStatusBg, getPlatformColor, calculateEngagement } from '../lib/utils';
import { CONTENT_STATUSES, type ContentStatus } from '../types';
import { toast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';

const STATUS_COLORS: Record<ContentStatus, string> = {
  'Idea':          '#8E8E93',
  'Scripting':     '#FF9500',
  'Production':    '#007AFF',
  'Editing':       '#AF52DE',
  'Ready to Post': '#34C759',
  'Published':     '#5856D6',
};

const PLATFORM_COLORS: Record<string, string> = {
  'TikTok':    '#636366',
  'Instagram': '#E1306C',
  'YouTube':   '#FF0000',
  'Twitter/X': '#1DA1F2',
  'LinkedIn':  '#0A66C2',
  'Facebook':  '#1877F2',
  'Threads':   '#636366',
};

const PERIOD_OPTIONS = [
  { label: '1 Bln', days: 30  },
  { label: '3 Bln', days: 90  },
  { label: '6 Bln', days: 180 },
  { label: 'Semua', days: 9999 },
];

// Custom Glassmorphic Tooltip for Recharts
function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].value;
    let name = payload[0].name === 'followers' ? 'Followers' : 'Views';
    if (payload[0].name === 'count') name = 'Konten';
    const color = payload[0].stroke || payload[0].fill || '#007AFF';
    
    return (
      <div 
        className="p-3 rounded-ios border text-xs shadow-ios-md flex flex-col gap-1 text-left"
        style={{ 
          background: 'rgba(28, 28, 30, 0.75)', 
          backdropFilter: 'blur(20px)', 
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'rgba(255, 255, 255, 0.1)', 
          color: '#fff',
          minWidth: 120
        }}
      >
        <p className="font-semibold text-[10px] uppercase tracking-wider opacity-60">{label}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="font-bold text-sm text-white">
            {typeof data === 'number' ? data.toLocaleString('id-ID') : data}
          </span>
        </div>
        <p className="text-[9px] opacity-40 mt-0.5">{name}</p>
      </div>
    );
  }
  return null;
}

// ─── Sub-components ──────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, gradient, onClick }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string; gradient?: string; onClick?: () => void;
}) {
  return (
    <div
      className={`stat-card${onClick ? ' cursor-pointer' : ''}`}
      onClick={onClick}
      style={{ transition: 'all 0.25s var(--ease-spring)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-quaternary)' }}>{label}</p>
          <p className="text-3xl font-bold mt-1.5" style={{ color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1.1 }}>{value}</p>
          {sub && <p className="text-xs mt-1.5 truncate" style={{ color: 'var(--text-quaternary)' }}>{sub}</p>}
        </div>
        <div
          className="w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0"
          style={{
            background: gradient || `linear-gradient(135deg, ${color}22, ${color}14)`,
            boxShadow: `0 4px 16px ${color}30`,
            border: `1px solid ${color}20`,
          }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function ContentStatusBar({ status, count, total }: { status: ContentStatus; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const color = STATUS_COLORS[status];
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs w-28 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{status}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-semibold w-5 text-right" style={{ color: 'var(--text-primary)' }}>{count}</span>
    </div>
  );
}

function PlatformBrandIcon({ platform, size = 16, color }: { platform: string; size?: number; color?: string }) {
  const normalized = platform.trim().toLowerCase();
  const style = color ? { color } : undefined;

  switch (normalized) {
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style}>
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.63 4.16 1.02 1.12 2.45 1.77 3.94 1.9v3.82c-1.78-.02-3.51-.57-4.99-1.57-.15-.1-.3-.21-.44-.33v8.52c.04 1.55-.4 3.09-1.29 4.31-.97 1.34-2.43 2.29-4.04 2.62-1.78.37-3.67.14-5.29-.63-1.63-.78-2.93-2.18-3.56-3.87C.86 14.88.98 12.72 1.9 10.96c.92-1.76 2.56-3.04 4.5-3.52 1.48-.37 3.04-.21 4.41.44v3.98c-1.12-.53-2.41-.6-3.58-.2-1.12.38-2.03 1.25-2.48 2.36-.46 1.1-.38 2.37.23 3.4.6.98 1.63 1.63 2.76 1.74 1.23.1 2.44-.38 3.19-1.37.52-.7.73-1.59.7-2.47V0h.89z"/>
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style}>
          <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    case 'twitter/x':
    case 'twitter':
    case 'x':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style}>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/>
        </svg>
      );
    case 'threads':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15.9c-2.45-.15-4.4-2.1-4.4-4.5V12c0-2.5 2-4.5 4.5-4.5h.9c2.45.15 4.4 2.1 4.4 4.5v1.4c0 2.5-2 4.5-4.5 4.5h-.9c-.8 0-1.5-.6-1.5-1.4 0-.8.6-1.5 1.4-1.5h1.5"/>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      );
  }
}

function PlatformPill({ platform, count, followers, color, onClick }: { platform: string; count: number; followers: number; color: string; onClick?: () => void }) {
  return (
    <button
      className="flex items-center gap-2 px-3 py-2 rounded-ios transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{ background: `${color}10`, border: `1px solid ${color}25` }}
      onClick={onClick}
    >
      <div className="w-8 h-8 rounded-ios flex items-center justify-center flex-shrink-0" style={{ background: `${color}14` }}>
        <PlatformBrandIcon platform={platform} size={15} color={color} />
      </div>
      <div className="text-left">
        <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{platform}</p>
        <p className="text-xs" style={{ color: 'var(--text-quaternary)', fontSize: '10px' }}>
          {formatNumber(followers)} followers · {count} konten
        </p>
      </div>
    </button>
  );
}


// ─── Main Dashboard ───────────────────────────────────────

export default function Dashboard() {
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const ws = useAppStore((state) => state.workspaces.find((w) => w.id === state.activeWorkspaceId));
  const content = useAppStore(useShallow((state) => state.contentItems.filter((c) => c.workspaceId === state.activeWorkspaceId)));
  const analytics = useAppStore(useShallow((state) => state.analyticsHistory.filter((a) => a.workspaceId === state.activeWorkspaceId).sort((a, b) => (a.date || '').localeCompare(b.date || ''))));
  const plats = useAppStore(useShallow((state) => (state.platforms ?? []).filter((p) => p.workspaceId === state.activeWorkspaceId)));

  const addAnalyticsSnapshot = useAppStore((state) => state.addAnalyticsSnapshot);
  const updateAnalyticsSnapshot = useAppStore((state) => state.updateAnalyticsSnapshot);
  const deleteAnalyticsSnapshot = useAppStore((state) => state.deleteAnalyticsSnapshot);
  const updatePlatform = useAppStore((state) => state.updatePlatform);
  const updateContent = useAppStore((state) => state.updateContent);

  const navigate = useNavigate();

  // ── Content views history states & actions ──
  const [selectedContentId, setSelectedContentId] = useState<string>('');
  const [logDate, setLogDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [logViews, setLogViews] = useState<string>('');

  const selectedContent = useMemo(() => {
    return content.find((c) => c.id === selectedContentId);
  }, [content, selectedContentId]);

  useEffect(() => {
    if (selectedContent) {
      setLogViews(selectedContent.performance?.views?.toString() || '');
    } else {
      setLogViews('');
    }
  }, [selectedContent]);

  const selectedContentHistory = useMemo(() => {
    if (!selectedContent?.performance?.viewsHistory) return [];
    return selectedContent.performance.viewsHistory.map((h) => ({
      ...h,
      dateFormatted: format(parseISO(h.date), 'dd MMM', { locale: idLocale }),
    }));
  }, [selectedContent]);

  const handleSaveContentViewsHistory = () => {
    if (!selectedContent) {
      toast.error('Konten tidak ditemukan atau belum dipilih');
      return;
    }
    const valViews = parseInt(logViews);
    if (isNaN(valViews) || valViews < 0) {
      toast.error('Masukkan jumlah views yang valid');
      return;
    }
    if (!logDate) {
      toast.error('Pilih tanggal terlebih dahulu');
      return;
    }

    const currentPerf = selectedContent.performance || { views: 0, likes: 0, comments: 0 };
    let newHistory = currentPerf.viewsHistory ? [...currentPerf.viewsHistory] : [];
    
    const existingIdx = newHistory.findIndex((e) => e.date === logDate);
    if (existingIdx > -1) {
      newHistory[existingIdx] = { ...newHistory[existingIdx], views: valViews };
    } else {
      newHistory.push({ date: logDate, views: valViews });
    }
    newHistory.sort((a, b) => a.date.localeCompare(b.date));

    let latestViews = valViews;
    if (newHistory.length > 0) {
      const latestEntry = [...newHistory].sort((a, b) => b.date.localeCompare(a.date))[0];
      latestViews = latestEntry.views;
    }

    updateContent(selectedContentId, {
      performance: {
        ...currentPerf,
        views: latestViews,
        viewsHistory: newHistory,
      },
    });

    toast.success(`Data views untuk "${selectedContent.title}" berhasil disimpan`);
  };
  
  // ── Unified Tabs & Analytics Filters ──
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'analytics'>('overview');
  const [period, setPeriod]             = useState(180);
  const [platform, setPlatform]         = useState<string | 'all'>('all');
  const [chartMode, setChartMode]       = useState<'followers' | 'views' | 'views_bar'>('views');
  
  // ── Modals & Instagram Sync States ──
  const [addOpen, setAddOpen]             = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [newSnap, setNewSnap]             = useState({ platform: '', date: '', followers: '', totalViews: '', avgEngagementRate: '' });
  const [quickFollowerOpen, setQuickFollowerOpen] = useState(false);
  const [quickFollowers, setQuickFollowers] = useState('');
  const [quickPlat, setQuickPlat]           = useState('');
  const [igUsername, setIgUsername]         = useState('');
  const [isSyncingIg, setIsSyncingIg]       = useState(false);
  const [saveIgUsername, setSaveIgUsername] = useState(true);

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

  // Pre-fill Instagram username from settings when the modal opens
  useEffect(() => {
    if (quickFollowerOpen && quickPlat.toLowerCase() === 'instagram') {
      const igPlat = plats.find((p) => (p.name || '').toLowerCase() === 'instagram');
      setIgUsername(igPlat?.instagramUsername || '');
    }
  }, [quickFollowerOpen, quickPlat, plats]);

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

  const handleSyncInstagram = async () => {
    if (!igUsername.trim()) {
      toast.error('Masukkan username Instagram terlebih dahulu');
      return;
    }
    setIsSyncingIg(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/analyze-instagram/${igUsername.trim()}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setQuickFollowers(data.followersCount.toString());
        toast.success(`Berhasil menarik data @${igUsername.trim()}! Followers: ${data.followersCount.toLocaleString()}`);
        
        if (saveIgUsername) {
          const igPlat = plats.find((p) => (p.name || '').toLowerCase() === 'instagram');
          if (igPlat) {
            updatePlatform(igPlat.id, { instagramUsername: igUsername.trim() });
          }
        }
      } else {
        toast.error(data.message || 'Gagal mengambil data Instagram.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghubungi server backend.');
    } finally {
      setIsSyncingIg(false);
    }
  };

  const handleSaveQuickFollowers = () => {
    const val = parseInt(quickFollowers);
    if (!val || val <= 0) { toast.error('Masukkan jumlah followers yang valid'); return; }
    if (!quickPlat) { toast.error('Pilih platform terlebih dahulu'); return; }
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingSnap = analytics.find((a) => a.date === todayStr && (a.platform ?? 'TikTok') === quickPlat);

    const platformSnaps = analytics
      .filter((a) => (a.platform ?? 'TikTok') === quickPlat)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const lastPlatformSnap = platformSnaps.length > 0 ? platformSnaps[0] : null;

    if (existingSnap) {
      updateAnalyticsSnapshot(existingSnap.id, {
        followers: val,
      });
      toast.success(`Followers ${quickPlat} hari ini berhasil diperbarui`);
    } else {
      addAnalyticsSnapshot({
        workspaceId:       activeWorkspaceId!,
        platform:          quickPlat,
        date:              todayStr,
        followers:         val,
        totalViews:        lastPlatformSnap?.totalViews ?? 0,
        avgEngagementRate: lastPlatformSnap?.avgEngagementRate ?? undefined,
      });
      toast.success(`Perkembangan followers ${quickPlat} berhasil ditambahkan`);
    }

    setQuickFollowers('');
    setQuickFollowerOpen(false);
  };

  const handleAddSnap = () => {
    if (!newSnap.date || !newSnap.followers) { toast.error('Tanggal dan followers wajib diisi'); return; }
    const targetPlat = newSnap.platform || (platform !== 'all' ? platform : (plats[0]?.name ?? 'TikTok'));

    addAnalyticsSnapshot({
      workspaceId:      activeWorkspaceId!,
      platform:         targetPlat,
      date:             newSnap.date,
      followers:        parseInt(newSnap.followers),
      totalViews:       parseInt(newSnap.totalViews) || 0,
      avgEngagementRate: parseFloat(newSnap.avgEngagementRate) || undefined,
    });
    toast.success('Data analytics ditambahkan');
    setNewSnap({ platform: '', date: '', followers: '', totalViews: '', avgEngagementRate: '' });
    setAddOpen(false);
  };

  // ── Filters & Analytics Computations ──
  const activePlats = useMemo(() => {
    return plats.filter(p => platform === 'all' || p.name === platform);
  }, [plats, platform]);
  
  const targetFollowers  = useMemo(() => {
    return activePlats.reduce((sum, p) => sum + (p.followerTarget ?? 0), 0);
  }, [activePlats]);

  const filteredContent = useMemo(() => {
    return platform === 'all' ? content : content.filter((c) => c.platform === platform);
  }, [content, platform]);

  const publishedContent = useMemo(() => {
    return filteredContent.filter((c) => c.status === 'Published');
  }, [filteredContent]);

  const readyToPost = useMemo(() => {
    return content.filter((c) => c.status === 'Ready to Post');
  }, [content]);

  const recentPlanned = useMemo(() => {
    return content
      .filter((c) => c.status !== 'Published')
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 5);
  }, [content]);

  // Aggregate stats by date for the active selection
  const analyticsChartData = useMemo(() => {
    let numDays = period;
    if (period === 9999) {
      if (analytics.length > 0) {
        const dates = analytics.map(a => a.date).sort();
        const earliest = parseISO(dates[0]);
        const diffTime = Math.abs(new Date().getTime() - earliest.getTime());
        numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (numDays < 7) numDays = 7;
      } else {
        numDays = 30;
      }
    }

    const dates: string[] = [];
    const today = new Date();
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }

    return dates.map((dateStr) => {
      let dateFollowers = 0;
      let dateViews = 0;
      let dateLikes = 0;
      let dateComments = 0;
      let dateShares = 0;
      let dateSaves = 0;

      for (const p of activePlats) {
        const platformSnaps = analytics
          .filter((a) => (a.platform ?? 'TikTok') === p.name && a.date <= dateStr)
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        
        if (platformSnaps.length > 0) {
          const snap = platformSnaps[0];
          dateFollowers += snap.followers;
          dateViews     += snap.totalViews ?? 0;
          dateLikes     += snap.totalLikes ?? 0;
          dateComments  += snap.totalComments ?? 0;
          dateShares    += snap.totalShares ?? 0;
          dateSaves     += snap.totalSaves ?? 0;
        } else {
          dateFollowers += p.initialFollowers ?? 0;
        }
      }

      const totalInteractions = dateLikes + dateComments + dateShares + dateSaves;
      const dateER = dateViews > 0 ? parseFloat(((totalInteractions / dateViews) * 100).toFixed(2)) : 0;

      return {
        date: numDays > 180 
          ? format(parseISO(dateStr), 'dd MMM yy', { locale: idLocale })
          : format(parseISO(dateStr), 'dd MMM', { locale: idLocale }),
        followers:  dateFollowers,
        views:      dateViews,
        engagement: dateER,
      };
    });
  }, [analytics, activePlats, period]);

  // Latest metrics for "Published" tab (Current Followers)
  const currentFollowers = useMemo(() => {
    let total = 0;
    for (const p of activePlats) {
      const platformSnaps = analytics
        .filter((a) => (a.platform ?? 'TikTok') === p.name)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      if (platformSnaps.length > 0) {
        total += platformSnaps[0].followers;
      } else {
        total += p.initialFollowers ?? 0;
      }
    }
    return total;
  }, [analytics, activePlats]);

  // Previous followers count (from the start of the period)
  const prevFollowers = useMemo(() => {
    const today = new Date();
    let numDays = period;
    if (period === 9999) {
      if (analytics.length > 0) {
        const dates = analytics.map(a => a.date).sort();
        const earliest = parseISO(dates[0]);
        const diffTime = Math.abs(today.getTime() - earliest.getTime());
        numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      } else {
        numDays = 30;
      }
    }
    
    const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - numDays);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const targetDateStr = `${yyyy}-${mm}-${dd}`;
    
    let total = 0;
    for (const p of activePlats) {
      const platformSnaps = analytics
        .filter((a) => (a.platform ?? 'TikTok') === p.name && a.date <= targetDateStr)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      if (platformSnaps.length > 0) {
        total += platformSnaps[0].followers;
      } else {
        total += p.initialFollowers ?? 0;
      }
    }
    return total;
  }, [analytics, activePlats, period]);

  const analyticsFollowerGrowth = useMemo(() => {
    if (analytics.length > 0 && prevFollowers > 0) {
      const diff = currentFollowers - prevFollowers;
      const pct = ((diff / prevFollowers) * 100).toFixed(1);
      return diff >= 0 ? `+${pct}%` : `${pct}%`;
    }
    return null;
  }, [analytics.length, currentFollowers, prevFollowers]);

  const analyticsTotalViews = publishedContent.reduce((s, c) => s + (c.performance?.views ?? 0), 0);
  const analyticsTotalLikes = publishedContent.reduce((s, c) => s + (c.performance?.likes ?? 0), 0);
  const analyticsTotalComments = publishedContent.reduce((s, c) => s + (c.performance?.comments ?? 0), 0);
  const analyticsTotalShares = publishedContent.reduce((s, c) => s + (c.performance?.shares ?? 0), 0);
  const analyticsTotalSaves  = publishedContent.reduce((s, c) => s + (c.performance?.saves ?? 0), 0);
  const analyticsTotalInteractions = analyticsTotalLikes + analyticsTotalComments + analyticsTotalShares + analyticsTotalSaves;
  const analyticsAvgEng     = analyticsTotalViews > 0 ? ((analyticsTotalInteractions / analyticsTotalViews) * 100).toFixed(1) : '0';

  const topContent = useMemo(() => {
    return [...publishedContent]
      .filter((c) => c.performance)
      .sort((a, b) => (b.performance?.views ?? 0) - (a.performance?.views ?? 0))
      .slice(0, 5);
  }, [publishedContent]);

  const stats = useMemo(() => {
    const published    = content.filter((c) => c.status === 'Published');
    const planned      = content.filter((c) => c.status !== 'Published');
    const totalViews   = published.reduce((s, c) => s + (c.performance?.views ?? 0), 0);
    const getFollowersOnDate = (dateStr: string) => {
      let total = 0;
      for (const p of plats) {
        const platformSnaps = analytics
          .filter((a) => (a.platform ?? 'TikTok').toLowerCase() === (p.name || '').toLowerCase() && a.date <= dateStr)
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        if (platformSnaps.length > 0) {
          total += platformSnaps[0].followers;
        } else {
          total += p.initialFollowers ?? 0;
        }
      }
      return total;
    };

    const today = new Date();
    const formatYmd = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const todayStr = formatYmd(today);
    const date30DaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    const date30DaysAgoStr = formatYmd(date30DaysAgo);

    const currentFollowers = getFollowersOnDate(todayStr);
    const prevFollowers    = getFollowersOnDate(date30DaysAgoStr);

    let followerGrowth = null;
    if (analytics.length > 0 && prevFollowers > 0) {
      const diff = currentFollowers - prevFollowers;
      const pct = ((diff / prevFollowers) * 100).toFixed(1);
      followerGrowth = diff >= 0 ? `+${pct}` : pct;
    }

    // Status distribution
    const statusDist = CONTENT_STATUSES.map((s) => ({
      name:  s,
      value: content.filter((c) => c.status === s).length,
      color: STATUS_COLORS[s],
    })).filter((s) => s.value > 0);

    // Platform distribution
    const platformDist = plats.map((p) => {
      const platformSnaps = analytics
        .filter((a) => (a.platform ?? 'TikTok').toLowerCase() === (p.name || '').toLowerCase())
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const followers = platformSnaps.length > 0 
        ? platformSnaps[0].followers 
        : (p.initialFollowers ?? 0);

      return {
        name:  p.name,
        count: content.filter((c) => c.platform.toLowerCase() === (p.name || '').toLowerCase()).length,
        followers,
        color: getPlatformColor(p.name, p.color),
      };
    }).filter((p) => p.count > 0 || p.followers > 0);

    return {
      followers:    currentFollowers,
      followerGrowth,
      totalViews,
      totalContent: content.length,
      published:    published.length,
      planned:      planned.length,
      statusDist,
      platformDist,
    };
  }, [content, analytics, plats]);

  const chartData = useMemo(() => {
    // Generate last 7 days day-by-day
    const dates: string[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    
    return dates.map((dateStr) => {
      let dateFollowers = 0;
      let dateViews = 0;
      for (const p of plats) {
        const platformSnaps = analytics
          .filter((a) => (a.platform ?? 'TikTok').toLowerCase() === (p.name || '').toLowerCase() && a.date <= dateStr)
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        if (platformSnaps.length > 0) {
          dateFollowers += platformSnaps[0].followers;
          dateViews     += platformSnaps[0].totalViews ?? 0;
        } else {
          dateFollowers += p.initialFollowers ?? 0;
        }
      }

      return {
        date: format(parseISO(dateStr), 'dd MMM', { locale: idLocale }),
        followers: dateFollowers,
        views: dateViews,
      };
    });
  }, [analytics, plats]);

  return (
    <div className="page-enter flex flex-col h-full overflow-hidden">
      <TopBar
        title={`Halo, ${ws?.name ?? 'Creator'}`}
        subtitle={format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })}
      />

      {/* ── Tab Switcher & Filter Toolbar ── */}
      <div
        className="px-4 md:px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 flex-shrink-0"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--bg-surface-translucent)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="seg-control">
          <button
            className={`seg-btn ${dashboardTab === 'overview' ? 'active' : ''}`}
            onClick={() => setDashboardTab('overview')}
          >
            Ikhtisar
          </button>
          <button
            className={`seg-btn ${dashboardTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setDashboardTab('analytics')}
          >
            Analitik
          </button>
        </div>

        {/* Filters and Actions shown only when 'analytics' tab is active */}
        {dashboardTab === 'analytics' && (
          <div className="flex items-center gap-3 flex-wrap animate-fade-in">
            {/* Platform filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium" style={{ color: 'var(--text-quaternary)' }}>Platform:</span>
              <button
                className={`badge cursor-pointer text-xs transition-all ${platform === 'all' ? 'scale-105 font-semibold' : 'opacity-60'}`}
                style={{
                  background: platform === 'all' ? '#1C1C1E' : 'var(--bg-tertiary)',
                  color:      platform === 'all' ? '#fff' : 'var(--text-secondary)',
                }}
                onClick={() => setPlatform('all')}
              >
                Semua
              </button>
              {plats.filter((p) => content.some((c) => c.platform === p.name)).map((p) => {
                const color  = p.color || PLATFORM_COLORS[p.name] || '#636366';
                const active = platform === p.name;
                return (
                  <button
                    key={p.id}
                    className={`badge cursor-pointer text-xs transition-all ${active ? 'scale-105 font-semibold' : 'opacity-60'}`}
                    style={{
                      background: active ? `${color}18` : 'var(--bg-tertiary)',
                      color:      active ? color : 'var(--text-secondary)',
                      border:     active ? `1.5px solid ${color}30` : '1.5px solid transparent',
                    }}
                    onClick={() => setPlatform(active ? 'all' : p.name)}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>

            {/* Period selector */}
            <div className="seg-control">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  className={`seg-btn ${period === opt.days ? 'active' : ''}`}
                  onClick={() => setPeriod(opt.days)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Aksi */}
            <div className="flex items-center gap-2">
              <button className="btn btn-secondary btn-sm text-xs py-1.5" onClick={() => { 
                const targetPlat = platform !== 'all' ? platform : (plats[0]?.name ?? 'TikTok');
                setQuickPlat(targetPlat);
                const platformSnaps = analytics
                  .filter((a) => (a.platform ?? 'TikTok').toLowerCase() === targetPlat.toLowerCase())
                  .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                const currentVal = platformSnaps.length > 0 ? platformSnaps[0].followers : (plats.find(p => (p.name || '').toLowerCase() === targetPlat.toLowerCase())?.initialFollowers ?? 0);
                setQuickFollowers(currentVal.toString()); 
                setQuickFollowerOpen(true); 
              }}>
                Update Followers
              </button>
              <button className="btn btn-secondary btn-sm text-xs py-1.5" onClick={() => setAddOpen(true)}>
                Input Performa Lengkap
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="page-content flex-1 min-h-0 overflow-y-auto pb-6">
        {dashboardTab === 'overview' ? (
          <div className="animate-fade-in flex flex-col gap-4">
            {/* ── Stats Row ────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 flex-shrink-0">
              <StatCard
                icon={Users} label="Followers"
                value={formatNumber(stats.followers)}
                sub={stats.followerGrowth ? `${stats.followerGrowth}% bulan ini` : 'Belum ada data'}
                color="#0A84FF"
                gradient="linear-gradient(135deg, rgba(10,132,255,0.18), rgba(94,92,230,0.10))"
                onClick={() => setDashboardTab('analytics')}
              />
              <StatCard
                icon={Eye} label="Total Views"
                value={formatNumber(stats.totalViews)}
                sub={`${stats.published} konten published`}
                color="#5E5CE6"
                gradient="linear-gradient(135deg, rgba(94,92,230,0.18), rgba(191,90,242,0.10))"
                onClick={() => setDashboardTab('analytics')}
              />
              <StatCard
                icon={FileText} label="Konten Published"
                value={stats.published.toString()}
                sub="siap dilihat audiens"
                color="#30D158"
                gradient="linear-gradient(135deg, rgba(48,209,88,0.18), rgba(90,200,250,0.10))"
                onClick={() => navigate('/bank')}
              />
              <StatCard
                icon={Layers} label="Dalam Pipeline"
                value={stats.planned.toString()}
                sub="sedang diproses"
                color="#FF9F0A"
                gradient="linear-gradient(135deg, rgba(255,159,10,0.18), rgba(255,69,58,0.10))"
                onClick={() => navigate('/planner')}
              />
            </div>

            {/* ── Row 2: Growth + Status Dist ──────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 flex-shrink-0">
              {/* Growth Chart — 3/5 */}
              <div className="card p-5 lg:col-span-3">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {chartMode === 'followers' ? 'Pertumbuhan Followers' : 'Pertumbuhan Views'}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>7 hari terakhir</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="seg-control">
                      <button
                        className={`seg-btn ${chartMode === 'followers' ? 'active' : ''}`}
                        onClick={() => setChartMode('followers')}
                      >
                        Followers
                      </button>
                      <button
                        className={`seg-btn ${chartMode === 'views' ? 'active' : ''}`}
                        onClick={() => setChartMode('views')}
                      >
                        Views
                      </button>
                    </div>
                    <button
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--color-blue)' }}
                      onClick={() => setDashboardTab('analytics')}
                    >
                      Lihat detail <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
                {chartData.length > 1 ? (
                  <ResponsiveContainer width="99%" height={160}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#007AFF" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#5856D6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#5856D6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8E8E93' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} axisLine={false} tickLine={false} tickFormatter={formatNumber} width={38} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey={chartMode === 'followers' || chartMode === 'views' ? chartMode : 'views'}
                        stroke={chartMode === 'followers' ? '#007AFF' : '#5856D6'}
                        strokeWidth={2.5}
                        fill={chartMode === 'followers' ? 'url(#gradBlue)' : 'url(#gradIndigo)'}
                        dot={false}
                        activeDot={{ r: 5, fill: chartMode === 'followers' ? '#007AFF' : '#5856D6' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state h-40">
                    <p className="text-sm" style={{ color: 'var(--text-quaternary)' }}>Belum cukup data untuk grafik</p>
                    <button className="btn btn-secondary btn-sm mt-2" onClick={() => setDashboardTab('analytics')}>
                      Input Data Analytics
                    </button>
                  </div>
                )}
              </div>

              {/* Status Distribution — 2/5 */}
              <div className="card p-5 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Status Konten</h3>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-quaternary)' }}>{content.length} total</span>
                </div>
                {content.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {CONTENT_STATUSES.map((status) => (
                      <ContentStatusBar
                        key={status}
                        status={status}
                        count={content.filter((c) => c.status === status).length}
                        total={content.length}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state h-40">
                    <p className="text-sm" style={{ color: 'var(--text-quaternary)' }}>Belum ada konten</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Row 3: Platform + Ready + Recent ─────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-grow min-h-0">
              {/* Platform Breakdown */}
              <div className="card p-5 flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Konten per Platform</h3>
                  <button
                    className="text-xs"
                    style={{ color: 'var(--color-blue)' }}
                    onClick={() => setDashboardTab('analytics')}
                  >
                    Analitik →
                  </button>
                </div>
                {stats.platformDist.length > 0 ? (
                  <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2 min-h-0">
                    <div className="flex flex-wrap gap-2 mb-2 flex-shrink-0">
                      {stats.platformDist.map((p) => (
                        <PlatformPill
                          key={p.name}
                          platform={p.name}
                          count={p.count}
                          followers={p.followers}
                          color={p.color}
                          onClick={() => {
                            setDashboardTab('analytics');
                            setPlatform(p.name);
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex-grow min-h-[100px] flex items-center justify-center">
                      <ResponsiveContainer width="99%" height={100}>
                        <BarChart data={stats.platformDist} barSize={18}>
                          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#8E8E93' }} axisLine={false} tickLine={false}
                            tickFormatter={(v) => v.length > 10 ? v.substring(0, 8) + '..' : v} />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {stats.platformDist.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state h-32 flex-1 flex items-center justify-center">
                    <p className="text-sm" style={{ color: 'var(--text-quaternary)' }}>Belum ada konten</p>
                  </div>
                )}
              </div>

              {/* Ready to Post */}
              <div className="card p-5 flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#34C759' }} />
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Siap Upload</h3>
                    {readyToPost.length > 0 && (
                      <span className="badge text-xs" style={{ background: '#E6FAF0', color: '#34C759' }}>
                        {readyToPost.length}
                      </span>
                    )}
                  </div>
                  <button
                    className="text-xs font-semibold"
                    style={{ color: 'var(--color-blue)' }}
                    onClick={() => navigate('/planner')}
                  >
                    Planner →
                  </button>
                </div>
                {readyToPost.length > 0 ? (
                  <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2 min-h-0">
                    {readyToPost.map((c) => {
                      const color = getPlatformColor(c.platform, PLATFORM_COLORS[c.platform]);
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-2.5 py-2 border-b last:border-0"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                          </div>
                          <button
                            className="btn btn-ghost btn-sm text-[10px] font-semibold py-0.5 px-2"
                            style={{ color: 'var(--color-blue)' }}
                            onClick={() => navigate('/kanban')}
                          >
                            Post
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state h-32 flex-grow flex items-center justify-center">
                    <p className="text-sm" style={{ color: 'var(--text-quaternary)' }}>Tidak ada konten siap upload</p>
                  </div>
                )}
              </div>

              {/* Konten Berjalan */}
              <div className="card p-5 flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Konten Berjalan</h3>
                  <button
                    className="text-xs font-semibold"
                    style={{ color: 'var(--color-blue)' }}
                    onClick={() => navigate('/kanban')}
                  >
                    Kanban →
                  </button>
                </div>
                {recentPlanned.length > 0 ? (
                  <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2 min-h-0">
                    {recentPlanned.map((c) => {
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-2.5 py-2 border-b last:border-0"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ background: getPlatformColor(c.platform, PLATFORM_COLORS[c.platform]) }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                          </div>
                          <span
                            className="badge text-xs flex-shrink-0"
                            style={{ background: getStatusBg(c.status), color: STATUS_COLORS[c.status] }}
                          >
                            {c.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state h-32 flex-grow flex items-center justify-center">
                    <p className="text-sm" style={{ color: 'var(--text-quaternary)' }}>Semua konten sudah published!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in flex flex-col gap-4">
            
            {/* Primary Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Views (Indigo Premium Glow) */}
              <div className="stat-card relative overflow-hidden transition-all duration-300 hover:shadow-ios-md animate-fade-in" 
                   style={{ border: '1px solid rgba(88, 86, 214, 0.25)', boxShadow: '0 4px 20px rgba(88, 86, 214, 0.08)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-quaternary)' }}>Total Views</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                      {formatNumber(analyticsTotalViews)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-quaternary)' }}>{publishedContent.length} konten published</p>
                  </div>
                  <div className="w-10 h-10 rounded-ios flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(88, 86, 214, 0.12)' }}>
                    <Eye size={20} style={{ color: '#5856D6' }} />
                  </div>
                </div>
              </div>

              {/* Followers & Growth (Blue) */}
              <div className="stat-card transition-all duration-300 hover:shadow-ios-md">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-quaternary)' }}>Followers</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                      {formatNumber(currentFollowers)}
                    </p>
                    {analyticsFollowerGrowth ? (
                      <p className="text-xs mt-1 font-semibold" style={{ color: analyticsFollowerGrowth.startsWith('+') ? '#34C759' : '#FF3B30' }}>
                        {analyticsFollowerGrowth} periode ini
                      </p>
                    ) : (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-quaternary)' }}>Belum ada pertumbuhan</p>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-ios flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0, 122, 255, 0.12)' }}>
                    <Users size={20} style={{ color: '#007AFF' }} />
                  </div>
                </div>
              </div>

              {/* Avg Engagement Rate (Green) */}
              <div className="stat-card transition-all duration-300 hover:shadow-ios-md">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-quaternary)' }}>Avg Engagement Rate</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                      {analyticsAvgEng}%
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-quaternary)' }}>Rasio interaksi vs tayang</p>
                  </div>
                  <div className="w-10 h-10 rounded-ios flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(52, 199, 89, 0.12)' }}>
                    <TrendingUp size={20} style={{ color: '#34C759' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary stats horizontal bar (de-emphasized) */}
            <div className="card p-3 px-5 flex flex-row items-center justify-around gap-4 flex-wrap text-center border-t" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-quaternary)' }}>Total Likes</p>
                <div className="flex items-center gap-1 justify-center">
                  <Heart size={12} className="text-[#FF2D55]" />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{formatNumber(analyticsTotalLikes)}</span>
                </div>
              </div>
              <div className="w-[1px] h-6" style={{ background: 'var(--border-color)' }} />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-quaternary)' }}>Total Shares</p>
                <div className="flex items-center gap-1 justify-center">
                  <Share2 size={12} className="text-[#FF9500]" />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{formatNumber(analyticsTotalShares)}</span>
                </div>
              </div>
              <div className="w-[1px] h-6" style={{ background: 'var(--border-color)' }} />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-quaternary)' }}>Total Saves</p>
                <div className="flex items-center gap-1 justify-center">
                  <Bookmark size={12} className="text-[#AF52DE]" />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{formatNumber(analyticsTotalSaves)}</span>
                </div>
              </div>
            </div>

            {/* Target Followers Goal Progress Tracker */}
            {targetFollowers > 0 && (
              <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-ios flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,122,255,0.1)' }}>
                    <Users size={20} style={{ color: '#007AFF' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {platform === 'all' ? `Target Followers Gabungan (${ws?.name})` : `Target Followers ${platform}`}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                      {formatNumber(currentFollowers)} dari {formatNumber(targetFollowers)} followers tercapai
                    </p>
                  </div>
                </div>
                <div className="flex-1 max-w-md w-full">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Progres Pencapaian</span>
                    <span className="text-xs font-bold" style={{ color: '#007AFF' }}>
                      {Math.min(Math.round((currentFollowers / targetFollowers) * 100), 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${Math.min(Math.round((currentFollowers / targetFollowers) * 100), 100)}%`, 
                        background: 'linear-gradient(90deg, #007AFF, #00C7FF)' 
                      }} 
                    />
                  </div>
                </div>
                {targetFollowers - currentFollowers > 0 ? (
                  <span className="text-xs badge flex-shrink-0" style={{ background: 'rgba(0,122,255,0.1)', color: '#007AFF' }}>
                    Kurang {formatNumber(targetFollowers - currentFollowers)} lagi!
                  </span>
                ) : (
                  <span className="text-xs badge flex-shrink-0" style={{ background: '#E6FAF0', color: '#34C759' }}>
                    Target Tercapai!
                  </span>
                )}
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Followers/Views Trend Chart (Default to Views growth) */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {chartMode === 'followers' ? 'Pertumbuhan Followers' : 'Pertumbuhan Views'}
                      {platform !== 'all' && <span className="ml-2 badge text-xs" style={{ background: `${PLATFORM_COLORS[platform]}18`, color: PLATFORM_COLORS[platform] }}>{platform}</span>}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>Tren pertumbuhan pengikut & tayang</p>
                  </div>
                  <div className="seg-control">
                    <button
                      className={`seg-btn ${chartMode === 'views' ? 'active' : ''}`}
                      onClick={() => setChartMode('views')}
                    >
                      Views
                    </button>
                    <button
                      className={`seg-btn ${chartMode === 'followers' ? 'active' : ''}`}
                      onClick={() => setChartMode('followers')}
                    >
                      Followers
                    </button>
                  </div>
                </div>
                {analyticsChartData.length > 1 ? (
                  <ResponsiveContainer width="99%" height={200}>
                    <AreaChart data={analyticsChartData}>
                      <defs>
                        <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#007AFF" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gIndigo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#5856D6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#5856D6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8E8E93' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} axisLine={false} tickLine={false} tickFormatter={formatNumber} width={38} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey={chartMode === 'followers' ? 'followers' : 'views'}
                        stroke={chartMode === 'followers' ? '#007AFF' : '#5856D6'}
                        strokeWidth={2.5}
                        fill={chartMode === 'followers' ? 'url(#gBlue)' : 'url(#gIndigo)'}
                        dot={false}
                        activeDot={{ r: 5, fill: chartMode === 'followers' ? '#007AFF' : '#5856D6' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state h-48">
                    <p className="text-sm" style={{ color: 'var(--text-quaternary)' }}>Butuh min. 2 data snapshot untuk melihat grafik</p>
                    <button className="btn btn-secondary btn-sm mt-2" onClick={() => setAddOpen(true)}>Input Data</button>
                  </div>
                )}
              </div>

              {/* Total Views per Periode (Bar Chart) */}
              <div className="card p-5">
                <div className="mb-4">
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Total Views per Periode</h3>
                  <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>Distribusi akumulasi tayang per titik waktu</p>
                </div>
                {analyticsChartData.length > 0 ? (
                  <ResponsiveContainer width="99%" height={200}>
                    <BarChart data={analyticsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8E8E93' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} axisLine={false} tickLine={false} tickFormatter={formatNumber} width={38} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Bar dataKey="views" fill="#5856D6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state h-48">
                    <p className="text-sm" style={{ color: 'var(--text-quaternary)' }}>Belum ada data untuk grafik bar</p>
                  </div>
                )}
              </div>
            </div>

            {/* Views Growth per Content Card */}
            <div className="card p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Pertumbuhan View per Konten
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                    Grafik kenaikan tayangan untuk konten tertentu dari waktu ke waktu
                  </p>
                </div>
                
                {/* Content Dropdown Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Pilih Konten:</span>
                  <select
                    className="input select py-1 px-2 text-xs max-w-[250px]"
                    value={selectedContentId}
                    onChange={(e) => setSelectedContentId(e.target.value)}
                  >
                    <option value="">-- Pilih Konten --</option>
                    {publishedContent.map(c => (
                      <option key={c.id} value={c.id}>
                        [{c.platform}] {c.title.length > 35 ? c.title.substring(0, 35) + '...' : c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedContent ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                  {/* Recharts Area Chart */}
                  <div className="lg:col-span-2">
                    {selectedContentHistory && selectedContentHistory.length > 0 ? (
                      <ResponsiveContainer width="99%" height={200}>
                        <AreaChart data={selectedContentHistory}>
                          <defs>
                            <linearGradient id="gContentIndigo" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#5856D6" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#5856D6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                          <XAxis dataKey="dateFormatted" tick={{ fontSize: 10, fill: '#8E8E93' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#8E8E93' }} axisLine={false} tickLine={false} tickFormatter={formatNumber} width={38} />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="views"
                            stroke="#5856D6"
                            strokeWidth={2.5}
                            fill="url(#gContentIndigo)"
                            dot={{ r: 3, fill: '#5856D6' }}
                            activeDot={{ r: 5 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-state h-48 flex flex-col justify-center items-center">
                        <p className="text-sm" style={{ color: 'var(--text-quaternary)' }}>
                          Belum ada riwayat perkembangan views untuk konten ini.
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-quaternary)' }}>
                          Gunakan panel di sebelah kanan untuk merekam entri pertama.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quick Update Form */}
                  <div className="p-4 rounded-ios border flex flex-col gap-3.5 text-left" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-left" style={{ color: 'var(--text-tertiary)' }}>
                      Log Views Harian
                    </h4>
                    
                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-left" style={{ color: 'var(--text-quaternary)' }}>
                        Tanggal
                      </label>
                      <input
                        type="date"
                        className="input text-xs py-1"
                        value={logDate}
                        onChange={(e) => setLogDate(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-left" style={{ color: 'var(--text-quaternary)' }}>
                        Jumlah Views
                      </label>
                      <input
                        type="number"
                        className="input text-xs py-1"
                        placeholder="Masukkan total views"
                        value={logViews}
                        onChange={(e) => setLogViews(e.target.value)}
                      />
                    </div>

                    <button
                      className="btn btn-primary btn-sm py-1.5 w-full justify-center text-xs mt-1"
                      onClick={handleSaveContentViewsHistory}
                    >
                      Simpan Data Views
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state h-36 flex items-center justify-center border border-dashed rounded-ios" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="text-sm text-center" style={{ color: 'var(--text-quaternary)' }}>
                    {publishedContent.length > 0
                      ? 'Pilih salah satu konten di atas untuk melihat grafik pertumbuhan tayangan.'
                      : 'Belum ada konten dengan status Published di platform/workspace ini.'}
                  </p>
                </div>
              )}
            </div>

            {/* Top Performers Table */}
            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
                Top Performa Konten
                {platform !== 'all' && <span className="ml-2 text-xs" style={{ color: 'var(--text-quaternary)' }}>({platform})</span>}
              </h3>
              {topContent.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        {['#', 'Judul', 'Platform', 'Views', 'Likes', 'Shares', 'Saves', 'ER%'].map((h) => (
                          <th key={h} className="text-left py-2 px-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-quaternary)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topContent.map((c, i) => {
                        const er    = c.performance ? calculateEngagement(c.performance) : 0;
                        const pColor = PLATFORM_COLORS[c.platform] ?? '#636366';
                        return (
                          <tr key={c.id} className="border-b hover-bg-subtle transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                            <td className="py-3 px-2 text-xs font-bold" style={{ color: 'var(--text-quaternary)' }}>#{i + 1}</td>
                            <td className="py-3 px-2">
                              <p className="text-sm font-medium truncate max-w-[220px]" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                            </td>
                            <td className="py-3 px-2">
                              <span className="badge text-xs" style={{ background: `${pColor}14`, color: pColor }}>
                                {c.platform}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatNumber(c.performance!.views)}</td>
                            <td className="py-3 px-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatNumber(c.performance!.likes)}</td>
                            <td className="py-3 px-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatNumber(c.performance!.shares ?? 0)}</td>
                            <td className="py-3 px-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatNumber(c.performance!.saves ?? 0)}</td>
                            <td className="py-3 px-2">
                              <span className="badge text-xs" style={{ background: '#E6FAF0', color: '#34C759' }}>{er}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state py-10">
                  <p className="text-sm" style={{ color: 'var(--text-quaternary)' }}>
                    {platform !== 'all'
                      ? `Belum ada konten published di ${platform} dengan data performa`
                      : 'Belum ada konten published dengan data performa'}
                  </p>
                </div>
              )}
            </div>

            {/* Collapsible Snapshot History Manager */}
            <div className="card p-5">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowSnapshots(!showSnapshots)}>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Kelola Riwayat Snapshot ({analytics.length} Data)
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                    Lihat dan hapus data titik snapshot untuk meriset ulang grafik pertumbuhan.
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-blue)' }}>
                  {showSnapshots ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
              
              {showSnapshots && (
                <div className="mt-4 overflow-x-auto">
                  {analytics.length > 0 ? (
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                          <th className="py-2 px-2 font-semibold" style={{ color: 'var(--text-quaternary)' }}>Platform</th>
                          <th className="py-2 px-2 font-semibold" style={{ color: 'var(--text-quaternary)' }}>Tanggal</th>
                          <th className="py-2 px-2 font-semibold" style={{ color: 'var(--text-quaternary)' }}>Followers</th>
                          <th className="py-2 px-2 font-semibold" style={{ color: 'var(--text-quaternary)' }}>Total Views</th>
                          <th className="py-2 px-2 font-semibold" style={{ color: 'var(--text-quaternary)' }}>Engagement</th>
                          <th className="py-2 px-2 font-semibold text-right" style={{ color: 'var(--text-quaternary)' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.map((snap) => (
                          <tr key={snap.id} className="border-b hover-bg-subtle transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                            <td className="py-2.5 px-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {snap.platform ?? 'TikTok'}
                            </td>
                            <td className="py-2.5 px-2" style={{ color: 'var(--text-primary)' }}>{snap.date}</td>
                            <td className="py-2.5 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{snap.followers.toLocaleString()}</td>
                            <td className="py-2.5 px-2" style={{ color: 'var(--text-secondary)' }}>{(snap.totalViews || 0).toLocaleString()}</td>
                            <td className="py-2.5 px-2" style={{ color: 'var(--text-secondary)' }}>{snap.avgEngagementRate ? `${snap.avgEngagementRate}%` : '-'}</td>
                            <td className="py-2.5 px-2 text-right">
                              <button
                                className="btn btn-ghost btn-sm text-[11px] p-1 font-semibold"
                                style={{ color: 'var(--color-red)' }}
                                onClick={() => {
                                  triggerConfirm({
                                    title: 'Hapus Snapshot Data?',
                                    message: `Apakah Anda yakin ingin menghapus snapshot data platform ${snap.platform ?? 'TikTok'} pada tanggal ${snap.date}?`,
                                    confirmText: 'Hapus',
                                    type: 'danger',
                                    onConfirm: () => {
                                      deleteAnalyticsSnapshot(snap.id);
                                      toast.success('Snapshot dihapus');
                                    },
                                  });
                                }}
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs py-4 text-center" style={{ color: 'var(--text-quaternary)' }}>Belum ada data snapshot</p>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      
      {/* 1. Quick Update Followers Modal */}
      {quickFollowerOpen && createPortal(
        <div className="modal-overlay" onClick={() => setQuickFollowerOpen(false)} style={{ zIndex: 9999 }}>
          <div className="modal w-full max-w-[92vw] md:max-w-[400px]" style={{ borderRadius: 16 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header p-4 pb-0 md:p-6 md:pb-0">
              <h3 className="font-semibold text-base md:text-lg" style={{ color: 'var(--text-primary)' }}>Update Followers</h3>
              <button className="p-1 rounded-full hover-bg-subtle border-none bg-transparent cursor-pointer flex items-center justify-center" onClick={() => setQuickFollowerOpen(false)}>
                <X size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            
            <div className="modal-body p-4 md:p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Platform</label>
                <select 
                  className="input text-sm w-full" 
                  value={quickPlat}
                  onChange={(e) => {
                    setQuickPlat(e.target.value);
                    const valSnap = analytics
                      .filter((a) => (a.platform ?? 'TikTok').toLowerCase() === e.target.value.toLowerCase())
                      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                    const currentVal = valSnap.length > 0 ? valSnap[0].followers : (plats.find(p => (p.name || '').toLowerCase() === e.target.value.toLowerCase())?.initialFollowers ?? 0);
                    setQuickFollowers(currentVal.toString());
                  }}
                >
                  {plats.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {quickPlat === 'Instagram' && (
                <div className="form-group flex flex-col gap-1 rounded-[12px] p-3 border" style={{ borderColor: 'var(--border-color)', background: 'rgba(10, 132, 255, 0.04)' }}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Sinkronisasi Instagram Otomatis</label>
                    <button 
                      className="btn btn-primary btn-sm flex items-center gap-1"
                      onClick={handleSyncInstagram}
                      disabled={isSyncingIg}
                    >
                      {isSyncingIg ? (
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <RefreshCw size={12} />
                          Tarik Data
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Sistem akan otomatis mengambil data followers terbaru dari profil publik instagram:
                  </p>
                  <input
                    type="text"
                    className="input py-1 px-2.5 mt-1.5 text-xs font-medium"
                    placeholder="Username Instagram (cth: @bagas)"
                    value={igUsername}
                    onChange={(e) => setIgUsername(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-[10px] mt-1.5 cursor-pointer" style={{ color: 'var(--text-quaternary)' }}>
                    <input 
                      type="checkbox"
                      checked={saveIgUsername}
                      onChange={(e) => setSaveIgUsername(e.target.checked)}
                    />
                    Simpan username di Pengaturan
                  </label>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Jumlah Followers Baru</label>
                <input
                  type="number"
                  className="input text-sm w-full"
                  placeholder="Contoh: 12800"
                  value={quickFollowers}
                  onChange={(e) => setQuickFollowers(e.target.value)}
                />
              </div>

              <div className="flex flex-col md:flex-row gap-2.5 mt-2">
                <button className="btn btn-secondary w-full md:w-auto md:flex-1 justify-center" onClick={() => setQuickFollowerOpen(false)}>Batal</button>
                <button className="btn btn-primary w-full md:w-auto md:flex-1 justify-center" onClick={handleSaveQuickFollowers}>Simpan</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. Full Performance Snapshot Modal */}
      {addOpen && createPortal(
        <div className="modal-overlay" onClick={() => setAddOpen(false)} style={{ zIndex: 9999 }}>
          <div className="modal w-full max-w-[92vw] md:max-w-[400px]" style={{ borderRadius: 16 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header p-4 pb-0 md:p-6 md:pb-0">
              <h3 className="font-semibold text-base md:text-lg" style={{ color: 'var(--text-primary)' }}>Input Performa Lengkap</h3>
              <button className="p-1 rounded-full hover-bg-subtle border-none bg-transparent cursor-pointer flex items-center justify-center" onClick={() => setAddOpen(false)}>
                <X size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            
            <div className="modal-body p-4 md:p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Platform</label>
                <select 
                  className="input text-sm w-full" 
                  value={newSnap.platform}
                  onChange={(e) => setNewSnap(prev => ({ ...prev, platform: e.target.value }))}
                >
                  <option value="">Pilih Platform</option>
                  {plats.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Tanggal Snapshot</label>
                <input
                  type="date"
                  className="input text-sm w-full"
                  value={newSnap.date}
                  onChange={(e) => setNewSnap(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Jumlah Followers</label>
                <input
                  type="number"
                  className="input text-sm w-full"
                  placeholder="Contoh: 15400"
                  value={newSnap.followers}
                  onChange={(e) => setNewSnap(prev => ({ ...prev, followers: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Total Views Terakumulasi</label>
                <input
                  type="number"
                  className="input text-sm w-full"
                  placeholder="Contoh: 350000 (Opsional)"
                  value={newSnap.totalViews}
                  onChange={(e) => setNewSnap(prev => ({ ...prev, totalViews: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Engagement Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input text-sm w-full"
                  placeholder="Contoh: 5.4 (Opsional)"
                  value={newSnap.avgEngagementRate}
                  onChange={(e) => setNewSnap(prev => ({ ...prev, avgEngagementRate: e.target.value }))}
                />
              </div>

              <div className="flex flex-col md:flex-row gap-2.5 mt-2">
                <button className="btn btn-secondary w-full md:w-auto md:flex-1 justify-center" onClick={() => setAddOpen(false)}>Batal</button>
                <button className="btn btn-primary w-full md:w-auto md:flex-1 justify-center" onClick={handleAddSnap}>Simpan</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3. Confirm Modal wrapper */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

