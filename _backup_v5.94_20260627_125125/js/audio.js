// AUDIO PLAYER & SYNC
// ═══════════════════════════════════════════════════
let _currentAudioUrl = null;

async function loadAudioForSession(session) {
  const bar     = document.getElementById('audioPlayerBar');
  const player  = document.getElementById('audioPlayer');
  const fnLabel = document.getElementById('audioPlayerFilename');
  const noFile  = document.getElementById('audioNoFile');

  // Alten Object-URL freigeben
  if (_currentAudioUrl) { URL.revokeObjectURL(_currentAudioUrl); _currentAudioUrl = null; }
  player.pause();
  player.removeAttribute('src');
  player.load();

  if (!session.audioFilename) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'block';
  fnLabel.textContent = session.audioFilename;

  if (!driveToken || !session._audioId) {
    player.style.display = 'none';
    noFile.style.display = 'block';
    noFile.innerHTML = icon('alert-triangle',13,'margin-right:5px;color:var(--yellow)') + (driveToken ? ' Keine Audio-Datei in Drive verknüpft' : ' Nicht mit Drive verbunden');
    return;
  }

  try {
    const blob = await driveDownloadBlob(session._audioId);
    _currentAudioUrl = URL.createObjectURL(blob);
    player.src = _currentAudioUrl;
    player.style.display = 'block';
    noFile.style.display = 'none';
  } catch (e) {
    player.style.display = 'none';
    noFile.style.display = 'block';
    noFile.innerHTML = icon('alert-triangle',13,'margin-right:5px;color:var(--yellow)') + ' Audio konnte nicht geladen werden: ' + escHtml(e.message);
  }
}

function seekAudio(startMs) {
  const player = document.getElementById('audioPlayer');
  if (!player || !player.src) return;
  player.currentTime = startMs / 1000;
  player.play();
}

function stopAudio() {
  const player = document.getElementById('audioPlayer');
  if (!player) return;
  player.pause();
  player.currentTime = 0;
  _updateAudioStopBtn(false);
}

function _updateAudioStopBtn(playing) {
  const btn      = document.getElementById('audioStopBtn');
  const btnFloat = document.getElementById('audioStopBtnFloat');
  if (btn)      btn.style.display      = playing ? 'inline-flex' : 'none';
  if (btnFloat) btnFloat.style.display = playing ? 'inline-flex' : 'none';
}

// Sync: aktuelle Utterance beim Abspielen hervorheben
function setupAudioSync() {
  const player = document.getElementById('audioPlayer');
  if (!player) return;
  player.addEventListener('play',  () => _updateAudioStopBtn(true));
  player.addEventListener('pause', () => _updateAudioStopBtn(false));
  player.addEventListener('ended', () => _updateAudioStopBtn(false));
  player.addEventListener('timeupdate', () => {
    const currentMs = player.currentTime * 1000;
    let activeEl = null;
    document.querySelectorAll('#utterancesContainer .utterance').forEach(el => {
      const start = parseFloat(el.dataset.start);
      const end   = parseFloat(el.dataset.end);
      const isActive = currentMs >= start && currentMs < end;
      el.classList.toggle('active-utterance', isActive);
      if (isActive) activeEl = el;
    });
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

// ═══════════════════════════════════════════════════
// ZEITSTRAHL
// ═══════════════════════════════════════════════════
function renderTimeline(filter) {
  const tl = document.getElementById('timelineView');
  if (!tl) return;
  const tagFilter = document.getElementById('tagFilter')?.value || '';
  const searchVal = filter || document.getElementById('sidebarSearchMain')?.value || '';
  let list = sessions.filter(s => s.status === 'done');
  const folderFilter = document.getElementById('folderFilter')?.value || '';
  if (folderFilter) list = list.filter(s => s.archiveFolder === folderFilter);
  if (tagFilter) list = list.filter(s => (s.tags||[]).includes(tagFilter));
  if (searchVal.trim()) {
    const q = searchVal.toLowerCase();
    list = list.filter(s => (s.label||'').toLowerCase().includes(q) || (s.filename||'').toLowerCase().includes(q));
  }
  list.sort((a,b) => new Date(b.date) - new Date(a.date));

  if (list.length === 0) { tl.innerHTML = '<div class="browser-empty">Keine Sitzungen gefunden.</div>'; return; }

  // Nach Monat gruppieren
  const groups = {};
  list.forEach(s => {
    const key = new Date(s.date).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  tl.innerHTML = '';
  Object.entries(groups).forEach(([month, items]) => {
    const block = document.createElement('div');
    block.className = 'timeline-month';
    block.innerHTML = `<div class="timeline-month-label">${month}</div>`;
    const itemsEl = document.createElement('div');
    itemsEl.className = 'timeline-items';
    items.forEach(s => {
      const el = document.createElement('div');
      // Farbverlauf je nach Typ – passend zu den Kacheln
      const typeGradient = {
        arbeit:   'linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(167,139,250,0.05) 100%)',
        privat:   'linear-gradient(135deg, rgba(52,211,153,0.10) 0%, rgba(16,185,129,0.04) 100%)',
        gedanken: 'linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(245,158,11,0.04) 100%)',
      }[s.type || 'privat'] || 'linear-gradient(135deg, rgba(52,211,153,0.10) 0%, rgba(16,185,129,0.04) 100%)';
      const typeBorder = {
        arbeit:   'rgba(99,102,241,0.35)',
        privat:   'rgba(52,211,153,0.35)',
        gedanken: 'rgba(251,191,36,0.35)',
      }[s.type || 'privat'] || 'rgba(52,211,153,0.35)';
      const typeLabel = { arbeit: icon('briefcase',12), privat: icon('message-circle',12), gedanken: icon('message-square',12) }[s.type || 'privat'] || icon('message-circle',12);

      el.className = 'timeline-item';
      el.onclick = () => showTranscript(s);
      const dur = s.duration ? formatDuration(s.duration) : '';
      const tagsHtml = (s.tags||[]).map(t => `<span class="sc-tag">${escHtml(t)}</span>`).join('');
      const tiIconName = { arbeit: 'briefcase', privat: 'message-circle', gedanken: 'message-square' }[s.type || 'privat'] || 'message-circle';
      el.innerHTML = `
        <div class="ti-icon">${icon(tiIconName, 15)}</div>
        <div class="ti-date">${new Date(s.date).toLocaleDateString('de-DE',{day:'numeric',month:'short'})}</div>
        <div style="flex:1; min-width:0">
          <div class="ti-name">${escHtml(s.label)}</div>
          <div class="ti-meta">${escHtml(s.speakerA||'A')} &amp; ${escHtml(s.speakerB||'B')}${dur?' · '+dur:''}</div>
          ${tagsHtml ? `<div class="sc-tags" style="margin-top:4px">${tagsHtml}</div>` : ''}
        </div>
      `;
      itemsEl.appendChild(el);
    });
    block.appendChild(itemsEl);
    tl.appendChild(block);
  });
}

// ═══════════════════════════════════════════════════
