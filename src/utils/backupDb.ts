import {
  Mistake,
  ImportantNote,
  InorganicAssignment,
  ExamTemplate,
  TestAttempt,
  SyllabusChapter,
  BackupSnapshot,
} from '../types';
import { generateSafeId } from './security';

const DB_NAME = 'jee_prep_ledger_backups_db';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const MAX_SNAPSHOTS = 10;
const FALLBACK_LS_KEY = 'jee-auto-backups-fallback-v1';

function openBackupDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function saveAutoBackupSnapshot(
  data: {
    mistakes: Mistake[];
    notes: ImportantNote[];
    assignments: InorganicAssignment[];
    testTemplates: ExamTemplate[];
    testAttempts: TestAttempt[];
    syllabus: SyllabusChapter[];
  },
  label = 'Auto-Backup'
): Promise<BackupSnapshot | null> {
  const itemCount =
    data.mistakes.length +
    data.notes.length +
    data.assignments.length +
    data.testTemplates.length +
    data.testAttempts.length +
    data.syllabus.length;

  const snapshot: BackupSnapshot = {
    id: generateSafeId('snap'),
    timestamp: Date.now(),
    label,
    itemCount,
    payload: {
      version: '6.1',
      exportDate: new Date().toISOString(),
      ...data,
    },
  };

  try {
    const db = await openBackupDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(snapshot);

      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const all = (getAllReq.result as BackupSnapshot[]).sort(
          (a, b) => b.timestamp - a.timestamp
        );
        if (all.length > MAX_SNAPSHOTS) {
          all.slice(MAX_SNAPSHOTS).forEach(old => store.delete(old.id));
        }
      };

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
    return snapshot;
  } catch {
    // Fallback to localStorage if IndexedDB is restricted
    try {
      const existingRaw = localStorage.getItem(FALLBACK_LS_KEY);
      const existing: BackupSnapshot[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [snapshot, ...existing].slice(0, 3);
      localStorage.setItem(FALLBACK_LS_KEY, JSON.stringify(updated));
      return snapshot;
    } catch {
      return null;
    }
  }
}

export async function listBackupSnapshots(): Promise<BackupSnapshot[]> {
  try {
    const db = await openBackupDB();
    return await new Promise<BackupSnapshot[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        db.close();
        const list = (req.result as BackupSnapshot[]) || [];
        resolve(list.sort((a, b) => b.timestamp - a.timestamp));
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    try {
      const raw = localStorage.getItem(FALLBACK_LS_KEY);
      return raw ? (JSON.parse(raw) as BackupSnapshot[]) : [];
    } catch {
      return [];
    }
  }
}

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Prevent CSV formula injection (=, +, -, @ at start of cell)
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsvContent(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows.map(r => r.map(escapeCsvCell).join(','));
  return [headerLine, ...dataLines].join('\r\n');
}

export function triggerFileDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
