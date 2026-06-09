// src/pages/ContentBank.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Search, Grid, List, Eye, Heart, MessageCircle, Share2, 
  Bookmark, FileSearch, Calendar, Filter, ChevronDown, 
  X, Check, Clock, AlignLeft
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/appStore';
import { TopBar } from '../components/layout/TopBar';
import { ContentModal } from '../components/content/ContentModal';
import { formatDate, getStatusColor, getStatusBg } from '../lib/utils';
import type { ContentItem, ContentStatus, Category, WorkspacePlatform } from '../types';
import { CONTENT_STATUSES } from '../types';
import { toast } from '../components/ui/Toast';
import { logActivity } from '../lib/auditLogger';

// Status info untuk form planner
const STATUS_INFO: Record<ContentStatus, { icon: React.ElementType; desc: string; color: string }> = {
  'Idea':          { icon: Clock,        desc: 'Ide mentah, belum mulai dikerjakan',         color: '#8E8E93' },
  'Scripting':     { icon: AlignLeft,    desc: 'Sedang menulis script / storyline',          color: '#FF9500' },
  'Production':    { icon: Eye,          desc: 'Sedang proses shooting / rekaman',           color: '#007AFF' },
  'Editing':       { icon: Bookmark,     desc: 'Sedang editing video / foto / desain',       color: '#AF52DE' },
  'Ready to Post': { icon: Calendar,     desc: 'Selesai, siap untuk diupload ke platform',  color: '#34C759' },
  'Published':     { icon: Check,        desc: 'Sudah diupload dan live di platform',        color: '#5856D6' },
};

interface PlannerFormState {
  title:        string;
  categoryId:   string;
  status:       ContentStatus;
  platforms:    string[];
  scheduleDate: string;
  notes:        string;
}

const EMPTY_FORM = (defaultPlats?: string[]): PlannerFormState => ({
  title:        '',
  categoryId:   '',
  status:       'Idea',
  platforms:    defaultPlats ?? [],
  scheduleDate: '',
  notes:        '',
});

