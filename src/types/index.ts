// src/types/index.ts

export type Platform = string; // flexible: bisa default atau custom

export const DEFAULT_PLATFORMS = [
  'TikTok', 'Instagram', 'YouTube', 'Twitter/X',
  'LinkedIn', 'Facebook', 'Threads',
] as const;

// Backward compat alias
export const PLATFORMS = [...DEFAULT_PLATFORMS];

export type ContentStatus =
  | 'Idea'
  | 'Scripting'
  | 'Production'
  | 'Editing'
  | 'Ready to Post'
  | 'Published';

export const CONTENT_STATUSES: ContentStatus[] = [
  'Idea',
  'Scripting',
  'Production',
  'Editing',
  'Ready to Post',
  'Published',
];

// ─── Workspace ───────────────────────────────────────────
export interface WorkspacePlatform {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  initialFollowers?: number;
  followerTarget?: number;
  instagramUsername?: string;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  emoji?: string;
  createdAt: string;
}

// ─── Category ────────────────────────────────────────────
export interface Category {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  description?: string;
}

export type ContentFormat = 'Foto' | 'Video';

// ─── Content Item ────────────────────────────────────────
export interface ContentItem {
  id: string;
  workspaceId: string;
  title: string;
  categoryId: string;
  status: ContentStatus;
  format?: ContentFormat;
  scheduleDate?: string;
  platform: Platform;
  notes?: string;
  tags?: string[];
  referenceUrl?: string;
  performance?: ContentPerformance;
  createdAt: string;
  updatedAt: string;
}

export interface ContentViewHistoryEntry {
  date: string;
  views: number;
}

export interface ContentPerformance {
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  reach?: number;
  viewsHistory?: ContentViewHistoryEntry[];
}

// ─── Analytics ───────────────────────────────────────────
export interface AnalyticsSnapshot {
  id: string;
  workspaceId: string;
  platform: string;
  date: string;
  followers: number;
  totalViews: number;
  totalLikes?: number;
  totalComments?: number;
  totalShares?: number;
  totalSaves?: number;
  avgEngagementRate?: number;
}

// ─── Workspace Note ──────────────────────────────────────
export interface WorkspaceNote {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
  isUrgent?: boolean;
}

// ─── App State ───────────────────────────────────────────
export interface AppState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  categories: Category[];
  platforms: WorkspacePlatform[];
  contentItems: ContentItem[];
  analyticsHistory: AnalyticsSnapshot[];
  notes?: WorkspaceNote[];
}

// ─── Excel Import ─────────────────────────────────────────
export interface ExcelColumnMap {
  title: string;
  category?: string;
  status?: string;
  scheduleDate?: string;
  platform?: string;
  notes?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}
