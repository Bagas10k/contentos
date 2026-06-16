# ContentOS · Creator Workspace 🚀

ContentOS adalah platform Creator Workspace modern berbasis Web App untuk mengelola ide konten, jadwal penerbitan (editorial calendar), papan kerja (Kanban Board), tugas, serta berbagi berkas secara lokal (Local Share) tanpa memotong kuota internet.

Dokumentasi ini ditujukan bagi pengguna baru untuk melakukan pengaturan (setup) awal dari nol hingga aplikasi dapat berjalan secara lokal maupun diakses oleh perangkat lain dalam satu jaringan Wi-Fi/LAN.

---

## 🛠️ Persyaratan Sistem (Prerequisites)

Sebelum memulai, pastikan komputer Anda telah memiliki aplikasi berikut:
1. **Node.js** (Sangat disarankan versi LTS terbaru, minimal v18 ke atas)  
   👉 [Unduh Node.js di sini](https://nodejs.org/)
2. **Web Browser** modern seperti Google Chrome, Microsoft Edge, Safari, atau Firefox.
3. **Koneksi Jaringan** (Router Wi-Fi atau port LAN aktif) jika ingin menggunakan fitur berbagi berkas antar-perangkat.

---

## ⚡ Cara Cepat: Setup Otomatis (Hanya untuk Windows)

Kami telah menyediakan file batch otomatis agar Anda dapat menjalankan aplikasi dengan satu klik saja.

1. **Unduh kode proyek** ini ke komputer Anda dan ekstrak file ZIP jika diunduh dalam bentuk arsip.
2. **Hubungkan komputer ke Wi-Fi / Router**.
3. Cari file bernama `Dasboar_WiFi_Lokal.bat` di dalam folder proyek.
4. **Klik dua kali (Double-click)** pada file `Dasboar_WiFi_Lokal.bat`.
5. Script batch akan otomatis melakukan:
   * Mengunduh/menginstal seluruh dependensi frontend dan backend (`npm install`).
   * Melakukan build produksi aplikasi.
   * Menambahkan aturan Firewall Windows secara otomatis agar perangkat lain dapat mengakses server (memerlukan izin Administrator jika jendela konfirmasi UAC muncul).
   * Membuka browser default secara otomatis ke alamat `http://localhost:3001`.
   * Menampilkan daftar link IP Address lokal (contoh: `http://192.168.1.15:3001`) yang dapat dibuka oleh perangkat lain (HP Android/iPhone/Laptop lain) yang berada dalam satu jaringan Wi-Fi yang sama.

---

## 🔧 Cara Manual (Semua Sistem Operasi: Windows, macOS, Linux)

Jika Anda menggunakan macOS/Linux, atau ingin mengonfigurasi secara manual lewat terminal/command prompt:

### Langkah 1: Instalasi Dependensi Frontend & Build
1. Buka Terminal atau Command Prompt di folder utama proyek.
2. Jalankan perintah untuk menginstal dependensi:
   ```bash
   npm install
   ```
3. Bangun berkas web produksi siap pakai:
   ```bash
   npm run build
   ```

### Langkah 2: Instalasi Dependensi Backend
1. Masuk ke dalam direktori server:
   ```bash
   cd server
   ```
2. Jalankan perintah untuk menginstal dependensi server:
   ```bash
   npm install
   ```

### Langkah 3: Menjalankan Aplikasi
1. Di dalam direktori `server`, jalankan server backend:
   ```bash
   node server.js
   ```
2. Server akan aktif di port **3001**.
3. Buka browser Anda dan akses:
   * **Akses Lokal (di komputer server):** [http://localhost:3001](http://localhost:3001)
   * **Akses Jaringan (dari HP/perangkat lain):** `http://<IP-KOMPUTER-ANDA>:3001` (Gunakan perintah `ipconfig` di Windows atau `ifconfig` di Mac/Linux untuk mengetahui alamat IP komputer Anda).

---

## 📱 Petunjuk Penggunaan Fitur Berbagi Lokal (Local Share)

Untuk mengirim/menerima file antar HP dan PC tanpa memotong kuota internet:
1. Hubungkan HP dan PC ke **Wi-Fi yang sama**.
2. Buka browser di HP Anda dan ketikkan alamat IP lokal server (contoh: `http://192.168.1.15:3001`).
3. Buka menu **Local Share** di bar samping aplikasi.
4. **Tips Android:** Jika Android memunculkan notifikasi *"Jaringan Wi-Fi tidak memiliki internet"*, tekan notifikasi tersebut dan pilih **"Tetap Terhubung"**. 
5. Matikan **Data Seluler** di HP Anda untuk memastikan transfer data 100% gratis melewati Wi-Fi lokal, lalu mulailah berbagi file dengan drag/drop berkas di aplikasi.

---

## 🔒 Informasi Kredensial Login Bawaan
Saat aplikasi pertama kali dijalankan, silakan gunakan akun berikut untuk masuk:
* **Username:** `admin`
* **Password:** `admin`

*(Anda dapat mengubah password atau menambahkan akun baru setelah masuk melalui menu Pengaturan/Settings di pojok kiri bawah).*
