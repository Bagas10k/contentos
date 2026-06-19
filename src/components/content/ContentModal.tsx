// src/components/content/ContentModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';
import type { ContentItem, ContentStatus, ContentFormat } from '../../types';
import { CONTENT_STATUSES } from '../../types';
import { toast } from '../ui/Toast';
import { formatDate, generateId } from '../../lib/utils';
import { ConfirmModal } from '../ui/ConfirmModal';
import { logActivity } from '../../lib/auditLogger';

interface ContentModalProps {
  item?: ContentItem;
  defaultDate?: string;
  onClose: () => void;
}

export function ContentModal({ item, defaultDate, onClose }: ContentModalProps) {
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const cats = useAppStore(useShallow((state) => state.categories.filter((c) => c.workspaceId === state.activeWorkspaceId)));
  const plats = useAppStore(useShallow((state) => (state.platforms ?? []).filter((p) => p.workspaceId === state.activeWorkspaceId)));
  const addContent = useAppStore((state) => state.addContent);
  const updateContent = useAppStore((state) => state.updateContent);
  const deleteContent = useAppStore((state) => state.deleteContent);

  const [title, setTitle]       = useState(item?.title ?? '');
  const [categoryId, setCatId]  = useState(item?.categoryId ?? cats[0]?.id ?? '');
  const [status, setStatus]     = useState<ContentStatus>(item?.status ?? 'Idea');
  const [platforms, setPlatforms] = useState<string[]>(() => {
    if (!item) {
      return plats[0] ? [plats[0].name] : [];
    }
    const storeContent = useAppStore.getState().contentItems;
    const related = storeContent.filter((c) => 
      c.workspaceId === item.workspaceId && 
      c.categoryId === item.categoryId &&
      c.title.toLowerCase().trim() === item.title.toLowerCase().trim() &&
      c.scheduleDate === item.scheduleDate
    );
    return related.length > 0 ? related.map(c => c.platform) : [item.platform];
  });
  const [schedDate, setSchedDate] = useState(item?.scheduleDate ?? defaultDate ?? '');
  const [notes, setNotes]       = useState(item?.notes ?? '');
  const [referenceUrl, setReferenceUrl] = useState(item?.referenceUrl ?? '');
  const [perfByPlatform, setPerfByPlatform] = useState<Record<string, {
    views: string;
    likes: string;
    comments: string;
    shares: string;
    saves: string;
  }>>(() => {
    const storeContent = useAppStore.getState().contentItems;
    const related = item ? storeContent.filter((c) => 
      c.workspaceId === item.workspaceId && 
      c.categoryId === item.categoryId &&
      c.title.toLowerCase().trim() === item.title.toLowerCase().trim() &&
      c.scheduleDate === item.scheduleDate
    ) : [];
    
    const perfMap: Record<string, any> = {};
    if (item) {
      related.forEach((c) => {
        perfMap[c.platform] = {
          views: c.performance?.views?.toString() ?? '',
          likes: c.performance?.likes?.toString() ?? '',
          comments: c.performance?.comments?.toString() ?? '',
          shares: c.performance?.shares?.toString() ?? '',
          saves: c.performance?.saves?.toString() ?? '',
        };
      });
    }
    return perfMap;
  });
  const [formatType, setFormatType] = useState<ContentFormat>(item?.format ?? 'Video');
  const [tab, setTab]           = useState<'detail' | 'performance'>('detail');
  const [delConfirm, setDelConfirm] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>(item ? 'view' : 'edit');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringWeeks, setRecurringWeeks] = useState(4);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    singleButton?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const isEdit = !!item;

  useEffect(() => {
    if (plats.length > 0 && platforms.length === 0 && !item) {
      setPlatforms([plats[0].name]);
    }
  }, [plats, platforms.length, item]);

  const executeSave = () => {
    const storeContent = useAppStore.getState().contentItems;
    const related = item ? storeContent.filter((c) => 
      c.workspaceId === item.workspaceId && 
      c.categoryId === item.categoryId &&
      c.title.toLowerCase().trim() === item.title.toLowerCase().trim() &&
      c.scheduleDate === item.scheduleDate
    ) : [];

    const basePayload = {
      workspaceId: activeWorkspaceId!,
      title: title.trim(),
      categoryId,
      status,
      format: formatType,
      scheduleDate: schedDate || undefined,
      notes: notes || undefined,
      referenceUrl: referenceUrl.trim() || undefined,
    };

    if (isEdit) {
      const originalItems = JSON.parse(JSON.stringify(related));
      const addedIds: string[] = [];

      // 1. Update existing platforms or add new ones
      for (const plat of platforms) {
        const existingItem = related.find(c => c.platform.toLowerCase() === plat.toLowerCase());
        const perf = perfByPlatform[plat] || { views: '', likes: '', comments: '', shares: '', saves: '' };
        
        const newViews = parseInt(perf.views) || 0;
        let updatedViewsHistory = existingItem?.performance?.viewsHistory ? [...existingItem.performance.viewsHistory] : [];
        
        if (newViews > 0) {
          const todayStr = new Date().toLocaleDateString('en-CA');
          const existingIdx = updatedViewsHistory.findIndex((e) => e.date === todayStr);
          if (existingIdx > -1) {
            updatedViewsHistory[existingIdx] = { ...updatedViewsHistory[existingIdx], views: newViews };
          } else {
            updatedViewsHistory.push({ date: todayStr, views: newViews });
          }
          updatedViewsHistory.sort((a, b) => a.date.localeCompare(b.date));
        }

        const platformPerformance = (perf.views || perf.likes || perf.comments || perf.shares || perf.saves) ? {
          views:    newViews,
          likes:    parseInt(perf.likes) || 0,
          comments: parseInt(perf.comments) || 0,
          shares:   parseInt(perf.shares) || 0,
          saves:    parseInt(perf.saves) || 0,
          viewsHistory: updatedViewsHistory,
        } : undefined;

        const payload = {
          ...basePayload,
          platform: plat,
          performance: platformPerformance,
        };

        if (existingItem) {
          updateContent(existingItem.id, payload);
        } else {
          const newId = generateId();
          addedIds.push(newId);
          addContent({
            ...payload,
            id: newId,
          });
        }
      }

      // 2. Delete deselected platforms
      for (const oldItem of related) {
        const stillSelected = platforms.some(p => p.toLowerCase() === oldItem.platform.toLowerCase());
        if (!stillSelected) {
          deleteContent(oldItem.id);
        }
      }

      const statusChanged = item.status !== status;
      const details = statusChanged ? `Ubah status: ${item.status} -> ${status}` : 'Mengedit detail/performa konten';
      
      const restorePayload = {
        type: 'edit_content',
        originalItems,
        addedIds
      };

      logActivity('Mengubah Konten', title.trim(), details, restorePayload);
      toast.success('Konten berhasil diperbarui');
    } else {
      const addedIds: string[] = [];
      const datesToAdd: string[] = [];
      
      if (isRecurring && recurringDays.length > 0) {
        const start = new Date(schedDate || new Date().toLocaleDateString('en-CA'));
        const startDay = start.getDay();
        const weeks = Math.min(Math.max(recurringWeeks || 1, 1), 12);

        for (let w = 0; w < weeks; w++) {
          for (const day of recurringDays) {
            let diff = day - startDay;
            if (diff < 0) diff += 7;
            const occurrenceDate = new Date(start.getTime() + (diff + w * 7) * 24 * 60 * 60 * 1000);
            const dateStr = occurrenceDate.toLocaleDateString('en-CA');
            datesToAdd.push(dateStr);
          }
        }
      } else {
        datesToAdd.push(schedDate || new Date().toLocaleDateString('en-CA'));
      }

      for (const dStr of datesToAdd) {
        for (const plat of platforms) {
          const newId = generateId();
          addedIds.push(newId);

          const perf = perfByPlatform[plat] || { views: '', likes: '', comments: '', shares: '', saves: '' };
          const newViews = parseInt(perf.views) || 0;
          const platformPerformance = (perf.views || perf.likes || perf.comments || perf.shares || perf.saves) ? {
            views:    newViews,
            likes:    parseInt(perf.likes) || 0,
            comments: parseInt(perf.comments) || 0,
            shares:   parseInt(perf.shares) || 0,
            saves:    parseInt(perf.saves) || 0,
            viewsHistory: newViews > 0 ? [{ date: dStr, views: newViews }] : [],
          } : undefined;

          addContent({
            ...basePayload,
            id: newId,
            platform: plat,
            scheduleDate: dStr,
            performance: platformPerformance,
          });
        }
      }

      const restorePayload = {
        type: 'add_content',
        addedIds
      };

      logActivity(
        isRecurring ? 'Menambah Konten (Berulang)' : 'Menambah Konten', 
        title.trim(), 
        isRecurring
          ? `Platform: ${platforms.join(', ')}, Durasi: ${recurringWeeks} minggu`
          : `Platform: ${platforms.join(', ')}, Status: ${status}`, 
        restorePayload
      );
      toast.success(
        isRecurring 
          ? `Berhasil menjadwalkan ${addedIds.length} konten berulang`
          : `Berhasil menambahkan ${platforms.length} konten`
      );
    }
    onClose();
  };

  const handleSave = () => {
    if (!title.trim()) { toast.error('Judul tidak boleh kosong'); return; }
    if (platforms.length === 0) { toast.error('Pilih minimal satu platform'); return; }

    if (isRecurring && recurringDays.length === 0) {
      toast.error('Pilih minimal satu hari untuk pengulangan');
      return;
    }

    if (status === 'Published') {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const isFuture = schedDate && schedDate > todayStr;
      
      if (isFuture) {
        setConfirmState({
          isOpen: true,
          title: 'Belum Waktunya Publish',
          message: `Konten ini dijadwalkan untuk diposting pada tanggal ${formatDate(schedDate)}. Anda tidak dapat mempublikasikannya sebelum tanggal tersebut.`,
          confirmText: 'Mengerti',
          cancelText: '',
          type: 'warning',
          singleButton: true,
          onConfirm: () => {
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
          },
          onCancel: () => {
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
          },
        });
      } else {
        setConfirmState({
          isOpen: true,
          title: 'Publish Konten?',
          message: 'Apakah Anda yakin ingin mengubah status konten ini menjadi Published?',
          confirmText: 'Ya, Publish',
          cancelText: 'Batal',
          type: 'info',
          singleButton: false,
          onConfirm: () => {
            executeSave();
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
          },
          onCancel: () => {
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
          },
        });
      }
    } else {
      executeSave();
    }
  };

  const handleDelete = () => {
    const storeContent = useAppStore.getState().contentItems;
    const related = item ? storeContent.filter((c) => 
      c.workspaceId === item.workspaceId && 
      c.categoryId === item.categoryId &&
      c.title.toLowerCase().trim() === item.title.toLowerCase().trim() &&
      c.scheduleDate === item.scheduleDate
    ) : [];

    const itemsToDelete = related.length > 0 ? related : (item ? [item] : []);

    for (const dItem of itemsToDelete) {
      deleteContent(dItem.id);
    }

    if (itemsToDelete.length > 0) {
      const restorePayload = {
        type: 'delete_content',
        items: itemsToDelete
      };
      logActivity(
        'Menghapus Konten', 
        itemsToDelete[0].title, 
        `Platform: ${itemsToDelete.map(r => r.platform).join(', ')}`, 
        restorePayload
      );
    }
    
    toast.success('Konten berhasil dihapus');
    onClose();
  };

  // Close on backdrop
  const handleBackdrop = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) onClose();
  };

  return createPortal(
    <div className="modal-overlay" onClick={handleBackdrop}>
      <div className="modal" style={{ maxWidth: 560 }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {mode === 'view' ? 'Detail Konten' : isEdit ? 'Edit Konten' : 'Tambah Konten Baru'}
            </h2>
            {isEdit && (
              <p className="text-xs text-[var(--text-quaternary)]">
                Dibuat {formatDate(item.createdAt)}
              </p>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        {/* Tabs (shown when editing, OR when creating a new item with status 'Published') */}
        {mode === 'edit' && (isEdit || status === 'Published') && (
          <div className="px-6 pt-3">
            <div className="seg-control">
              <button className={`seg-btn ${tab === 'detail' ? 'active' : ''}`} onClick={() => setTab('detail')}>Detail</button>
              <button className={`seg-btn ${tab === 'performance' ? 'active' : ''}`} onClick={() => setTab('performance')}>Performa</button>
            </div>
          </div>
        )}

        <div className="modal-body">
          {mode === 'view' ? (
            <div className="flex flex-col gap-4">
              {/* Title */}
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] leading-snug">
                  {title}
                </h3>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap gap-2 mt-1">
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] mr-1">Platform:</span>
                  {platforms.map((plat) => {
                    const platData = plats.find(p => p.name.toLowerCase() === plat.toLowerCase());
                    const pColor = platData?.color ?? '#8E8E93';
                    return (
                      <span 
                        key={plat} 
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white" 
                        style={{ background: pColor }}
                      >
                        {plat}
                      </span>
                    );
                  })}
                </div>
                {(() => {
                  const cat = cats.find((c) => c.id === categoryId);
                  return cat ? (
                    <span className="px-2.5 py-1 rounded text-[11px] font-semibold text-white" style={{ background: cat.color }}>
                      Pilar: {cat.name}
                    </span>
                  ) : null;
                })()}
                <span className="px-2.5 py-1 rounded bg-[var(--bg-tertiary)] text-[11px] font-semibold text-[var(--text-secondary)]">
                  Format: {formatType}
                </span>
                <span className="px-2.5 py-1 rounded text-[11px] font-semibold" style={{
                  background: status === 'Published' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 149, 0, 0.1)',
                  color: status === 'Published' ? 'var(--color-green)' : 'var(--color-orange)',
                }}>
                  Status: {status}
                </span>
              </div>

              {/* Schedule date */}
              {schedDate && (
                <div className="flex flex-col gap-0.5 mt-2">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-quaternary)]">Jadwal Posting</span>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {formatDate(schedDate)}
                  </p>
                </div>
              )}

              {/* Link url */}
              {referenceUrl && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-quaternary)]">Tautan Konten</span>
                  <a 
                    href={referenceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs font-medium text-[var(--color-blue)] hover:underline truncate block"
                  >
                    {referenceUrl}
                  </a>
                </div>
              )}

              {/* Notes */}
              {notes && (
                <div className="flex flex-col gap-1 p-3 rounded-lg border bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-quaternary)]">Catatan</span>
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap mt-0.5">
                    {notes}
                  </p>
                </div>
              )}

              {/* Performance Statistics */}
              {(() => {
                const totalViews = Object.values(perfByPlatform).reduce((sum, p) => sum + (parseInt(p.views) || 0), 0);
                const totalLikes = Object.values(perfByPlatform).reduce((sum, p) => sum + (parseInt(p.likes) || 0), 0);
                const totalComments = Object.values(perfByPlatform).reduce((sum, p) => sum + (parseInt(p.comments) || 0), 0);
                const totalShares = Object.values(perfByPlatform).reduce((sum, p) => sum + (parseInt(p.shares) || 0), 0);
                const totalSaves = Object.values(perfByPlatform).reduce((sum, p) => sum + (parseInt(p.saves) || 0), 0);

                return status === 'Published' && (
                  <div className="flex flex-col gap-3 mt-2 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="text-[10px] uppercase font-bold text-[var(--text-quaternary)]">Total Statistik Performa</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { label: 'Views', val: totalViews.toString() },
                        { label: 'Likes', val: totalLikes.toString() },
                        { label: 'Comments', val: totalComments.toString() },
                        { label: 'Shares', val: totalShares.toString() },
                        { label: 'Saves', val: totalSaves.toString() },
                      ].map(({ label, val }) => (
                        <div key={label} className="p-2 rounded border bg-[var(--bg-surface)] text-center flex flex-col gap-0.5" style={{ borderColor: 'var(--border-color)' }}>
                          <span className="text-[9px] text-[var(--text-quaternary)]">{label}</span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">{parseInt(val).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>

                    {/* Breakdown per Platform */}
                    {platforms.length > 1 && (
                      <div className="flex flex-col gap-2 mt-2">
                        <span className="text-[9px] uppercase font-bold text-[var(--text-quaternary)]">Rincian Per Platform</span>
                        <div className="flex flex-col gap-1.5">
                          {platforms.map((platName) => {
                            const perf = perfByPlatform[platName] || { views: '0', likes: '0', comments: '0', shares: '0', saves: '0' };
                            const platData = plats.find(p => p.name.toLowerCase() === platName.toLowerCase());
                            const pColor = platData?.color ?? '#8E8E93';

                            return (
                              <div key={platName} className="flex items-center justify-between text-[11px] p-2 rounded border bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
                                <div className="flex items-center gap-1.5 font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: pColor }} />
                                  <span style={{ color: 'var(--text-primary)' }}>{platName}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[var(--text-secondary)] font-medium">
                                  <span>👁️ {parseInt(perf.views || '0').toLocaleString('id-ID')}</span>
                                  <span>❤️ {parseInt(perf.likes || '0').toLocaleString('id-ID')}</span>
                                  <span>💬 {parseInt(perf.comments || '0').toLocaleString('id-ID')}</span>
                                  <span>🔄 {parseInt(perf.shares || '0').toLocaleString('id-ID')}</span>
                                  <span>💾 {parseInt(perf.saves || '0').toLocaleString('id-ID')}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : tab === 'detail' ? (
            <div className="flex flex-col gap-4">
              {/* Title */}
              <div className="form-group">
                <label className="form-label">Judul Konten *</label>
                <input
                  className="input"
                  placeholder="Tuliskan judul kontenmu..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Category + Status row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select className="input select" value={categoryId} onChange={(e) => setCatId(e.target.value)}>
                    {cats.length === 0 && <option value="">-- Belum ada kategori --</option>}
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="input select" 
                    value={status} 
                    onChange={(e) => {
                      const newStatus = e.target.value as ContentStatus;
                      setStatus(newStatus);
                      if (newStatus !== 'Published' && !isEdit) {
                        setTab('detail');
                      }
                    }}
                  >
                    {CONTENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Format Konten */}
              <div className="form-group">
                <label className="form-label">Format Konten</label>
                <div className="seg-control w-full flex">
                  <button 
                    type="button"
                    className={`seg-btn flex-1 py-1.5 ${formatType === 'Video' ? 'active' : ''}`} 
                    onClick={() => setFormatType('Video')}
                  >
                    Video
                  </button>
                  <button 
                    type="button"
                    className={`seg-btn flex-1 py-1.5 ${formatType === 'Foto' ? 'active' : ''}`} 
                    onClick={() => setFormatType('Foto')}
                  >
                    Foto
                  </button>
                </div>
              </div>

              {/* Platform + Date row */}
              <div className="flex flex-col gap-3">
                <div className="form-group">
                  <label className="form-label">Platform Target (Bisa pilih lebih dari 1) *</label>
                  <div className="flex flex-wrap gap-2">
                    {plats.map((p) => {
                      const selected = platforms.includes(p.name);
                      const accentColor = '#007AFF'; // Uniform blue color for active platform selection
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                          style={{
                            background: selected ? `${accentColor}18` : 'var(--bg-tertiary)',
                            color:      selected ? accentColor : 'var(--text-tertiary)',
                            border:     `1px solid ${selected ? accentColor + '40' : 'transparent'}`,
                          }}
                          onClick={() => {
                            if (selected) {
                              if (platforms.length > 1) {
                                setPlatforms(platforms.filter((val) => val !== p.name));
                              } else {
                                toast.warning('Minimal pilih satu platform');
                              }
                            } else {
                              setPlatforms([...platforms, p.name]);
                            }
                          }}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Jadwal Posting</label>
                  <input
                    type="date"
                    className="input"
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                  />
                </div>

                {!isEdit && (
                  <div className="form-group border-t border-[var(--border-color)] pt-3 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="rounded border-[var(--border-color)] text-[var(--color-blue)]"
                        style={{ width: '14px', height: '14px' }}
                      />
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">Buat Jadwal Berulang (Recurring)</span>
                    </label>

                    {isRecurring && (
                      <div className="flex flex-col gap-3 mt-3 pl-4 border-l-2 border-[var(--color-blue)] animate-fade-in">
                        <div className="form-group">
                          <label className="form-label text-[10px] mb-1.5 uppercase tracking-wider text-[var(--text-tertiary)]">Hari Pengulangan</label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { name: 'Sen', val: 1 },
                              { name: 'Sel', val: 2 },
                              { name: 'Rab', val: 3 },
                              { name: 'Kam', val: 4 },
                              { name: 'Jum', val: 5 },
                              { name: 'Sab', val: 6 },
                              { name: 'Min', val: 0 },
                            ].map((dayObj) => {
                              const isSelected = recurringDays.includes(dayObj.val);
                              return (
                                <button
                                  key={dayObj.val}
                                  type="button"
                                  className="px-2.5 py-1 rounded text-[10px] font-bold transition-all"
                                  style={{
                                    background: isSelected ? 'var(--color-blue)' : 'var(--bg-tertiary)',
                                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                                  }}
                                  onClick={() => {
                                    if (isSelected) {
                                      setRecurringDays(recurringDays.filter(d => d !== dayObj.val));
                                    } else {
                                      setRecurringDays([...recurringDays, dayObj.val]);
                                    }
                                  }}
                                >
                                  {dayObj.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label text-[10px] mb-1 uppercase tracking-wider text-[var(--text-tertiary)]">Durasi Pengulangan (Minggu)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="12"
                              className="input py-1 px-2.5 text-xs"
                              style={{ width: 70 }}
                              value={recurringWeeks}
                              onChange={(e) => setRecurringWeeks(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                            />
                            <span className="text-xs text-[var(--text-tertiary)]">minggu ke depan</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Link Konten Upload */}
              <div className="form-group">
                <label className="form-label">Link Konten Upload (URL)</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://instagram.com/p/... atau https://tiktok.com/@..."
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Catatan</label>
                <textarea
                  className="input"
                  placeholder="Ide, referensi, atau catatan tambahan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Masukkan data performa setelah konten dipublish untuk masing-masing platform.
              </p>
              {platforms.map((platName) => {
                const perf = perfByPlatform[platName] || { views: '', likes: '', comments: '', shares: '', saves: '' };
                const updatePerfField = (field: string, value: string) => {
                  setPerfByPlatform(prev => ({
                    ...prev,
                    [platName]: {
                      ...perf,
                      [field]: value
                    }
                  }));
                };

                return (
                  <div key={platName} className="p-3.5 rounded-[12px] border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full" style={{ background: '#007AFF' }} />
                      <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                        {platName}
                      </h4>
                    </div>
                    <div className="grid grid-cols-5 gap-2.5">
                      {[
                        { label: 'Views', field: 'views' },
                        { label: 'Likes', field: 'likes' },
                        { label: 'Comments', field: 'comments' },
                        { label: 'Shares', field: 'shares' },
                        { label: 'Saves', field: 'saves' },
                      ].map(({ label, field }) => (
                        <div key={field} className="form-group mb-0">
                          <label className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                            {label}
                          </label>
                          <input
                            type="number"
                            className="input py-1 px-2 text-xs w-full"
                            placeholder="0"
                            value={perf[field as keyof typeof perf] || ''}
                            onChange={(e) => updatePerfField(field, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {mode === 'view' ? (
            <>
              {isEdit && !delConfirm && (
                <button className="btn btn-danger btn-sm mr-auto" onClick={() => setDelConfirm(true)}>
                  Hapus
                </button>
              )}
              {delConfirm && (
                <div className="flex items-center gap-2 mr-auto">
                  <span className="text-sm" style={{ color: 'var(--color-red)' }}>Yakin hapus?</span>
                  <button className="btn btn-danger btn-sm" onClick={handleDelete}>Ya, Hapus</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setDelConfirm(false)}>Batal</button>
                </div>
              )}
              <button className="btn btn-secondary" onClick={onClose}>Tutup</button>
              <button className="btn btn-primary" onClick={() => setMode('edit')}>
                Edit Konten
              </button>
            </>
          ) : (
            <>
              {isEdit && !delConfirm && (
                <button className="btn btn-danger btn-sm mr-auto" onClick={() => setDelConfirm(true)}>
                  Hapus
                </button>
              )}
              {delConfirm && (
                <div className="flex items-center gap-2 mr-auto">
                  <span className="text-sm" style={{ color: 'var(--color-red)' }}>Yakin hapus?</span>
                  <button className="btn btn-danger btn-sm" onClick={handleDelete}>Ya, Hapus</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setDelConfirm(false)}>Batal</button>
                </div>
              )}
              <button className="btn btn-secondary" onClick={() => isEdit ? setMode('view') : onClose()}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                {isEdit ? 'Simpan Perubahan' : 'Tambah Konten'}
              </button>
            </>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        singleButton={confirmState.singleButton}
        onConfirm={confirmState.onConfirm}
        onCancel={confirmState.onCancel}
      />
    </div>,
    document.body
  );
}
