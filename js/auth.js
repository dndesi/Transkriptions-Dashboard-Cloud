// ═══════════════════════════════════════════════════
// GOOGLE AUTH – Progressive Auth (v5.8)
// App startet ohne Login. Anmeldung über Header-Button.
// ═══════════════════════════════════════════════════

window.addEventListener('load', function() {
  // GIS laden und stille Auth versuchen (wiederkehrende Nutzer)
  const check = setInterval(() => {
    if (window.google?.accounts?.oauth2) {
      clearInterval(check);
      try {
        initGoogleAuth();
        // Stille Anfrage: kein Popup, kein Account-Picker
        driveTokenClient.requestAccessToken({ prompt: '' });
      } catch(e) { console.error('initGoogleAuth Fehler:', e); }
    }
  }, 100);
  setTimeout(() => {
    clearInterval(check);
    if (!driveTokenClient) {
      console.warn('[auth] Google API nicht geladen (Werbeblocker?)');
    }
  }, 15000);
});

// ── Hilfsfunktionen für Sign-In-Button ─────────────
function _showSignInBtn() {
  const btn = document.getElementById('signInBtn');
  if (btn) btn.style.display = 'flex';
}
function _hideSignInBtn() {
  const btn = document.getElementById('signInBtn');
  if (btn) btn.style.display = 'none';
}

// ── Google Auth initialisieren ──────────────────────
function initGoogleAuth() {
  driveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: onTokenReceived,
  });
}

// ── Sign-In: vom Nutzer aktiv ausgelöst ────────────
function signInWithGoogle() {
  const btn = document.getElementById('signInBtn');

  if (!driveTokenClient && window.google?.accounts?.oauth2) {
    try { initGoogleAuth(); } catch(e) { console.error('initGoogleAuth Fehler:', e); }
  }

  if (!driveTokenClient) {
    // GIS noch nicht bereit – kurz warten
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Lädt…'; }
    const wait = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(wait);
        try {
          if (!driveTokenClient) initGoogleAuth();
          if (btn) { btn.disabled = false; btn.innerHTML = _signInBtnInner(); }
          driveTokenClient.requestAccessToken({ prompt: 'consent' });
        } catch(e) {
          if (btn) { btn.disabled = false; btn.innerHTML = _signInBtnInner(); }
          showToast('Google Auth Fehler: ' + e.message, 'error');
        }
      }
    }, 200);
    setTimeout(() => {
      clearInterval(wait);
      if (btn) { btn.disabled = false; btn.innerHTML = _signInBtnInner(); }
      if (!driveTokenClient) showToast('Google API nicht erreichbar – Werbeblocker deaktivieren?', 'warning');
    }, 12000);
    return;
  }
  driveTokenClient.requestAccessToken({ prompt: 'consent' });
}

function _signInBtnInner() {
  return `<svg width="14" height="14" viewBox="0 0 48 48" style="flex-shrink:0">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>Anmelden`;
}

// ── Token empfangen (nach Auth) ────────────────────
async function onTokenReceived(resp) {
  if (resp.error) {
    // Stille Auth fehlgeschlagen → Sign-In-Button bleibt sichtbar, kein Popup
    if (resp.error !== 'user_cancelled') {
      console.info('[auth] Stille Auth fehlgeschlagen:', resp.error);
    }
    _showSignInBtn();
    return;
  }
  driveToken = resp.access_token;
  driveTokenExpiry = Date.now() + resp.expires_in * 1000 - 60000;

  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + driveToken }
    });
    driveUser = await r.json();
  } catch(e) { console.warn('userinfo failed', e); }

  await enterApp();
}

// ── App mit eingeloggtem Nutzer starten ────────────
async function enterApp() {
  _hideSignInBtn();
  _hideDriveBanner();
  setDateInputToNow();

  if (driveUser) {
    const badge  = document.getElementById('userBadge');
    const avatar = document.getElementById('userAvatar');
    const email  = document.getElementById('userEmail');
    if (badge)  badge.style.display  = 'flex';
    if (avatar) avatar.textContent   = (driveUser.given_name || driveUser.name || '?')[0].toUpperCase();
    if (email)  email.textContent    = driveUser.email || driveUser.name || '';
  }

  try {
    await ensureDriveFolder();
    updateDriveStatus();
    await loadDriveSubfolders();
    checkUploadReady();
  } catch(e) {
    showToast('Drive-Verbindung fehlgeschlagen: ' + e.message, 'error');
    return;
  }

  updateApiIndicator();
  updateTagFilter();
  renderBrowser();
  setupAudioSync();
  await loadFromDrive();
}

// ── Drive-Banner (nicht blockierend) ──────────────
function _showDriveBanner(msg, clickable = false) {
  let banner = document.getElementById('driveBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'driveBanner';
    banner.style.cssText = `
      position:fixed; top:0; left:0; right:0; z-index:500;
      background:var(--surface2); border-bottom:1px solid var(--border);
      padding:8px 16px; font-size:0.82rem; color:var(--muted);
      display:flex; align-items:center; justify-content:center; gap:12px;`;
    document.body.prepend(banner);
  }
  banner.innerHTML = `
    <span>${msg}</span>
    ${clickable ? `<button onclick="signInWithGoogle()" style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:4px 12px;font-size:0.78rem;cursor:pointer">Verbinden</button>` : ''}
    <button onclick="_hideDriveBanner()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1rem;padding:0 4px">✕</button>`;
  banner.style.display = 'flex';
}

function _hideDriveBanner() {
  const banner = document.getElementById('driveBanner');
  if (banner) banner.style.display = 'none';
}

// ── Abmelden ──────────────────────────────────────
function signOut() {
  if (!confirm('Wirklich abmelden?')) return;
  if (driveToken) google.accounts.oauth2.revoke(driveToken, () => {});
  driveToken = null; driveUser = null; driveFolderId = null;
  localStorage.removeItem('drive_folder_id');
  const badge = document.getElementById('userBadge');
  if (badge) badge.style.display = 'none';
  _showSignInBtn();
  showToast('Abgemeldet', 'info');
}
