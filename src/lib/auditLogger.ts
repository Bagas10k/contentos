// src/lib/auditLogger.ts

/**
 * Merekam jejak aktivitas pengguna ke Audit Trail backend.
 * Fungsi ini berjalan secara asinkron (fire-and-forget) agar tidak memblokir UI pengguna.
 * 
 * @param action Tindakan yang dilakukan (misal: "Menambah Konten", "Menghapus Konten", "Menggeser Kanban")
 * @param targetName Nama objek yang terpengaruh (misal: Judul konten, nama workspace, username)
 * @param details Keterangan opsional tambahan (misal: status awal -> status akhir)
 */
export async function logActivity(action: string, targetName: string, details?: string, restoreData?: any): Promise<void> {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Menjalankan fetch secara asinkron tanpa menunggu responnya di thread utama
    fetch('/api/activity-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action,
        targetName,
        details: details || '',
        restoreData: restoreData ? JSON.stringify(restoreData) : null
      })
    }).catch(err => {
      console.warn('[Audit Log] Gagal mengirim log aktivitas ke server:', err);
    });
  } catch (error) {
    console.warn('[Audit Log] Error saat memicu log aktivitas:', error);
  }
}
