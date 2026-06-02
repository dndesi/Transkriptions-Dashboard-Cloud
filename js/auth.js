// Google Auth separat initialisieren (unabhängig von init())
window.addEventListener('load', function() {
  // App sofort mit localStorage-Daten zeigen – kein Login-Block
  const overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.style.display = 'none';

  // Stille Auth im Hintergrund versuchen
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
      _showDriveBanner('Google API nicht geladen – Werbeblocker deaktivieren?');
    }
  }, 15000);
});

// ═══════════════════════════════════════════════════
// GOOGLE AUTH
// ═══════════════════════════════════════════════════
function initGoogleAuth() {
  driveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: onTokenReceived,
  });
}

function signInWithGoogle() {
  // Falls GIS inzwischen geladen aber tokenClient noch nicht init
  if (!driveTokenClient && window.google?.accounts?.oauth2) {
    try { initGoogleAuth(); } catch(e) { console.error('initGoogleAuth Fehler:', e); }
  }

  if (!driveTokenClient) {
    // GIS noch nicht bereit – warten und nach erfolgreichem Laden direkt anmelden
    const btn = document.querySelector('#loginOverlay button');
    const orig = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Google API lädt…'; }

    const wait = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(wait);
        try {
          if (!driveTokenClient) initGoogleAuth();
          if (btn) { btn.innerHTML = orig; btn.disabled = false; }
          driveTokenClient.requestAccessToken({ prompt: 'consent' });
        } catch(e) {
          if (btn) { btn.innerHTML = orig; btn.disabled = false; }
          showToast('Google Auth Fehler: ' + e.message, 'error');
        }
      }
    }, 200);
    setTimeout(() => {
      clearInterval(wait);
      if (btn) { btn.innerHTML = orig; btn.disabled = false; }
      if (!driveTokenClient) {
        const err = document.getElementById('loginError');
        if (err) { err.style.display = 'block'; err.textContent = 'Google API nicht erreichbar. Werbeblocker deaktivieren oder Seite neu laden.'; }
      }
    }, 12000);
    return;
  }
  driveTokenClient.requestAccessToken({ prompt: 'consent' });
}

async function onTokenReceived(resp) {
  if (resp.error) {
    // Stille Auth fehlgeschlagen → kleinen Banner zeigen (nicht blockierend)
    if (resp.error !== 'user_cancelled') {
      _showDriveBanner('Drive nicht verbunden – Klicken um zu verbinden', true);
    }
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

async function enterApp() {
  // Overlay verstecken (falls noch sichtbar) + Drive-Banner wegräumen
  const overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.style.display = 'none';
  _hideDriveBanner();
  setDateInputToNow();

  if (driveUser) {
    const badge = document.getElementById('userBadge');
    const avatar = document.getElementById('userAvatar');
    const email  = document.getElementById('userEmail');
    if (badge) badge.style.display = 'flex';
    if (avatar) avatar.textContent = (driveUser.given_name || driveUser.name || '?')[0].toUpperCase();
    if (email)  email.textContent  = driveUser.email || driveUser.name || '';
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

// ── Drive-Banner (nicht blockierend) ─────────────────────────────────────
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

function signOut() {
  if (!confirm('Wirklich abmelden?')) return;
  if (driveToken) google.accounts.oauth2.revoke(driveToken, () => {});
  driveToken = null; driveUser = null; driveFolderId = null;
  localStorage.removeItem('drive_folder_id');
  document.getElementById('loginOverlay').style.display = 'flex';
  const badge = document.getElementById('userBadge');
  if (badge) badge.style.display = 'none';
  showToast('Abgemeldet', 'info');
}

