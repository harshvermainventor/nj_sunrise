import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { ApartmentInfo, CrmBackupPayload, VisitorProfile } from '../types/crm';
import { createBackupPayload, parseAndValidateBackup } from './crmLogic';

const DEFAULT_NATIVE_DIR = 'ApartmentVisitorCRM';
const DEFAULT_NATIVE_FILENAME = 'apartment-visitor-crm-data.json';
const LS_NATIVE_PATH_KEY = 'avcrm_native_sync_path';
const LS_LAST_SYNC_AT_KEY = 'avcrm_last_auto_sync_at';

const HANDLE_DB_NAME = 'avcrm_file_handles_db';
const HANDLE_STORE = 'handles';
const HANDLE_KEY = 'auto_sync_file';

export interface FileSystemFileHandleLike {
  name: string;
  queryPermission?: (opts: { mode: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission?: (opts: { mode: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
  getFile?: () => Promise<File>;
}

export interface DeviceSyncStatus {
  isNativeAndroid: boolean;
  supportsBrowserFileHandle: boolean;
  targetLabel: string | null;
  lastSyncedAt: string | null;
  needsPermissionPrompt: boolean;
  lastError: string | null;
}

export function isNativeAndroidApp(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

export function supportsBrowserAutoSyncFile(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as { showSaveFilePicker?: unknown };
  return typeof win.showSaveFilePicker === 'function';
}

function getNativeRelativePath(): string {
  if (typeof window === 'undefined') {
    return `${DEFAULT_NATIVE_DIR}/${DEFAULT_NATIVE_FILENAME}`;
  }
  try {
    return (
      window.localStorage.getItem(LS_NATIVE_PATH_KEY) ||
      `${DEFAULT_NATIVE_DIR}/${DEFAULT_NATIVE_FILENAME}`
    );
  } catch {
    return `${DEFAULT_NATIVE_DIR}/${DEFAULT_NATIVE_FILENAME}`;
  }
}

function setNativeRelativePath(relPath: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_NATIVE_PATH_KEY, relPath);
  } catch {
    // ignore
  }
}

export function getLastAutoSyncAt(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LS_LAST_SYNC_AT_KEY);
  } catch {
    return null;
  }
}

function recordAutoSyncAt(iso = new Date().toISOString()): string {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LS_LAST_SYNC_AT_KEY, iso);
    } catch {
      // ignore
    }
  }
  return iso;
}

function openHandleDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(HANDLE_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(HANDLE_STORE)) {
          db.createObjectStore(HANDLE_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function getSavedBrowserFileHandle(): Promise<FileSystemFileHandleLike | null> {
  const db = await openHandleDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(HANDLE_STORE, 'readonly');
      const req = tx.objectStore(HANDLE_STORE).get(HANDLE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve((req.result as FileSystemFileHandleLike) ?? null);
      };
      tx.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

async function saveBrowserFileHandle(handle: FileSystemFileHandleLike | null): Promise<void> {
  const db = await openHandleDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(HANDLE_STORE, 'readwrite');
      const store = tx.objectStore(HANDLE_STORE);
      if (handle) {
        store.put(handle, HANDLE_KEY);
      } else {
        store.delete(HANDLE_KEY);
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      resolve();
    }
  });
}

export async function linkBrowserAutoSyncFile(
  apartment: ApartmentInfo,
  visitors: VisitorProfile[]
): Promise<{ ok: boolean; fileName?: string; error?: string }> {
  const win = window as unknown as {
    showSaveFilePicker?: (opts: unknown) => Promise<FileSystemFileHandleLike>;
  };
  if (typeof win.showSaveFilePicker !== 'function') {
    return {
      ok: false,
      error: 'Direct folder auto-sync is not supported by this browser. Use Save to Drive / Folder instead.',
    };
  }
  try {
    const handle = await win.showSaveFilePicker({
      suggestedName: DEFAULT_NATIVE_FILENAME,
      types: [
        {
          description: 'Apartment Visitor CRM Backup (JSON)',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });
    const payload = createBackupPayload(apartment, visitors);
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
    await saveBrowserFileHandle(handle);
    recordAutoSyncAt();
    return { ok: true, fileName: handle.name };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not link local backup file.',
    };
  }
}

export async function unlinkBrowserAutoSyncFile(): Promise<void> {
  await saveBrowserFileHandle(null);
}

export async function reconnectBrowserAutoSyncFile(
  apartment: ApartmentInfo,
  visitors: VisitorProfile[]
): Promise<{ ok: boolean; fileName?: string; error?: string }> {
  const handle = await getSavedBrowserFileHandle();
  if (!handle) {
    return linkBrowserAutoSyncFile(apartment, visitors);
  }
  try {
    if (handle.requestPermission) {
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        return { ok: false, error: 'Write permission was not granted for the linked file.' };
      }
    }
    const payload = createBackupPayload(apartment, visitors);
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
    recordAutoSyncAt();
    return { ok: true, fileName: handle.name };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not write to linked file.',
    };
  }
}

