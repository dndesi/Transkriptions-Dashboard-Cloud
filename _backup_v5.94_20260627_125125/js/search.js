// ═══════════════════════════════════════════════════
// SEARCH.JS – Globale Suche v3.1
// Instant-Textsuche + Claude-Semantiksuche über alle Aufnahmen
// ═══════════════════════════════════════════════════

// ── Suchmodal öffnen / schließen ─────────────────────
function openSearchModal() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('searchClaudeResult').style.display = 'none';
  document.getElementById('searchStats').textContent = '';
  document.getElementById('searchModal').classList.add('open');
  setTimeout(() => { if (input) input.focus(); }, 100);
}

function closeSearchModal() {
  document.getElementById('searchModal').classList.remove('open');
}

// ── Instant-Textsuche (läuft direkt beim Tippen) ──────
function onSearchInput(e) {
  const query = e.target.value.trim();
  document.getElementById('searchClaudeResult').style.display = 'none';
  if (query.length < 2) {
    document.getElementById('searchResults').innerHTML =
      '<div class="search-hint">Mindestens 2 Zeichen eingeben…</div>';
    document.getElementById('searchStats').textContent = '';
    return;
  }
  runInstantSearch(query);
}

function runInstantSearch(query) {
  const terms   = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = [];

  (sessions || []).forEach(s => {
    const hits = [];

    // Label & Datei
    const label = (s.label || '').toLowerCase();
    if (terms.every(t => label.includes(t))) {
      hits.push({ field: 'Titel', snippet: s.label });
    }

    // Notizen
    const notes = (s.notes || '').toLowerCase();
    if (terms.some(t => notes.includes(t))) {
      hits.push({ field: 'Notizen', snippet: extractSnippet(s.notes, terms) });
    }

    // Tags
    const tagHits = (s.tags || []).filter(tag => terms.some(t => tag.toLowerCase().includes(t)));
    if (tagHits.length) {
      hits.push({ field: 'Tags', snippet: tagHits.join(', ') });
    }

    // Zusammenfassung (private + work)
    const summary = [
      s.privateAnalysis?.summary,
      s.workAnalysis?.summary
    ].filter(Boolean).join(' ');
    if (summary && terms.some(t => summary.toLowerCase().includes(t))) {
      hits.push({ field: 'Zusammenfassung', snippet: extractSnippet(summary, terms) });
    }

    // Transkript (Utterances)
    const utteranceHits = (s.utterances || []).filter(u =>
      terms.every(t => u.text.toLowerCase().includes(t))
    );
    if (utteranceHits.length) {
      hits.push({
        field: 'Transkript',
        snippet: extractSnippet(utteranceHits[0].text, terms),
        timestamp: utteranceHits[0].start,
        count: utteranceHits.length
      });
    }

    // Themen
    const topicHits = (s.claudeTopics || [])
      .map(t => typeof t === 'object' ? t.text : t)
      .filter(t => terms.some(term => t.toLowerCase().includes(term)));
    if (topicHits.length) {
      hits.push({ field: 'Themen', snippet: topicHits.join(', ') });
    }

    // Personen
    const personHits = (s.persons || []).filter(p =>
      terms.some(t => p.toLowerCase().includes(t))
    );
    if (personHits.length) {
      hits.push({ field: 'Personen', snippet: personHits.join(', ') });
    }

    if (hits.length) results.push({ session: s, hits });
  });

  renderInstantResults(results, query);
}

