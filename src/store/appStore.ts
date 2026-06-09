// src/store/appStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  AppState,
  Workspace,
  Category,
  ContentItem,
  AnalyticsSnapshot,
  ContentStatus,
  WorkspaceNote,
} from '../types';
import { saveState } from '../lib/storage';
import { generateId } from '../lib/utils';

// ─── Default Notes ───────────────────────────────────────
const defaultNotes: WorkspaceNote[] = [
  {
    id: 'changelog-w1',
    workspaceId: 'w1',
    title: 'Riwayat Pembaruan & Fitur Baru (Changelog)',
    content: `Berikut adalah ringkasan pembaruan dan perbaikan sistem yang telah dilakukan sejauh ini:

1. Kanban Board & Alur Kerja
   - Memperbaiki bug seret & letak (drag-and-drop) ke kolom status yang kosong dengan algoritma deteksi kustom (pointerWithin).
   - Menambahkan filter platform dan kategori konten di bagian atas Kanban.
   - Proteksi rilis: Memblokir pemindahan status ke "Published" jika tanggal posting belum tiba (di masa mendatang) dan menampilkan peringatan.
   - Menambahkan pop-up konfirmasi sebelum konten di-publish jika tanggalnya sudah tiba.

2. Pelacakan Pengikut (Follower) per Platform
   - Reorganisasi pengikut awal, target pengikut, dan riwayat pertumbuhan secara mandiri per platform sosial media (tidak lagi digabung per workspace).
   - Menghitung pertumbuhan views dan follower harian secara real day-by-day dengan carry-over logic untuk mengantisipasi data kosong.

3. Peningkatan Kalender Editorial
   - Menampilkan label Pilar Konten (Kategori) dan Format Konten (Foto/Video) agar mudah dibaca di kalender.
   - Menambahkan filter media sosial di halaman kalender.

4. Antarmuka & Dialog Kustom
   - Membuat ConfirmModal kustom bergaya iOS (tombol ganda/tunggal) untuk menggantikan konfirmasi bawaan browser.
   - Memperbaiki bug input nama workspace yang kehilangan fokus saat mengetik di Pengaturan.
   - Mengonversi tombol lonceng menjadi pusat "Catatan & Panduan" yang Anda buka saat ini.`,
    createdAt: new Date().toISOString(),
    isRead: false,
  },
  {
    id: 'guide-w1',
    workspaceId: 'w1',
    title: 'Panduan Fitur ContentOS',
    content: `Selamat datang di ContentOS! Berikut adalah panduan singkat fitur utama kami:

1. Manajemen Workspace
   Kelola beberapa brand sekaligus! Switch workspace melalui pilihan di pojok kanan atas.

2. Monitor Pertumbuhan
   Dapatkan data pertumbuhan views dan follower harian secara real di Dashboard & Analytics. Update data Anda secara cepat di halaman Analytics.

3. Kanban Pipeline
   Kelola alur kerja konten dari Ide, Scripting, hingga Published secara visual dengan drag-and-drop.
   * Catatan: Konten tidak dapat di-publish jika tanggal jadwal posting di masa mendatang.

4. Kalender Editorial & Konten Bank
   Atur jadwal posting bulanan Anda dengan mudah. Halaman Kalender mendukung filter per sosial media dan label format (Foto/Video) & pilar konten.`,
    createdAt: new Date().toISOString(),
    isRead: false,
  },
  {
    id: 'changelog-w2',
    workspaceId: 'w2',
    title: 'Riwayat Pembaruan & Fitur Baru (Changelog)',
    content: `Berikut adalah ringkasan pembaruan dan perbaikan sistem yang telah dilakukan sejauh ini:

1. Kanban Board & Alur Kerja
   - Memperbaiki bug seret & letak (drag-and-drop) ke kolom status yang kosong dengan algoritma deteksi kustom (pointerWithin).
   - Menambahkan filter platform dan kategori konten di bagian atas Kanban.
   - Proteksi rilis: Memblokir pemindahan status ke "Published" jika tanggal posting belum tiba (di masa mendatang) dan menampilkan peringatan.
   - Menambahkan pop-up konfirmasi sebelum konten di-publish jika tanggalnya sudah tiba.

2. Pelacakan Pengikut (Follower) per Platform
   - Reorganisasi pengikut awal, target pengikut, dan riwayat pertumbuhan secara mandiri per platform sosial media (tidak lagi digabung per workspace).
   - Menghitung pertumbuhan views dan follower harian secara real day-by-day dengan carry-over logic untuk mengantisipasi data kosong.

3. Peningkatan Kalender Editorial
   - Menampilkan label Pilar Konten (Kategori) dan Format Konten (Foto/Video) agar mudah dibaca di kalender.
   - Menambahkan filter media sosial di halaman kalender.

4. Antarmuka & Dialog Kustom
   - Membuat ConfirmModal kustom bergaya iOS (tombol ganda/tunggal) untuk menggantikan konfirmasi bawaan browser.
   - Memperbaiki bug input nama workspace yang kehilangan fokus saat mengetik di Pengaturan.
   - Mengonversi tombol lonceng menjadi pusat "Catatan & Panduan" yang Anda buka saat ini.`,
    createdAt: new Date().toISOString(),
    isRead: false,
  },
  {
    id: 'guide-w2',
    workspaceId: 'w2',
    title: 'Panduan Fitur ContentOS',
    content: `Selamat datang di ContentOS! Berikut adalah panduan singkat fitur utama kami:

1. Manajemen Workspace
   Kelola beberapa brand sekaligus! Switch workspace melalui pilihan di pojok kanan atas.

2. Monitor Pertumbuhan
   Dapatkan data pertumbuhan views dan follower harian secara real di Dashboard & Analytics. Update data Anda secara cepat di halaman Analytics.

3. Kanban Pipeline
   Kelola alur kerja konten dari Ide, Scripting, hingga Published secara visual dengan drag-and-drop.
   * Catatan: Konten tidak dapat di-publish jika tanggal jadwal posting di masa mendatang.

4. Kalender Editorial & Konten Bank
   Atur jadwal posting bulanan Anda dengan mudah. Halaman Kalender mendukung filter per sosial media dan label format (Foto/Video) & pilar konten.`,
    createdAt: new Date().toISOString(),
    isRead: false,
  }
];

