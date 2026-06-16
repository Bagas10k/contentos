// src/pages/KanbanBoard.tsx
import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  pointerWithin,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  type Modifier,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Calendar, ExternalLink } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/appStore';
import { TopBar } from '../components/layout/TopBar';
import { ContentModal } from '../components/content/ContentModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { ContentItem, ContentStatus, GroupedContentItem } from '../types';
import { CONTENT_STATUSES } from '../types';
import { formatDate } from '../lib/utils';
import { logActivity } from '../lib/auditLogger';

const COLUMN_COLORS: Record<ContentStatus, string> = {
  'Idea':          '#8E8E93',
  'Scripting':     '#FF9500',
  'Production':    '#007AFF',
  'Editing':       '#AF52DE',
  'Ready to Post': '#34C759',
  'Published':     '#5856D6',
};

function KanbanCard({ item, cats, plats, isDragging, onClick }: {
  item: GroupedContentItem;
  cats: { id: string; name: string; color: string }[];
  plats: { id: string; name: string; color: string }[];
  isDragging?: boolean;
  onClick: () => void;
}) {
  const cat = cats.find((c) => c.id === item.categoryId);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="kanban-card"
      onClick={onClick}
    >
      {cat && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
          <span className="text-xs font-medium" style={{ color: cat.color }}>{cat.name}</span>
        </div>
      )}
      <p className="text-sm font-medium leading-snug mb-2" style={{ color: 'var(--text-primary)' }}>
        {item.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {item.platforms && item.platforms.map((platName) => {
            const p = plats.find((plat) => plat.name.toLowerCase() === platName.toLowerCase());
            const pColor = p?.color ?? '#8E8E93';
            return (
              <span key={platName} className="badge text-[10px]" style={{ background: `${pColor}14`, color: pColor }}>
                {platName}
              </span>
            );
          })}
          {item.referenceUrl && (
            <a
              href={item.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold hover:underline"
              style={{ color: 'var(--color-blue)', pointerEvents: 'auto' }}
            >
              <ExternalLink size={10} />
              Post
            </a>
          )}
        </div>
        {item.scheduleDate && (
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-quaternary)' }}>
            <Calendar size={10} /> {formatDate(item.scheduleDate, 'd MMM')}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ status, items, cats, plats, onCardClick, onAddClick }: {
  status: ContentStatus;
  items: GroupedContentItem[];
  cats: { id: string; name: string; color: string }[];
  plats: { id: string; name: string; color: string }[];
  onCardClick: (item: GroupedContentItem) => void;
  onAddClick: (status: ContentStatus) => void;
}) {
  const color = COLUMN_COLORS[status];
  const { setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div ref={setNodeRef} className="kanban-column min-w-[240px] w-[240px] flex-shrink-0 flex flex-col h-full min-h-0">
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{status}</span>
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: `${color}14`, color }}
          >
            {items.length}
          </span>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          style={{ padding: 4 }}
          onClick={() => onAddClick(status)}
        >
          <Plus size={14} style={{ color: 'var(--text-quaternary)' }} />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 px-3 pb-3 flex flex-col gap-2 overflow-y-auto min-h-0">
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              cats={cats}
              plats={plats}
              onClick={() => onCardClick(item)}
            />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div
            className="flex items-center justify-center py-8 rounded-ios border-dashed border-2 flex-shrink-0"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-quaternary)' }}
          >
            <p className="text-xs">Tidak ada konten</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const content = useAppStore(useShallow((state) => state.contentItems.filter((c) => c.workspaceId === state.activeWorkspaceId)));
  const cats = useAppStore(useShallow((state) => state.categories.filter((c) => c.workspaceId === state.activeWorkspaceId)));
  const plats = useAppStore(useShallow((state) => (state.platforms ?? []).filter((p) => p.workspaceId === state.activeWorkspaceId)));
  const moveContentStatus = useAppStore((state) => state.moveContentStatus);

  const [selected, setSelected]   = useState<GroupedContentItem | null>(null);
  const [addStatus, setAddStatus] = useState<ContentStatus | null>(null);
  const [activeId, setActiveId]   = useState<string | null>(null);

  const [filterPlat, setFilterPlat] = useState<string | 'all'>('all');
  const [filterCat, setFilterCat]   = useState<string | 'all'>('all');

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

  const filteredContent = useMemo(() => {
    let list = content;
    if (filterPlat !== 'all') {
      list = list.filter((c) => c.platform === filterPlat);
    }
    if (filterCat !== 'all') {
      list = list.filter((c) => c.categoryId === filterCat);
    }

    // Group identical items (workspace, category, scheduleDate, title)
    const groupedMap: Record<string, ContentItem[]> = {};
    list.forEach((c) => {
      const key = `${c.workspaceId}_${c.categoryId}_${c.scheduleDate || 'unscheduled'}_${c.title.toLowerCase().trim()}`;
      if (!groupedMap[key]) groupedMap[key] = [];
      groupedMap[key].push(c);
    });

    return Object.values(groupedMap).map((items) => {
      const primary = items[0];
      const platforms = Array.from(new Set(items.map(it => it.platform)));
      const allIds = items.map(it => it.id);

      const hasPerf = items.some(it => it.performance);
      const aggregatedPerformance = hasPerf ? {
        views: items.reduce((sum, it) => sum + (it.performance?.views ?? 0), 0),
        likes: items.reduce((sum, it) => sum + (it.performance?.likes ?? 0), 0),
        comments: items.reduce((sum, it) => sum + (it.performance?.comments ?? 0), 0),
        shares: items.reduce((sum, it) => sum + (it.performance?.shares ?? 0), 0),
        saves: items.reduce((sum, it) => sum + (it.performance?.saves ?? 0), 0),
      } : undefined;

      return {
        ...primary,
        platforms,
        allIds,
        performance: aggregatedPerformance,
      } as GroupedContentItem;
    });
  }, [content, filterPlat, filterCat]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  // Modifier: overlay mengikuti kursor tepat di titik tempat pengguna mengklik kartu.
  // DragOverlay default sudah menghitung delta gerakan cursor dengan benar.
  // Yang kita perlu koreksi: jika ada scrollable ancestor, tambahkan kompensasi scroll-nya.
  const grabPointModifier: Modifier = ({ transform, activatorEvent, draggingNodeRect, scrollableAncestors }) => {
    if (!draggingNodeRect || !activatorEvent || !('clientX' in activatorEvent)) {
      return transform;
    }

    // Hitung total scroll offset dari semua ancestor yang scrollable
    let scrollOffsetX = 0;
    let scrollOffsetY = 0;
    for (const el of scrollableAncestors) {
      scrollOffsetX += el.scrollLeft;
      scrollOffsetY += el.scrollTop;
    }

    // Tambahkan kompensasi scroll agar overlay tidak bergeser saat container discroll
    return {
      ...transform,
      x: transform.x - scrollOffsetX,
      y: transform.y - scrollOffsetY,
    };
  };

  // Custom collision detection to handle empty columns gracefully
  const collisionDetectionStrategy = (args: any) => {
    // 1. First, find all collisions using pointerWithin
    const pointerCollisions = pointerWithin(args);
    
    // 2. If we have pointer collisions, prioritize card collisions over column collisions
    if (pointerCollisions.length > 0) {
      const cardCollision = pointerCollisions.find(
        (c) => !CONTENT_STATUSES.includes(c.id as any)
      );
      if (cardCollision) {
        return [cardCollision];
      }
      
      const columnCollision = pointerCollisions.find(
        (c) => CONTENT_STATUSES.includes(c.id as any)
      );
      if (columnCollision) {
        return [columnCollision];
      }
    }
    
    // 3. Fall back to closestCenter
    return closestCenter(args);
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeGroupItem = filteredContent.find((c) => c.id === active.id);
    if (!activeGroupItem) return;

    const isStatus = CONTENT_STATUSES.includes(over.id as ContentStatus);
    const targetStatus = isStatus ? (over.id as ContentStatus) : (content.find((c) => c.id === over.id)?.status);

    if (!targetStatus) return;

    if (activeGroupItem.status !== targetStatus) {
      if (targetStatus === 'Published') {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const isFuture = activeGroupItem.scheduleDate && activeGroupItem.scheduleDate > todayStr;
        
        if (isFuture) {
          setConfirmState({
            isOpen: true,
            title: 'Belum Waktunya Publish',
            message: `Konten ini dijadwalkan untuk diposting pada tanggal ${formatDate(activeGroupItem.scheduleDate!)}. Anda tidak dapat mempublikasikannya sebelum tanggal tersebut.`,
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
              for (const itemId of activeGroupItem.allIds) {
                moveContentStatus(itemId, 'Published');
              }
              const restorePayload = {
                type: 'status_content',
                ids: activeGroupItem.allIds,
                oldStatus: activeGroupItem.status
              };
              logActivity(
                'Mengubah Status Konten', 
                activeGroupItem.title, 
                `Kanban: ${activeGroupItem.status} -> Published`,
                restorePayload
              );
              setConfirmState((prev) => ({ ...prev, isOpen: false }));
            },
            onCancel: () => {
              setConfirmState((prev) => ({ ...prev, isOpen: false }));
            },
          });
        }
      } else {
        for (const itemId of activeGroupItem.allIds) {
          moveContentStatus(itemId, targetStatus);
        }
        const restorePayload = {
          type: 'status_content',
          ids: activeGroupItem.allIds,
          oldStatus: activeGroupItem.status
        };
        logActivity(
          'Mengubah Status Konten', 
          activeGroupItem.title, 
          `Kanban: ${activeGroupItem.status} -> ${targetStatus}`,
          restorePayload
        );
      }
    }
  };

  const dragItem = activeId ? filteredContent.find((c) => c.id === activeId) : null;

  return (
    <div className="page-enter flex flex-col h-full overflow-hidden">
      <TopBar title="Kanban Pipeline" subtitle="Kelola produksi kontenmu secara visual" />
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 md:px-7 py-4 md:py-5 flex flex-col min-h-0">
        
        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-quaternary)' }}>Platform:</span>
            <select 
              className="input select py-1 px-3 text-xs w-36"
              style={{ padding: '4px 28px 4px 10px', borderRadius: 8 }}
              value={filterPlat} 
              onChange={(e) => setFilterPlat(e.target.value)}
            >
              <option value="all">Semua Platform</option>
              {plats.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-quaternary)' }}>Kategori:</span>
            <select 
              className="input select py-1 px-3 text-xs w-38"
              style={{ padding: '4px 28px 4px 10px', borderRadius: 8 }}
              value={filterCat} 
              onChange={(e) => setFilterCat(e.target.value)}
            >
              <option value="all">Semua Kategori</option>
              {cats.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={collisionDetectionStrategy} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full pb-4" style={{ minWidth: 'max-content' }}>
            {CONTENT_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                items={filteredContent.filter((c) => c.status === status)}
                cats={cats}
                plats={plats}
                onCardClick={setSelected}
                onAddClick={(s) => setAddStatus(s)}
              />
            ))}
          </div>

          <DragOverlay modifiers={[grabPointModifier]} dropAnimation={{ duration: 200, easing: 'ease' }}>
            {dragItem && (() => {
              const cat = cats.find((c) => c.id === dragItem.categoryId);
              return (
                <div
                  className="kanban-card"
                  style={{
                    opacity: 0.93,
                    rotate: '2deg',
                    scale: '1.04',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.15)',
                    cursor: 'grabbing',
                    pointerEvents: 'none',
                    width: 216,
                  }}
                >
                  {cat && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                      <span className="text-xs font-medium" style={{ color: cat.color }}>{cat.name}</span>
                    </div>
                  )}
                  <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {dragItem.title}
                  </p>
                  {dragItem.platforms && dragItem.platforms.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mt-2">
                      {dragItem.platforms.slice(0, 2).map((platName) => {
                        const p = plats.find((plat) => plat.name.toLowerCase() === platName.toLowerCase());
                        const pColor = p?.color ?? '#8E8E93';
                        return (
                          <span key={platName} className="badge text-[10px]" style={{ background: `${pColor}14`, color: pColor }}>
                            {platName}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </DragOverlay>
        </DndContext>
      </div>

      {selected && <ContentModal item={selected} onClose={() => setSelected(null)} />}
      {addStatus && (
        <ContentModal
          onClose={() => setAddStatus(null)}
          item={undefined}
        />
      )}
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
    </div>
  );
}
