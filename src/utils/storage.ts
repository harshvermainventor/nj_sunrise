import { ApartmentInfo, VisitorProfile } from '../types/crm';
import { createDefaultApartmentInfo } from './crmLogic';

const DB_NAME = 'apartment_visitor_crm_db';
const DB_VERSION = 1;
const STORE_NAME = 'crm_state';
const CACHE_NAME = 'avcrm-offline-data-v1';
const CACHE_KEY = '/__avcrm_state_backup__.json';
const LS_VISITORS_KEY = 'avcrm_visitors_v1';
const LS_APARTMENT_KEY = 'avcrm_apartment_v1';
const LS_THEME_KEY = 'avcrm_theme';
const LS_DRAFT_KEY = 'avcrm_register_draft_v1';

export interface StoredCrmState {
  apartment: ApartmentInfo;
  visitors: VisitorProfile[];
}

export async function requestPersistentDeviceStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }
  try {
    const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    if (already) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

async function readFromCacheStorage(): Promise<StoredCrmState | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await window.caches.open(CACHE_NAME);
    const res = await cache.match(CACHE_KEY);
    if (!res) return null;
    const parsed = (await res.json()) as Partial<StoredCrmState>;
    if (!parsed || typeof parsed !== 'object') return null;
    const baseApt = createDefaultApartmentInfo();
    return {
      apartment: parsed.apartment
        ? normalizeLoadedApartment({ ...baseApt, ...parsed.apartment })
        : baseApt,
      visitors: Array.isArray(parsed.visitors) ? parsed.visitors : [],
    };
  } catch {
    return null;
  }
}

async function writeToCacheStorage(state: StoredCrmState): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await window.caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(state), {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(CACHE_KEY, response);
  } catch {
    // CacheStorage unavailable (e.g. restricted private context)
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function normalizeLoadedApartment(apt: ApartmentInfo): ApartmentInfo {
  if (
    apt.currency === '$' &&
    apt.expectedMonthlyRent === 2400 &&
    apt.expectedSalePrice === 420000
  ) {
    return {
      ...apt,
      currency: '₹',
      expectedMonthlyRent: 25000,
      expectedSalePrice: 0,
    };
  }
  return {
    ...apt,
    currency: '₹',
  };
}

export function loadCrmStateSync(): StoredCrmState {
  let apartment = createDefaultApartmentInfo();
  let visitors: VisitorProfile[] = [];
  if (typeof window === 'undefined') return { apartment, visitors };

  try {
    const rawApt = window.localStorage.getItem(LS_APARTMENT_KEY);
    if (rawApt) {
      apartment = normalizeLoadedApartment({ ...apartment, ...JSON.parse(rawApt) });
    }
  } catch {
    // ignore storage parse failure
  }

  try {
    const rawVisitors = window.localStorage.getItem(LS_VISITORS_KEY);
    if (rawVisitors) {
      const parsed = JSON.parse(rawVisitors);
      if (Array.isArray(parsed)) {
        visitors = parsed;
      }
    }
  } catch {
    // ignore storage parse failure
  }

  return { apartment, visitors };
}

export async function loadCrmStateAsync(): Promise<StoredCrmState> {
  void requestPersistentDeviceStorage();
  const syncFallback = loadCrmStateSync();
  const db = await openDatabase();
  if (!db) {
    if (syncFallback.visitors.length > 0) return syncFallback;
    return (await readFromCacheStorage()) ?? syncFallback;
  }

  const idbResult = await new Promise<StoredCrmState | null>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const aptReq = store.get('apartment');
      const visReq = store.get('visitors');

      tx.oncomplete = () => {
        const hasIdbApt = Boolean(aptReq.result);
        const hasIdbVis = Array.isArray(visReq.result);
        if (!hasIdbApt && !hasIdbVis) {
          db.close();
          resolve(null);
          return;
        }
        const apartment = hasIdbApt
          ? normalizeLoadedApartment(aptReq.result as ApartmentInfo)
          : syncFallback.apartment;
        const visitors = hasIdbVis
          ? (visReq.result as VisitorProfile[])
          : syncFallback.visitors;
        db.close();
        resolve({ apartment, visitors });
      };
      tx.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });

  if (idbResult) return idbResult;
  if (syncFallback.visitors.length > 0) return syncFallback;
  return (await readFromCacheStorage()) ?? syncFallback;
}

export async function saveCrmState(state: StoredCrmState): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LS_APARTMENT_KEY, JSON.stringify(state.apartment));
    window.localStorage.setItem(LS_VISITORS_KEY, JSON.stringify(state.visitors));
  } catch {
    // localStorage quota or restricted mode; IndexedDB and CacheStorage still store full data
  }

  void writeToCacheStorage(state);

  try {
    if ('BroadcastChannel' in window) {
      const ch = new BroadcastChannel('avcrm-realtime-sync');
      ch.postMessage(state);
      ch.close();
    }
  } catch {
    // ignore
  }

  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(state.apartment, 'apartment');
      store.put(state.visitors, 'visitors');
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

export function subscribeToRealtimeSync(onUpdate: (state: StoredCrmState) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  let channel: BroadcastChannel | null = null;
  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('avcrm-realtime-sync');
      channel.onmessage = (event) => {
        if (event.data && typeof event.data === 'object') {
          const { apartment, visitors } = event.data as StoredCrmState;
          if (apartment && visitors) {
            onUpdate({ apartment, visitors });
          }
        }
      };
    }
  } catch {
    // ignore
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === LS_APARTMENT_KEY || e.key === LS_VISITORS_KEY) {
      const current = loadCrmStateSync();
      onUpdate(current);
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    if (channel) channel.close();
    window.removeEventListener('storage', handleStorage);
  };
}


export function loadRegistrationDraft<T>(fallback: T): { form: T; step: number } {
  if (typeof window === 'undefined') return { form: fallback, step: 0 };
  try {
    const raw = window.localStorage.getItem(LS_DRAFT_KEY);
    if (!raw) return { form: fallback, step: 0 };
    const parsed = JSON.parse(raw) as { form?: Partial<T>; step?: number };
    if (!parsed || typeof parsed !== 'object' || !parsed.form) {
      return { form: fallback, step: 0 };
    }
    const step =
      typeof parsed.step === 'number' && parsed.step >= 0 && parsed.step <= 4 ? parsed.step : 0;
    return {
      form: { ...fallback, ...parsed.form },
      step,
    };
  } catch {
    return { form: fallback, step: 0 };
  }
}

export function saveRegistrationDraft<T>(form: T, step: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_DRAFT_KEY, JSON.stringify({ form, step }));
  } catch {
    // ignore storage errors
  }
}

export function clearRegistrationDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LS_DRAFT_KEY);
  } catch {
    // ignore
  }
}

const LS_LAST_BACKUP_KEY = 'avcrm_last_backup_at';

export function getLastBackupAt(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LS_LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function recordBackupExported(isoTimestamp = new Date().toISOString()): string {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LS_LAST_BACKUP_KEY, isoTimestamp);
    } catch {
      // ignore
    }
  }
  return isoTimestamp;
}

export function getSavedTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = window.localStorage.getItem(LS_THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // fallback
  }
  return 'light';
}

export function applyAndSaveTheme(theme: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_THEME_KEY, theme);
  } catch {
    // ignore
  }
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#111114' : '#FFFFFF');
  }
}
