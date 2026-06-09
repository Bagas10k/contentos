# Rencana Perubahan ContentOS — Sprint 2

## Perubahan yang Akan Dilakukan

### 1. Dashboard (Revamp)
- Donut chart **distribusi status konten** (Idea/Scripting/.../Published)
- **Platform pills** breakdown: berapa konten per platform
- Grafik growth tetap ada tapi lebih compact
- Hapus kebingungan input — arahkan ke Content Planner

### 2. Content Planner (HALAMAN BARU)
- Layout 2 kolom: Form input (kiri) + List planned content (kanan)
- Form step-by-step dengan label deskriptif
- Hanya tampil konten yang BELUM publish (Idea → Ready to Post)
- Bisa update status langsung dari list

### 3. Analytics (Revamp besar)
- **Tab 1: "Performa Publish"** — growth chart, views, likes (published only)
- **Tab 2: "Pipeline Overview"** — status breakdown, velocity planning
- Filter platform di atas (All / TikTok / Instagram / dll)
- Chart terfilter sesuai platform yang dipilih

### 4. Sidebar
- Tambah route: `/planner` (Content Planner)
- Ikon berbeda dari Content Bank

### 5. App.tsx
- Tambah route `/planner`
