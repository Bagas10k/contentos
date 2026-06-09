// src/lib/storage.ts
import type { AppState } from '../types';

export const saveState = (state: AppState): void => {
  const token = localStorage.getItem('token');
  fetch('/api/state', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(state),
  }).catch((e) => {
    console.error('Failed to save state to server:', e);
  });
};

export const loadState = (): AppState | null => {
  // Return null initially so the store starts with default seedData.
  // The actual state will be loaded asynchronously via loadStateFromServer() in App.tsx.
  return null;
};

export const exportBackup = async (): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/state', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      }
    });
    if (!res.ok) throw new Error('Gagal mengambil data dari server');
    const state = await res.json();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `contentos-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to export backup:', e);
  }
};

export const importBackup = (file: File): Promise<AppState> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const state = JSON.parse(e.target?.result as string) as AppState;
        resolve(state);
      } catch {
        reject(new Error('File backup tidak valid'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsText(file);
  });
};



