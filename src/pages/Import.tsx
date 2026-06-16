// src/pages/Import.tsx
import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/appStore';
import { TopBar } from '../components/layout/TopBar';
import { CONTENT_STATUSES } from '../types';
import { toast } from '../components/ui/Toast';
import { logActivity } from '../lib/auditLogger';

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  title: string;
  category: string;
  status: string;
  scheduleDate: string;
  platform: string;
  notes: string;
}

const EMPTY_MAP: ColumnMapping = {
  title: '', category: '', status: '', scheduleDate: '', platform: '', notes: '',
};

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  title:        'Judul Konten *',
  category:     'Nama Kategori',
  status:       'Status',
  scheduleDate: 'Tanggal Jadwal',
  platform:     'Platform',
  notes:        'Catatan',
};

export default function Import({ hideTopBar = false }: { hideTopBar?: boolean }) {
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const cats = useAppStore(useShallow((state) => state.categories.filter((c) => c.workspaceId === state.activeWorkspaceId)));
  const plats = useAppStore(useShallow((state) => (state.platforms ?? []).filter((p) => p.workspaceId === state.activeWorkspaceId)));
  const bulkImportContent = useAppStore((state) => state.bulkImportContent);

  const [files, setFiles]       = useState<File[]>([]);
  const [headers, setHeaders]   = useState<string[]>([]);
  const [rows, setRows]         = useState<ParsedRow[]>([]);
  const [mapping, setMapping]   = useState<ColumnMapping>(EMPTY_MAP);
  const [mergeMode, setMerge]   = useState<'merge' | 'replace'>('merge');
  const [result, setResult]     = useState<{ imported: number; skipped: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFiles = useCallback((fileList: File[]) => {
    setFiles(fileList);
    setResult(null);
    if (fileList.length === 0) return;

    let allRows: ParsedRow[] = [];
    const allHeadersSet = new Set<string>();
    let filesProcessed = 0;

    fileList.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const wb   = XLSX.read(data, { type: 'array' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: '', raw: false });
          if (json.length > 0) {
            allRows = [...allRows, ...json];
            Object.keys(json[0]).forEach((h) => allHeadersSet.add(h));
          }
        } catch (err) {
          console.error(`Gagal membaca file ${f.name}:`, err);
          toast.error(`Gagal membaca file ${f.name}`);
        }

        filesProcessed++;
        if (filesProcessed === fileList.length) {
          if (allRows.length === 0) {
            toast.error('Semua file kosong atau format tidak valid');
            return;
          }
          const hdrs = Array.from(allHeadersSet);
          setHeaders(hdrs);
          setRows(allRows);

          // Auto-map common column names
          const autoMap: ColumnMapping = { ...EMPTY_MAP };
          const lowerHdrs = hdrs.map((h) => h.toLowerCase());
          if (lowerHdrs.some((h) => h.includes('judul') || h.includes('title')))
            autoMap.title = hdrs[lowerHdrs.findIndex((h) => h.includes('judul') || h.includes('title'))];
          if (lowerHdrs.some((h) => h.includes('kategori') || h.includes('category')))
            autoMap.category = hdrs[lowerHdrs.findIndex((h) => h.includes('kategori') || h.includes('category'))];
          if (lowerHdrs.some((h) => h.includes('status')))
            autoMap.status = hdrs[lowerHdrs.findIndex((h) => h.includes('status'))];
          if (lowerHdrs.some((h) => h.includes('tanggal') || h.includes('date')))
            autoMap.scheduleDate = hdrs[lowerHdrs.findIndex((h) => h.includes('tanggal') || h.includes('date'))];
          if (lowerHdrs.some((h) => h.includes('platform')))
            autoMap.platform = hdrs[lowerHdrs.findIndex((h) => h.includes('platform'))];
          if (lowerHdrs.some((h) => h.includes('catatan') || h.includes('notes')))
            autoMap.notes = hdrs[lowerHdrs.findIndex((h) => h.includes('catatan') || h.includes('notes'))];
          setMapping(autoMap);
        }
      };
      reader.readAsArrayBuffer(f);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(
      (f) => f.name.endsWith('.xlsx') || f.name.endsWith('.csv') || f.name.endsWith('.xls')
    );
    if (validFiles.length > 0) {
      parseFiles(validFiles);
    } else {
      toast.error('Hanya file .xlsx, .xls, atau .csv yang diterima');
    }
  }, [parseFiles]);

  const handleImport = () => {
    if (!mapping.title) { toast.error('Harus map kolom Judul terlebih dahulu'); return; }

    const items = rows
      .filter((r) => r[mapping.title]?.trim())
      .map((r) => {
        const statusRaw = mapping.status ? r[mapping.status] : '';
        const validStatus = CONTENT_STATUSES.find((s) => s.toLowerCase() === statusRaw?.toLowerCase()) ?? 'Idea' as import('../types').ContentStatus;
        const platRaw = mapping.platform ? r[mapping.platform] : '';
        const validPlat = plats.find((p) => p.name.toLowerCase() === platRaw?.toLowerCase())?.name ?? (plats[0]?.name ?? 'TikTok');
        const catName  = mapping.category ? r[mapping.category] : '';
        const cat      = cats.find((c) => c.name.toLowerCase() === catName?.toLowerCase());

        return {
          workspaceId:  activeWorkspaceId!,
          title:        r[mapping.title].trim(),
          categoryId:   cat?.id ?? cats[0]?.id ?? '',
          status:       validStatus,
          platform:     validPlat,
          scheduleDate: mapping.scheduleDate && r[mapping.scheduleDate] ? r[mapping.scheduleDate] : undefined,
          notes:        mapping.notes && r[mapping.notes] ? r[mapping.notes] : undefined,
        };
      });

    const res = bulkImportContent(items, mergeMode === 'merge');
    setResult({ imported: res.imported, skipped: res.skipped });
    
    const fileNamesLabel = files.map(f => f.name).join(', ');
    const restorePayload = {
      type: 'add_content',
      addedIds: res.importedIds
    };
    logActivity(
      'Mengimpor Konten Massal', 
      fileNamesLabel || 'Excel/CSV', 
      `Berhasil mengimpor: ${res.imported}, Dilewati: ${res.skipped}`, 
      restorePayload
    );
    toast.success(`${res.imported} konten berhasil diimport`);
  };

  const handleReset = () => {
    setFiles([]); setHeaders([]); setRows([]); setMapping(EMPTY_MAP); setResult(null);
  };

  return (
    <div className={hideTopBar ? "" : "page-enter"}>
      {!hideTopBar && <TopBar title="Import Data" subtitle="Impor konten dari file Excel atau CSV" />}
      <div className={hideTopBar ? "max-w-3xl" : "page-content max-w-3xl"}>
        {files.length === 0 ? (
          /* Upload Area */
          <div
            className="card p-8 text-center cursor-pointer transition-all"
            style={{
              borderStyle: dragging ? 'solid' : 'dashed',
              borderColor: dragging ? 'var(--color-blue)' : 'var(--border-color)',
              background:  dragging ? 'rgba(0,122,255,0.04)' : 'var(--bg-surface)',
            }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--bg-tertiary)' }}>
              <Upload size={28} style={{ color: dragging ? 'var(--color-blue)' : 'var(--text-quaternary)' }} />
            </div>
            <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>
              {dragging ? 'Lepaskan file-file di sini' : 'Drag & drop file Excel / CSV'}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-quaternary)' }}>
              atau klik untuk pilih satu atau banyak file
            </p>
            <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
              Mendukung: .xlsx, .xls, .csv (bisa pilih banyak)
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && parseFiles(Array.from(e.target.files))}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* File info */}
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-ios flex items-center justify-center" style={{ background: 'rgba(0,122,255,0.1)' }}>
                <FileText size={20} style={{ color: 'var(--color-blue)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {files.length === 1 
                    ? files[0].name 
                    : `${files.length} file dipilih (${files.map(f => f.name).join(', ')})`}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                  {rows.length} baris data digabungkan & ditemukan
                </p>
              </div>
              <button className="btn btn-ghost btn-icon flex-shrink-0" onClick={handleReset}>
                <X size={16} />
              </button>
            </div>

            {/* Column Mapper */}
            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
                Mapping Kolom
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => (
                  <div key={field} className="form-group">
                    <label className="form-label">{FIELD_LABELS[field]}</label>
                    <select
                      className="input select"
                      value={mapping[field]}
                      onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                    >
                      <option value="">-- Pilih kolom --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            {rows.length > 0 && mapping.title && (
              <div className="card p-5">
                <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                  Preview Data (5 Baris Pertama)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        {Object.values(mapping).filter(Boolean).map((h) => (
                          <th key={h} className="text-left py-2 px-2 font-semibold" style={{ color: 'var(--text-quaternary)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                          {Object.values(mapping).filter(Boolean).map((col) => (
                            <td key={col} className="py-2 px-2 truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>
                              {row[col] ?? '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import options */}
            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Opsi Import</h3>
              <div className="flex flex-col gap-2">
                {[
                  { val: 'merge',   label: 'Merge (Lewati duplikat)', desc: 'Konten yang sudah ada tidak akan ditimpa' },
                  { val: 'replace', label: 'Replace (Timpa duplikat)', desc: 'Konten duplikat akan ditimpa dengan data baru' },
                ].map(({ val, label, desc }) => (
                  <label
                    key={val}
                    className="flex items-center gap-3 p-3 rounded-ios cursor-pointer transition-colors"
                    style={{ background: mergeMode === val ? 'rgba(0,122,255,0.06)' : 'var(--bg-secondary)' }}
                  >
                    <input
                      type="radio"
                      name="mergeMode"
                      value={val}
                      checked={mergeMode === val}
                      onChange={() => setMerge(val as 'merge' | 'replace')}
                      className="accent-[#007AFF]"
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <button
                className="btn btn-primary w-full mt-4"
                onClick={handleImport}
                disabled={!mapping.title}
              >
                <Upload size={16} />
                Import {rows.filter((r) => r[mapping.title]?.trim()).length} Konten
              </button>
            </div>

            {/* Result */}
            {result && (
              <div className="card p-5 animate-scale-in" style={{ borderColor: 'var(--color-green)', borderWidth: 1.5 }}>
                <div className="flex items-center gap-3">
                  <CheckCircle size={24} style={{ color: 'var(--color-green)' }} />
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Import selesai!</p>
                    <p className="text-sm" style={{ color: 'var(--text-quaternary)' }}>
                      {result.imported} konten berhasil · {result.skipped} duplikat dilewati
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Guide */}
        <div className="card p-5 mt-5" style={{ background: 'rgba(0,122,255,0.04)', borderColor: 'rgba(0,122,255,0.15)' }}>
          <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--color-blue)' }}>Panduan Format File</h3>
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Buat kolom di Excel/Sheet dengan nama berikut untuk auto-mapping:</p>
          <div className="flex flex-wrap gap-2">
            {['Judul', 'Kategori', 'Status', 'Tanggal', 'Platform', 'Catatan'].map((col) => (
              <span key={col} className="badge text-xs" style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--color-blue)' }}>{col}</span>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-quaternary)' }}>
            Status valid: {CONTENT_STATUSES.join(', ')}
          </p>
        </div>
      </div>
    </div>
  );
}
