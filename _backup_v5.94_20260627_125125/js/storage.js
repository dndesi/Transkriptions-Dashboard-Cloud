// ═══════════════════════════════════════════════════
// STORAGE – IndexedDB-Wrapper (ersetzt localStorage für sessions + projects)
// ═══════════════════════════════════════════════════
// Warum: localStorage hat ~5 MB Limit → "exceeded the quota" auf Smartphones
// IndexedDB hat kein nennenswerts Limit (~50% des freien Speichers)

const _IDB_NAME    = 'distill_voice_db';
const _IDB_VERSION = 1;
let   _idb         = null;

function _openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(_IDB_NAME, _IDB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('keyval')) {
        db.createObjectStore('keyval');
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function _idbGet(key) {
  const db = _idb || (_idb = await _openDB());
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('keyval', 'readonly');
    const req = tx.objectStore('keyval').get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = e => reject(e.target.error);
  });
}

async function _idbSet(key, value) {
  const db = _idb || (_idb = await _openDB());
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('keyval', 'readwrite');
    const req = tx.objectStore('keyval').put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

// ── Haupt-Init: aufrufen bevor die App startet ────────────────────────────
async function initStorage() {
  _idb = await _openDB();

  // Migration: falls sessions noch in localStorage → nach IDB verschieben + löschen
  const lsSessions = localStorage.getItem('transcription_sessions');
  if (lsSessions) {
    try {
      await _idbSet('sessions', JSON.parse(lsSessions));
      localStorage.removeItem('transcription_sessions');
      console.log('[storage] Sessions aus localStorage nach IndexedDB migriert.');
    } catch(e) { console.warn('[storage] Session-Migration fehlgeschlagen:', e); }
  }

  // Migration: falls projects noch in localStorage → nach IDB verschieben + löschen
  const lsProjects = localStorage.getItem('distill_projects');
  if (lsProjects) {
    try {
      await _idbSet('projects', JSON.parse(lsProjects));
      localStorage.removeItem('distill_projects');
      console.log('[storage] Projekte aus localStorage nach IndexedDB migriert.');
    } catch(e) { console.warn('[storage] Projekt-Migration fehlgeschlagen:', e); }
  }

  // Sessions in globale Variable laden
  const storedSessions = await _idbGet('sessions');
  if (Array.isArray(storedSessions)) {
    sessions = storedSessions;
    localStorage.setItem('distill_has_sessions', sessions.length > 0 ? '1' : '0');
  }

  // Projekte in globale Variable laden
  const storedProjects = await _idbGet('projects');
  if (Array.isArray(storedProjects)) {
    projects = storedProjects;
    // Sicherstellen dass das Builtin-Projekt immer vorhanden ist
    if (!projects.find(p => p.id === BUILTIN_PROJECT_ID)) {
      projects.unshift(_defaultProjects()[0]);
    }
  }

  // Contacts in globale Variable laden
  const storedContacts = await _idbGet('contacts');
  if (Array.isArray(storedContacts) && typeof contacts !== 'undefined') {
    contacts = storedContacts;
  }
}

// ── Speichern ─────────────────────────────────────────────────────────────
async function saveSessions() {
  try {
    await _idbSet('sessions', sessions);
    // Kleines Flag damit auth.js ohne IDB-Zugriff prüfen kann ob Daten vorhanden
    localStorage.setItem('distill_has_sessions', sessions.length > 0 ? '1' : '0');
  } catch(e) {
    console.error('[storage] saveSessions Fehler:', e);
  }
}

async function saveProjects({ skipDriveSync = false } = {}) {
  try {
    await _idbSet('projects', projects);
    // Drive-Sync sofort (kein Debounce – Projekte ändern sich selten, v4.94)
    if (!skipDriveSync && typeof saveSettingsToDrive === 'function' && typeof driveToken !== 'undefined' && driveToken && typeof driveFolderId !== 'undefined' && driveFolderId) {
      saveSettingsToDrive().catch(e => console.warn('[projects] Drive-Sync:', e.message));
    }
  } catch(e) {
    console.error('[storage] saveProjects Fehler:', e);
  }
}