// ─── Seed Data ───────────────────────────────────────────
const seedData: AppState = {
  activeWorkspaceId: 'w1',
  workspaces: [
    {
      id: 'w1',
      name: 'Bisnis Utama',
      color: '#007AFF',
      emoji: '',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'w2',
      name: 'Personal Brand',
      color: '#E1306C',
      emoji: '',
      createdAt: '2026-02-01T00:00:00Z',
    },
  ],
  categories: [
    { id: 'cat1', workspaceId: 'w1', name: 'Edukasi Tech', color: '#007AFF' },
    { id: 'cat2', workspaceId: 'w1', name: 'Behind The Scene', color: '#FF9500' },
    { id: 'cat3', workspaceId: 'w1', name: 'Tips & Tricks', color: '#34C759' },
    { id: 'cat4', workspaceId: 'w1', name: 'Product Review', color: '#AF52DE' },
    { id: 'cat5', workspaceId: 'w1', name: 'Story Time', color: '#FF2D55' },
    { id: 'cat6', workspaceId: 'w2', name: 'Lifestyle', color: '#E1306C' },
    { id: 'cat7', workspaceId: 'w2', name: 'OOTD', color: '#FF6B6B' },
    { id: 'cat8', workspaceId: 'w2', name: 'Travel', color: '#5856D6' },
  ],
  contentItems: [
    {
      id: 'item1', workspaceId: 'w1', title: 'Cara Coding Pake AI untuk Pemula',
      categoryId: 'cat1', status: 'Published', scheduleDate: '2026-06-01',
      platform: 'TikTok', notes: 'Referensi audio tren TikTok',
      performance: { 
        views: 45000, likes: 3200, comments: 185, shares: 420,
        viewsHistory: [
          { date: '2026-06-01', views: 5000 },
          { date: '2026-06-02', views: 12000 },
          { date: '2026-06-03', views: 20000 },
          { date: '2026-06-04', views: 28000 },
          { date: '2026-06-05', views: 35000 },
          { date: '2026-06-06', views: 41000 },
          { date: '2026-06-07', views: 45000 }
        ]
      },
      createdAt: '2026-05-25T10:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
    },
    {
      id: 'item2', workspaceId: 'w1', title: 'Review MacBook Pro M3 Pro Setelah 3 Bulan',
      categoryId: 'cat4', status: 'Ready to Post', scheduleDate: '2026-06-07',
      platform: 'TikTok', notes: 'Edit dulu intro-nya',
      createdAt: '2026-06-01T10:00:00Z', updatedAt: '2026-06-03T00:00:00Z',
    },
    {
      id: 'item3', workspaceId: 'w1', title: 'Rutinitas Pagi Sebelum Kerja',
      categoryId: 'cat2', status: 'Editing', scheduleDate: '2026-06-10',
      platform: 'TikTok',
      createdAt: '2026-06-02T10:00:00Z', updatedAt: '2026-06-04T00:00:00Z',
    },
    {
      id: 'item4', workspaceId: 'w1', title: '5 Tool AI yang Bikin Kerja 10x Lebih Cepat',
      categoryId: 'cat3', status: 'Scripting', scheduleDate: '2026-06-14',
      platform: 'TikTok', notes: 'Riset tools terbaru dulu',
      createdAt: '2026-06-03T10:00:00Z', updatedAt: '2026-06-05T00:00:00Z',
    },
    {
      id: 'item5', workspaceId: 'w1', title: 'Cerita Gagal Startup Pertamaku',
      categoryId: 'cat5', status: 'Idea', platform: 'TikTok',
      createdAt: '2026-06-04T10:00:00Z', updatedAt: '2026-06-04T00:00:00Z',
    },
    {
      id: 'item6', workspaceId: 'w1', title: 'Behind The Scene Pembuatan Video Viral',
      categoryId: 'cat2', status: 'Production', scheduleDate: '2026-06-18',
      platform: 'TikTok',
      createdAt: '2026-06-05T10:00:00Z', updatedAt: '2026-06-05T00:00:00Z',
    },
    {
      id: 'item7', workspaceId: 'w1', title: 'Cara Dapet Client Pertama sebagai Freelancer',
      categoryId: 'cat3', status: 'Published', scheduleDate: '2026-05-20',
      platform: 'TikTok',
      performance: { 
        views: 28000, likes: 1900, comments: 97, shares: 210,
        viewsHistory: [
          { date: '2026-05-20', views: 3000 },
          { date: '2026-05-22', views: 9000 },
          { date: '2026-05-24', views: 15000 },
          { date: '2026-05-26', views: 21000 },
          { date: '2026-05-28', views: 25000 },
          { date: '2026-05-30', views: 28000 }
        ]
      },
      createdAt: '2026-05-15T10:00:00Z', updatedAt: '2026-05-20T00:00:00Z',
    },
    {
      id: 'item8', workspaceId: 'w2', title: 'Morning Skincare Routine 2026',
      categoryId: 'cat6', status: 'Published', scheduleDate: '2026-06-02',
      platform: 'Instagram',
      performance: { 
        views: 12000, likes: 980, comments: 64, saves: 340,
        viewsHistory: [
          { date: '2026-06-02', views: 2000 },
          { date: '2026-06-04', views: 5000 },
          { date: '2026-06-06', views: 8000 },
          { date: '2026-06-08', views: 10500 },
          { date: '2026-06-10', views: 12000 }
        ]
      },
      createdAt: '2026-05-28T10:00:00Z', updatedAt: '2026-06-02T00:00:00Z',
    },
    {
      id: 'item9', workspaceId: 'w2', title: 'OOTD Summer Vibes',
      categoryId: 'cat7', status: 'Ready to Post', scheduleDate: '2026-06-08',
      platform: 'Instagram',
      createdAt: '2026-06-04T10:00:00Z', updatedAt: '2026-06-05T00:00:00Z',
    },
  ],
  analyticsHistory: [
    // Workspace 1 - TikTok
    { id: 'a1', workspaceId: 'w1', platform: 'TikTok', date: '2026-01-01', followers: 1500, totalViews: 25000, avgEngagementRate: 4.2 },
    { id: 'a2', workspaceId: 'w1', platform: 'TikTok', date: '2026-02-01', followers: 2000, totalViews: 37000, avgEngagementRate: 4.8 },
    { id: 'a3', workspaceId: 'w1', platform: 'TikTok', date: '2026-03-01', followers: 2800, totalViews: 52000, avgEngagementRate: 5.1 },
    { id: 'a4', workspaceId: 'w1', platform: 'TikTok', date: '2026-04-01', followers: 3900, totalViews: 78000, avgEngagementRate: 5.6 },
    { id: 'a5', workspaceId: 'w1', platform: 'TikTok', date: '2026-05-01', followers: 4900, totalViews: 110000, avgEngagementRate: 6.0 },
    { id: 'a6', workspaceId: 'w1', platform: 'TikTok', date: '2026-06-01', followers: 5800, totalViews: 145000, avgEngagementRate: 6.4 },

    // Workspace 1 - Instagram
    { id: 'ai1', workspaceId: 'w1', platform: 'Instagram', date: '2026-01-01', followers: 800, totalViews: 20000, avgEngagementRate: 4.0 },
    { id: 'ai2', workspaceId: 'w1', platform: 'Instagram', date: '2026-02-01', followers: 1100, totalViews: 30000, avgEngagementRate: 4.5 },
    { id: 'ai3', workspaceId: 'w1', platform: 'Instagram', date: '2026-03-01', followers: 1400, totalViews: 46000, avgEngagementRate: 5.0 },
    { id: 'ai4', workspaceId: 'w1', platform: 'Instagram', date: '2026-04-01', followers: 1900, totalViews: 64000, avgEngagementRate: 5.5 },
    { id: 'ai5', workspaceId: 'w1', platform: 'Instagram', date: '2026-05-01', followers: 2300, totalViews: 79000, avgEngagementRate: 5.9 },
    { id: 'ai6', workspaceId: 'w1', platform: 'Instagram', date: '2026-06-01', followers: 3100, totalViews: 89000, avgEngagementRate: 6.2 },

    // Workspace 2 - Instagram
    { id: 'b1', workspaceId: 'w2', platform: 'Instagram', date: '2026-01-01', followers: 700, totalViews: 10000, avgEngagementRate: 5.2 },
    { id: 'b2', workspaceId: 'w2', platform: 'Instagram', date: '2026-02-01', followers: 1100, totalViews: 16000, avgEngagementRate: 5.8 },
    { id: 'b3', workspaceId: 'w2', platform: 'Instagram', date: '2026-03-01', followers: 1600, totalViews: 24000, avgEngagementRate: 6.1 },
    { id: 'b4', workspaceId: 'w2', platform: 'Instagram', date: '2026-04-01', followers: 2100, totalViews: 33000, avgEngagementRate: 6.5 },
    { id: 'b5', workspaceId: 'w2', platform: 'Instagram', date: '2026-05-01', followers: 2500, totalViews: 41000, avgEngagementRate: 7.0 },
    { id: 'b6', workspaceId: 'w2', platform: 'Instagram', date: '2026-06-01', followers: 2900, totalViews: 49000, avgEngagementRate: 7.3 },

    // Workspace 2 - TikTok
    { id: 'bi1', workspaceId: 'w2', platform: 'TikTok', date: '2026-01-01', followers: 500, totalViews: 8000, avgEngagementRate: 5.0 },
    { id: 'bi2', workspaceId: 'w2', platform: 'TikTok', date: '2026-02-01', followers: 700, totalViews: 11000, avgEngagementRate: 5.4 },
    { id: 'bi3', workspaceId: 'w2', platform: 'TikTok', date: '2026-03-01', followers: 1000, totalViews: 15000, avgEngagementRate: 6.0 },
    { id: 'bi4', workspaceId: 'w2', platform: 'TikTok', date: '2026-04-01', followers: 1300, totalViews: 19000, avgEngagementRate: 6.2 },
    { id: 'bi5', workspaceId: 'w2', platform: 'TikTok', date: '2026-05-01', followers: 1600, totalViews: 23000, avgEngagementRate: 6.5 },
    { id: 'bi6', workspaceId: 'w2', platform: 'TikTok', date: '2026-06-01', followers: 1900, totalViews: 29000, avgEngagementRate: 7.0 },
  ],
  platforms: [
    // Workspace 1 (w1)
    { id: 'p1_1', workspaceId: 'w1', name: 'TikTok', color: '#636366', initialFollowers: 1500, followerTarget: 6000 },
    { id: 'p1_2', workspaceId: 'w1', name: 'Instagram', color: '#E1306C', initialFollowers: 800, followerTarget: 4000 },
    { id: 'p1_3', workspaceId: 'w1', name: 'YouTube', color: '#FF0000', initialFollowers: 100, followerTarget: 1000 },
    { id: 'p1_4', workspaceId: 'w1', name: 'Twitter/X', color: '#1DA1F2', initialFollowers: 0, followerTarget: 0 },
    { id: 'p1_5', workspaceId: 'w1', name: 'LinkedIn', color: '#0A66C2', initialFollowers: 0, followerTarget: 0 },
    { id: 'p1_6', workspaceId: 'w1', name: 'Facebook', color: '#1877F2', initialFollowers: 0, followerTarget: 0 },
    { id: 'p1_7', workspaceId: 'w1', name: 'Threads', color: '#636366', initialFollowers: 0, followerTarget: 0 },

    // Workspace 2 (w2)
    { id: 'p2_1', workspaceId: 'w2', name: 'TikTok', color: '#636366', initialFollowers: 500, followerTarget: 2000 },
    { id: 'p2_2', workspaceId: 'w2', name: 'Instagram', color: '#E1306C', initialFollowers: 700, followerTarget: 3000 },
    { id: 'p2_3', workspaceId: 'w2', name: 'YouTube', color: '#FF0000', initialFollowers: 0, followerTarget: 0 },
  ],
  notes: defaultNotes,
};