async function writeNativeDocumentsBackup(payload: CrmBackupPayload): Promise<{
  ok: boolean;
  path?: string;
  error?: string;
}> {
  const jsonText = JSON.stringify(payload, null, 2);
  let targetPath = getNativeRelativePath();

  try {
    const perm = await Filesystem.checkPermissions();
    if (perm.publicStorage !== 'granted') {
      await Filesystem.requestPermissions();
    }
  } catch {
    // Scoped storage on Android 11+ may not require legacy permission
  }

  try {
    await Filesystem.writeFile({
      path: targetPath,
      data: jsonText,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    recordAutoSyncAt();
    return { ok: true, path: `Documents/${targetPath}` };
  } catch {
    // On Android 11+ after uninstall+reinstall, an older uninstalled APK may own the original filename.
    // Create a new active sync filename in Documents/ApartmentVisitorCRM/ so live updates never fail
    // and the old backup file remains untouched.
    const fallbackPath = `${DEFAULT_NATIVE_DIR}/apartment-visitor-crm-live.json`;
    try {
      await Filesystem.writeFile({
        path: fallbackPath,
        data: jsonText,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      setNativeRelativePath(fallbackPath);
      recordAutoSyncAt();
      return { ok: true, path: `Documents/${fallbackPath}` };
    } catch (err2) {
      return {
        ok: false,
        error: err2 instanceof Error ? err2.message : 'Could not write to Phone Documents folder.',
      };
    }
  }
}

export async function tryAutoRestoreFromNativeDocuments(): Promise<CrmBackupPayload | null> {
  if (!isNativeAndroidApp()) return null;

  const candidates = [
    getNativeRelativePath(),
    `${DEFAULT_NATIVE_DIR}/apartment-visitor-crm-live.json`,
    `${DEFAULT_NATIVE_DIR}/${DEFAULT_NATIVE_FILENAME}`,
  ];

  for (const relPath of Array.from(new Set(candidates))) {
    try {
      const res = await Filesystem.readFile({
        path: relPath,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      if (typeof res.data === 'string' && res.data.trim()) {
        const parsed = parseAndValidateBackup(res.data);
        setNativeRelativePath(relPath);
        return parsed;
      }
    } catch {
      // File may not exist yet or belong to a prior uninstalled UID under Scoped Storage
    }
  }
  return null;
}

export async function syncDataToDeviceFile(
  apartment: ApartmentInfo,
  visitors: VisitorProfile[]
): Promise<{ synced: boolean; targetLabel?: string; needsPermissionPrompt?: boolean; error?: string }> {
  const payload = createBackupPayload(apartment, visitors);

  if (isNativeAndroidApp()) {
    const res = await writeNativeDocumentsBackup(payload);
    return {
      synced: res.ok,
      targetLabel: res.path,
      error: res.error,
    };
  }

  const handle = await getSavedBrowserFileHandle();
  if (!handle) {
    return { synced: false };
  }

  try {
    if (handle.queryPermission) {
      const state = await handle.queryPermission({ mode: 'readwrite' });
      if (state !== 'granted') {
        return {
          synced: false,
          targetLabel: handle.name,
          needsPermissionPrompt: true,
        };
      }
    }
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
    recordAutoSyncAt();
    return { synced: true, targetLabel: handle.name };
  } catch (err) {
    return {
      synced: false,
      targetLabel: handle.name,
      error: err instanceof Error ? err.message : 'Failed to update linked local file.',
    };
  }
}

export async function getDeviceSyncStatus(): Promise<DeviceSyncStatus> {
  const native = isNativeAndroidApp();
  const supportsBrowser = supportsBrowserAutoSyncFile();
  const lastSyncedAt = getLastAutoSyncAt();

  if (native) {
    return {
      isNativeAndroid: true,
      supportsBrowserFileHandle: false,
      targetLabel: `Documents/${getNativeRelativePath()}`,
      lastSyncedAt,
      needsPermissionPrompt: false,
      lastError: null,
    };
  }

  const handle = await getSavedBrowserFileHandle();
  let needsPermissionPrompt = false;
  if (handle?.queryPermission) {
    try {
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      needsPermissionPrompt = perm !== 'granted';
    } catch {
      needsPermissionPrompt = true;
    }
  }

  return {
    isNativeAndroid: false,
    supportsBrowserFileHandle: supportsBrowser,
    targetLabel: handle ? handle.name : null,
    lastSyncedAt,
    needsPermissionPrompt,
    lastError: null,
  };
}
