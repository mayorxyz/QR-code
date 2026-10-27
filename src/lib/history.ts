export interface HistoryEntry {
  id: string; // SHA-256 hash
  url: string;
  displayUrl: string;
  platform: string;
  createdAt: number;
  style: StyleSettings;
  type?: string; // Payload type ID (url, text, email, etc.)
  fieldValues?: Record<string, string | boolean>; // Field values for restoration
}

export interface StyleSettings {
  foreground: string;
  background: string;
  dotStyle: 'square' | 'rounded' | 'dots';
  cornerStyle: 'square' | 'rounded' | 'dot';
  logo: string | null; // data URL
  size: number;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
}

export const DEFAULT_STYLE: StyleSettings = {
  foreground: '#000000',
  background: '#FFFFFF',
  dotStyle: 'rounded',
  cornerStyle: 'rounded',
  logo: null,
  size: 1024,
  errorCorrection: 'M',
};

const HISTORY_KEY = 'qrlink_history';
const MAX_ENTRIES = 50;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage full or unavailable - silently fail
  }
}

export function addEntry(entry: HistoryEntry, existing: HistoryEntry[]): { entries: HistoryEntry[]; duplicate: boolean } {
  const idx = existing.findIndex(e => e.id === entry.id);
  if (idx !== -1) {
    // Move to top
    const filtered = existing.filter(e => e.id !== entry.id);
    return { entries: [entry, ...filtered], duplicate: true };
  }
  // Add to top, FIFO cap
  const newEntries = [entry, ...existing].slice(0, MAX_ENTRIES);
  return { entries: newEntries, duplicate: false };
}

export function removeEntry(id: string, existing: HistoryEntry[]): HistoryEntry[] {
  return existing.filter(e => e.id !== id);
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

export function loadSettings(): StyleSettings {
  try {
    const raw = localStorage.getItem('qrlink_settings');
    if (!raw) return DEFAULT_STYLE;
    return { ...DEFAULT_STYLE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STYLE;
  }
}

export function saveSettings(settings: StyleSettings): void {
  try {
    localStorage.setItem('qrlink_settings', JSON.stringify(settings));
  } catch {
    // ignore
  }
}
