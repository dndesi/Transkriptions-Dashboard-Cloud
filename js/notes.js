// NOTIZEN
// ═══════════════════════════════════════════════════
let notesTimer = null;
function saveNotes() {
  clearTimeout(notesTimer);
  notesTimer = setTimeout(() => {
    const s = getSession();
    if (!s) return;
    s.notes = document.getElementById('notesArea').value;
    saveSessions();
    saveToArchive(s);
  }, 800);
}

// ── LESEZEICHEN (v5.50) ──────────────────────────────────────────────────────

const HL_TYPES = {
  wichtig:    { label: '⭐ Wichtig',         css: 'wichtig' },
  erkenntnis: { label: '💡 Erkenntnis',      css: 'erkenntnis' },
  risiko:     { label: '⚠️ Risiko',          css: 'risiko' },
  schluessel: { label: '🔑 Schlüsselbegriff', css: 'schluessel' },
};

const HL_SOURCE_LABELS = {
  privat:      'Gesprächsanalyse',
  arbeit:      'Arbeitsanalyse',
  sentiment:   'Stimmungsanalyse',
  kapitel:     'Kapitel',
  themen:      'Themen',
  '360':       '360°-Auswertung',
  custom:      'Eigene Analyse',
};

let _hlActiveFilter = 'alle';

// Lesezeichen speichern
function addHighlight(text, type, sourceBlock) {
  const s = getSession();
  if (!s) return;
  if (!s.highlights) s.highlights = [];
  s.highlights.unshift({
    id: 'hl_' + Date.now(),
    text: text.trim(),
    type,
    sourceBlock,
    createdAt: new Date().toISOString(),
  });
  saveSessions();
  saveToArchive(s);
  renderHighlights(s);
  showToast('Lesezeichen gespeichert', 'success');
}

// Lesezeichen löschen
function deleteHighlight(id) {
  const s = getSession();
  if (!s || !s.highlights) return;
  s.highlights = s.highlights.filter(h => h.id !== id);
  saveSessions();
  saveToArchive(s);
  renderHighlights(s);
}

// Lesezeichen rendern
function renderHighlights(session) {
  const container = document.getElementById('highlightsContainer');
  if (!container) return;
  const all = session?.highlights || [];
  const filtered = _hlActiveFilter === 'alle' ? all : all.filter(h => h.type === _hlActiveFilter);

  // Filter-Pills aktualisieren
  document.querySelectorAll('.hl-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === _hlActiveFilter);
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="hl-empty">${all.length ? 'Kein Lesezeichen dieses Typs.' : 'Noch keine Lesezeichen – Text in einer Analyse markieren.'}</div>`;
    return;
  }

  container.innerHTML = filtered.map(h => {
    const typeInfo = HL_TYPES[h.type] || { label: h.type, css: '' };
    const srcLabel = HL_SOURCE_LABELS[h.sourceBlock] ?? h.sourceBlock ?? '';
    const date = new Date(h.createdAt).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'2-digit' });
    return `
    <div class="hl-card">
      <div class="hl-card-header">
        <span class="hl-badge ${typeInfo.css}">${typeInfo.label}</span>
        ${srcLabel ? `<span class="hl-source">${srcLabel}</span>` : ''}
      </div>
      <p class="hl-text">${escHtml(h.text)}</p>
      <div class="hl-card-footer">
        <span class="hl-date">${date}</span>
        <button class="hl-del-btn" onclick="deleteHighlight('${h.id}')" title="Lesezeichen löschen">✕</button>
      </div>
    </div>`;
  }).join('');
}

function setHlFilter(filter) {
  _hlActiveFilter = filter;
  const s = getSession();
  if (s) renderHighlights(s);
}

// ── Text-Selektion → Popup ───────────────────────────────────────────────────

let _hlPopup = null;

function _removeHlPopup() {
  if (_hlPopup) { _hlPopup.remove(); _hlPopup = null; }
}

function _showHlPopup(text, sourceBlock, x, y) {
  _removeHlPopup();
  const popup = document.createElement('div');
  popup.id = 'highlightPopup';
  popup.innerHTML = `
    <span class="hl-pop-label">Markieren als:</span>
    ${Object.entries(HL_TYPES).map(([key, t]) =>
      `<button onclick="_saveHlFromPopup('${key}','${escHtml(sourceBlock)}')">${t.label}</button>`
    ).join('')}
    <button class="hl-pop-cancel" onclick="_removeHlPopup()" title="Abbrechen">✕</button>
  `;
  document.body.appendChild(popup);
  _hlPopup = popup;

  // Popup-Text für den Handler speichern
  popup._hlText = text;

  // Positionierung: unterhalb des Cursors, viewport-sicher
  const pw = popup.offsetWidth || 360;
  const ph = popup.offsetHeight || 48;
  let left = Math.min(x, window.innerWidth - pw - 12);
  let top  = y + 10;
  if (top + ph > window.innerHeight - 10) top = y - ph - 10;
  popup.style.left = Math.max(8, left) + 'px';
  popup.style.top  = top + 'px';

  // Schließen bei Klick außerhalb
  setTimeout(() => {
    document.addEventListener('mousedown', _hlOutsideClick, { once: true });
    document.addEventListener('touchstart', _hlOutsideClick, { once: true });
  }, 50);
}

function _hlOutsideClick(e) {
  if (_hlPopup && !_hlPopup.contains(e.target)) _removeHlPopup();
}

function _saveHlFromPopup(type, sourceBlock) {
  const text = _hlPopup?._hlText || '';
  _removeHlPopup();
  if (text) addHighlight(text, type, sourceBlock);
  window.getSelection()?.removeAllRanges();
}

// Selektion-Handler – wird auf #sdc-panel-analysen registriert
function initHighlightSelection() {
  const panel = document.getElementById('sdc-panel-analysen');
  if (!panel) return;

  function onSelectionEnd(e) {
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || text.length < 10) { _removeHlPopup(); return; }

      // Prüfen: liegt die Selektion vollständig im Analysen-Panel?
      const range = sel.rangeCount ? sel.getRangeAt(0) : null;
      if (!range) return;
      if (!panel.contains(range.commonAncestorContainer)) { _removeHlPopup(); return; }

      // Quell-Block bestimmen (nächstes .insights-block Elternelement)
      let node = range.commonAncestorContainer;
      if (node.nodeType === 3) node = node.parentElement;
      const block = node.closest('[data-hl-source]');
      const sourceBlock = block?.dataset.hlSource || 'custom';

      // Popup-Position
      const coords = e.touches ? e.touches[0] : e;
      const x = coords?.clientX ?? window.innerWidth / 2;
      const y = coords?.clientY ?? window.innerHeight / 2;

      _showHlPopup(text, sourceBlock, x, y);
    }, 10);
  }

  panel.addEventListener('mouseup', onSelectionEnd);
  panel.addEventListener('touchend', onSelectionEnd);
}

// ═══════════════════════════════════════════════════
