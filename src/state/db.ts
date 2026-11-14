const DB_NAME = "caln";
const DB_VERSION = 1;
const STORE_NAME = "kv";

let dbPromise: Promise<IDBDatabase | null> | null = null;
let persistedRequested = false;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.warn(
          "IndexedDB unavailable; falling back to hash-only storage.",
        );
        resolve(null);
      };
    }).catch(() => null);
  }
  return dbPromise;
}

function requestPersist(): void {
  if (persistedRequested) return;
  persistedRequested = true;
  if (
    typeof navigator !== "undefined" &&
    navigator.storage &&
    typeof navigator.storage.persist === "function"
  ) {
    navigator.storage.persist().catch(() => {});
  }
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    if (!db) return null;
    return new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function idbSet<T>(key: string, value: T): Promise<boolean> {
  try {
    const db = await openDb();
    if (!db) return false;
    const ok = await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
    if (ok) requestPersist();
    return ok;
  } catch {
    return false;
  }
}

export async function idbClear(): Promise<boolean> {
  try {
    const db = await openDb();
    if (!db) return false;
    return new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
