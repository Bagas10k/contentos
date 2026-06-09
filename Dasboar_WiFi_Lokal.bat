@echo off
title Konten Dasboar (Satu Klik WiFi Lokal)
echo ==============================================================
echo Menjalankan ContentOS - Creator Workspace (Wi-Fi Lokal)
echo ==============================================================
echo.

:: 1. Deteksi otomatis direktori proyek
set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

if not exist "%PROJECT_DIR%\package.json" (
    if exist "C:\laragon\www\konten dasboar\package.json" (
        set "PROJECT_DIR=C:\laragon\www\konten dasboar"
    ) else (
        echo [ERROR] Folder proyek tidak ditemukan!
        echo Pastikan file batch ini berada di dalam folder proyek.
        pause
        exit /b
    )
)

cd /d "%PROJECT_DIR%"
echo [INFO] Folder Proyek: %PROJECT_DIR%

:: 2. Cek dependensi frontend
if not exist "node_modules" (
    echo [INFO] Menginstall dependensi frontend...
    call npm install
)

:: 3. Cek dependensi backend
if not exist "server\node_modules" (
    echo [INFO] Menginstall dependensi backend...
    cd /d "server"
    call npm install
    cd /d "%PROJECT_DIR%"
)

:: 4. Cek build folder (dist)
if not exist "dist" (
    echo [INFO] Folder 'dist' tidak ditemukan. Membangun berkas produksi...
    call npm run build
)

:: 5. Cek Aturan Firewall
netsh advfirewall firewall show rule name="ContentOS Backend API" >nul 2>&1
if %errorlevel% neq 0 (
    echo [FIREWALL] Aturan firewall untuk port 3001 belum dikonfigurasi.
    echo [FIREWALL] Menjalankan konfigurasi firewall otomatis...
    echo [FIREWALL] Harap izinkan UAC [Run as Administrator] jika muncul...
    echo.
    powershell -Command "Start-Process cmd -ArgumentList '/c cd /d \"%PROJECT_DIR%\" && Konfigurasi_Firewall_Lokal.bat nopause' -Verb RunAs -Wait"
    echo [FIREWALL] Konfigurasi selesai!
    echo.
)

:: 6. Cetak IP Address yang bisa diakses di WiFi Lokal (Port 3001)
echo.
node -e "const os = require('os'); const interfaces = os.networkInterfaces(); console.log('\x1b[36m%s\x1b[0m', '---------------------------------------------------------'); console.log('   LINK UNTUK DIAKSES DI HP/LAPTOP LAIN (Satu WiFi):'); for (const name in interfaces) { for (const alias of interfaces[name]) { if ((alias.family === 'IPv4' || alias.family === 4) && alias.address !== '127.0.0.1' && !alias.internal) { console.log('   -> http://' + alias.address + ':3001'); } } } console.log('\x1b[36m%s\x1b[0m', '---------------------------------------------------------');"

echo [TIPS JARINGAN]
echo 1. Pastikan HP/Laptop terhubung ke Wi-Fi yang sama dengan laptop ini.
echo 2. Gunakan link di atas untuk akses dari perangkat lain.
echo.

:: 7. Buka browser lokal ke Port 3001
echo [INFO] Membuka browser ke http://localhost:3001...
start "" "http://localhost:3001"

:: 8. Jalankan server Express di foreground
echo [INFO] Menjalankan server ContentOS...
echo Tekan [Ctrl + C] atau tutup jendela ini untuk mematikan server.
echo.
cd /d "%PROJECT_DIR%\server"
node server.js
