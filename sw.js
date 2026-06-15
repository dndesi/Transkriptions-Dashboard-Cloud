// ═══════════════════════════════════════════════════
// SERVICE WORKER – Distill Voice v5.2
// Aufgabe: Web Share Target POST abfangen,
//          Dateien in IndexedDB speichern,
//          zur App weiterleiten
// ═══════════════════════════════════════════════════

const SW_VERSION = 'distill-voice-sw-v5.2';
const APP_PATH   = '/Transkriptions-Dashboard-Cloud/';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// ─── Share Target POST abfangen ───────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Nur POST an /share Route abfangen
  if (event.request.method === 'POST' && url.pathname === APP_PATH + 'share') {
    event.respondWith(handleShare(event.request));
  }
});

async function handleShare(request) {
  try {
    const formData = await request.formData();
    const files    = formData.getAll('files');

    if (!files || files.length === 0) {
      return Response.redirect(APP_PATH, 303);
    }

    // Dateien als ArrayBuffer vorbereiten
    const pending = await Promise.all(
      files.map(async file => ({
        name:       file.name || 'datei',
        type:       file.type || '',
        size:       file.size || 0,
        data:       await file.arrayBuffer(),
        receivedAt: Date.now()
      }))
    );

    // In eigener IDB speichern (getrennt von App-IDB)
    await storePendingShares(pending);

    // Zur App weiterleiten mit Flag
    return Response.redirect(APP_PATH + '?shared=1', 303);

  } catch (e) {
    console.error('[SW] Share-Fehler:', e);
    return Response.redirect(APP_PATH, 303);
  }
}

// ─── IndexedDB Hilfsfunktionen ─────────────────────
const SHARE_DB      = 'distill_share_db';
const SHARE_DB_VER  = 1;
const SHARE_STORE   = 'pendingShares';

function openShareDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SHARE_DB, SHARE_DB_VER);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(SHARE_STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function storePendingShares(shares) {
  const db = await openShareDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(SHARE_STORE, 'readwrite');
    const store = tx.objectStore(SHARE_STORE);
    shares.forEach(s => store.add(s));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror    = () => { db.close(); reject(tx.error); };
  });
}