function StatusSelector({ value, onChange }: { value: ContentStatus; onChange: (s: ContentStatus) => void }) {
  const [open, setOpen] = useState(false);
  const info = STATUS_INFO[value];
  const Icon = info.icon;
  return (
    <div className="relative">
      <button
        type="button"
        className="w-full flex items-center gap-2 p-2.5 rounded-ios border text-left transition-all text-xs"
        style={{
          background: `${info.color}08`,
          borderColor: `${info.color}30`,
        }}
        onClick={() => setOpen(!open)}
      >
        <div className="w-6 h-6 rounded-[7px] flex items-center justify-center flex-shrink-0" style={{ background: `${info.color}18` }}>
          <Icon size={13} style={{ color: info.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
        </div>
        <ChevronDown size={14} style={{ color: 'var(--text-quaternary)', transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-ios overflow-hidden z-20 animate-scale-in"
          style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}
        >
          {CONTENT_STATUSES.map((s) => {
            const si = STATUS_INFO[s];
            const SI = si.icon;
            return (
              <button
                key={s}
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 hover-bg-subtle transition-colors text-left text-xs"
                style={{ background: s === value ? `${si.color}08` : undefined }}
                onClick={() => { onChange(s); setOpen(false); }}
              >
                <div className="w-6 h-6 rounded-[7px] flex items-center justify-center flex-shrink-0" style={{ background: `${si.color}18` }}>
                  <SI size={13} style={{ color: si.color }} />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{s}</p>
                </div>
                {s === value && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: si.color }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlatformSelector({ value, onChange, plats }: { value: string[]; onChange: (p: string[]) => void; plats: any[] }) {
  const accentColor = '#007AFF';
  return (
    <div className="flex flex-wrap gap-1.5">
      {plats.map((plat) => {
        const p = plat.name;
        const selected = value.includes(p);
        return (
          <button
            key={plat.id}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
            style={{
              background: selected ? `${accentColor}18` : 'var(--bg-tertiary)',
              color:      selected ? accentColor : 'var(--text-tertiary)',
              border:     `1px solid ${selected ? accentColor + '40' : 'transparent'}`,
            }}
            onClick={() => {
              if (selected) {
                onChange(value.filter((val) => val !== p));
              } else {
                onChange([...value, p]);
              }
            }}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

function ContentCard({ item, cats, onClick }: {
  item: ContentItem;
  cats: { id: string; name: string; color: string }[];
  onClick: () => void;
}) {
  const cat = cats.find((c) => c.id === item.categoryId);
  return (
    <div className="card card-interactive p-4 animate-fade-in" onClick={onClick}>
      <div className="h-1 rounded-full mb-3" style={{ background: cat?.color ?? '#E5E5EA' }} />
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
          {item.title}
        </h3>
        <span
          className="badge flex-shrink-0"
          style={{ background: getStatusBg(item.status), color: getStatusColor(item.status) }}
        >
          {item.status}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {cat && (
          <span className="badge" style={{ background: `${cat.color}14`, color: cat.color }}>
            {cat.name}
          </span>
        )}
        <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-quaternary)' }}>
          {item.platform}
        </span>
        <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {item.format === 'Foto' ? 'Foto' : 'Video'}
        </span>
        {item.referenceUrl && (
          <span
            className="badge inline-flex items-center gap-1 font-semibold"
            style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--color-blue)' }}
          >
            Link Aktif
          </span>
        )}
      </div>
      {item.scheduleDate && (
        <p className="text-xs mt-3 flex items-center gap-1" style={{ color: 'var(--text-quaternary)' }}>
          <Calendar size={10} /> {formatDate(item.scheduleDate)}
        </p>
      )}
      {item.performance && (
        <div className="flex gap-3 flex-wrap mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-quaternary)' }}><Eye size={10} /> {item.performance.views.toLocaleString()}</span>
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-quaternary)' }}><Heart size={10} /> {item.performance.likes.toLocaleString()}</span>
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-quaternary)' }}><MessageCircle size={10} /> {item.performance.comments.toLocaleString()}</span>
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-quaternary)' }}><Share2 size={10} /> {(item.performance.shares ?? 0).toLocaleString()}</span>
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-quaternary)' }}><Bookmark size={10} /> {(item.performance.saves ?? 0).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

function ContentRow({ item, cats, plats, onClick }: {
  item: ContentItem;
  cats: Category[];
  plats: WorkspacePlatform[];
  onClick: () => void;
}) {
  const cat = cats.find((c) => c.id === item.categoryId);
  const plat = plats.find((p) => p.name.toLowerCase() === item.platform.toLowerCase());
  const platColor = plat?.color ?? '#8E8E93';

  return (
    <tr 
      className="border-b hover-bg-subtle transition-colors cursor-pointer text-xs" 
      style={{ borderColor: 'var(--border-color)' }}
      onClick={onClick}
    >
      <td className="py-2.5 px-4 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat?.color ?? '#C7C7CC' }} />
        <span className="font-semibold truncate max-w-[240px]" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
      </td>
      <td className="py-2.5 px-4">
        <span className="badge" style={{ background: `${platColor}14`, color: platColor }}>
          {item.platform}
        </span>
      </td>
      <td className="py-2.5 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
        {item.format === 'Foto' ? 'Foto' : 'Video'}
      </td>
      <td className="py-2.5 px-4" style={{ color: 'var(--text-secondary)' }}>
        {cat?.name ?? '-'}
      </td>
      <td className="py-2.5 px-4">
        <span 
          className="badge" 
          style={{ background: getStatusBg(item.status), color: getStatusColor(item.status) }}
        >
          {item.status}
        </span>
      </td>
      <td className="py-2.5 px-4 font-medium text-center" style={{ color: 'var(--text-secondary)' }}>
        {item.scheduleDate ? formatDate(item.scheduleDate, 'd MMM yyyy') : '-'}
      </td>
      <td className="py-2.5 px-4 text-right" style={{ color: 'var(--text-secondary)' }}>
        {item.performance ? item.performance.views.toLocaleString() : '-'}
      </td>
      <td className="py-2.5 px-4 text-right" style={{ color: 'var(--text-secondary)' }}>
        {item.performance ? item.performance.likes.toLocaleString() : '-'}
      </td>
      <td className="py-2.5 px-4 text-right" style={{ color: 'var(--text-secondary)' }}>
        {item.performance ? (item.performance.shares ?? 0).toLocaleString() : '-'}
      </td>
      <td className="py-2.5 px-4 text-right" style={{ color: 'var(--text-secondary)' }}>
        {item.performance ? (item.performance.saves ?? 0).toLocaleString() : '-'}
      </td>
    </tr>
  );
}

export default function ContentBank() {
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const content = useAppStore(useShallow((state) => state.contentItems.filter((c) => c.workspaceId === state.activeWorkspaceId)));
  const cats = useAppStore(useShallow((state) => state.categories.filter((c) => c.workspaceId === state.activeWorkspaceId)));
  const plats = useAppStore(useShallow((state) => (state.platforms ?? []).filter((p) => p.workspaceId === state.activeWorkspaceId)));
  const addContent = useAppStore((state) => state.addContent);

  // Left Collapsible Planner state
  const [isPlannerOpen, setIsPlannerOpen]   = useState(false);
  const [plannerForm, setPlannerForm]       = useState<PlannerFormState>(() => EMPTY_FORM(plats[0] ? [plats[0].name] : []));
  const [plannerSaving, setPlannerSaving]   = useState(false);
  const [plannerInputMode, setPlannerInputMode] = useState<'single' | 'bulk'>('single');
  const [plannerBulkTitles, setPlannerBulkTitles] = useState('');

  // Top Search and Sort states
  const [search, setSearch]               = useState('');
  const [sort, setSort]                   = useState<'newest' | 'oldest' | 'az' | 'views' | 'likes' | 'shares' | 'saves'>('newest');
  const [viewMode, setViewMode]           = useState<'grid' | 'list'>('grid');
  const [selected, setSelected]           = useState<ContentItem | null>(null);

  // Filter Popover state
  const [showFilters, setShowFilters]     = useState(false);
  const [filterStatus, setStatus]         = useState<ContentStatus | 'all'>('all');
  const [filterCat, setCat]               = useState('all');
  const [filterPlatforms, setPlatforms]   = useState<string[]>([]);
  const [filterMonth, setFilterMonth]     = useState('all');

  const filterRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close filter popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync planner form categories/platforms
  useEffect(() => {
    setPlannerForm((f) => {
      const nextCategory = cats.some(c => c.id === f.categoryId) ? f.categoryId : (cats[0]?.id ?? '');
      const validPlatforms = f.platforms.filter(p => plats.some(plat => plat.name === p));
      const nextPlatforms = validPlatforms.length > 0 ? validPlatforms : (plats[0] ? [plats[0].name] : []);

      if (f.categoryId === nextCategory && f.platforms.length === nextPlatforms.length && f.platforms.every((p, i) => p === nextPlatforms[i])) {
        return f;
      }
      return {
        ...f,
        categoryId: nextCategory,
        platforms: nextPlatforms,
      };
    });
  }, [activeWorkspaceId, cats, plats]);

  // Extract unique months
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    for (const item of content) {
      const dateStr = item.scheduleDate || item.createdAt.split('T')[0];
      if (dateStr) {
        months.add(dateStr.substring(0, 7));
      }
    }
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [content]);

  const formatMonthYear = (myStr: string) => {
    const [y, m] = myStr.split('-');
    const names = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mIdx = parseInt(m) - 1;
    return `${names[mIdx] ?? m} ${y}`;
  };

  // Active filter count
  const activeFilterCount = useMemo(() => {
    return (filterStatus !== 'all' ? 1 : 0) + 
           (filterCat !== 'all' ? 1 : 0) + 
           (filterMonth !== 'all' ? 1 : 0) + 
           (filterPlatforms.length > 0 ? 1 : 0);
  }, [filterStatus, filterCat, filterMonth, filterPlatforms]);

  // Form submit handlers
  const handleSavePlanner = () => {
    if (plannerInputMode === 'single') {
      if (!plannerForm.title.trim()) { toast.error('Judul konten tidak boleh kosong'); return; }
      if (plannerForm.platforms.length === 0) { toast.error('Pilih minimal satu platform'); return; }
      if (!activeWorkspaceId) { toast.error('Pilih workspace terlebih dahulu'); return; }

      setPlannerSaving(true);
      setTimeout(() => {
        for (const plat of plannerForm.platforms) {
          addContent({
            workspaceId:  activeWorkspaceId,
            title:        plannerForm.title.trim(),
            categoryId:   plannerForm.categoryId || cats[0]?.id || '',
            status:       plannerForm.status,
            platform:     plat,
            scheduleDate: plannerForm.scheduleDate || undefined,
            notes:        plannerForm.notes.trim() || undefined,
          });
          logActivity('Menambah Konten', plannerForm.title.trim(), `Platform: ${plat}, Status: ${plannerForm.status}`);
        }
        toast.success(`Konten berhasil ditambahkan ke pipeline`);
        setPlannerForm({ ...EMPTY_FORM(plats[0] ? [plats[0].name] : []), categoryId: plannerForm.categoryId });
        setPlannerSaving(false);
      }, 300);
    } else {
      const lines = plannerBulkTitles.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) { toast.error('Masukkan minimal satu judul ide'); return; }
      if (plannerForm.platforms.length === 0) { toast.error('Pilih minimal satu platform'); return; }
      if (!activeWorkspaceId) { toast.error('Pilih workspace terlebih dahulu'); return; }

      setPlannerSaving(true);
      setTimeout(() => {
        let count = 0;
        for (const title of lines) {
          for (const plat of plannerForm.platforms) {
            addContent({
              workspaceId:  activeWorkspaceId,
              title,
              categoryId:   plannerForm.categoryId || cats[0]?.id || '',
              status:       plannerForm.status,
              platform:     plat,
              scheduleDate: plannerForm.scheduleDate || undefined,
              notes:        plannerForm.notes.trim() || undefined,
            });
            logActivity('Menambah Konten (Massal)', title, `Platform: ${plat}, Status: ${plannerForm.status}`);
            count++;
          }
        }
        toast.success(`${count} ide konten berhasil ditambahkan`);
        setPlannerBulkTitles('');
        setPlannerSaving(false);
      }, 400);
    }
  };

  const handleResetPlanner = () => {
    setPlannerForm({ ...EMPTY_FORM(plats[0] ? [plats[0].name] : []), categoryId: cats[0]?.id ?? '' });
    setPlannerBulkTitles('');
  };

  // Filtered & sorted array
  const filtered = useMemo(() => {
    let res = [...content];
    if (search)       res = res.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));
    if (filterStatus !== 'all') res = res.filter((c) => c.status === filterStatus);
    if (filterCat !== 'all')   res = res.filter((c) => c.categoryId === filterCat);
    if (filterPlatforms.length > 0) res = res.filter((c) => filterPlatforms.includes(c.platform));
    if (filterMonth !== 'all') {
      res = res.filter((c) => {
        const dateStr = c.scheduleDate || c.createdAt.split('T')[0];
        return dateStr && dateStr.startsWith(filterMonth);
      });
    }

    if (sort === 'newest') res.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === 'oldest') res.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (sort === 'az')     res.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'views')  res.sort((a, b) => (b.performance?.views ?? 0) - (a.performance?.views ?? 0));
    if (sort === 'likes')  res.sort((a, b) => (b.performance?.likes ?? 0) - (a.performance?.likes ?? 0));
    if (sort === 'shares') res.sort((a, b) => (b.performance?.shares ?? 0) - (a.performance?.shares ?? 0));
    if (sort === 'saves')  res.sort((a, b) => (b.performance?.saves ?? 0) - (a.performance?.saves ?? 0));
    return res;
  }, [content, search, filterStatus, filterCat, filterPlatforms, filterMonth, sort]);

  return (
    <div className="page-enter flex flex-col h-full overflow-hidden">
      <TopBar title="Content Bank" subtitle={`${content.length} ide konten · ${content.filter(c => c.status === 'Published').length} published`} />
      
      <div className="page-content flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row gap-6">
        
        {/* COLLAPSIBLE PLANNER PANEL */}
        {isPlannerOpen && (
          <div 
            className="w-full md:w-[350px] flex-shrink-0 border-r pr-4 overflow-y-auto flex flex-col gap-4 animate-slide-right pb-4"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded" style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--color-blue)' }}>
                  <Plus size={16} />
                </div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Rencanakan Konten</h3>
              </div>
              <button 
                className="btn btn-ghost btn-icon" 
                style={{ padding: 4 }}
                onClick={() => setIsPlannerOpen(false)}
              >
                <X size={15} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="seg-control">
              <button
                type="button"
                className={`seg-btn text-xs py-1 ${plannerInputMode === 'single' ? 'active' : ''}`}
                onClick={() => setPlannerInputMode('single')}
              >
                Tunggal
              </button>
              <button
                type="button"
                className={`seg-btn text-xs py-1 ${plannerInputMode === 'bulk' ? 'active' : ''}`}
                onClick={() => setPlannerInputMode('bulk')}
              >
                Banyak
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {plannerInputMode === 'single' ? (
                <div className="form-group">
                  <label className="form-label text-[11px] font-semibold">Judul Konten *</label>
                  <input
                    className="input text-xs"
                    placeholder="Judul ide baru..."
                    value={plannerForm.title}
                    onChange={(e) => setPlannerForm({ ...plannerForm, title: e.target.value })}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label text-[11px] font-semibold">Ide Konten (Satu per baris) *</label>
                  <textarea
                    className="input text-xs font-mono"
                    placeholder="Ide Pertama&#10;Ide Kedua..."
                    value={plannerBulkTitles}
                    onChange={(e) => setPlannerBulkTitles(e.target.value)}
                    rows={4}
                  />
                </div>
              )}

              {/* Platform */}
              <div className="form-group">
                <label className="form-label text-[11px] font-semibold">Target Platform *</label>
                <PlatformSelector value={plannerForm.platforms} onChange={(p) => setPlannerForm({ ...plannerForm, platforms: p })} plats={plats} />
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="form-label text-[11px] font-semibold">Pilar Konten</label>
                {cats.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {cats.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-all"
                        style={{
                          background: plannerForm.categoryId === c.id ? `${c.color}18` : 'var(--bg-tertiary)',
                          color:      plannerForm.categoryId === c.id ? c.color : 'var(--text-tertiary)',
                          border:     `1px solid ${plannerForm.categoryId === c.id ? c.color + '40' : 'transparent'}`,
                        }}
                        onClick={() => setPlannerForm({ ...plannerForm, categoryId: c.id })}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>Kategori kosong</p>
                )}
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label text-[11px] font-semibold">Status Awal</label>
                <StatusSelector value={plannerForm.status} onChange={(s) => setPlannerForm({ ...plannerForm, status: s })} />
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label text-[11px] font-semibold">Rencana Tanggal Upload (opsional)</label>
                <input
                  type="date"
                  className="input text-xs"
                  value={plannerForm.scheduleDate}
                  onChange={(e) => setPlannerForm({ ...plannerForm, scheduleDate: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label text-[11px] font-semibold">Catatan (opsional)</label>
                <textarea
                  className="input text-xs"
                  placeholder="Referensi, link inspirasi, dll..."
                  value={plannerForm.notes}
                  onChange={(e) => setPlannerForm({ ...plannerForm, notes: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button className="btn btn-secondary btn-sm flex-1" onClick={handleResetPlanner}>
                  Reset
                </button>
                <button 
                  className="btn btn-primary btn-sm flex-1" 
                  onClick={handleSavePlanner}
                  disabled={plannerSaving}
                >
                  {plannerSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONTENT BANK RESULTS & TOOLBAR SECTION */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top toolbar */}
          <div className="flex items-center gap-3 mb-4 flex-wrap relative">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-quaternary)' }} />
              <input
                className="input pl-8 text-xs py-1.5"
                placeholder="Cari konten..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filter Toggle Button */}
            <div ref={filterRef} className="relative">
              <button
                className={`btn btn-sm ${activeFilterCount > 0 ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={13} />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-white text-blue-600 font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Filter Popover Dropdown */}
              {showFilters && (
                <div 
                  className="absolute left-0 mt-2 w-72 p-4 rounded-ios border shadow-lg z-50 flex flex-col gap-3.5 animate-scale-in"
                  style={{
                    background: 'var(--bg-surface-translucent)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-primary)]">Filter Konten</span>
                    <button
                      onClick={() => {
                        setStatus('all');
                        setCat('all');
                        setPlatforms([]);
                        setFilterMonth('all');
                      }}
                      className="text-[10px] font-semibold text-blue-500 hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  </div>

                  {/* Status selection */}
                  <div className="form-group">
                    <label className="form-label text-[10px] font-semibold">Status</label>
                    <select className="input select text-[11px] py-1" value={filterStatus} onChange={(e) => setStatus(e.target.value as ContentStatus | 'all')}>
                      <option value="all">Semua Status</option>
                      {CONTENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Category selection */}
                  <div className="form-group">
                    <label className="form-label text-[10px] font-semibold">Kategori</label>
                    <select className="input select text-[11px] py-1" value={filterCat} onChange={(e) => setCat(e.target.value)}>
                      <option value="all">Semua Kategori</option>
                      {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Month selection */}
                  <div className="form-group">
                    <label className="form-label text-[10px] font-semibold">Bulan</label>
                    <select className="input select text-[11px] py-1" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                      <option value="all">Semua Bulan</option>
                      {uniqueMonths.map((m) => (
                        <option key={m} value={m}>{formatMonthYear(m)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Platform Filter Multi-select */}
                  <div className="form-group">
                    <label className="form-label text-[10px] font-semibold">Platform</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {plats.map((p) => {
                        const active = filterPlatforms.includes(p.name);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all border ${active ? 'scale-105 font-bold' : 'opacity-60'}`}
                            style={{
                              background: active ? `${p.color}14` : 'var(--bg-tertiary)',
                              color:      active ? p.color : 'var(--text-secondary)',
                              borderColor: active ? `${p.color}30` : 'transparent',
                            }}
                            onClick={() => {
                              if (active) {
                                setPlatforms(filterPlatforms.filter((x) => x !== p.name));
                              } else {
                                setPlatforms([...filterPlatforms, p.name]);
                              }
                            }}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sort selection */}
            <select className="input select text-xs py-1.5" style={{ width: 'auto', minWidth: 120 }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="views">Views Terbanyak</option>
              <option value="likes">Likes Terbanyak</option>
              <option value="shares">Shares Terbanyak</option>
              <option value="saves">Saves Terbanyak</option>
              <option value="az">A–Z</option>
            </select>

            {/* Right toolbar controls */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              <div className="seg-control">
                <button className={`seg-btn p-1.5 ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}><Grid size={13} /></button>
                <button className={`seg-btn p-1.5 ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={13} /></button>
              </div>

              {/* Rencanakan Konten Toggle Button */}
              {!isPlannerOpen && (
                <button className="btn btn-secondary btn-sm flex items-center gap-1" onClick={() => setIsPlannerOpen(true)}>
                  <Plus size={13} />
                  <span>Rencanakan Konten</span>
                </button>
              )}
            </div>
          </div>

          {/* Results stats */}
          <p className="text-xs mb-3.5" style={{ color: 'var(--text-quaternary)' }}>
            Menampilkan {filtered.length} dari {content.length} konten
          </p>

          {/* Cards & Grid render */}
          {filtered.length === 0 ? (
            <div className="card flex-1 min-h-0 flex flex-col justify-center items-center">
              <div className="empty-state">
                <div className="empty-icon"><FileSearch size={28} style={{ color: 'var(--text-quaternary)' }} /></div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Tidak ada konten ditemukan</p>
                <p className="text-sm" style={{ color: 'var(--text-quaternary)' }}>Sesuaikan filter atau rencanakan ide baru</p>
                {!isPlannerOpen && (
                  <button className="btn btn-primary mt-2" onClick={() => setIsPlannerOpen(true)}>
                    <Plus size={13} /> Rencanakan Konten
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto px-1.5 py-1 flex-1 pb-4 min-h-0 scrollbar-thin">
              {filtered.map((item) => (
                <ContentCard key={item.id} item={item} cats={cats} onClick={() => setSelected(item)} />
              ))}
            </div>
          ) : (
            <div className="card overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 scrollbar-thin">
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }} className="text-xs">
                      <th className="sticky top-0 bg-[var(--bg-secondary)] py-2.5 px-4 font-semibold uppercase tracking-wider z-10" style={{ color: 'var(--text-quaternary)' }}>Judul</th>
                      <th className="sticky top-0 bg-[var(--bg-secondary)] py-2.5 px-4 font-semibold uppercase tracking-wider z-10" style={{ color: 'var(--text-quaternary)' }}>Platform</th>
                      <th className="sticky top-0 bg-[var(--bg-secondary)] py-2.5 px-4 font-semibold uppercase tracking-wider z-10" style={{ color: 'var(--text-quaternary)' }}>Format</th>
                      <th className="sticky top-0 bg-[var(--bg-secondary)] py-2.5 px-4 font-semibold uppercase tracking-wider z-10" style={{ color: 'var(--text-quaternary)' }}>Kategori</th>
                      <th className="sticky top-0 bg-[var(--bg-secondary)] py-2.5 px-4 font-semibold uppercase tracking-wider z-10" style={{ color: 'var(--text-quaternary)' }}>Status</th>
                      <th className="sticky top-0 bg-[var(--bg-secondary)] py-2.5 px-4 font-semibold uppercase tracking-wider text-center z-10" style={{ color: 'var(--text-quaternary)' }}>Jadwal</th>
                      <th className="sticky top-0 bg-[var(--bg-secondary)] py-2.5 px-4 font-semibold uppercase tracking-wider text-right z-10" style={{ color: 'var(--text-quaternary)' }}>Views</th>
                      <th className="sticky top-0 bg-[var(--bg-secondary)] py-2.5 px-4 font-semibold uppercase tracking-wider text-right z-10" style={{ color: 'var(--text-quaternary)' }}>Likes</th>
                      <th className="sticky top-0 bg-[var(--bg-secondary)] py-2.5 px-4 font-semibold uppercase tracking-wider text-right z-10" style={{ color: 'var(--text-quaternary)' }}>Shares</th>
                      <th className="sticky top-0 bg-[var(--bg-secondary)] py-2.5 px-4 font-semibold uppercase tracking-wider text-right z-10" style={{ color: 'var(--text-quaternary)' }}>Saves</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <ContentRow key={item.id} item={item} cats={cats} plats={plats} onClick={() => setSelected(item)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>

      {selected && <ContentModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
