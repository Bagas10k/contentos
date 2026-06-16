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
  const categoryName = eventInfo.event.extendedProps.categoryName;
  const categoryColor = eventInfo.event.extendedProps.categoryColor;

  return (
    <div className="flex flex-col p-1 w-full overflow-hidden text-[10px] leading-tight text-white gap-1 mobile-compact-event">
      {/* Category Tag/Badge at the very top */}
      {categoryName && (
        <div className="flex category-badge">
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
      
      {/* Title */}
      <div className="font-semibold truncate event-title">
        <span className="truncate" title={c.title}>{c.title}</span>
      </div>
      
      {/* Bottom row: format & status dot */}
      <div className="flex items-center justify-between gap-1 mt-0.5 w-full event-meta">
        <span 
          className="px-1 py-0.5 rounded text-[8px] font-bold format-badge"
          style={{ background: 'rgba(0,0,0,0.20)', color: '#fff' }}
        >
          {c.format === 'Foto' ? 'Foto' : 'Video'}
        </span>
        <span 
          className="w-2 h-2 rounded-full flex-shrink-0 status-dot"
          style={{ 
            background: STATUS_COLORS[c.status] ?? '#C7C7CC',
            border: '1px solid rgba(255,255,255,0.4)',
            boxShadow: '0 0.5px 1px rgba(0,0,0,0.15)'
          }}
          title={`Status: ${c.status}`}
        />
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

  // Map content to FullCalendar events color-coded by Status, grouping duplicates on the same date
  const events = useMemo(() => {
    const grouped: Record<string, ContentItem[]> = {};
    
    filteredContent
      .filter((c) => c.scheduleDate)
      .forEach((c) => {
        // Group by title and date (same title, category, format, date, and status)
        const key = `${c.title.trim().toLowerCase()}_${c.scheduleDate}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(c);
      });

    return Object.values(grouped).map((items) => {
      const primaryItem = items[0];
      const cat = cats.find((ct) => ct.id === primaryItem.categoryId);
      const color = cat?.color ?? '#8E8E93';
      const allPlatforms = items.map(it => it.platform);

      return {
        id:    primaryItem.id,
        title: primaryItem.title,
        date:  primaryItem.scheduleDate!,
        backgroundColor: color,
        borderColor:     color,
        textColor:       '#fff',
        extendedProps: { 
          contentId: primaryItem.id, 
          content: primaryItem,
          categoryName: cat?.name,
          categoryColor: cat?.color,
          platforms: allPlatforms,
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

        @media (max-width: 768px) {
          .fc-header-toolbar {
            flex-direction: column;
            gap: 6px;
            margin-bottom: 8px !important;
          }
          .fc-toolbar-title {
            font-size: 13px !important;
          }
          .fc-button {
            padding: 3px 6px !important;
            font-size: 10px !important;
          }
          .fc-daygrid-day-top {
            padding: 1px !important;
          }
          .fc-daygrid-day-number {
            font-size: 9px !important;
            padding: 1px 4px !important;
          }
          .fc-day-today .fc-daygrid-day-number {
            padding: 1px 4px !important;
          }
          .fc-event {
            border-radius: 3px !important;
          }
          .fc-daygrid-event-harness {
            margin-top: 1px !important;
          }
          .fc-daygrid-more-link {
            font-size: 8px !important;
            padding: 0 1.5px !important;
            margin-top: 0.5px !important;
            display: block !important;
            text-align: center;
          }

          /* Compact mobile layout for events */
          .mobile-compact-event {
            padding: 1px !important;
            gap: 0px !important;
          }
          .mobile-compact-event .category-badge {
            display: none !important;
          }
          .mobile-compact-event .format-badge {
            display: none !important;
          }
          .mobile-compact-event .event-title {
            font-size: 8px !important;
            font-weight: 500 !important;
            line-height: 1.1 !important;
          }
          .mobile-compact-event .event-meta {
            justify-content: flex-end !important;
            margin-top: 0px !important;
            padding-right: 1px;
          }
          .mobile-compact-event .status-dot {
            width: 4px !important;
            height: 4px !important;
          }
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
        </div>

        {/* Desktop Split Layout */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4">
          {/* Left panel: Calendar (primary) */}
          <div className="flex-1 min-h-[520px] md:min-h-0 card p-2 md:p-4 flex flex-col">
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
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {cat && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold text-white" style={{ background: cat.color }}>
                              {cat.name}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                            {c.format === 'Foto' ? 'Foto' : 'Video'}
                          </span>
                        </div>
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

