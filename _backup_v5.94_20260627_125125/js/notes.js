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
  wichtig:    { label: 'Wichtig',          icon: 'star',           css: 'wichtig',    color: 'rgba(245,158,11,0.85)' },
  erkenntnis: { label: 'Erkenntnis',       icon: 'lightbulb',      css: 'erkenntnis', color: 'rgba(6,182,212,0.85)'  },
  risiko:     { label: 'Risiko',           icon: 'alert-triangle', css: 'risiko',     color: 'rgba(239,68,68,0.85)'  },
  schluessel: { label: 'Schlüsselbegriff', icon: 'key',            css: 'schluessel', color: 'rgba(167,139,250,0.85)'},
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
function addHighlight(text, type, sourceBlock, isRowMark, rowKey) {
  const s = getSession();
  if (!s) return;
  if (!s.highlights) s.highlights = [];
  const entry = {
    id: 'hl_' + Date.now(),
    text: text.trim(),
    type,
    sourceBlock,
    createdAt: new Date().toISOString(),
  };
  if (isRowMark) { entry.isRowMark = true; entry.rowKey = rowKey || text.trim(); }
  s.highlights.unshift(entry);
  saveSessions();
  saveToArchive(s);
  renderHighlights(s);
  _applyHighlightMarkers(s);
  _applyHighlightBadges(s);
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
  _applyHighlightMarkers(s);
  _applyHighlightBadges(s);
}

