// Google Auth separat initialisieren (unabhängig von init())
window.addEventListener('load', function() {
  const check = setInterval(() => {
    if (window.google?.accounts?.oauth2) {
      clearInterval(check);
      try { initGoogleAuth(); } catch(e) { console.error('initGoogleAuth Fehler:', e); }
    }
  }, 100);
  setTimeout(() => {
    clearInterval(check);
    if (!driveTokenClient) {
      const err = document.getElementById('loginError');
      if (err) { err.style.display = 'block'; err.textContent = 'Google API nicht geladen – bitte Seite neu laden oder Werbeblocker deaktivieren.'; }
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
          driveTokenClient.requestAccessToken({ prompt: 'select_account' });
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
  driveTokenClient.requestAccessToken({ prompt: 'select_account' });
}

async function onTokenReceived(resp) {
  if (resp.error) {
    const err = document.getElementById('loginError');
    if (err) { err.style.display = 'block'; err.textContent = 'Anmeldung fehlgeschlagen: ' + resp.error; }
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
  document.getElementById('loginOverlay').style.display = 'none';
  setDateInputToNow(); // sofort setzen, unabhängig von Drive

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

