// src/lib/notifications.ts

// Set of shown notification tags during the current app session to avoid spamming
const shownNotificationTags = new Set<string>();

/**
 * Meminta izin akses notifikasi dari browser perangkat.
 */
export function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('[Notification] Izin notifikasi browser diberikan.');
        showNativeNotification(
          'Notifikasi Aktif',
          'Anda akan menerima pemberitahuan tentang tugas, tenggat waktu, dan pengumuman di sini.'
        );
      }
    });
  }
}

/**
 * Menampilkan notifikasi browser lokal/sistem (atau service worker untuk PWA di HP).
 * 
 * @param title Judul notifikasi
 * @param body Keterangan isi notifikasi
 * @param tag ID unik opsional untuk mencegah notifikasi yang sama muncul berulang kali
 */
export function showNativeNotification(title: string, body: string, tag?: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Cek jika notifikasi dengan tag ini sudah pernah ditampilkan dalam sesi ini
  if (tag) {
    if (shownNotificationTags.has(tag)) {
      return; // Jangan tampilkan ulang
    }
    shownNotificationTags.add(tag);
  }

  try {
    const options: NotificationOptions = {
      body: body,
      icon: '/app-icon.png',
      badge: '/favicon.svg',
      tag: tag,
    };
    
    // Coba tampilkan lewat Notification API normal
    new Notification(title, options);
  } catch (e) {
    console.warn('[Notification] Gagal memicu notifikasi visual langsung, mencoba fallback Service Worker:', e);
    
    // Fallback khusus untuk perangkat mobile (Android/PWA) yang membatasi API Notification window secara langsung
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body: body,
          icon: '/app-icon.png',
          badge: '/favicon.svg',
          tag: tag,
        });
      });
    }
  }
}
