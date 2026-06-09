// src/components/content/ContentModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';
import type { ContentItem, ContentStatus, ContentFormat } from '../../types';
import { CONTENT_STATUSES } from '../../types';
import { toast } from '../ui/Toast';
import { formatDate } from '../../lib/utils';
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
  const [platforms, setPlatforms] = useState<string[]>(item?.platform ? [item.platform] : (plats[0] ? [plats[0].name] : []));
  const [schedDate, setSchedDate] = useState(item?.scheduleDate ?? defaultDate ?? '');
  const [notes, setNotes]       = useState(item?.notes ?? '');
  const [referenceUrl, setReferenceUrl] = useState(item?.referenceUrl ?? '');
  const [views, setViews]       = useState(item?.performance?.views?.toString() ?? '');
  const [likes, setLikes]       = useState(item?.performance?.likes?.toString() ?? '');
  const [comments, setComments] = useState(item?.performance?.comments?.toString() ?? '');
  const [shares, setShares]     = useState(item?.performance?.shares?.toString() ?? '');
  const [saves, setSaves]       = useState(item?.performance?.saves?.toString() ?? '');
  const [formatType, setFormatType] = useState<ContentFormat>(item?.format ?? 'Video');
  const [tab, setTab]           = useState<'detail' | 'performance'>('detail');
  const [delConfirm, setDelConfirm] = useState(false);
  const [mode, setMode]         = useState<'view' | 'edit'>(item ? 'view' : 'edit');
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
    let updatedViewsHistory = item?.performance?.viewsHistory ? [...item.performance.viewsHistory] : [];
    const newViews = parseInt(views) || 0;
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

    const basePayload = {
      workspaceId: activeWorkspaceId!,
      title: title.trim(),
      categoryId,
      status,
      format: formatType,
      scheduleDate: schedDate || undefined,
      notes: notes || undefined,
      referenceUrl: referenceUrl.trim() || undefined,
      performance: (views || likes || comments || shares || saves) ? {
        views:    newViews,
        likes:    parseInt(likes) || 0,
        comments: parseInt(comments) || 0,
        shares:   parseInt(shares) || 0,
        saves:    parseInt(saves) || 0,
        viewsHistory: updatedViewsHistory,
      } : undefined,
    };

    if (isEdit) {
      updateContent(item.id, {
        ...basePayload,
        platform: platforms[0],
      });
      const statusChanged = item.status !== status;
      const details = statusChanged ? `Ubah status: ${item.status} -> ${status}` : 'Mengedit detail/performa konten';
      logActivity('Mengubah Konten', title.trim(), details);
      toast.success('Konten berhasil diperbarui');
    } else {
      for (const plat of platforms) {
        addContent({
          ...basePayload,
          platform: plat,
        });
        logActivity('Menambah Konten', title.trim(), `Platform: ${plat}, Status: ${status}`);
      }
      toast.success(`Berhasil menambahkan ${platforms.length} konten`);
    }
    onClose();
  };

  const handleSave = () => {
    if (!title.trim()) { toast.error('Judul tidak boleh kosong'); return; }
    if (platforms.length === 0) { toast.error('Pilih minimal satu platform'); return; }

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
    deleteContent(item!.id);
    logActivity('Menghapus Konten', item!.title, `Platform: ${item!.platform}`);
    toast.success('Konten dihapus');
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

        {/* Tabs (for edit mode) */}
        {mode === 'edit' && isEdit && (
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
                <span className="px-2.5 py-1 rounded bg-[var(--bg-secondary)] text-[11px] font-semibold border text-[var(--text-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
                  Platform: {platforms[0]}
                </span>
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
              {status === 'Published' && (
                <div className="flex flex-col gap-2 mt-2 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-quaternary)]">Statistik Performa Konten</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { label: 'Views', val: views || '0' },
                      { label: 'Likes', val: likes || '0' },
                      { label: 'Comments', val: comments || '0' },
                      { label: 'Shares', val: shares || '0' },
                      { label: 'Saves', val: saves || '0' },
                    ].map(({ label, val }) => (
                      <div key={label} className="p-2 rounded border bg-[var(--bg-surface)] text-center flex flex-col gap-0.5" style={{ borderColor: 'var(--border-color)' }}>
                        <span className="text-[9px] text-[var(--text-quaternary)]">{label}</span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">{parseInt(val).toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  <select className="input select" value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)}>
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
              {isEdit ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">Platform</label>
                    <select className="input select" value={platforms[0] ?? ''} onChange={(e) => setPlatforms([e.target.value])}>
                      {plats.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
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
                </div>
              ) : (
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
                              border:     `1.5px solid ${selected ? accentColor + '40' : 'transparent'}`,
                            }}
                            onClick={() => {
                              if (selected) {
                                  setPlatforms(platforms.filter((val) => val !== p.name));
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
                    {platforms.length > 1 && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-quaternary)' }}>
                        Konten terpisah akan dibuat untuk setiap platform terpilih agar performa dapat dilacak masing-masing.
                      </p>
                    )}
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
                </div>
              )}

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
            <div className="flex flex-col gap-4">
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Masukkan data performa setelah konten dipublish.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Views', val: views, set: setViews },
                  { label: 'Likes', val: likes, set: setLikes },
                  { label: 'Comments', val: comments, set: setComments },
                  { label: 'Shares', val: shares, set: setShares },
                  { label: 'Saves (Simpan)', val: saves, set: setSaves },
                ].map(({ label, val, set }) => (
                  <div key={label} className="form-group">
                    <label className="form-label">{label}</label>
                    <input type="number" className="input" placeholder="0" value={val} onChange={(e) => set(e.target.value)} />
                  </div>
                ))}
              </div>
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
