// src/pages/EditorialCalendar.tsx
import { useState, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import idLocale from '@fullcalendar/core/locales/id';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/appStore';
import { TopBar } from '../components/layout/TopBar';
import { ContentModal } from '../components/content/ContentModal';
import type { ContentItem, ContentStatus } from '../types';
import { getPlatformColor } from '../lib/utils';
import { Eye } from 'lucide-react';

const STATUS_COLORS: Record<ContentStatus, string> = {
  'Idea':          '#8E8E93',
  'Scripting':     '#FF9500',
  'Production':    '#007AFF',
  'Editing':       '#AF52DE',
  'Ready to Post': '#34C759',
  'Published':     '#5856D6',
};

function renderEventContent(eventInfo: any) {
  const c = eventInfo.event.extendedProps.content as ContentItem | undefined;
  if (!c) return <span className="truncate">{eventInfo.event.title}</span>;
  const platformColor = getPlatformColor(c?.platform ?? '');
  const categoryName = eventInfo.event.extendedProps.categoryName;
  const categoryColor = eventInfo.event.extendedProps.categoryColor;

  return (
    <div className="flex flex-col p-1 w-full overflow-hidden text-[10px] leading-tight text-white gap-1">
      {/* Category Tag/Badge at the very top */}
      {categoryName && (
        <div className="flex">
          <span 
            className="px-1.5 py-0.5 rounded-sm text-[7.5px] font-bold uppercase tracking-wide truncate max-w-full" 
            style={{ 
              background: '#FFFFFF', 
              color: categoryColor || 'var(--text-primary)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            {categoryName}
          </span>
        </div>
      )}
      
      {/* Title with platform color dot */}
      <div className="flex items-center gap-1 font-semibold truncate">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: platformColor, opacity: 0.9 }} />
        <span className="truncate" title={c.title}>{c.title}</span>
      </div>
      
      {/* Bottom row: status + format/performance */}
      <div className="flex items-center justify-between gap-1 mt-0.5 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          <span 
            className="px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider" 
            style={{ background: 'rgba(255,255,255,0.25)' }}
          >
            {c.status}
          </span>
          {/* Format badge: Foto / Video */}
          <span 
            className="px-1 py-0.5 rounded text-[8px] font-bold"
            style={{ background: 'rgba(0,0,0,0.20)', color: '#fff' }}
          >
            {c.format === 'Foto' ? 'Foto' : 'Video'}
          </span>
        </div>
        
        {c.performance && c.performance.views > 0 && (
          <span className="text-[8px] opacity-95 flex-shrink-0 flex items-center gap-0.5">
            <Eye size={7} /> {c.performance.views.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

export default function EditorialCalendar() {
  const content = useAppStore(useShallow((state) => state.contentItems.filter((c) => c.workspaceId === state.activeWorkspaceId)));
  const cats = useAppStore(useShallow((state) => state.categories.filter((c) => c.workspaceId === state.activeWorkspaceId)));
  const plats = useAppStore(useShallow((state) => (state.platforms ?? []).filter((p) => p.workspaceId === state.activeWorkspaceId)));

  const [platform, setPlatform] = useState<string | 'all'>('all');

  const [selected, setSelected]       = useState<ContentItem | null>(null);
  const [addDate, setAddDate]         = useState<string | null>(null);
  const calRef = useRef<FullCalendar>(null);

  const filteredContent = useMemo(() => {
    return platform === 'all' ? content : content.filter((c) => c.platform === platform);
  }, [content, platform]);

  // Map content to FullCalendar events color-coded by Status
  const events = useMemo(() => {
    return filteredContent
      .filter((c) => c.scheduleDate)
      .map((c) => {
        const color = STATUS_COLORS[c.status] ?? '#8E8E93';
        const cat = cats.find((ct) => ct.id === c.categoryId);
        return {
          id:    c.id,
          title: c.title,
          date:  c.scheduleDate!,
          backgroundColor: color,
          borderColor:     color,
          textColor:       '#fff',
          extendedProps: { 
            contentId: c.id, 
            content: c,
            categoryName: cat?.name,
            categoryColor: cat?.color
          },
        };
      });
  }, [filteredContent, cats]);

  const handleEventClick = (info: any) => {
    const item = content.find((c) => c.id === info.event.extendedProps.contentId);
    if (item) setSelected(item);
  };

  const handleDateClick = (info: any) => {
    setAddDate(info.dateStr);
  };

  return (
    <div className="page-enter flex flex-col h-full overflow-hidden">
      {/* Calendar past/future day dimming and styles */}
      <style>{`
        .fc-day-past {
          background-color: var(--bg-secondary) !important;
          opacity: 0.8;
        }
        .fc-day-today {
          background-color: rgba(0, 122, 255, 0.05) !important;
        }
        .fc-day-today .fc-daygrid-day-number {
          background-color: #007AFF !important;
          color: #fff !important;
          border-radius: 50% !important;
          padding: 2px 6px !important;
          font-weight: bold;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: var(--border-color) !important;
        }
        .fc-event {
          border-radius: 6px !important;
          padding: 1px !important;
          border: none !important;
          box-shadow: var(--shadow-sm) !important;
        }
        .fc-daygrid-event-harness {
          margin-top: 2px !important;
        }
      `}</style>

      <TopBar title="Editorial Calendar" subtitle={`${events.length} konten terjadwal`} />
      <div className="page-content flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* Platform filter & Status Legend Inline */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: 'var(--text-quaternary)' }}>Platform:</span>
            <button
              className={`badge cursor-pointer text-xs transition-all ${platform === 'all' ? 'scale-105' : 'opacity-60'}`}
              style={{
                background: platform === 'all' ? '#1C1C1E' : 'var(--bg-tertiary)',
                color:      platform === 'all' ? '#fff' : 'var(--text-secondary)',
              }}
              onClick={() => setPlatform('all')}
            >
              Semua
            </button>
            {plats.map((p) => {
              const color  = p.color || '#636366';
              const active = platform === p.name;
              return (
                <button
                  key={p.id}
                  className={`badge cursor-pointer text-xs transition-all ${active ? 'scale-105' : 'opacity-60'}`}
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

          {/* Status Legend (Compact) */}
          <div className="flex flex-wrap gap-1.5 p-2 rounded-ios border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            {(Object.keys(STATUS_COLORS) as ContentStatus[]).map((status) => {
              const color = STATUS_COLORS[status];
              const count = content.filter((c) => c.status === status).length;
              return (
                <span
                  key={status}
                  className="badge text-[10px] py-0.5 px-2"
                  style={{ background: `${color}14`, color: color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: color }} />
                  {status} <span className="opacity-70 ml-0.5">({count})</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Desktop Split Layout */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4">
          {/* Left panel: Calendar (primary) */}
          <div className="flex-1 min-h-[480px] md:min-h-0 card p-4 flex flex-col">
            <div className="flex-1 min-h-0">
              <FullCalendar
                ref={calRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale={idLocale}
                events={events}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                eventContent={renderEventContent}
                headerToolbar={{
                  left:   'prev,next today',
                  center: 'title',
                  right:  'dayGridMonth,dayGridWeek',
                }}
                height="100%"
                dayMaxEvents={3}
                moreLinkText={(n) => `+${n} lagi`}
                eventMouseEnter={(info) => {
                  info.el.style.transform = 'scale(1.02)';
                  info.el.style.zIndex = '10';
                  info.el.style.transition = 'transform 0.15s ease';
                }}
                eventMouseLeave={(info) => {
                  info.el.style.transform = '';
                  info.el.style.zIndex = '';
                }}
              />
            </div>
          </div>

          {/* Right panel: Upcoming Scheduled (secondary) */}
          <div className="w-full md:w-80 flex-shrink-0 flex flex-col min-h-0 card p-4">
            <h3 className="font-semibold text-sm mb-3 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
              Jadwal Mendatang
            </h3>
            <div className="flex-1 overflow-y-auto px-2 py-1 flex flex-col gap-2">
              {filteredContent
                .filter((c) => c.scheduleDate && c.scheduleDate >= new Date().toISOString().split('T')[0])
                .sort((a, b) => (a.scheduleDate ?? '').localeCompare(b.scheduleDate ?? ''))
                .map((c) => {
                  const cat = cats.find((ct) => ct.id === c.categoryId);
                  return (
                    <div
                      key={c.id}
                      className="card card-interactive p-3 flex items-center gap-3 flex-shrink-0"
                      onClick={() => setSelected(c)}
                    >
                      <div
                        className="w-8 h-8 rounded-ios flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: STATUS_COLORS[c.status] ?? '#C7C7CC' }}
                      >
                        {c.scheduleDate?.split('-')[2]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                        <p className="text-[10px] truncate" style={{ color: 'var(--text-quaternary)' }}>
                          {c.platform} · {cat?.name ?? '-'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              {filteredContent.filter((c) => c.scheduleDate && c.scheduleDate >= new Date().toISOString().split('T')[0]).length === 0 && (
                <p className="text-xs text-center py-6" style={{ color: 'var(--text-quaternary)' }}>
                  Tidak ada jadwal mendatang
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {selected  && <ContentModal item={selected}  onClose={() => setSelected(null)} />}
      {addDate   && <ContentModal defaultDate={addDate} onClose={() => setAddDate(null)} />}
    </div>
  );
}

