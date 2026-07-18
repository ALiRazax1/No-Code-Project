/**
 * Browser-only local key storage using IndexedDB + Web Crypto API.
 * No dependency on @keybridge/security — avoids pulling pg into the browser.
 */

const DB_NAME = 'keybridge';
const STORE_NAME = 'vault';

async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeKeyLocally({
  userId,
  providerId,
  plaintextKey,
}: {
  userId: string;
  providerId: string;
  plaintextKey: string;
}): Promise<void> {
  const db = await getDB();
  const id = crypto.randomUUID();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({
      id,
      user_id: userId,
      provider_id: providerId,
      // Store as-is in IndexedDB — browser storage is scoped to this origin
      key: plaintextKey,
      storage_mode: 'local',
      created_at: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listLocalKeys(): Promise<{
  id: string;
  user_id: string;
  provider_id: string;
  storage_mode: 'local';
  created_at: number;
}[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteLocalKey(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}