// Lesezeichen-Liste rendern
function renderHighlights(session) {
  const container = document.getElementById('highlightsContainer');
  if (!container) return;
  const all = session?.highlights || [];
  const filtered = _hlActiveFilter === 'alle' ? all : all.filter(h => h.type === _hlActiveFilter);

  document.querySelectorAll('.hl-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === _hlActiveFilter);
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="hl-empty">${all.length ? 'Kein Lesezeichen dieses Typs.' : 'Noch keine Lesezeichen – Text in einer Analyse markieren.'}</div>`;
    return;
  }

  container.innerHTML = filtered.map(h => {
    const typeInfo = HL_TYPES[h.type] || { label: h.type, css: '', icon: 'bookmark' };
    const srcLabel = HL_SOURCE_LABELS[h.sourceBlock] ?? h.sourceBlock ?? '';
    const date = new Date(h.createdAt).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'2-digit' });
    const ico = typeof icon === 'function' ? icon(typeInfo.icon, 11, 'flex-shrink:0') : '';
    return `
    <div class="hl-card">
      <div class="hl-card-header">
        <span class="hl-badge ${typeInfo.css}">${ico} ${typeInfo.label}</span>
        ${srcLabel ? `<span class="hl-source">${escHtml(srcLabel)}</span>` : ''}
      </div>
      ${h.isRowMark ? `<div class="hl-row-label">${typeof icon === 'function' ? icon('table',10,'flex-shrink:0') : ''} Tabellenzeile</div>` : ''}
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

// ── Block-Badges: Zähler auf Analyse-Block-Titeln ───────────────────────────

function _applyHighlightBadges(session) {
  // Bestehende Badges entfernen
  document.querySelectorAll('.hl-block-badge').forEach(b => b.remove());
  if (!session?.highlights?.length) return;

  // Zählen pro sourceBlock
  const counts = {};
  session.highlights.forEach(h => {
    counts[h.sourceBlock] = (counts[h.sourceBlock] || 0) + 1;
  });

  Object.entries(counts).forEach(([src, count]) => {
    const block = document.querySelector(`[data-hl-source="${CSS.escape(src)}"]`);
    if (!block) return;
    const titleBar = block.querySelector('.insights-block-title');
    if (!titleBar) return;
    const badge = document.createElement('span');
    badge.className = 'hl-block-badge';
    badge.innerHTML = (typeof icon === 'function' ? icon('bookmark', 10, 'flex-shrink:0') : '🔖') + ' ' + count;
    // Vor dem letzten Element (Chevron / Export-Buttons) einfügen
    titleBar.appendChild(badge);
  });
}

// ── Text-Marker: Unterlinie in Analyse-Blöcken ──────────────────────────────

function _applyHighlightMarkers(session) {
  const section = document.getElementById('insightsSection');
  if (!section || !session?.highlights?.length) return;

  // Bestehende Marker + Zeilen-Klassen entfernen (Duplikate verhindern)
  section.querySelectorAll('.hl-marker').forEach(span => {
    const parent = span.parentNode;
    parent.replaceChild(document.createTextNode(span.textContent), span);
    parent.normalize();
  });
  const ROW_CLASSES = ['hl-row-wichtig','hl-row-erkenntnis','hl-row-risiko','hl-row-schluessel'];
  section.querySelectorAll('tr').forEach(tr => tr.classList.remove(...ROW_CLASSES));

  // Für jedes Lesezeichen: Textstelle im DOM suchen und markieren
  session.highlights.forEach(h => {
    const searchText = h.text.trim();
    if (!searchText) return;

    // ── Tabellenzeilen-Markierung ──────────────────────────────────────────
    if (h.isRowMark) {
      const rowKey = (h.rowKey || searchText).replace(/\s+/g, ' ').trim();
      section.querySelectorAll('tr').forEach(tr => {
        if (tr.closest('thead')) return; // Kopfzeilen überspringen
        const trKey = tr.textContent.replace(/\s+/g, ' ').trim();
        if (trKey && rowKey && trKey === rowKey) {
          tr.classList.add(`hl-row-${h.type}`);
        }
      });
      return;
    }

    // ── Normaler Text-Marker (TreeWalker) ──────────────────────────────────
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName?.toLowerCase();
        if (['button', 'input', 'textarea', 'script', 'style'].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (parent.classList?.contains('hl-marker')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let node;
    let found = false;
    while (!found && (node = walker.nextNode())) {
      const content = node.textContent;
      const idx = content.indexOf(searchText);
      if (idx === -1) continue;

      const before = content.slice(0, idx);
      const after  = content.slice(idx + searchText.length);
      const typeInfo = HL_TYPES[h.type] || {};

      const marker = document.createElement('span');
      marker.className = `hl-marker hl-marker-${h.type}`;
      marker.textContent = searchText;
      marker.title = typeInfo.label || h.type;
      marker.dataset.hlId = h.id;

      const parent = node.parentNode;
      if (before) parent.insertBefore(document.createTextNode(before), node);
      parent.insertBefore(marker, node);
      if (after) parent.insertBefore(document.createTextNode(after), node);
      parent.removeChild(node);
      found = true;
    }
  });

  // Badges nach Marker-Durchlauf setzen
  _applyHighlightBadges(session);
}

// ── Text-Selektion → Popup ───────────────────────────────────────────────────

let _hlPopup = null;

function _removeHlPopup() {
  if (_hlPopup) { _hlPopup.remove(); _hlPopup = null; }
}

function _showHlPopup(text, sourceBlock, x, y, isRowMark, rowKey) {
  _removeHlPopup();
  const popup = document.createElement('div');
  popup.id = 'highlightPopup';

  const btns = Object.entries(HL_TYPES).map(([key, t]) => {
    const ico = typeof icon === 'function' ? icon(t.icon, 12, 'flex-shrink:0') : '';
    return `<button class="hl-pop-btn hl-pop-btn-${key}" onclick="_saveHlFromPopup('${key}','${escHtml(sourceBlock)}')">${ico} ${t.label}</button>`;
  }).join('');

  const rowHint = isRowMark
    ? `<span class="hl-pop-row-hint">${typeof icon === 'function' ? icon('table', 11) : ''} Tabellenzeile</span>`
    : '';

  popup.innerHTML = `
    <span class="hl-pop-label">Speichern als:</span>
    ${rowHint}
    ${btns}
    <button class="hl-pop-cancel" onclick="_removeHlPopup()" title="Abbrechen">✕</button>
  `;
  document.body.appendChild(popup);
  _hlPopup = popup;
  popup._hlText = text;
  popup._hlIsRowMark = !!isRowMark;
  popup._hlRowKey = rowKey || '';

  // Viewport-sichere Positionierung
  requestAnimationFrame(() => {
    const pw = popup.offsetWidth || 400;
    const ph = popup.offsetHeight || 48;
    let left = Math.min(x, window.innerWidth - pw - 12);
    let top  = y + 12;
    if (top + ph > window.innerHeight - 10) top = y - ph - 12;
    popup.style.left = Math.max(8, left) + 'px';
    popup.style.top  = top + 'px';
  });

  setTimeout(() => {
    document.addEventListener('mousedown', _hlOutsideClick, { once: true });
    document.addEventListener('touchstart', _hlOutsideClick, { once: true });
  }, 50);
}

function _hlOutsideClick(e) {
  if (_hlPopup && !_hlPopup.contains(e.target)) _removeHlPopup();
}

function _saveHlFromPopup(type, sourceBlock) {
  const text       = _hlPopup?._hlText      || '';
  const isRowMark  = _hlPopup?._hlIsRowMark || false;
  const rowKey     = _hlPopup?._hlRowKey    || '';
  _removeHlPopup();
  if (text) addHighlight(text, type, sourceBlock, isRowMark, rowKey);
  window.getSelection()?.removeAllRanges();
}

// Selektion-Handler – wird auf #sdc-panel-analysen registriert
function initHighlightSelection() {
  const panel = document.getElementById('sdc-panel-analysen');
  if (!panel) return;

  function onSelectionEnd(e) {
    setTimeout(() => {
      const sel = window.getSelection();
      let text = sel?.toString().trim();
      if (!text || text.length < 10) { _removeHlPopup(); return; }

      const range = sel.rangeCount ? sel.getRangeAt(0) : null;
      if (!range) return;
      if (!panel.contains(range.commonAncestorContainer)) { _removeHlPopup(); return; }

      // Quell-Block + Tabellenzeilen-Erkennung
      let node = range.commonAncestorContainer;
      if (node.nodeType === 3) node = node.parentElement;
      const block = node.closest('[data-hl-source]');
      const sourceBlock = block?.dataset.hlSource || 'custom';

      // Tabellen-Selektion? → wenn commonAncestor TR/TBODY/TABLE ist
      const TABLE_TAGS = ['TR', 'TBODY', 'TABLE'];
      const isRowMark = TABLE_TAGS.includes(node.tagName?.toUpperCase() || '');
      let rowKey = '';
      if (isRowMark) {
        const tr = node.tagName?.toUpperCase() === 'TR' ? node : node.querySelector('tr');
        if (tr) {
          rowKey = tr.textContent.replace(/\s+/g, ' ').trim();
          // Anzeigetext mit Pipe-Trennern zwischen den Zellen
          const cells = [...tr.querySelectorAll('td, th')];
          const piped = cells.map(td => td.textContent.trim()).filter(Boolean).join(' | ');
          if (piped) text = piped;
        } else {
          rowKey = text;
        }
      }

      const coords = e.touches ? e.touches[0] : e;
      const x = coords?.clientX ?? window.innerWidth / 2;
      const y = coords?.clientY ?? window.innerHeight / 2;

      _showHlPopup(text, sourceBlock, x, y, isRowMark, rowKey);
    }, 10);
  }

  panel.addEventListener('mouseup', onSelectionEnd);
  panel.addEventListener('touchend', onSelectionEnd);
}

// ═══════════════════════════════════════════════════