function extractSnippet(text, terms, maxLen = 120) {
  if (!text) return '';
  const lower = text.toLowerCase();
  let pos = -1;
  for (const t of terms) {
    const idx = lower.indexOf(t);
    if (idx !== -1) { pos = idx; break; }
  }
  if (pos === -1) return text.slice(0, maxLen);
  const start = Math.max(0, pos - 40);
  const end   = Math.min(text.length, start + maxLen);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

function highlightTerms(text, terms) {
  let result = escHtml(text);
  terms.forEach(t => {
    const regex = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(regex, '<mark class="search-highlight">$1</mark>');
  });
  return result;
}

function renderInstantResults(results, query) {
  const container = document.getElementById('searchResults');
  const statsEl   = document.getElementById('searchStats');
  const terms     = query.toLowerCase().split(/\s+/).filter(Boolean);

  if (!results.length) {
    container.innerHTML = `<div class="search-empty">Keine Treffer für „${escHtml(query)}"<br><span style="font-size:0.78rem; opacity:0.7">Versuche die Claude-Suche für semantische Fragen</span></div>`;
    statsEl.textContent = '0 Treffer';
    return;
  }

  statsEl.textContent = `${results.length} Aufnahme${results.length !== 1 ? 'n' : ''} gefunden`;

  container.innerHTML = results.map(({ session: s, hits }) => {
    const date = new Date(s.date).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
    const typeIcon = s.type === 'arbeit' ? icon('briefcase',12) : s.type === 'gedanken' ? icon('message-square',12) : icon('message-circle',12);
    const dur = s.duration ? ` · ${formatDuration(s.duration)}` : '';

    const hitsHtml = hits.map(h => {
      const countBadge = h.count > 1 ? ` <span class="search-count">${h.count}×</span>` : '';
      const tsLink = h.timestamp != null
        ? ` <a href="#" onclick="event.preventDefault(); closeSearchModal(); openSessionById('${s.id}', ${h.timestamp});" class="search-ts-link">▶ ${formatMs(h.timestamp)}</a>`
        : '';
      return `<div class="search-hit">
        <span class="search-hit-field">${escHtml(h.field)}</span>${countBadge}
        <span class="search-hit-snippet">${highlightTerms(h.snippet, terms)}</span>${tsLink}
      </div>`;
    }).join('');

    return `<div class="search-card" onclick="closeSearchModal(); openSessionById('${s.id}')">
      <div class="search-card-header">
        <span class="search-card-icon">${typeIcon}</span>
        <div class="search-card-title">${highlightTerms(s.label || 'Unbenannt', terms)}</div>
        <div class="search-card-meta">${escHtml(date)}${escHtml(dur)}</div>
      </div>
      ${hitsHtml}
    </div>`;
  }).join('');
}

// ── Hilfsfunktion: Session öffnen und optional zur Zeitstelle springen ──
function openSessionById(id, jumpToMs) {
  const s = (sessions || []).find(s => s.id === id);
  if (!s) return;
  currentSessionId = id;
  showTranscript(s);
  if (jumpToMs != null) {
    setTimeout(() => seekAudio(jumpToMs), 400);
  }
  // Sidebar-Selektion aktualisieren
  document.querySelectorAll('.session-card').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

// ── Claude Semantiksuche über alle Aufnahmen ──────────
async function runClaudeSearch() {
  const query = document.getElementById('searchInput')?.value.trim();
  if (!query) { showToast('Bitte zuerst eine Frage eingeben', 'error'); return; }
  if (!anthropicKey) { showToast('Kein Anthropic API-Key gesetzt', 'error'); return; }

  const allSessions = (sessions || []).filter(s => s.utterances?.length || s.privateAnalysis || s.workAnalysis);
  if (!allSessions.length) { showToast('Keine Aufnahmen mit Inhalt gefunden', 'error'); return; }

  const btn = document.getElementById('searchClaudeBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Suche…'; }
  document.getElementById('searchClaudeResult').style.display = 'none';

  try {
    // Kompaktes Digest aller Sessions für Claude
    const digest = allSessions.map((s, i) => {
      const date    = new Date(s.date).toLocaleDateString('de-DE');
      const summary = s.privateAnalysis?.summary || s.workAnalysis?.summary || '';
      const topics  = (s.claudeTopics || []).map(t => typeof t === 'object' ? t.text : t).join(', ');
      const persons = (s.persons || []).join(', ');
      const tasks   = (s.workAnalysis?.tasks || []).map(t => t.task).slice(0,3).join('; ');
      return `[${i+1}] ${s.label} (${date}, ${s.type})\n` +
        (summary  ? `  Zusammenfassung: ${summary.slice(0, 200)}\n` : '') +
        (topics   ? `  Themen: ${topics}\n` : '') +
        (persons  ? `  Personen: ${persons}\n` : '') +
        (tasks    ? `  Aufgaben: ${tasks}\n` : '');
    }).join('\n');

    const prompt = getEditablePromptText('builtin_search')
      .replace(/\{\{sessionCount\}\}/g, allSessions.length)
      .replace(/\{\{digest\}\}/g, digest.slice(0, 12000))
      .replace(/\{\{query\}\}/g, query);

    const { text, inputTokens, outputTokens } = await callClaudeAPI(prompt);

    // Tokens global tracken (keine spezifische Session)
    console.log(`[GlobalSearch] Tokens: ${inputTokens} in / ${outputTokens} out`);

    renderClaudeSearchResult(text, allSessions);
  } catch(e) {
    showToast('Claude-Suche fehlgeschlagen: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✦ Claude fragen'; }
  }
}

function renderClaudeSearchResult(text, allSessions) {
  const container = document.getElementById('searchClaudeResult');
  const content   = document.getElementById('searchClaudeContent');

  // Sitzungsnummern in klickbare Links umwandeln [1], [2], …
  let html = escHtml(text).replace(/\[(\d+)\]/g, (match, num) => {
    const idx = parseInt(num) - 1;
    const s   = allSessions[idx];
    if (!s) return match;
    return `<a href="#" onclick="event.preventDefault(); closeSearchModal(); openSessionById('${s.id}');" class="search-session-link">[${num}] ${escHtml(s.label)}</a>`;
  });

  // Zeilenumbrüche rendern
  html = html.replace(/\n/g, '<br>');

  content.innerHTML = html;
  container.style.display = 'block';
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Tastatur-Shortcut: Cmd/Ctrl+K öffnet Suche ───────
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    openSearchModal();
  }
  if (e.key === 'Escape') {
    const m = document.getElementById('searchModal');
    if (m && m.classList.contains('open')) closeSearchModal();
  }
});
