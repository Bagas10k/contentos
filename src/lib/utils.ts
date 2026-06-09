// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDate(dateStr: string, fmt = 'd MMM yyyy'): string {
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, fmt, { locale: idLocale }) : '-';
  } catch {
    return '-';
  }
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function calculateEngagement(perf: {
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
}): number {
  const interactions = perf.likes + perf.comments + (perf.shares ?? 0) + (perf.saves ?? 0);
  if (perf.views === 0) return 0;
  return parseFloat(((interactions / perf.views) * 100).toFixed(2));
}

export function getPlatformColor(platform: string, customColor?: string): string {
  if (!platform) return customColor || '#007AFF';
  const normalized = platform.trim().toLowerCase();
  
  if (customColor) {
    const clashingColors = ['#000000', '#010101', '#101010', '#1c1c1e', '#111111', '#222222', '#2c2c2e', '#3a3a3c'];
    if (!clashingColors.includes(customColor.toLowerCase())) {
      return customColor;
    }
  }

  const map: Record<string, string> = {
    tiktok:      '#00F2FE', // Cyan (sangat kontras & modern di dark mode)
    instagram:   '#E1306C',
    youtube:     '#FF0000',
    'twitter/x': '#1DA1F2',
    twitter:     '#1DA1F2',
    x:           '#1DA1F2',
    linkedin:    '#0A66C2',
    facebook:    '#1877F2',
    threads:     '#9B9B9B',
  };
  return map[normalized] ?? (customColor || '#007AFF');
}

export function getPlatformEmoji(_platform: string): string {
  return '';
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    'Idea':          '#8E8E93',
    'Scripting':     '#FF9500',
    'Production':    '#007AFF',
    'Editing':       '#AF52DE',
    'Ready to Post': '#34C759',
    'Published':     '#5856D6',
  };
  return map[status] ?? '#8E8E93';
}

export function getStatusBg(status: string): string {
  const map: Record<string, string> = {
    'Idea':          '#F2F2F7',
    'Scripting':     '#FFF5E6',
    'Production':    '#E6F2FF',
    'Editing':       '#F5EAFF',
    'Ready to Post': '#E6FAF0',
    'Published':     '#EEEEFF',
  };
  return map[status] ?? '#F2F2F7';
}
