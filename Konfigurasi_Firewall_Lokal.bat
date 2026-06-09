@echo off
title Konfigurasi Firewall Lokal - ContentOS
echo ==============================================================
echo Menambahkan Aturan Firewall untuk Akses Jaringan Lokal (WiFi)
echo ==============================================================
echo.
echo Pastikan Anda menjalankan berkas ini dengan klik kanan -> "Run as Administrator".
echo.

:: Periksa hak akses Administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Hak akses Administrator terdeteksi.
) else (
    echo [ERROR] Harap jalankan file ini sebagai Administrator!
    echo Klik kanan file ini, lalu pilih "Run as Administrator".
    echo.
    pause
    exit /b
)

echo.
echo [INFO] Membuka port 5173 untuk Frontend Vite...
netsh advfirewall firewall delete rule name="ContentOS Vite Dev Server" >nul 2>&1
netsh advfirewall firewall add rule name="ContentOS Vite Dev Server" dir=in action=allow protocol=TCP localport=5173

echo [INFO] Membuka port 3001 untuk Backend Express API...
netsh advfirewall firewall delete rule name="ContentOS Backend API" >nul 2>&1
netsh advfirewall firewall add rule name="ContentOS Backend API" dir=in action=allow protocol=TCP localport=3001

echo.
echo ==============================================================
echo BERHASIL! Port 5173 dan 3001 sekarang terbuka di Wi-Fi Lokal.
echo ==============================================================
echo.
if "%~1" neq "nopause" pause
