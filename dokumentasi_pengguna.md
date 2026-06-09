# Dokumentasi Lengkap Pengguna & Panduan SEO Sistem ContentOS

Selamat datang di **ContentOS**, sistem operasi manajemen konten terlengkap yang dirancang khusus untuk Content Creator, Social Media Specialist, Agency, dan Brand Owner. Sistem ini membantu Anda merencanakan, memproduksi, menganalisis, dan mengoptimalkan performa konten media sosial Anda di dalam satu dasbor yang dinamis, modern, dan sangat responsif.

Dokumen ini menyajikan panduan pengguna komprehensif, penjelasan teknis fitur, integrasi sistem, hingga panduan optimasi SEO pengguna untuk memaksimalkan kehadiran digital Anda.

---

## 📑 Daftar Isi
1. [🌟 Pendahuluan & Filosofi Sistem](#-pendahuluan--filosofi-sistem)
2. [🔍 Panduan SEO Pengguna & Optimasi Kehadiran Digital](#-panduan-seo-pengguna--optimasi-kehadiran-digital)
3. [⚙️ Arsitektur Teknis & Aliran Data](#-arsitektur-teknis--aliran-data)
4. [🧭 Panduan Fitur Lengkap Per Halaman](#-panduan-fitur-lengkap-per-halaman)
   - [Dashboard](#1-dashboard)
   - [Content Planner](#2-content-planner)
   - [Content Bank](#3-content-bank)
   - [Kanban Board](#4-kanban-board)
   - [Editorial Calendar](#5-editorial-calendar)
   - [Analytics & Auto-Sync](#6-analytics--auto-sync)
   - [Settings & Administrator Panel](#7-settings--administrator-panel)
5. [🔄 Fitur Cross-Cutting (Lintas Sistem)](#-fitur-cross-cutting-lintas-sistem)
6. [📘 Panduan Operasional Langkah demi Langkah](#-panduan-operasional-langkah-demi-langkah)
7. [❓ FAQ & Troubleshooting](#-faq--troubleshooting)

---

## 🌟 Pendahuluan & Filosofi Sistem

ContentOS dibangun dengan filosofi **"Workflow over Chaos"** (Alur kerja di atas kekacauan). Mengelola banyak media sosial untuk berbagai merek (brand) sering kali menimbulkan kebingungan karena data yang tersebar di mana-mana. ContentOS memecahkan masalah ini dengan menyediakan struktur data berbasis **Workspace** yang terisolasi namun mudah dialihkan.

### Misi Utama ContentOS:
* **Sentralisasi Ide**: Menampung semua ide mentah sebelum masuk ke tahap produksi.
* **Strukturisasi Pilar**: Memastikan distribusi konten seimbang sesuai kategori pilar konten (Content Pillars).
* **Kolaborasi Tanpa Batas**: Mengintegrasikan sistem otorisasi multi-user dan kemudahan berbagi akses di jaringan lokal (LAN) secara instan.
* **Keputusan Berbasis Data**: Melacak statistik pertumbuhan pengikut dan performa konten secara historis untuk mengevaluasi strategi pemasaran.

---

## 🔍 Panduan SEO Pengguna & Optimasi Kehadiran Digital

Meskipun media sosial (seperti TikTok dan Instagram) berbeda dengan mesin pencari tradisional (seperti Google), saat ini terjadi pergeseran besar di mana pengguna mencari informasi langsung di kolom pencarian sosmed. Strategi ini disebut **Social SEO**. ContentOS dirancang untuk mendukung optimasi SEO pengguna melalui fitur-fiturnya:

### 1. Penerapan Pilar Konten (Content Pillars) untuk Otoritas Topik
Mesin pencari dan algoritma media sosial sangat menyukai akun yang memiliki fokus topik yang jelas (*Topical Authority*). 
* **Optimasi**: Di menu **Settings**, buatlah 3-5 Kategori Pilar Konten yang spesifik untuk brand Anda. Misalnya: *Edukasi*, *Behind The Scene*, *Tips & Trik*, dan *Review Produk*. 
* **Manfaat**: Konsistensi memposting konten berdasarkan pilar ini akan memberi sinyal kepada algoritma bahwa akun Anda adalah pakar di bidang tersebut, yang meningkatkan peringkat pencarian profil Anda baik di Google maupun di dalam pencarian sosmed.

### 2. Riset Kata Kunci pada Field "Notes" di Content Planner
Sebelum memproduksi konten, Anda harus melakukan riset kata kunci (keyword) yang sering dicari audiens.
* **Optimasi**: Gunakan area **Notes (Catatan)** pada form pembuatan konten untuk menuliskan daftar kata kunci utama, hashtag relevan, dan struktur kalimat pancingan (hook) yang ramah SEO.
* **Penerapan**: Saat memindahkan konten ke tahap produksi, pastikan kata kunci tersebut diucapkan dalam 3 detik pertama video (untuk SEO audio TikTok/YouTube) dan ditulis di baris pertama caption postingan Anda.

### 3. Pelacakan Tautan Balik (Backlink) & Reference URL
ContentOS menyediakan kolom **Link Konten Upload (Reference URL)** pada setiap item konten.
* **Optimasi**: Setelah konten Anda dipublikasikan di internet, segera salin tautan postingan tersebut ke kolom Reference URL di ContentOS.
* **Manfaat**: Ini membantu tim Anda melacak di mana saja konten disebarkan, memudahkan audit tautan, dan memastikan Anda dapat mengarahkan lalu lintas (traffic) antar-platform secara silang (cross-linking) guna memperkuat SEO eksternal website utama Anda.

### 4. Evaluasi Rasio Keterikatan (Engagement Rate) di Analytics
Keterlibatan audiens (likes, comments, shares, saves) adalah indikator kualitas utama bagi algoritma pencarian.
* **Optimasi**: Analisis konten berkinerja tinggi di halaman **Content Bank** dan **Analytics**.
* **Penerapan**: Identifikasi pilar konten mana yang menghasilkan rasio simpan (*saves*) tertinggi. Konten yang sering disimpan audiens memiliki nilai SEO yang sangat tinggi karena dianggap bermanfaat secara jangka panjang oleh algoritma platform.

---

## ⚙️ Arsitektur Teknis & Aliran Data

ContentOS mengadopsi arsitektur modern yang ringan, cepat, dan aman:

```mermaid
graph TD
    Client[React Frontend + Vite] -- HTTP Request / JWT -- Backend[Express Server]
    Backend -- Query SQL -- DB[(SQLite Database)]
    Client -- PWA Install -- OS[Windows / Android / iOS]
    Backend -- Child Process -- Python[Scraper analyze_instagram.py]
    Python -- Fetch Public Web -- Instagram[Instagram Server]
```

### 1. Frontend (Klien)
* **React & TypeScript**: Memastikan pengetikan kode yang aman dan rendering UI yang cepat.
* **Zustand (State Management)**: Mengelola seluruh status aplikasi (workspaces, content, platforms, users) secara global dengan sinkronisasi otomatis ke backend.
* **dnd-kit**: Pustaka drag-and-drop berkinerja tinggi dengan dukungan *TouchSensor* khusus untuk perangkat seluler.
* **Recharts**: Merender bagan analitik interaktif yang responsif terhadap perubahan ukuran layar.
* **FullCalendar**: Komponen kalender editorial berskala industri untuk performa render jadwal bulanan yang mulus.

### 2. Backend (Server)
* **Node.js & Express**: Server API yang menangani autentikasi, manajemen data, backup, dan integrasi scraper.
* **SQLite (`database.db`)**: Database relasional lokal yang tangguh, cepat, dan sangat mudah dipindahkan/dibackup.
* **JWT (JSON Web Token)**: Autentikasi sesi pengguna dengan masa kedaluwarsa 30 menit demi keamanan data.
* **Bcrypt.js**: Mengenkripsi password pengguna dengan algoritma *hashing* satu arah berstandar industri.

### 3. Integrasi Python (Scraper)
* Modul `analyze_instagram.py` berjalan sebagai proses mandiri (child process) di server untuk mengambil jumlah pengikut terbaru Instagram secara langsung tanpa membutuhkan API Key resmi (bebas biaya).

---

## 🧭 Panduan Fitur Lengkap Per Halaman

Berikut adalah penjelasan detail mengenai setiap halaman menu yang tersedia di ContentOS:

### 1. Dashboard
Halaman utama yang menyajikan ringkasan eksekutif dari workspace aktif Anda.

```
+------------------------------------------------------------+
|  Halo, Admin! 🚀 Bisnis Utama                              |
+------------------------------------------------------------+
|  Total Konten   Published      Scheduled     Total Views   |
|     [ 124 ]      [ 86 ]         [ 38 ]        [ 1.2M ]     |
+------------------------------------------------------------+
|  [ Grafik Pertumbuhan Followers ]   [ Distribusi Platform ]|
|  - Tren naik/turun per platform      - Instagram: 45%      |
|  - Target vs Realisasi               - TikTok: 55%         |
+------------------------------------------------------------+
```

* **Statistik Utama (Stat Cards)**: Menampilkan total konten keseluruhan, jumlah konten yang sudah terbit (*Published*), konten dalam jadwal (*Scheduled*), dan akumulasi tayangan (*Total Views*) di seluruh media sosial pada workspace terpilih.
* **Grafik Area Pertumbuhan Pengikut (Followers Growth Chart)**: Menampilkan tren kenaikan pengikut dari hari ke hari berdasarkan data historis yang dicatat. Sangat berguna untuk melihat platform mana yang tumbuh paling cepat.
* **Grafik Batang Distribusi Platform (Content Distribution Chart)**: Visualisasi jumlah konten yang diproduksi untuk masing-masing platform (TikTok, Instagram, YouTube, dll.). Menjaga konsistensi kehadiran Anda di setiap saluran.
* **Platform Breakdown**: Kartu detail untuk masing-masing platform yang menampilkan jumlah pengikut saat ini, persentase pencapaian target, dan indikator warna yang selaras dengan identitas brand platform tersebut.

---

### 2. Content Planner
Halaman pusat ide dan perencanaan awal konten.

* **Form Pembuatan Konten**:
  * **Judul (Title)**: Judul atau topik konten (Wajib diisi).
  * **Pilar Konten (Category)**: Pilihan kategori pilar konten yang telah diatur di Settings.
  * **Platform Tujuan**: Media sosial target (TikTok, Instagram, YouTube, dll.).
  * **Status Awal**: Menentukan posisi kartu di alur kerja (Default: *Idea*).
  * **Jadwal Posting**: Tanggal rencana konten akan diunggah.
  * **Format Konten**: Pilihan antara **Foto** (carousel/single image) atau **Video** (durasi pendek/panjang).
  * **Catatan Tambahan (Notes)**: Deskripsi singkat, naskah script, atau riset kata kunci SEO.
  * **Link Konten Upload (Reference URL)**: Tautan langsung ke file cloud (Google Drive/Dropbox) atau tautan postingan setelah terbit.
* **Daftar Konten Terencana (Planned Items List)**: Terletak di panel kanan, menampilkan daftar seluruh konten yang sedang dalam proses perencanaan beserta statusnya saat ini. Dilengkapi dengan filter cepat berdasarkan status untuk mempermudah pencarian.

---

### 3. Content Bank
Perpustakaan digital tempat menyimpan semua aset konten yang telah direncanakan atau diterbitkan.

* **Toggle Tampilan (Layout Switcher)**: Pengguna dapat beralih antara tampilan **Grid (Kartu)** yang visual dan estetik, atau tampilan **Table (Tabel)** yang padat informasi dan mudah dipindai dengan cepat.
* **Pencarian & Penyaringan Tingkat Lanjut**:
  * Kotak pencarian teks berdasarkan judul konten.
  * Filter multi-opsi berdasarkan Platform, Status, dan Pilar Konten.
* **Performance Card (Metrik Kinerja)**: Pada konten berstatus *Published*, kartu akan menampilkan indikator kinerja real:
  * 👁️ Jumlah Tayangan (Views)
  * ❤️ Jumlah Suka (Likes)
  * 💬 Jumlah Komentar (Comments)
  * 🔄 Jumlah Bagikan (Shares)
  * 💾 Jumlah Simpan (Saves)
* **Tautan Langsung ("Lihat Post")**: Jika kolom *Reference URL* terisi, kartu akan memunculkan tombol eksternal berwarna biru yang mengarahkan pengguna langsung ke halaman postingan di media sosial terkait.

---

### 4. Kanban Board
Manajer alur kerja visual interaktif berbasis metode Agile/Kanban.

* **Kolom Status Alur Kerja**:
  1. **Idea**: Kolam ide mentah, konsep kasar, atau usulan topik.
  2. **Scripting**: Tahap penulisan naskah, riset materi, atau pembuatan storyboard.
  3. **Production**: Proses syuting video, pengambilan foto, atau pembuatan desain grafis.
  4. **Editing**: Proses pasca-produksi (cutting, grading, penambahan audio/teks).
  5. **Ready to Post**: Konten telah selesai diproduksi dan siap diunggah sesuai jadwal.
  6. **Published**: Konten telah berhasil diunggah dan aktif di media sosial target.
* **Drag-and-Drop Teroptimasi**: Memindahkan kartu antar-kolom secara mulus menggunakan mouse pada desktop, atau sentuhan jari (*touch gesture*) pada layar ponsel berkat integrasi deteksi area kustom.
* **Proteksi Validasi Rilis (Release Gatekeeper)**:
  * > [!WARNING]
    > Jika Anda mencoba menggeser kartu ke kolom **Published** namun tanggal jadwal posting di kartu tersebut diatur pada masa mendatang (besok atau seterusnya), sistem akan otomatis memblokir tindakan tersebut dan memunculkan notifikasi peringatan. Konten tidak boleh ditandai terbit sebelum tanggal posting tiba!
  * Jika tanggal posting sudah hari ini atau masa lalu, sistem akan memunculkan dialog konfirmasi sebelum resmi menandainya sebagai *Published*.
  * Jika kartu tidak memiliki tanggal jadwal posting, saat digeser ke kolom *Published*, sistem akan otomatis mengisi tanggal posting tersebut dengan tanggal hari ini.

---

### 5. Editorial Calendar
Representasi visual jadwal penerbitan dalam format kalender bulanan.

* **Split Layout (Tata Letak Terpisah)**:
  * **Sisi Kiri**: Kalender bulanan interaktif (FullCalendar) yang tetap diam (*fixed*) di tempatnya.
  * **Sisi Kanan**: Panel gulir (*scrollable*) daftar jadwal posting mendatang (*Upcoming Schedule*) yang diurutkan kronologis berdasarkan tanggal terdekat.
* **Filter Sosial Media**: Tombol filter cepat di atas kalender untuk menyaring dan melihat jadwal posting khusus platform tertentu saja (misal: hanya melihat jadwal Instagram).
* **Visual Badge**: Setiap entri kalender menampilkan label format konten (Foto/Video) dengan ikon yang berbeda, serta pilar konten lengkap dengan warna latar belakang yang sesuai untuk memudahkan pemindaian visual.

---

### 6. Analytics & Auto-Sync
Pusat evaluasi data kinerja media sosial dan workspace Anda.

* **Tab Navigasi**:
  * **Published Content**: Menganalisis konten yang sudah terbit berdasarkan total views, likes, comments, shares, dan saves.
  * **Planning Insights**: Memberikan proyeksi beban kerja berdasarkan jumlah konten yang ada di setiap tahap alur kerja.
* **Pusat Grafik Analitik**:
  * Tren pertumbuhan pengikut dari waktu ke waktu per platform.
  * Distribusi performa tayangan (views) per platform.
* **Manajer Riwayat Snapshot (Manual Snapshot Manager)**: Memungkinkan pengguna memasukkan data pengikut (*followers*), jumlah tayangan (*views*), dan rata-rata tingkat keterlibatan (*engagement rate*) secara berkala untuk tanggal tertentu guna membentuk kurva pertumbuhan yang akurat.
* **Instagram Auto-Sync Scraper**:
  * > [!TIP]
    > Jika platform Instagram Anda dikonfigurasi dengan username di menu Settings, ContentOS akan otomatis menjalankan skrip Python di latar belakang untuk memperbarui jumlah pengikut secara berkala tanpa memerlukan intervensi manual.
  * **Sistem Proteksi Rate Limit**: Untuk menghindari pemblokiran IP oleh server Instagram, proses sinkronisasi otomatis dibatasi ketat hanya **1 kali per username per hari**. Jika dicoba berulang kali, sistem akan mengembalikan kode respons `429 Rate Limited` secara aman.

---

### 7. Settings & Administrator Panel
Pusat konfigurasi aplikasi yang sangat komprehensif.

```
+-------------------------------------------------------------------------+
| [ Workspace ]  [ Kategori/Pilar ]  [ Platform ]  [ Tampilan ]  [ Admin ]|
+-------------------------------------------------------------------------+
|                                                                         |
|  * Kelola nama brand, emoji, dan warna tema aksen                       |
|  * Buat pilar konten custom dengan label warna                          |
|  * Aktifkan platform sosial media dan target followers                  |
|  * Ekspor/Impor data backup (JSON/CSV)                                  |
|  * Atur Tema (Gelap/Terang/Sistem) & Font (Inter/Roboto/Outfit/System)  |
|  * Manajemen Pengguna (Tambah/Hapus anggota tim - Admin Only)            |
|                                                                         |
+-------------------------------------------------------------------------+
```

* **Tab Workspace**: Kelola identitas brand yang Anda kelola. Tambahkan nama workspace, pilih emoji representatif, dan tentukan warna aksen khas. Workspace yang Anda buat di sini akan memengaruhi warna tema UI saat workspace tersebut aktif.
* **Tab Content Pillars (Kategori)**: Buat, edit, atau hapus kategori pilar konten. Berikan warna khusus pada masing-masing pilar untuk mempermudah identifikasi warna pada kalender dan Kanban.
* **Tab Target Platforms**: Tentukan media sosial apa saja yang aktif pada workspace ini. Masukkan jumlah pengikut awal (*initial followers*), target pengikut (*follower target*), dan username Instagram untuk fitur *auto-sync*.
* **Tab Tampilan Web (Appearance Customization)**:
  * **Tema (Theme)**: Terang (*Light*), Gelap (*Dark*), atau Otomatis (*System*) mengikuti pengaturan perangkat.
  * **Kepadatan UI (Density)**: *Cozy* (longgar dan lega), *Standard* (sedang), atau *Compact* (padat, cocok untuk memantau banyak data sekaligus).
  * **Jenis Huruf (Font)**: Pilihan antara *Inter*, *System Default*, *Outfit*, atau *Roboto*.
  * **Gaya Sidebar**: *Standard* (lebar dengan teks menu) atau *Icon-only* (ringkas hanya menampilkan ikon).
* **Tab Impor Data**: Fitur canggih untuk mengimpor konten secara massal dari file Excel atau CSV. Menyediakan fitur pemetaan kolom (*column mapping*) interaktif dan opsi penggabungan data (lewati jika duplikat atau timpa data lama).
* **Tab Backup & Pemulihan Data (Backup & Restore)**:
  * Unduh salinan database SQLite secara manual.
  * Unggah file cadangan untuk memulihkan seluruh data sistem secara instan.
  * Opsi reset total data ke pengaturan awal pabrik (*Reset to Seed Data*).
* **Aplikasi PWA (Progressive Web App)**: Tombol dan instruksi instan untuk menginstal ContentOS sebagai aplikasi mandiri di desktop atau layar beranda ponsel Anda, lengkap dengan kemampuan berjalan tanpa browser (*standalone mode*).
* **Tab Manajemen Pengguna (Khusus Akun Admin)**:
  * Mendaftarkan pengguna baru dengan memasukkan username dan password.
  * Mengatur peran pengguna: **Admin** (akses penuh ke seluruh fitur dan pengaturan) atau **User** (akses operasional tanpa menu manajemen user dan backup).
  * Menghapus anggota tim secara aman. Sistem memiliki proteksi bawaan untuk mencegah penghapusan akun administrator terakhir agar sistem tidak terkunci.

---

## 🔄 Fitur Cross-Cutting (Lintas Sistem)

ContentOS dilengkapi dengan berbagai fitur global terintegrasi yang bekerja di balik layar:

### 1. Keamanan & Manajemen Sesi JWT
* Setiap kali pengguna login, backend menghasilkan token JWT yang disimpan aman di `localStorage` peramban.
* Token ini memiliki masa aktif 30 menit. Jika kedaluwarsa, permintaan API berikutnya akan ditolak dengan kode status `401/403`.
* > [!NOTE]
  > Berbeda dengan aplikasi web tradisional yang langsung memuat ulang halaman (*force reload*) saat sesi habis, ContentOS mendeteksi kedaluwarsa token secara elegan lewat event sistem dan mengembalikan pengguna ke halaman login dengan transisi yang halus tanpa merusak data yang sedang diketik.

### 2. Sinkronisasi Latar Belakang Senyap (Silent Auto-Refetch)
* Untuk mendukung kolaborasi tim, aplikasi akan melakukan penyegaran data senyap (*soft refetch*) setiap **15 detik**.
* **Optimasi Efisiensi**: Proses sinkronisasi ini hanya berjalan jika tab peramban dalam keadaan aktif/terbuka (*visible*). Jika pengguna meminimalkan peramban atau membuka tab lain, sinkronisasi otomatis akan dijeda untuk menghemat baterai perangkat dan beban kerja server.

### 3. Sistem Pengumuman Urgent (Urgent Announcement Popup)
* Administrator dapat membuat catatan atau pengumuman yang ditandai sebagai **Urgent (Penting)**.
* Saat pengguna dengan peran *User* masuk ke sistem, pengumuman urgent terbaru akan muncul sebagai jendela popup modal dengan efek blur latar belakang yang tebal.
* **Proteksi Countdown**: Pengguna wajib membaca pengumuman tersebut dan tidak bisa menutupnya sebelum penghitung waktu mundur selama **5 detik** selesai. Hal ini memastikan pesan penting dari admin benar-benar dibaca oleh seluruh anggota tim. Status "Sudah Dibaca" disimpan secara unik berdasarkan username masing-masing di perangkat.

### 4. Pusat Notifikasi & Panduan (Notes Drawer)
* Klik pada tombol ikon lonceng di bar navigasi atas untuk membuka drawer geser kanan.
* Drawer ini menampung log riwayat pembaruan sistem (*Changelog*) serta dokumen panduan praktis penggunaan workspace aktif saat ini.

### 5. Berbagi Jaringan Lokal (Local Network QR Share)
* Ingin membuka dasbor di tablet atau ponsel saat bekerja di meja? Klik tombol **Bagikan (Share)** pada bar navigasi atas.
* Sistem akan memindai alamat IP lokal komputer server Anda dan menampilkan QR Code instan serta tautan IP lokal (misalnya: `http://192.168.1.10:5173`).
* Cukup pindai QR Code tersebut dengan ponsel Anda yang terhubung di jaringan Wi-Fi yang sama untuk langsung mengakses ContentOS tanpa konfigurasi rumit.

### 6. Judul Tab Browser Dinamis (Dynamic Tab Title)
* Judul tab peramban Anda akan secara otomatis diperbarui secara real-time berdasarkan halaman aktif dan nama workspace saat ini (misalnya: `Dashboard · Bisnis Utama · ContentOS` atau `Kanban Board · Personal Brand · ContentOS`).
* **Manfaat SEO & UX**: Menjaga kejelasan navigasi saat tim membuka banyak tab browser secara bersamaan, sekaligus menyelaraskan arsitektur web dasbor dengan standar SEO peramban modern.

---

## 📘 Panduan Operasional Langkah demi Langkah

### Alur Kerja Produksi Konten yang Benar:
```
[ Planner ] Membuat Ide Baru ──> [ Kanban ] Geser ke Script & Edit ──> [ Calendar ] Verifikasi Jadwal ──> [ Kanban ] Publikasikan Konten
```

1. **Langkah 1: Menulis Ide Baru**
   Buka halaman **Content Planner**, isi judul ide Anda (misal: "Tips SEO TikTok 2026"), pilih pilar konten yang sesuai, lalu klik **Tambah Konten**.
2. **Langkah 2: Proses Pra-Produksi**
   Buka **Kanban Board**. Saat Anda mulai menulis naskah, geser kartu dari kolom **Idea** ke **Scripting**. Lanjutkan menggeser ke **Production** saat syuting, dan ke **Editing** saat proses editing video berlangsung.
3. **Langkah 3: Menentukan Jadwal & File**
   Klik pada kartu di papan Kanban untuk membuka jendela detail konten. Masukkan tanggal rencana posting (misal: tanggal 15 bulan ini) dan masukkan tautan folder Google Drive berisi video matang Anda pada kolom *Reference URL*. Geser kartu ke kolom **Ready to Post**.
4. **Langkah 4: Publikasi Konten**
   Buka **Editorial Calendar** untuk memeriksa apakah ada jadwal yang bertabrakan pada hari tersebut. Jika aman, pada hari-H, unggah video ke akun media sosial Anda. Setelah berhasil diunggah, kembali ke Kanban Board dan geser kartu ke kolom **Published**. Sistem akan meminta konfirmasi final sebelum mengubah status kartu.
5. **Langkah 5: Evaluasi Hasil**
   Setelah konten tayang selama 3-7 hari, buka **Content Bank**. Klik ikon edit pada kartu konten tersebut, masukkan metrik kinerja (jumlah tayangan, likes, saves) yang tertera di analitik aplikasi media sosial asli Anda untuk melihat performa relatif konten tersebut.

---

## ❓ FAQ & Troubleshooting

### Q: Mengapa layar blank putih di laptop/desktop saya?
* **Penyebab**: Sebelumnya ada kendala pembacaan konfigurasi tema dan orientasi perangkat di file store yang menyebabkan kegagalan rendering pada mode desktop layar lebar.
* **Solusi**: Masalah ini telah **diperbaiki sepenuhnya** dalam pembaruan kode terbaru. Sistem kini secara otomatis mendeteksi ukuran layar dan mengoptimalkan rendering UI desktop maupun seluler tanpa kendala blank screen.

### Q: Mengapa proses sinkronisasi otomatis Instagram gagal?
* **Penyebab 1**: Anda sudah melakukan sinkronisasi otomatis untuk akun tersebut hari ini. Server memproteksi aktivitas dengan batas 1x per hari guna mencegah pemblokiran dari Instagram.
* **Penyebab 2**: Modul Python atau pustaka pendukung belum terpasang dengan benar di komputer server.
* **Solusi**: Pastikan Python terdaftar di sistem Environment Path komputer server, dan jalankan perintah install library yang diperlukan di folder server. Tunggu hingga hari esok untuk melakukan sinkronisasi ulang secara otomatis.

### Q: Apakah data saya aman jika saya menutup aplikasi?
* **Jawab**: Ya. Seluruh data Anda disimpan secara persisten di database SQLite (`database.db`) yang berada di folder server. Setiap kali Anda melakukan perubahan, data langsung diamankan ke database tersebut. Selain itu, sistem membuat cadangan data otomatis (*auto-backup*) secara berkala setiap kali Anda menyimpan state data baru.

---

*Dokumentasi ini disusun sebagai panduan resmi sistem ContentOS. Silakan ikuti instruksi pembaruan lebih lanjut dari administrator Anda jika terdapat penambahan fitur baru.*