// ─── Store Interface ──────────────────────────────────────
interface AppStore extends AppState {
  isLoading: boolean;
  loadStateFromServer: () => Promise<void>;

  // Workspace actions
  setActiveWorkspace: (id: string) => void;
  addWorkspace: (ws: Omit<Workspace, 'id' | 'createdAt'>) => void;
  updateWorkspace: (id: string, ws: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;

  // Category actions
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, cat: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Platform actions
  addPlatform: (plat: Omit<import('../types').WorkspacePlatform, 'id'>) => void;
  updatePlatform: (id: string, plat: Partial<import('../types').WorkspacePlatform>) => void;
  deletePlatform: (id: string) => void;

  // Content actions
  addContent: (item: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateContent: (id: string, item: Partial<ContentItem>) => void;
  deleteContent: (id: string) => void;
  moveContentStatus: (id: string, status: ContentStatus) => void;
  bulkImportContent: (items: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>[], merge: boolean) => { imported: number; skipped: number };

  // Analytics actions
  addAnalyticsSnapshot: (snap: Omit<AnalyticsSnapshot, 'id'>) => void;
  updateAnalyticsSnapshot: (id: string, snap: Partial<AnalyticsSnapshot>) => void;
  deleteAnalyticsSnapshot: (id: string) => void;

  // Note actions
  addNote: (note: Omit<WorkspaceNote, 'id' | 'createdAt'>) => void;
  deleteNote: (id: string) => void;
  markNotesAsRead: () => void;
  markNoteAsRead: (id: string) => void;

  // Utility
  restoreBackup: (state: AppState) => void;
  resetAll: () => void;

  // Sidebar toggle state
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Selectors
  activeWorkspace: () => Workspace | undefined;
  activeCategories: () => Category[];
  activePlatforms: () => import('../types').WorkspacePlatform[];
  activeContent: () => ContentItem[];
  activeAnalytics: () => AnalyticsSnapshot[];
  activeNotes: () => WorkspaceNote[];
}

const initialState: AppState = seedData;

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    isLoading: true,
    isSidebarOpen: false,
    setSidebarOpen: (open) => set({ isSidebarOpen: open }),


    // ── Workspace ──
    setActiveWorkspace: (id) => {
      set({ activeWorkspaceId: id });
      saveState(get() as AppState);
    },
    addWorkspace: (ws) => {
      const newId = generateId();
      const newWs: Workspace = { ...ws, id: newId, createdAt: new Date().toISOString() };
      // Copy default platforms for new workspace
      const defaultPlats = [
        { id: generateId(), workspaceId: newId, name: 'TikTok', color: '#636366', initialFollowers: 0, followerTarget: 0 },
        { id: generateId(), workspaceId: newId, name: 'Instagram', color: '#E1306C', initialFollowers: 0, followerTarget: 0 },
        { id: generateId(), workspaceId: newId, name: 'YouTube', color: '#FF0000', initialFollowers: 0, followerTarget: 0 },
        { id: generateId(), workspaceId: newId, name: 'Twitter/X', color: '#1DA1F2', initialFollowers: 0, followerTarget: 0 },
        { id: generateId(), workspaceId: newId, name: 'LinkedIn', color: '#0A66C2', initialFollowers: 0, followerTarget: 0 },
      ];
      set((s) => ({
        workspaces: [...s.workspaces, newWs],
        platforms: [...s.platforms, ...defaultPlats],
      }));
      saveState(get() as AppState);
    },
    updateWorkspace: (id, ws) => {
      set((s) => ({ workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, ...ws } : w)) }));
      saveState(get() as AppState);
    },
    deleteWorkspace: (id) => {
      set((s) => ({
        workspaces: s.workspaces.filter((w) => w.id !== id),
        categories: s.categories.filter((c) => c.workspaceId !== id),
        platforms: s.platforms.filter((p) => p.workspaceId !== id),
        contentItems: s.contentItems.filter((c) => c.workspaceId !== id),
        analyticsHistory: s.analyticsHistory.filter((a) => a.workspaceId !== id),
        notes: (s.notes ?? []).filter((n) => n.workspaceId !== id),
        activeWorkspaceId: s.activeWorkspaceId === id ? (s.workspaces.find((w) => w.id !== id)?.id ?? null) : s.activeWorkspaceId,
      }));
      saveState(get() as AppState);
    },

    // ── Category ──
    addCategory: (cat) => {
      const newCat: Category = { ...cat, id: generateId() };
      set((s) => ({ categories: [...s.categories, newCat] }));
      saveState(get() as AppState);
    },
    updateCategory: (id, cat) => {
      set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...cat } : c)) }));
      saveState(get() as AppState);
    },
    deleteCategory: (id) => {
      set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
      saveState(get() as AppState);
    },

    // ── Platform ──
    addPlatform: (plat) => {
      const newPlat = { ...plat, id: generateId() };
      set((s) => ({ platforms: [...s.platforms, newPlat] }));
      saveState(get() as AppState);
    },
    updatePlatform: (id, plat) => {
      set((s) => ({ platforms: s.platforms.map((p) => (p.id === id ? { ...p, ...plat } : p)) }));
      saveState(get() as AppState);
    },
    deletePlatform: (id) => {
      set((s) => ({ platforms: s.platforms.filter((p) => p.id !== id) }));
      saveState(get() as AppState);
    },

    // ── Content ──
    addContent: (item) => {
      const newItem: ContentItem = {
        ...item,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set((s) => ({ contentItems: [newItem, ...s.contentItems] }));
      saveState(get() as AppState);
    },
    updateContent: (id, item) => {
      set((s) => ({
        contentItems: s.contentItems.map((c) =>
          c.id === id ? { ...c, ...item, updatedAt: new Date().toISOString() } : c
        ),
      }));
      saveState(get() as AppState);
    },
    deleteContent: (id) => {
      set((s) => ({ contentItems: s.contentItems.filter((c) => c.id !== id) }));
      saveState(get() as AppState);
    },
    moveContentStatus: (id, status) => {
      const todayStr = new Date().toLocaleDateString('en-CA');
      set((s) => ({
        contentItems: s.contentItems.map((c) => {
          if (c.id === id) {
            const updated = { ...c, status, updatedAt: new Date().toISOString() };
            if (status === 'Published' && !c.scheduleDate) {
              updated.scheduleDate = todayStr;
            }
            return updated;
          }
          return c;
        }),
      }));
      saveState(get() as AppState);
    },
    bulkImportContent: (items, merge) => {
      const existing = get().contentItems;
      let imported = 0;
      let skipped = 0;
      const toAdd: ContentItem[] = [];

      for (const item of items) {
        const isDupe = existing.some(
          (e) => e.title.toLowerCase() === item.title.toLowerCase() && e.scheduleDate === item.scheduleDate
        );
        if (isDupe && merge) { skipped++; continue; }
        toAdd.push({ ...item, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        imported++;
      }

      if (!merge) {
        set((s) => ({ contentItems: [...s.contentItems.filter((e) => !toAdd.find((t) => t.title === e.title)), ...toAdd] }));
      } else {
        set((s) => ({ contentItems: [...s.contentItems, ...toAdd] }));
      }
      saveState(get() as AppState);
      return { imported, skipped };
    },

    // ── Analytics ──
    addAnalyticsSnapshot: (snap) => {
      const newSnap: AnalyticsSnapshot = { ...snap, id: generateId() };
      set((s) => ({ analyticsHistory: [...s.analyticsHistory, newSnap] }));
      saveState(get() as AppState);
    },
    updateAnalyticsSnapshot: (id, snap) => {
      set((s) => ({ analyticsHistory: s.analyticsHistory.map((a) => (a.id === id ? { ...a, ...snap } : a)) }));
      saveState(get() as AppState);
    },
    deleteAnalyticsSnapshot: (id) => {
      set((s) => ({ analyticsHistory: s.analyticsHistory.filter((a) => a.id !== id) }));
      saveState(get() as AppState);
    },

    // ── Note ──
    addNote: (note) => {
      const newNote: WorkspaceNote = {
        ...note,
        id: generateId(),
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      set((s) => ({ notes: [newNote, ...(s.notes ?? [])] }));
      saveState(get() as AppState);
    },
    deleteNote: (id) => {
      set((s) => ({ notes: (s.notes ?? []).filter((n) => n.id !== id) }));
      saveState(get() as AppState);
    },
    markNotesAsRead: () => {
      const { activeWorkspaceId } = get();
      set((s) => ({
        notes: (s.notes ?? []).map((n) =>
          n.workspaceId === activeWorkspaceId ? { ...n, isRead: true } : n
        ),
      }));
      saveState(get() as AppState);
    },
    markNoteAsRead: (id: string) => {
      set((s) => ({
        notes: (s.notes ?? []).map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
      }));
      saveState(get() as AppState);
    },

    // ── Utility ──
    loadStateFromServer: async () => {
      set({ isLoading: true });

      // Safety timeout: jika server tidak merespons dalam 10 detik, hentikan loading
      const loadingTimeout = setTimeout(() => {
        set({ isLoading: false });
      }, 10000);

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          clearTimeout(loadingTimeout);
          set({ isLoading: false });
          return;
        }
        
        const res = await fetch('/api/state', {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });

        // Token expired/invalid → hapus token dan reset state (bukan reload halaman)
        if (res.status === 401 || res.status === 403) {
          clearTimeout(loadingTimeout);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Dispatch event agar App.tsx menangkap perubahan dan tampilkan login
          window.dispatchEvent(new CustomEvent('contentos-logout'));
          set({ isLoading: false });
          return;
        }

        if (res.ok) {
          const loaded = await res.json();
          clearTimeout(loadingTimeout);
          if (loaded && loaded.workspaces && loaded.workspaces.length > 0) {
            set({
              ...loaded,
              isLoading: false,
            });
            return;
          } else {
            // Save initial seedData to server if server is empty
            saveState(seedData);
          }
        }
      } catch (e) {
        console.error('Gagal mengambil data dari server:', e);
        window.dispatchEvent(new CustomEvent('contentos-offline'));
      }
      clearTimeout(loadingTimeout);
      set({ isLoading: false });
    },
    restoreBackup: (state) => {
      set(state);
      saveState(state);
    },
    resetAll: () => {
      set(seedData);
      saveState(seedData);
    },

    // ── Selectors ──
    activeWorkspace: () => {
      const { workspaces, activeWorkspaceId } = get();
      return workspaces.find((w) => w.id === activeWorkspaceId);
    },
    activeCategories: () => {
      const { categories, activeWorkspaceId } = get();
      return categories.filter((c) => c.workspaceId === activeWorkspaceId);
    },
    activePlatforms: () => {
      const { platforms, activeWorkspaceId } = get();
      return (platforms ?? []).filter((p) => p.workspaceId === activeWorkspaceId);
    },
    activeContent: () => {
      const { contentItems, activeWorkspaceId } = get();
      return contentItems.filter((c) => c.workspaceId === activeWorkspaceId);
    },
    activeAnalytics: () => {
      const { analyticsHistory, activeWorkspaceId } = get();
      return analyticsHistory.filter((a) => a.workspaceId === activeWorkspaceId).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    },
    activeNotes: () => {
      const { notes, activeWorkspaceId } = get();
      return (notes ?? []).filter((n) => n.workspaceId === activeWorkspaceId);
    },
  }))
);

