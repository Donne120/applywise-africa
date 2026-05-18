/** Tiny offline-draft layer for the Writing Studio.
 *
 *  Strategy: debounce-write `finalWriting` to localStorage keyed by docId.
 *  On reconnect, the app's normal cloud-save path already runs whenever the
 *  doc state changes — so we just clear the offline entry once the latest
 *  body matches what we'd persisted. No bespoke queue, no merge conflicts.
 *
 *  Public surface:
 *    saveOfflineDraft(docId, body)
 *    loadOfflineDraft(docId)
 *    clearOfflineDraft(docId)
 *    listOfflineDraftIds()
 */

const KEY = 'udonpass-offline-drafts-v1';

type Store = Record<string, { body: string; savedAt: string }>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function write(store: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ }
}

export function saveOfflineDraft(docId: string, body: string) {
  if (!docId) return;
  const store = read();
  store[docId] = { body, savedAt: new Date().toISOString() };
  write(store);
}

export function loadOfflineDraft(docId: string): { body: string; savedAt: string } | null {
  if (!docId) return null;
  return read()[docId] || null;
}

export function clearOfflineDraft(docId: string) {
  if (!docId) return;
  const store = read();
  if (store[docId]) {
    delete store[docId];
    write(store);
  }
}

export function listOfflineDraftIds(): string[] {
  return Object.keys(read());
}
