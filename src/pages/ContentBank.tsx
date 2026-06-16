// src/pages/ContentBank.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, Search, Grid, List, Eye, Heart, MessageCircle, Share2, 
  Bookmark, FileSearch, Calendar, Filter, ChevronDown, 
  X, Check, Clock, AlignLeft, Download, FileSpreadsheet,
  ArrowUpDown, Trash2
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { TopBar } from '../components/layout/TopBar';
import { ContentModal } from '../components/content/ContentModal';
import Import from './Import';
import { formatDate, getStatusColor, getStatusBg, getPlatformColor, generateId } from '../lib/utils';
import type { ContentItem, ContentStatus, Category, WorkspacePlatform, GroupedContentItem } from '../types';
import { CONTENT_STATUSES } from '../types';
import { toast } from '../components/ui/Toast';
import { logActivity } from '../lib/auditLogger';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
// @ts-ignore
import ExcelJS from 'exceljs/dist/es5/exceljs.browser.js';

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
        <div className="dropdown-menu absolute top-full left-0 right-0 mt-1 z-20 py-1">
          {CONTENT_STATUSES.map((s) => {
            const si = STATUS_INFO[s];
            const SI = si.icon;
            return (
              <button
                key={s}
                type="button"
                className="dropdown-item text-xs"
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
                if (value.length > 1) {
                  onChange(value.filter((val) => val !== p));
                } else {
                  toast.warning('Minimal pilih satu platform');
                }
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

function ContentCard({ item, cats, plats, onClick, isSelectionMode = false, isSelected = false, onSelect }: {
  item: GroupedContentItem;
  cats: { id: string; name: string; color: string }[];
  plats: WorkspacePlatform[];
  onClick: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const cat = cats.find((c) => c.id === item.categoryId);
  return (
    <div 
      className={`card card-interactive p-4 animate-fade-in ${isSelected ? 'border-[var(--color-blue)]' : ''}`} 
      onClick={isSelectionMode ? onSelect : onClick}
      style={{
        border: isSelected ? '1.5px solid var(--color-blue)' : '1px solid var(--border-color)',
        background: isSelected ? 'rgba(10, 132, 255, 0.04)' : ''
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="h-1 rounded-full flex-grow mr-4" style={{ background: cat?.color ?? '#E5E5EA' }} />
        {isSelectionMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onSelect?.()}
            className="accent-[#007AFF] w-4 h-4 cursor-pointer flex-shrink-0"
          />
        )}
      </div>
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
        {item.platforms && item.platforms.map((platName) => {
          const p = plats.find((plat) => plat.name.toLowerCase() === platName.toLowerCase());
          const pColor = p?.color ?? '#8E8E93';
          return (
            <span key={platName} className="badge text-[10px]" style={{ background: `${pColor}14`, color: pColor }}>
              {platName}
            </span>
          );
        })}
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

function ContentRow({ item, cats, plats, onClick, isSelectionMode = false, isSelected = false, onSelect }: {
  item: GroupedContentItem;
  cats: Category[];
  plats: WorkspacePlatform[];
  onClick: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const cat = cats.find((c) => c.id === item.categoryId);

  return (
    <tr 
      className={`border-b transition-colors text-xs ${isSelected ? 'bg-[rgba(10,132,255,0.04)]' : 'hover-bg-subtle cursor-pointer'}`} 
      style={{ 
        borderColor: 'var(--border-color)',
        background: isSelected ? 'rgba(10, 132, 255, 0.04)' : ''
      }}
      onClick={isSelectionMode ? onSelect : onClick}
    >
      {isSelectionMode && (
        <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect?.()}
            className="accent-[#007AFF] w-4 h-4 cursor-pointer"
          />
        </td>
      )}
      <td className="py-2.5 px-4 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat?.color ?? '#C7C7CC' }} />
        <span className="font-semibold truncate max-w-[240px]" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
      </td>
      <td className="py-2.5 px-4">
        <div className="flex flex-wrap gap-1">
          {item.platforms && item.platforms.map((platName) => {
            const p = plats.find((plat) => plat.name.toLowerCase() === platName.toLowerCase());
            const pColor = p?.color ?? '#8E8E93';
            return (
              <span key={platName} className="badge text-[10px]" style={{ background: `${pColor}14`, color: pColor }}>
                {platName}
              </span>
            );
          })}
        </div>
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

function generateExcelChart(data: { label: string; value: number; color: string }[]) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#1c1c1e';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Distribusi Views per Platform (Konten Terfilter)', 20, 30);

    if (data.length === 0) {
      ctx.fillStyle = '#8e8e93';
      ctx.font = '12px sans-serif';
      ctx.fillText('Tidak ada data performa views untuk ditampilkan', 20, 150);
      return canvas.toDataURL('image/png');
    }

    // Chart area dimensions
    const chartX = 60;
    const chartY = 55;
    const chartWidth = 505;
    const chartHeight = 195;

    // Find max value
    const maxVal = Math.max(...data.map(d => d.value), 100);

    // Draw Y axis grids & labels
    ctx.strokeStyle = '#f2f2f7';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8e8e93';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';

    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const y = chartY + chartHeight - (i / gridCount) * chartHeight;
      const val = Math.round((i / gridCount) * maxVal);
      
      // Grid line
      ctx.beginPath();
      ctx.moveTo(chartX, y);
      ctx.lineTo(chartX + chartWidth, y);
      ctx.stroke();

      // Label
      ctx.fillText(val.toLocaleString('id-ID'), chartX - 8, y + 3);
    }

    // Draw Bars & X axis labels
    const barWidth = Math.min(32, (chartWidth / data.length) * 0.4);
    const gap = (chartWidth / data.length);
    ctx.textAlign = 'center';

    data.forEach((d, idx) => {
      const x = chartX + idx * gap + (gap - barWidth) / 2;
      const barHeight = (d.value / maxVal) * chartHeight;
      const y = chartY + chartHeight - barHeight;

      // Draw Bar
      ctx.fillStyle = d.color;
      
      // Handle roundRect support (safeguard)
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      // Value on top of bar
      ctx.fillStyle = '#1c1c1e';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(d.value.toLocaleString('id-ID'), x + barWidth / 2, y - 5);

      // X Label
      ctx.fillStyle = '#3a3a3c';
      ctx.font = '9px sans-serif';
      // Truncate label if too long
      const labelText = d.label.length > 12 ? d.label.substring(0, 10) + '..' : d.label;
      ctx.fillText(labelText, x + barWidth / 2, chartY + chartHeight + 15);
    });

    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Failed to generate canvas chart', e);
    return null;
  }
}

export default function ContentBank() {
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const contentItems = useAppStore((state) => state.contentItems);
  const categories = useAppStore((state) => state.categories);
  const platforms = useAppStore((state) => state.platforms);
  const addContent = useAppStore((state) => state.addContent);

  const content = useMemo(() => {
    return contentItems.filter((c) => c.workspaceId === activeWorkspaceId);
  }, [contentItems, activeWorkspaceId]);

  const cats = useMemo(() => {
    return categories.filter((c) => c.workspaceId === activeWorkspaceId);
  }, [categories, activeWorkspaceId]);

  const plats = useMemo(() => {
    return (platforms ?? []).filter((p) => p.workspaceId === activeWorkspaceId);
  }, [platforms, activeWorkspaceId]);

  // Left Collapsible Planner state
  const [isPlannerOpen, setIsPlannerOpen]   = useState(false);
  const [plannerForm, setPlannerForm]       = useState<PlannerFormState>(() => EMPTY_FORM(plats[0] ? [plats[0].name] : []));
  const [plannerSaving, setPlannerSaving]   = useState(false);
  const [plannerInputMode, setPlannerInputMode] = useState<'single' | 'bulk'>('single');
  const [plannerBulkTitles, setPlannerBulkTitles] = useState('');

  // Top Search and Sort states
  const [search, setSearch]               = useState('');
  const [sort, setSort]                   = useState<'newest' | 'oldest' | 'az' | 'views' | 'likes' | 'shares' | 'saves' | 'schedule_asc' | 'schedule_desc'>('newest');
  const [viewMode, setViewMode]           = useState<'grid' | 'list'>('grid');
  const [selected, setSelected]           = useState<ContentItem | null>(null);

  // Filter Popover state
  const [showFilters, setShowFilters]     = useState(false);
  const [filterStatus, setStatus]         = useState<ContentStatus | 'all'>('all');
  const [filterCat, setCat]               = useState('all');
  const [filterPlatforms, setPlatforms]   = useState<string[]>([]);
  const [filterMonth, setFilterMonth]     = useState('all');

  const filterRef = useRef<HTMLDivElement>(null);
  const dataMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const bulkDeleteContent = useAppStore((state) => state.bulkDeleteContent);
  const bulkUpdateContentStatus = useAppStore((state) => state.bulkUpdateContentStatus);
  const bulkUpdateContentCategory = useAppStore((state) => state.bulkUpdateContentCategory);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    toast.info('Menyiapkan file Excel...');
    try {
      const wsStore = useAppStore.getState().workspaces.find((w) => w.id === activeWorkspaceId);
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data Konten');

      // Ensure grid lines are visible in generated spreadsheet
      worksheet.views = [{ showGridLines: true }];

      // 1. Title Row
      worksheet.mergeCells('A1:N1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `LAPORAN BANK KONTEN - ${wsStore?.name?.toUpperCase() ?? 'CREATOR WORKSPACE'}`;
      titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF1C1C1E' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.getRow(1).height = 40;

      // 2. Aggregate views per platform for the chart
      const platformViewsMap: Record<string, { views: number; color: string }> = {};
      filtered.forEach((item) => {
        const platData = plats.find(p => p.name.toLowerCase() === item.platform.toLowerCase());
        const pColor = getPlatformColor(item.platform, platData?.color);
        if (!platformViewsMap[item.platform]) {
          platformViewsMap[item.platform] = { views: 0, color: pColor };
        }
        platformViewsMap[item.platform].views += item.performance?.views ?? 0;
      });

      const chartDataForExcel = Object.keys(platformViewsMap).map((key) => ({
        label: key,
        value: platformViewsMap[key].views,
        color: platformViewsMap[key].color,
      }));

      // 3. Generate and Embed Canvas Chart
      const chartBase64 = generateExcelChart(chartDataForExcel);
      if (chartBase64) {
        const imageId = workbook.addImage({
          base64: chartBase64,
          extension: 'png',
        });
        
        // Spans columns A to H, rows 3 to 14
        worksheet.addImage(imageId, {
          tl: { col: 0, row: 2 }, 
          br: { col: 7, row: 14 } 
        });

        // Set row heights for chart area
        worksheet.getRow(2).height = 10; // spacer row
        for (let r = 3; r <= 14; r++) {
          worksheet.getRow(r).height = 22; 
        }
        worksheet.getRow(15).height = 15; // spacer row
      } else {
        worksheet.getRow(2).height = 15;
      }

      // 4. Header Row starts at row 16
      const headerRow = worksheet.getRow(16);
      headerRow.values = [
        'Judul Konten',
        'Platform',
        'Format',
        'Kategori',
        'Status',
        'Tanggal Rencana Upload',
        'Views',
        'Likes',
        'Comments',
        'Shares',
        'Saves',
        'Link Konten Upload',
        'Catatan',
        'Dibuat Pada'
      ];
      headerRow.height = 28;

      // Style Headers
      headerRow.eachCell((cell: any) => {
        cell.font = {
          name: 'Segoe UI',
          size: 11,
          bold: true,
          color: { argb: 'FFFFFFFF' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF007AFF' } // Accent Royal Blue
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF0056B3' } },
          bottom: { style: 'medium', color: { argb: 'FF0056B3' } },
          left: { style: 'thin', color: { argb: 'FF0056B3' } },
          right: { style: 'thin', color: { argb: 'FF0056B3' } }
        };
      });

      // 5. Data Rows
      filtered.forEach((item) => {
        const cat = cats.find((c) => c.id === item.categoryId);
        const rowData = [
          item.title,
          item.platform,
          item.format || 'Video',
          cat?.name || '-',
          item.status,
          item.scheduleDate ? formatDate(item.scheduleDate, 'd MMM yyyy') : '-',
          item.performance?.views ?? 0,
          item.performance?.likes ?? 0,
          item.performance?.comments ?? 0,
          item.performance?.shares ?? 0,
          item.performance?.saves ?? 0,
          item.referenceUrl || '-',
          item.notes || '-',
          formatDate(item.createdAt, 'd MMM yyyy HH:mm')
        ];
        
        const addedRow = worksheet.addRow(rowData);
        addedRow.height = 20;

        addedRow.eachCell((cell: any, colNumber: number) => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };

          // Alignments & Number formats
          if (colNumber === 1 || colNumber === 13) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if ([7, 8, 9, 10, 11].includes(colNumber)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.numFmt = '#,##0'; // Numeric formatting for calculations
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        });
      });

      // 6. Auto-fit Column Widths (Calculated from row 16 onwards)
      worksheet.columns.forEach((column: any) => {
        let maxLen = 0;
        column.eachCell?.({ includeEmpty: false }, (cell: any) => {
          if (cell.row < 16) return; 
          const val = cell.value;
          if (val !== null && val !== undefined) {
            const strVal = String(val);
            if (strVal.length > maxLen) {
              maxLen = strVal.length;
            }
          }
        });
        column.width = Math.min(Math.max(maxLen + 4, 12), 40);
      });

      // 7. Write and Trigger Browser Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `Data_Konten_ContentOS_${dateStr}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Data Excel berhasil diunduh!');
    } catch (error: any) {
      console.error(error);
      toast.error('Gagal mengekspor data ke Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    toast.info('Menyiapkan dokumen PDF...');
    try {
      const element = document.querySelector('.content-bank-results') as HTMLElement;
      if (!element) throw new Error('Elemen tidak ditemukan.');

      await new Promise(resolve => setTimeout(resolve, 300));

      const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      
      const scrollContainer = element.querySelector('.overflow-y-auto') as HTMLElement;
      const originalScrollStyle = scrollContainer ? (scrollContainer.getAttribute('style') || '') : '';
      
      if (scrollContainer) {
        scrollContainer.style.overflowY = 'visible';
        scrollContainer.style.height = 'auto';
        scrollContainer.style.maxHeight = 'none';
      }
      
      // Temporarily force desktop width for consistent snapshot layout
      const originalStyle = element.getAttribute('style') || '';
      element.style.width = '1280px';
      element.style.minWidth = '1280px';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: theme === 'dark' ? '#1c1c1e' : '#f2f2f7',
        logging: false,
        windowWidth: 1280,
      });

      // Restore original styles
      element.setAttribute('style', originalStyle);
      if (scrollContainer) {
        scrollContainer.setAttribute('style', originalScrollStyle);
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      
      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`Laporan_Bank_Konten_ContentOS_${dateStr}.pdf`);
      
      toast.success('Visual PDF berhasil diunduh!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal mengekspor ke PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle click outside to close filter popover & data actions menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
      if (dataMenuRef.current && !dataMenuRef.current.contains(event.target as Node)) {
        setShowDataMenu(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync planner form categories/platforms
  useEffect(() => {
    const defaultCatId = cats[0]?.id ?? '';
    const defaultPlats = plats[0] ? [plats[0].name] : [];

    const isCatValid = cats.some((c) => c.id === plannerForm.categoryId);
    const nextCategory = isCatValid ? plannerForm.categoryId : defaultCatId;

    const validPlatforms = plannerForm.platforms.filter((p) => plats.some((plat) => plat.name === p));
    const nextPlatforms = validPlatforms.length > 0 ? validPlatforms : defaultPlats;

    const categoryChanged = plannerForm.categoryId !== nextCategory;
    const platformsChanged =
      plannerForm.platforms.length !== nextPlatforms.length ||
      !plannerForm.platforms.every((p, i) => p === nextPlatforms[i]);

    if (categoryChanged || platformsChanged) {
      setPlannerForm((f) => ({
        ...f,
        categoryId: nextCategory,
        platforms: nextPlatforms,
      }));
    }
  }, [activeWorkspaceId, cats, plats, plannerForm.categoryId, plannerForm.platforms]);


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
        const addedIds: string[] = [];
        for (const plat of plannerForm.platforms) {
          const newId = generateId();
          addedIds.push(newId);
          addContent({
            id:           newId,
            workspaceId:  activeWorkspaceId,
            title:        plannerForm.title.trim(),
            categoryId:   plannerForm.categoryId || cats[0]?.id || '',
            status:       plannerForm.status,
            platform:     plat,
            scheduleDate: plannerForm.scheduleDate || undefined,
            notes:        plannerForm.notes.trim() || undefined,
          });
        }

        const restorePayload = {
          type: 'add_content',
          addedIds
        };
        logActivity(
          'Menambah Konten', 
          plannerForm.title.trim(), 
          `Platform: ${plannerForm.platforms.join(', ')}, Status: ${plannerForm.status}`, 
          restorePayload
        );
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
        const addedIds: string[] = [];
        for (const title of lines) {
          for (const plat of plannerForm.platforms) {
            const newId = generateId();
            addedIds.push(newId);
            addContent({
              id:           newId,
              workspaceId:  activeWorkspaceId,
              title,
              categoryId:   plannerForm.categoryId || cats[0]?.id || '',
              status:       plannerForm.status,
              platform:     plat,
              scheduleDate: plannerForm.scheduleDate || undefined,
              notes:        plannerForm.notes.trim() || undefined,
            });
            count++;
          }
        }

        const restorePayload = {
          type: 'add_content',
          addedIds
        };
        logActivity(
          'Menambah Konten (Massal)', 
          `${lines.length} ide konten`, 
          `Platform: ${plannerForm.platforms.join(', ')}, Total: ${count}`, 
          restorePayload
        );
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

    // Group identical items (workspace, category, scheduleDate, title)
    const groupedMap: Record<string, ContentItem[]> = {};
    res.forEach((c) => {
      const key = `${c.workspaceId}_${c.categoryId}_${c.scheduleDate || 'unscheduled'}_${c.title.toLowerCase().trim()}`;
      if (!groupedMap[key]) groupedMap[key] = [];
      groupedMap[key].push(c);
    });

    const groupedList = Object.values(groupedMap).map((items) => {
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

    if (sort === 'newest') groupedList.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === 'oldest') groupedList.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (sort === 'az')     groupedList.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'views')  groupedList.sort((a, b) => (b.performance?.views ?? 0) - (a.performance?.views ?? 0));
    if (sort === 'likes')  groupedList.sort((a, b) => (b.performance?.likes ?? 0) - (a.performance?.likes ?? 0));
    if (sort === 'shares') groupedList.sort((a, b) => (b.performance?.shares ?? 0) - (a.performance?.shares ?? 0));
    if (sort === 'saves')  groupedList.sort((a, b) => (b.performance?.saves ?? 0) - (a.performance?.saves ?? 0));
    if (sort === 'schedule_asc') {
      groupedList.sort((a, b) => {
        if (!a.scheduleDate) return 1;
        if (!b.scheduleDate) return -1;
        return a.scheduleDate.localeCompare(b.scheduleDate);
      });
    }
    if (sort === 'schedule_desc') {
      groupedList.sort((a, b) => {
        if (!a.scheduleDate) return 1;
        if (!b.scheduleDate) return -1;
        return b.scheduleDate.localeCompare(a.scheduleDate);
      });
    }
    return groupedList;
  }, [content, search, filterStatus, filterCat, filterPlatforms, filterMonth, sort]);

  // Selection Handlers
  const handleToggleSelectItem = (id: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedGroupIds.size === filtered.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(filtered.map((item) => item.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedGroupIds.size === 0) return;
    
    const itemsToDelete = filtered.filter(item => selectedGroupIds.has(item.id));
    const count = itemsToDelete.length;
    
    if (window.confirm(`Apakah Anda yakin ingin menghapus ${count} konten terpilih secara permanen?`)) {
      const allIdsToDelete = itemsToDelete.flatMap(item => item.allIds);
      
      // Call Zustand store action
      bulkDeleteContent(allIdsToDelete);
      
      // Log audit trail for restoration compatibility
      logActivity(
        'Menghapus Konten Massal', 
        `${count} konten`, 
        `Menghapus massal: ${itemsToDelete.map(it => it.title).join(', ')}`, 
        {
          type: 'delete_content',
          items: itemsToDelete.flatMap(item => {
            return item.allIds.map(id => contentItems.find(c => c.id === id)).filter(Boolean);
          })
        }
      );
      
      setSelectedGroupIds(new Set());
      setIsSelectionMode(false);
      toast.success(`${count} konten berhasil dihapus.`);
    }
  };

  const handleBulkUpdateStatus = (status: ContentStatus) => {
    if (selectedGroupIds.size === 0) return;
    const itemsToUpdate = filtered.filter(item => selectedGroupIds.has(item.id));
    const count = itemsToUpdate.length;
    const allIdsToUpdate = itemsToUpdate.flatMap(item => item.allIds);

    bulkUpdateContentStatus(allIdsToUpdate, status);

    logActivity(
      'Mengubah Status Konten Massal', 
      `${count} konten`, 
      `Mengubah status massal menjadi ${status} untuk: ${itemsToUpdate.map(it => it.title).join(', ')}`, 
      {
        type: 'bulk_update_status',
        status,
        items: itemsToUpdate.flatMap(item => {
          return item.allIds.map(id => contentItems.find(c => c.id === id)).filter(Boolean);
        })
      }
    );

    setSelectedGroupIds(new Set());
    setIsSelectionMode(false);
    toast.success(`Status ${count} konten berhasil diubah menjadi ${status}.`);
  };

  const handleBulkUpdateCategory = (categoryId: string) => {
    if (selectedGroupIds.size === 0) return;
    const itemsToUpdate = filtered.filter(item => selectedGroupIds.has(item.id));
    const count = itemsToUpdate.length;
    const allIdsToUpdate = itemsToUpdate.flatMap(item => item.allIds);
    const categoryName = cats.find(c => c.id === categoryId)?.name || 'Kategori Baru';

    bulkUpdateContentCategory(allIdsToUpdate, categoryId);

    logActivity(
      'Mengubah Kategori Konten Massal', 
      `${count} konten`, 
      `Mengubah kategori massal menjadi ${categoryName} untuk: ${itemsToUpdate.map(it => it.title).join(', ')}`, 
      {
        type: 'bulk_update_category',
        categoryId,
        items: itemsToUpdate.flatMap(item => {
          return item.allIds.map(id => contentItems.find(c => c.id === id)).filter(Boolean);
        })
      }
    );

    setSelectedGroupIds(new Set());
    setIsSelectionMode(false);
    toast.success(`Kategori ${count} konten berhasil diubah menjadi ${categoryName}.`);
  };

  const filterFormContent = (
    <>
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
    </>
  );

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
        <div className="flex-1 min-w-0 flex flex-col content-bank-results">
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

              {/* Filter Popover Dropdown (Desktop vs Mobile Modal Portal) */}
              {showFilters && (
                isMobile ? (
                  createPortal(
                    <div className="modal-overlay z-50 animate-fade-in" onClick={() => setShowFilters(false)}>
                      <div 
                        className="modal p-5 rounded-ios border shadow-lg flex flex-col gap-3.5 animate-scale-in"
                        style={{ 
                          maxWidth: 320, 
                          background: 'var(--bg-surface)', 
                          borderColor: 'var(--border-color)',
                          width: '90%'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {filterFormContent}
                        <button className="btn btn-primary btn-sm mt-3 w-full" onClick={() => setShowFilters(false)}>
                          Terapkan Filter
                        </button>
                      </div>
                    </div>,
                    document.body
                  )
                ) : (
                  <div className="dropdown-menu absolute left-0 mt-2 w-72 p-4 z-50 flex flex-col gap-3.5">
                    {filterFormContent}
                  </div>
                )
              )}
            </div>

            {/* Sort selection — Custom Glassmorphism Dropdown */}
            {(() => {
              const SORT_OPTIONS: { value: typeof sort; label: string }[] = [
                { value: 'newest',       label: 'Terbaru' },
                { value: 'oldest',       label: 'Terlama' },
                { value: 'schedule_asc', label: 'Jadwal Terdekat' },
                { value: 'schedule_desc',label: 'Jadwal Terjauh' },
                { value: 'views',        label: 'Views Terbanyak' },
                { value: 'likes',        label: 'Likes Terbanyak' },
                { value: 'shares',       label: 'Shares Terbanyak' },
                { value: 'saves',        label: 'Saves Terbanyak' },
                { value: 'az',           label: 'A–Z' },
              ];
              const currentLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'Terbaru';
              return (
                <div ref={sortMenuRef} className="relative flex items-center">
                  <button
                    className="btn btn-secondary btn-sm text-xs py-1.5 flex items-center gap-1.5"
                    style={{
                      borderRadius: '9999px',
                      minWidth: 120,
                      paddingLeft: 10,
                      paddingRight: 10,
                      height: 30,
                      borderColor: 'var(--border-color)',
                      background: 'var(--bg-surface-elevated)',
                    }}
                    onClick={() => setShowSortMenu(!showSortMenu)}
                  >
                    <ArrowUpDown size={11} style={{ color: 'var(--text-quaternary)', flexShrink: 0 }} />
                    <span className="flex-1 text-left" style={{ color: 'var(--text-primary)' }}>{currentLabel}</span>
                    <ChevronDown size={10} style={{ color: 'var(--text-quaternary)', flexShrink: 0 }} />
                  </button>
                  {showSortMenu && (
                    <div className="dropdown-menu absolute left-0 top-full mt-1.5 z-50 w-44">
                      <div className="dropdown-label">Urutkan</div>
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          className="dropdown-item"
                          style={{ fontWeight: sort === opt.value ? 700 : 500, color: sort === opt.value ? 'var(--color-blue)' : 'var(--text-primary)' }}
                          onClick={() => { setSort(opt.value); setShowSortMenu(false); }}
                        >
                          {sort === opt.value && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-blue)' }} />}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Right toolbar controls */}
            <div className="ml-auto flex flex-wrap items-center gap-1.5 justify-end">
              <button 
                className="btn btn-secondary btn-sm text-xs py-1.5 flex items-center gap-1.5"
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedGroupIds(new Set());
                }}
                style={{ 
                  color: isSelectionMode ? '#fff' : 'var(--color-blue)', 
                  borderColor: isSelectionMode ? '' : 'rgba(10, 132, 255, 0.3)',
                  background: isSelectionMode ? 'var(--color-blue)' : 'rgba(10, 132, 255, 0.05)'
                }}
              >
                <Check size={13} />
                {isMobile 
                  ? (isSelectionMode ? 'Selesai' : 'Pilih') 
                  : (isSelectionMode ? 'Selesai Pilih' : 'Pilih Banyak')
                }
              </button>

              {/* Data Tools Dropdown */}
              <div ref={dataMenuRef} className="relative">
                <button 
                  className="btn btn-secondary btn-sm text-xs py-1.5 flex items-center gap-1.5"
                  onClick={() => setShowDataMenu(!showDataMenu)}
                  style={{
                    color: 'var(--text-secondary)',
                    borderColor: 'var(--border-color)',
                    background: 'var(--bg-surface-elevated)'
                  }}
                >
                  <Download size={13} />
                  <span>{isMobile ? 'Alat' : 'Aksi Data'}</span>
                  <ChevronDown size={10} style={{ opacity: 0.7 }} />
                </button>
                
                {showDataMenu && (
                  <div className="dropdown-menu absolute right-0 mt-1.5 w-48 z-50">
                    <div className="dropdown-label">Impor Data</div>
                    <button 
                      className="dropdown-item"
                      style={{ color: 'var(--color-blue)' }}
                      onClick={() => {
                        setIsImportOpen(true);
                        setShowDataMenu(false);
                      }}
                    >
                      <Plus size={14} /> Import Excel
                    </button>
                    <div className="dropdown-divider" />
                    <div className="dropdown-label">Ekspor Data</div>
                    <button 
                      className="dropdown-item"
                      style={{ color: 'var(--color-green)' }}
                      onClick={() => {
                        handleExportExcel();
                        setShowDataMenu(false);
                      }}
                      disabled={isExportingExcel}
                    >
                      <FileSpreadsheet size={14} /> {isExportingExcel ? 'Mengekspor...' : 'Export Excel'}
                    </button>
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        handleExportPdf();
                        setShowDataMenu(false);
                      }}
                      disabled={isExportingPdf}
                    >
                      <Download size={14} /> {isExportingPdf ? 'Mengekspor...' : 'Export PDF'}
                    </button>
                  </div>
                )}
              </div>

              <div className="seg-control">
                <button className={`seg-btn p-1.5 ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}><Grid size={13} /></button>
                <button className={`seg-btn p-1.5 ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={13} /></button>
              </div>

              {/* Rencanakan Konten Toggle Button */}
              {!isPlannerOpen && (
                <button className="btn btn-secondary btn-sm flex items-center gap-1" onClick={() => setIsPlannerOpen(true)}>
                  <Plus size={13} />
                  <span>{isMobile ? 'Rencana' : 'Rencanakan Konten'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Selection Actions Panel */}
          {isSelectionMode && (
            <div 
              className="card p-3 mb-3.5 flex flex-wrap items-center justify-between gap-3 animate-slide-up"
              style={{
                background: 'rgba(10, 132, 255, 0.05)',
                borderColor: 'rgba(10, 132, 255, 0.2)',
              }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  {selectedGroupIds.size} konten terpilih
                </span>
                <button 
                  className="btn btn-secondary btn-sm text-[11px] py-1 px-2.5" 
                  onClick={handleSelectAll}
                >
                  {selectedGroupIds.size === filtered.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select 
                  className="input select text-[11px] py-0 px-2 h-7 min-w-[110px]"
                  style={{ 
                    borderColor: 'rgba(10, 132, 255, 0.2)',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    lineHeight: '1',
                  }}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkUpdateStatus(e.target.value as ContentStatus);
                    }
                  }}
                  disabled={selectedGroupIds.size === 0}
                >
                  <option value="" disabled hidden>Ubah Status</option>
                  {CONTENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select 
                  className="input select text-[11px] py-0 px-2 h-7 min-w-[110px]"
                  style={{ 
                    borderColor: 'rgba(10, 132, 255, 0.2)',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    lineHeight: '1',
                  }}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkUpdateCategory(e.target.value);
                    }
                  }}
                  disabled={selectedGroupIds.size === 0}
                >
                  <option value="" disabled hidden>Ubah Pilar</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <button 
                  className="btn btn-primary btn-sm text-[11px] py-1 px-2.5 h-7" 
                  style={{ background: 'var(--color-red)' }}
                  onClick={handleBulkDelete}
                  disabled={selectedGroupIds.size === 0}
                >
                  <Trash2 size={11} /> Hapus Terpilih
                </button>
                <button 
                  className="btn btn-secondary btn-sm text-[11px] py-1 px-2.5 h-7"
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedGroupIds(new Set());
                  }}
                >
                  Batal
                </button>
              </div>
            </div>
          )}

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
                <ContentCard 
                  key={item.id} 
                  item={item} 
                  cats={cats} 
                  plats={plats} 
                  onClick={() => setSelected(item)} 
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedGroupIds.has(item.id)}
                  onSelect={() => handleToggleSelectItem(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="card overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 scrollbar-thin">
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }} className="text-xs">
                      {isSelectionMode && (
                        <th className="sticky top-0 bg-[var(--bg-secondary)] py-2.5 px-4 text-center z-10 w-10">
                          <input
                            type="checkbox"
                            checked={selectedGroupIds.size === filtered.length && filtered.length > 0}
                            onChange={handleSelectAll}
                            className="accent-[#007AFF] w-4 h-4 cursor-pointer"
                          />
                        </th>
                      )}
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
                      <ContentRow 
                        key={item.id} 
                        item={item} 
                        cats={cats} 
                        plats={plats} 
                        onClick={() => setSelected(item)} 
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedGroupIds.has(item.id)}
                        onSelect={() => handleToggleSelectItem(item.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>

      {selected && <ContentModal item={selected} onClose={() => setSelected(null)} />}

      {isImportOpen && (
        <div className="modal-overlay" onClick={() => setIsImportOpen(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  📥 Impor Konten Massal (Excel / CSV)
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-quaternary)' }}>
                  Unggah file Excel/CSV untuk diimpor ke Content Bank
                </p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsImportOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <Import hideTopBar={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
