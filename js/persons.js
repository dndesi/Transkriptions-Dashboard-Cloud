// PERSONEN-PROFILE
// ═══════════════════════════════════════════════════

function getAllPersons() {
  const hidden = getHiddenPersons().map(h => h.toLowerCase().trim());
  const map = {};
  sessions.forEach(s => {
    if (s.status !== 'done' && !s.utterances?.length) return;
    (s.persons || []).forEach(p => {
      const key = p.toLowerCase().trim();
      if (!key || hidden.includes(key)) return;
      if (!map[key]) map[key] = { name: p, count: 0, lastDate: null, topics: [] };
      map[key].count++;
      if (!map[key].lastDate || s.date > map[key].lastDate) {
        map[key].lastDate = s.date;
        map[key].name = p;
      }
      // Nur ⭐ markierte Themen ins Profil
      const starred = (s.claudeTopics || []).filter(t => typeof t === 'object' && t.status === 'starred').map(t => t.text);
      if (starred.length) map[key].topics.push(...starred);
    });
  });
  return Object.values(map).sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
}

function getPersonData(name) {
  const nameLower = name.toLowerCase().trim();
  const personSessions = sessions
    .filter(s => (s.status === 'done' || s.utterances?.length > 0) &&
                 s.persons?.some(p => p.toLowerCase().trim() === nameLower))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const wishes = [], agreements = [], openTopics = [], workTasks = [], allTopics = [];

  personSessions.forEach(s => {
    const dateStr = new Date(s.date).toLocaleDateString('de-DE');
    const meta    = { sessionDate: s.date, sessionLabel: s.label, dateStr };

    (s.privateAnalysis?.wishes || []).forEach(w => {
      const wPerson = (typeof w === 'object' ? w.person : '') || '';
      // Wunsch zuordnen: entweder kein Person-Feld, oder Person stimmt mit name überein
      if (!wPerson || wPerson.toLowerCase().includes(nameLower) || nameLower.includes(wPerson.toLowerCase().trim())) {
        wishes.push({ text: typeof w === 'object' ? w.wish : w, ...meta });
      }
    });
    (s.privateAnalysis?.agreements || []).forEach(a => agreements.push({ text: a, ...meta }));
    (s.privateAnalysis?.openTopics || []).forEach(t => openTopics.push({ text: t, ...meta }));
    (s.workAnalysis?.tasks || []).filter(t => t.person?.toLowerCase().includes(nameLower))
      .forEach(t => workTasks.push({ ...t, ...meta }));
    const starredPD = (s.claudeTopics || []).filter(t => typeof t === 'object' && t.status === 'starred').map(t => t.text);
    allTopics.push(...starredPD);
  });

  const topicCount = {};
  allTopics.forEach(t => { topicCount[t] = (topicCount[t] || 0) + 1; });
  const topTopics = Object.entries(topicCount).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([t,c])=>({topic:t,count:c}));

  return { name, sessions: personSessions, wishes, agreements, openTopics, workTasks, topTopics,
           lastContact: personSessions[0]?.date, firstContact: personSessions[personSessions.length-1]?.date };
}

function getMeinProfilData() {
  const done = sessions.filter(s => s.status === 'done' || s.utterances?.length > 0);
  done.sort((a, b) => new Date(b.date) - new Date(a.date));

  const myWishes = [], myCommitments = [], myTasks = [],
        openTopics = [], keyThoughts = [], nextSteps = [], allTopics = [];

  done.forEach(s => {
    const dateStr = new Date(s.date).toLocaleDateString('de-DE');
    const meta    = { sessionDate: s.date, sessionLabel: s.label, dateStr, sessionType: s.type };
    const meName  = (s.speakerA || 'Ich').toLowerCase();

    // Eigene Wünsche: wishes wo person = speakerA / "Ich"
    (s.privateAnalysis?.wishes || []).forEach(w => {
      const wPerson = (typeof w === 'object' ? w.person : '') || '';
      if (!wPerson || wPerson.toLowerCase().includes(meName) || meName.includes(wPerson.toLowerCase().trim())) {
        myWishes.push({ text: typeof w === 'object' ? w.wish : w, ...meta });
      }
    });

    // Vereinbarungen (alle – der Nutzer ist immer beteiligt)
    (s.privateAnalysis?.agreements || []).forEach(a => myCommitments.push({ text: a, ...meta }));

    // Eigene Aufgaben aus Arbeits-Analyse
    (s.workAnalysis?.tasks || []).filter(t => {
      const p = (t.person || '').toLowerCase();
      return p.includes(meName) || p === 'ich' || p === 'offen' || p === '';
    }).forEach(t => myTasks.push({ ...t, ...meta }));

    // Offene Themen (alle Sitzungen)
    (s.privateAnalysis?.openTopics || []).forEach(t => openTopics.push({ text: t, ...meta }));

    // Kerngedanken + nächste Schritte (nur Gedanken-Sitzungen)
    if (s.type === 'gedanken') {
      (s.privateAnalysis?.keyThoughts || []).forEach(t => keyThoughts.push({ text: t, ...meta }));
      (s.privateAnalysis?.nextSteps   || []).forEach(t => nextSteps.push({ text: t, ...meta }));
    }

    const starredMein = (s.claudeTopics || []).filter(t => typeof t === 'object' && t.status === 'starred').map(t => t.text);
    allTopics.push(...starredMein);
  });

  const topicCount = {};
  allTopics.forEach(t => { topicCount[t] = (topicCount[t]||0)+1; });
  const topTopics = Object.entries(topicCount).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([t,c])=>({topic:t,count:c}));

  return { sessions: done, myWishes, myCommitments, myTasks, openTopics, keyThoughts, nextSteps, topTopics };
}

function renderPersonsView() {
  const el = document.getElementById('personsView');
  const persons = getAllPersons();
  const meine = getMeinProfilData();
  const meinTopics = meine.topTopics.slice(0,3).map(t=>t.topic);

  const meinCard = `
    <div class="person-card" onclick="renderMeinProfil()" style="
      border-color: rgba(108,99,255,0.4);
      background: linear-gradient(135deg, rgba(108,99,255,0.08), rgba(167,139,250,0.06));">
      <div style="font-size:0.67rem; font-weight:700; color:var(--accent2); letter-spacing:0.06em; text-transform:uppercase; margin-bottom:4px">Ich</div>
      <div class="person-card-name">Mein Profil</div>
      <div class="person-card-meta">${meine.sessions.length} Gespräch${meine.sessions.length!==1?'e':''} · alle Sitzungen</div>
      <div class="person-card-topics">${meinTopics.map(t=>`<span class="person-topic-chip">${escHtml(t)}</span>`).join('')}</div>
    </div>`;

  el.innerHTML = `<div style="max-width:900px; margin:0 auto; padding:4px 0 32px">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px">
      <h2 style="font-size:1.1rem; font-weight:700; display:flex;align-items:center;gap:7px">${icon('users',16)} Personen-Profile</h2>
      <span style="font-size:0.78rem; color:var(--muted)">${persons.length} Person${persons.length!==1?'en':''} + du</span>
    </div>
    <div class="person-grid">
      ${meinCard}
      ${persons.map(p => {
        const topicCount = {};
        p.topics.forEach(t => { topicCount[t] = (topicCount[t]||0)+1; });
        const top3 = Object.entries(topicCount).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([t])=>t);
        const lastDate = p.lastDate ? new Date(p.lastDate).toLocaleDateString('de-DE',{day:'numeric',month:'short',year:'numeric'}) : '–';
        return `<div class="person-card" onclick="renderPersonProfile('${escHtml(p.name).replace(/'/g,"\\'")}')">
          <div class="person-card-name">${escHtml(p.name)}</div>
          <div class="person-card-meta">${p.count} Gespräch${p.count!==1?'e':''} · zuletzt ${lastDate}</div>
          <div class="person-card-topics">${top3.map(t=>`<span class="person-topic-chip">${escHtml(t)}</span>`).join('')}</div>
        </div>`;
      }).join('')}
    </div>
    ${persons.length === 0 ? `<div style="font-size:0.8rem; color:var(--muted); margin-top:16px; text-align:center">
      Trage bei neuen Sitzungen im Feld "Beteiligte Personen" ein, mit wem du gesprochen hast.
    </div>` : ''}
  </div>`;
}

function renderMeinProfil() {
  const el   = document.getElementById('personsView');
  const data = getMeinProfilData();
  const typeIcons = { arbeit: icon('briefcase',12), privat: icon('message-circle',12), gedanken: icon('message-square',12) };

  const section = (title, items, renderItem) => items.length === 0 ? '' : `
    <div class="work-section">
      <div class="work-section-title">${title}</div>
      ${items.map(renderItem).join('')}
    </div>`;

  const itemRow = (ico, text, meta='') => `
    <div class="work-item"><span>${ico}</span>
      <div><div>${escHtml(text)}</div>${meta?`<div class="work-item-meta">${meta}</div>`:''}</div>
    </div>`;

  el.innerHTML = `<div style="max-width:820px; margin:0 auto; padding:4px 0 32px">

    <button class="profile-back" onclick="renderPersonsView()">← Alle Personen</button>

    <div class="profile-header">
      <div>
        <div class="profile-name">Mein Profil</div>
        <div class="profile-stats">
          ${data.sessions.length} Gespräch${data.sessions.length!==1?'e':''} insgesamt ·
          ${data.sessions.filter(s=>s.type==='gedanken').length} Gedanken-Sitzungen
        </div>
      </div>
      <button class="btn btn-primary" id="syntheseBtn" onclick="synthesizeMeinProfil()">
        ✦ Selbst-Synthese
      </button>
    </div>

    <div id="syntheseResult" style="display:none"></div>

    ${section(`${icon('target',13,'margin-right:5px')} Meine Wünsche & Ziele`, data.myWishes,
      w => itemRow('→', w.text, `${w.dateStr} · ${w.sessionLabel}`))}

    ${section(`${icon('check',13,'margin-right:5px')} Meine Vereinbarungen`, data.myCommitments,
      c => itemRow(icon('check',11,'color:var(--green)'), c.text, `${c.dateStr} · ${c.sessionLabel}`))}

    ${section(`${icon('check-circle',13,'margin-right:5px')} Meine Aufgaben`, data.myTasks,
      t => itemRow(icon('square',12), t.task, [t.deadline?'Fällig: '+t.deadline:'', t.dateStr, t.sessionLabel].filter(Boolean).join(' · ')))}

    ${section(`${icon('lightbulb',13,'margin-right:5px')} Kerngedanken (aus Gedanken-Sitzungen)`, data.keyThoughts,
      t => itemRow('→', t.text, `${t.dateStr} · ${t.sessionLabel}`))}

    ${section(`${icon('skip-forward',13,'margin-right:5px')} Nächste Schritte`, data.nextSteps,
      t => itemRow(icon('square',12), t.text, `${t.dateStr} · ${t.sessionLabel}`))}

    ${section(`${icon('clock',13,'margin-right:5px')} Offene Themen (aus allen Gesprächen)`, data.openTopics.slice(0,15),
      t => itemRow('○', t.text, `${t.dateStr} · ${t.sessionLabel}`))}

    ${data.topTopics.length ? `<div class="work-section">
      <div class="work-section-title">${icon('tag',13,'margin-right:5px')} Häufigste Themen deiner Gespräche</div>
      <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:4px">
        ${data.topTopics.map(t=>`<span class="person-topic-chip" style="font-size:0.72rem">${escHtml(t.topic)}${t.count>1?` ×${t.count}`:''}</span>`).join('')}
      </div>
    </div>` : ''}

    <div class="work-section">
      <div class="work-section-title">${icon('calendar',13,'margin-right:5px')} Alle Sitzungen</div>
      ${data.sessions.map(s => {
        const d = new Date(s.date).toLocaleDateString('de-DE',{day:'numeric',month:'short',year:'numeric'});
        const t = s.type || 'privat';
        return `<div class="profile-session-row" onclick="showTranscript(sessions.find(x=>x.id==='${s.id}'))">
          <span class="profile-session-type sc-type sc-type-${t}" style="display:inline-flex;align-items:center;gap:3px">${typeIcons[t]||icon('message-circle',12)}</span>
          <span class="profile-session-date">${d}</span>
          <span>${escHtml(s.label)}</span>
        </div>`;
      }).join('')}
    </div>

  </div>`;
}

async function synthesizeMeinProfil() {
  const btn    = document.getElementById('syntheseBtn');
  const result = document.getElementById('syntheseResult');
  if (!anthropicKey) { showToast('Kein Anthropic API-Key gesetzt', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="synthese-spin">✦</span> Wird erstellt…';
  result.style.display = 'block';
  result.innerHTML = `<div class="synthese-box" style="color:var(--muted)">Claude analysiert deine Gespräche und Gedanken…</div>`;

  const data = getMeinProfilData();
  const lines = [];
  lines.push(`Gespräche insgesamt: ${data.sessions.length}`);
  lines.push(`Davon Gedanken-Sitzungen: ${data.sessions.filter(s=>s.type==='gedanken').length}`);
  if (data.topTopics.length)    lines.push(`Häufigste Themen: ${data.topTopics.map(t=>t.topic).join(', ')}`);
  if (data.myWishes.length)     lines.push(`Eigene Wünsche & Ziele:\n${data.myWishes.slice(0,8).map(w=>'- '+w.text).join('\n')}`);
  if (data.myCommitments.length)lines.push(`Vereinbarungen die ich eingegangen bin:\n${data.myCommitments.slice(0,6).map(c=>'- '+c.text).join('\n')}`);
  if (data.keyThoughts.length)  lines.push(`Kerngedanken aus Reflexionen:\n${data.keyThoughts.slice(0,6).map(t=>'- '+t.text).join('\n')}`);
  if (data.openTopics.length)   lines.push(`Offene Themen:\n${data.openTopics.slice(0,6).map(t=>'- '+t.text).join('\n')}`);

  const prompt = getEditablePromptText('builtin_self_synthesis')
    .replace(/\{\{personData\}\}/g, lines.join('\n\n'));

  try {
    const { text, inputTokens, outputTokens } = await callClaudeAPI(prompt);
    if (data.sessions[0]) {
      addTokensToSession(data.sessions[0], inputTokens, outputTokens);
      saveSessions();
      saveToArchive(data.sessions[0]).catch(()=>{});
    }
    result.innerHTML = `<div class="synthese-box">${escHtml(text)}</div>`;
  } catch(e) {
    result.innerHTML = `<div class="synthese-box" style="color:var(--red)">Fehler: ${escHtml(e.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✦ Selbst-Synthese';
  }
}

function renderPersonProfile(name) {
  const el   = document.getElementById('personsView');
  const data = getPersonData(name);
  const typeIcons2 = { arbeit: icon('briefcase',12), privat: icon('message-circle',12), gedanken: icon('message-square',12) };

  const firstDate = data.firstContact ? new Date(data.firstContact).toLocaleDateString('de-DE',{month:'long',year:'numeric'}) : '–';
  const lastDate  = data.lastContact  ? new Date(data.lastContact).toLocaleDateString('de-DE',{month:'long',year:'numeric'}) : '–';

  const section = (title, items, renderItem) => items.length === 0 ? '' : `
    <div class="work-section">
      <div class="work-section-title">${title}</div>
      ${items.map(renderItem).join('')}
    </div>`;

  const itemRow = (ico, text, meta='') => `
    <div class="work-item"><span>${ico}</span>
      <div><div>${escHtml(text)}</div>${meta ? `<div class="work-item-meta">${meta}</div>` : ''}</div>
    </div>`;

  el.innerHTML = `<div style="max-width:820px; margin:0 auto; padding:4px 0 32px">

    <button class="profile-back" onclick="renderPersonsView()">← Alle Personen</button>

    <div class="profile-header">
      <div style="flex:1; min-width:0">
        <div class="profile-name">${escHtml(name)}</div>
        <div class="profile-stats">
          ${data.sessions.length} Gespräch${data.sessions.length!==1?'e':''}
          ${data.firstContact !== data.lastContact ? ` · ${firstDate} – ${lastDate}` : ` · ${lastDate}`}
        </div>
        <div style="margin-top:8px; display:flex; align-items:center; gap:8px">
          <span style="font-size:0.76rem; color:var(--muted); white-space:nowrap; display:inline-flex;align-items:center;gap:4px">${icon('link',11)} Beziehung:</span>
          <input id="relCtxInput"
            type="text"
            value="${escHtml(getRelationship(name))}"
            placeholder="z.B. Freundin · Kollegin · Vorgesetzte · Therapeutin"
            style="flex:1; background:var(--surface2); border:1px solid var(--border); border-radius:6px; padding:5px 10px; color:var(--text); font-size:0.81rem; outline:none; transition:border-color 0.2s"
            onfocus="this.style.borderColor='var(--accent)'"
            onblur="this.style.borderColor='var(--border)'; saveRelationship('${escHtml(name).replace(/'/g,"\\'")}', this.value)"
            onkeydown="if(event.key==='Enter') this.blur()" />
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:flex-start; flex-wrap:wrap">
        <button class="btn btn-primary" id="syntheseBtn" onclick="synthesizePerson('${escHtml(name).replace(/'/g,"\\'")}')">
          ✦ Profil-Synthese
        </button>
        <button class="btn btn-ghost" title="Person ausblenden (reversibel)"
          onclick="deletePerson('${escHtml(name).replace(/'/g,"\\'")}')">Ausblenden</button>
        <button class="btn btn-ghost" title="Person endgültig löschen" style="color:var(--red); border-color:rgba(239,68,68,0.3); display:inline-flex;align-items:center;gap:5px"
          onclick="deletePersonPermanently('${escHtml(name).replace(/'/g,"\\'")}'">${icon('trash-2',12)} Löschen</button>
      </div>
    </div>

    <div id="syntheseResult" style="display:none"></div>

    ${section(`${icon('target',13,'margin-right:5px')} Wünsche & Bedürfnisse`, data.wishes,
      w => itemRow('→', w.text, `${w.dateStr} · ${w.sessionLabel}`))}

    ${section(`${icon('check',13,'margin-right:5px')} Vereinbarungen`, data.agreements,
      a => itemRow(icon('check',11,'color:var(--green)'), a.text, `${a.dateStr} · ${a.sessionLabel}`))}

    ${section(`${icon('clock',13,'margin-right:5px')} Offene Themen`, data.openTopics,
      t => itemRow('○', t.text, `${t.dateStr} · ${t.sessionLabel}`))}

    ${section(`${icon('check-circle',13,'margin-right:5px')} Aufgaben (Arbeit)`, data.workTasks,
      t => itemRow(icon('square',12), t.task, `${t.person ? t.person : ''} ${t.deadline ? '· Fällig: '+t.deadline : ''} · ${t.dateStr}`))}

    ${data.topTopics.length ? `<div class="work-section">
      <div class="work-section-title">${icon('tag',13,'margin-right:5px')} Häufige Themen</div>
      <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:4px">
        ${data.topTopics.map(t=>`<span class="person-topic-chip" style="font-size:0.72rem">${escHtml(t.topic)}${t.count>1?` ×${t.count}`:''}</span>`).join('')}
      </div>
    </div>` : ''}

    <div class="work-section">
      <div class="work-section-title">${icon('calendar',13,'margin-right:5px')} Gespräche</div>
      ${data.sessions.map(s => {
        const d = new Date(s.date).toLocaleDateString('de-DE',{day:'numeric',month:'short',year:'numeric'});
        const t = s.type || 'privat';
        return `<div class="profile-session-row" onclick="showTranscript(sessions.find(x=>x.id==='${s.id}'))">
          <span class="profile-session-type sc-type sc-type-${t}" style="display:inline-flex;align-items:center;gap:3px">${typeIcons2[t]||icon('message-circle',12)}</span>
          <span class="profile-session-date">${d}</span>
          <span>${escHtml(s.label)}</span>
        </div>`;
      }).join('')}
    </div>

  </div>`;
}

async function synthesizePerson(name) {
  const btn = document.getElementById('syntheseBtn');
  const result = document.getElementById('syntheseResult');
  if (!anthropicKey) { showToast('Kein Anthropic API-Key gesetzt', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="synthese-spin">✦</span> Wird erstellt…';
  result.style.display = 'block';
  result.innerHTML = `<div class="synthese-box" style="color:var(--muted)">Claude analysiert alle Gespräche mit ${escHtml(name)}…</div>`;

  const data = getPersonData(name);
  const firstDate = data.firstContact ? new Date(data.firstContact).toLocaleDateString('de-DE') : '–';
  const lastDate  = data.lastContact  ? new Date(data.lastContact).toLocaleDateString('de-DE')  : '–';

  const relContext = getRelationship(name);
  const lines = [];
  lines.push(`Person: ${name}`);
  if (relContext) lines.push(`Beziehung des Nutzers zu ${name}: ${relContext}`);
  lines.push(`Gespräche: ${data.sessions.length} (${firstDate} – ${lastDate})`);
  if (data.topTopics.length)   lines.push(`Häufige Themen: ${data.topTopics.map(t=>t.topic).join(', ')}`);
  if (data.wishes.length)      lines.push(`Wünsche/Bedürfnisse:\n${data.wishes.slice(0,8).map(w=>'- '+w.text).join('\n')}`);
  if (data.agreements.length)  lines.push(`Vereinbarungen:\n${data.agreements.slice(0,6).map(a=>'- '+a.text).join('\n')}`);
  if (data.openTopics.length)  lines.push(`Offene Themen:\n${data.openTopics.slice(0,6).map(t=>'- '+t.text).join('\n')}`);

  const prompt = getEditablePromptText('builtin_person_profile')
    .replace(/\{\{personData\}\}/g, lines.join('\n\n'))
    .replace(/\{\{personName\}\}/g, name);

  try {
    const { text, inputTokens, outputTokens } = await callClaudeAPI(prompt);
    // Tokens auf erste verfügbare Session dieser Person buchen
    if (data.sessions[0]) {
      addTokensToSession(data.sessions[0], inputTokens, outputTokens);
      saveSessions();
      saveToArchive(data.sessions[0]).catch(()=>{});
    }
    result.innerHTML = `<div class="synthese-box">${escHtml(text)}</div>`;
  } catch(e) {
    result.innerHTML = `<div class="synthese-box" style="color:var(--red)">Fehler: ${escHtml(e.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✦ Profil-Synthese';
  }
}

function renderCostsView() {
  const el = document.getElementById('costsView');
  if (!el) return;

  const done = sessions.filter(s => s.status === 'done' || (s.utterances && s.utterances.length > 0));
  if (done.length === 0) {
    el.innerHTML = '<div class="browser-empty">Noch keine abgeschlossenen Sitzungen vorhanden.</div>';
    return;
  }

  // Gesamtkosten – werden nach byMonth-Aufbau aus den Monatssummen aggregiert (weiter unten).
  // Vorläufige Initialisierung, Werte werden nach der Monatsgruppierung gesetzt.
  let totalAsmEur = 0, totalClaudeEur = 0;

  // Monatsgruppen:
  // AssemblyAI-Kosten  → Transkriptionsdatum (processedAt), Fallback date
  // Claude-Kosten      → je Log-Eintrag einzeln mit eigenem Datum (claudeCostLog)
  //                      Fallback für alte Sitzungen: claudeLastCallAt / processedAt
  const byMonth = {};

  const getOrCreateMonth = (dateStr) => {
    const d   = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const lbl = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    if (!byMonth[key]) byMonth[key] = { label: lbl, sessions: new Map(), asmEur: 0, claudeEur: 0 };
    return key;
  };

  const getOrCreateEntry = (key, s) => {
    if (!byMonth[key].sessions.has(s.id))
      byMonth[key].sessions.set(s.id, { s, asmEur: 0, claudeEur: 0 });
    return byMonth[key].sessions.get(s.id);
  };

  done.forEach(s => {
    const rate = getSessionRate(s);
    const c    = calculateSessionCost(s);

    // AssemblyAI → Transkriptions-Monat
    const keyAsm = getOrCreateMonth(s.processedAt || s.date);
    const asmEur = c.assemblyai * rate;
    byMonth[keyAsm].asmEur += asmEur;
    getOrCreateEntry(keyAsm, s).asmEur += asmEur;

    // Claude → je Log-Eintrag einzeln
    if (s.claudeCostLog && s.claudeCostLog.length > 0) {
      s.claudeCostLog.forEach(entry => {
        const keyCla    = getOrCreateMonth(entry.date);
        const claudeEur = calcLogEntryCost(entry) * rate;
        byMonth[keyCla].claudeEur += claudeEur;
        getOrCreateEntry(keyCla, s).claudeEur += claudeEur;
      });
    } else if (c.claude > 0) {
      // Fallback für alte Sitzungen ohne Log
      const keyCla    = getOrCreateMonth(s.claudeLastCallAt || s.processedAt || s.date);
      const claudeEur = c.claude * rate;
      byMonth[keyCla].claudeEur += claudeEur;
      getOrCreateEntry(keyCla, s).claudeEur += claudeEur;
    }
  });
  // Map → Array für Rendering
  Object.values(byMonth).forEach(m => { m.sessions = Array.from(m.sessions.values()); });

  // Gesamtsummen aus Monatswerten ableiten (korrekte Zuordnung nach Kostenentstehungs-Zeitpunkt)
  Object.values(byMonth).forEach(m => {
    totalAsmEur    += m.asmEur;
    totalClaudeEur += m.claudeEur;
  });
  const totalAllEur = totalAsmEur + totalClaudeEur;

  const pricingUpdated = PRICING.assemblyai.updatedAt;

  el.innerHTML = `
  <div style="max-width:820px; margin:0 auto; padding:8px 0 32px">

    <!-- Gesamtübersicht -->
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:28px">
      ${costCard(icon('mic',13,'margin-right:4px') + ' AssemblyAI', PRICING.assemblyai.model, fmtEur(totalAsmEur),
          `$${(PRICING.assemblyai.perMinute + PRICING.assemblyai.diarizationPerMin).toFixed(4)}/min (inkl. Diarization)`,
          PRICING.assemblyai.source)}
      ${costCard('✦ Claude', PRICING.claude.model, fmtEur(totalClaudeEur),
          `$${(PRICING.claude.inputPerMToken / 1e6).toFixed(7)}/Token Input · $${(PRICING.claude.outputPerMToken / 1e6).toFixed(7)}/Token Output`,
          PRICING.claude.source)}
      <div style="background:rgba(108,99,255,0.1); border:1px solid rgba(108,99,255,0.3);
                  border-radius:12px; padding:18px; text-align:center">
        <div style="font-size:0.75rem; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.06em">Gesamt</div>
        <div style="font-size:1.8rem; font-weight:800; color:var(--accent2)">${fmtEur(totalAllEur)}</div>
        <div style="font-size:0.72rem; color:var(--muted); margin-top:6px">${done.length} Sitzung${done.length!==1?'en':''}</div>
        <div style="font-size:0.65rem; color:var(--muted); margin-top:8px; border-top:1px solid var(--border); padding-top:8px">
          Preise Stand: ${pricingUpdated}
        </div>
      </div>
    </div>

    <!-- Monatsweise Aufschlüsselung -->
    ${Object.keys(byMonth).sort().reverse().map(key => {
      const m = byMonth[key];
      const mTotalEur = m.asmEur + m.claudeEur;
      return `
      <div style="margin-bottom:24px">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px">
          <h3 style="font-size:0.88rem; font-weight:700; color:var(--accent2)">${m.label}</h3>
          <span style="font-size:0.82rem; color:var(--green); font-weight:600">${fmtEur(mTotalEur)}</span>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem">
          <thead>
            <tr style="color:var(--muted); font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em">
              <th style="text-align:left; padding:6px 8px; border-bottom:1px solid var(--border)">Sitzung</th>
              <th style="text-align:left; padding:6px 8px; border-bottom:1px solid var(--border)">Datum</th>
              <th style="text-align:right; padding:6px 8px; border-bottom:1px solid var(--border)">Dauer</th>
              <th style="text-align:right; padding:6px 8px; border-bottom:1px solid var(--border)">AssemblyAI</th>
              <th style="text-align:right; padding:6px 8px; border-bottom:1px solid var(--border)">Claude</th>
              <th style="text-align:right; padding:6px 8px; border-bottom:1px solid var(--border)">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            ${m.sessions.map(({s, asmEur, claudeEur}) => {
              const rowTotal = asmEur + claudeEur;
              // Tooltip zeigt alle Log-Einträge dieser Session
              const logTip = (s.claudeCostLog && s.claudeCostLog.length > 1)
                ? `${s.claudeCostLog.length} Analyse-Aufrufe`
                : '';
              return `
            <tr style="border-bottom:1px solid var(--border); cursor:pointer"
                onclick="showTranscript(sessions.find(x=>x.id==='${s.id}'))"
                onmouseover="this.style.background='rgba(108,99,255,0.05)'"
                onmouseout="this.style.background=''">
              <td style="padding:8px 8px; font-weight:600; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${escHtml(s.label)}</td>
              <td style="padding:8px 8px; color:var(--muted)">
                <div>${new Date(s.processedAt || s.date).toLocaleDateString('de-DE')}</div>
                ${s.claudeLastCallAt ? `<div style="font-size:0.68rem;opacity:0.6;margin-top:2px">${icon('sparkles',10,'margin-right:2px;vertical-align:middle')}Analyse: ${new Date(s.claudeLastCallAt).toLocaleDateString('de-DE')}${logTip ? ` (${logTip})` : ''}</div>` : ''}
              </td>
              <td style="padding:8px 8px; text-align:right; color:var(--muted)">${s.duration ? formatDuration(s.duration) : '?'}</td>
              <td style="padding:8px 8px; text-align:right">${asmEur > 0 ? fmtEur(asmEur) : '—'}</td>
              <td style="padding:8px 8px; text-align:right">${claudeEur > 0 ? fmtEur(claudeEur) : '—'}</td>
              <td style="padding:8px 8px; text-align:right; font-weight:700; color:var(--green)">${fmtEur(rowTotal)}</td>
            </tr>`;}).join('')}
            <tr style="font-weight:700; font-size:0.78rem; color:var(--muted); background:rgba(255,255,255,0.02)">
              <td colspan="3" style="padding:8px 8px">Monatssumme</td>
              <td style="padding:8px 8px; text-align:right">${fmtEur(m.asmEur)}</td>
              <td style="padding:8px 8px; text-align:right">${fmtEur(m.claudeEur)}</td>
              <td style="padding:8px 8px; text-align:right; color:var(--green)">${fmtEur(mTotalEur)}</td>
            </tr>
          </tbody>
        </table>
      </div>`;
    }).join('')}

    <!-- Preishinweis -->
    <div style="margin-top:16px; padding:12px 16px; background:rgba(107,114,128,0.08);
                border:1px solid var(--border); border-radius:10px; font-size:0.75rem; color:var(--muted); line-height:1.6">
      <strong style="color:var(--text); display:inline-flex; align-items:center; gap:4px">${icon('info',13)} Preishinweis</strong> – Stand ${pricingUpdated} · Fallback-Kurs 1 USD = ${USD_TO_EUR_FALLBACK} € (Tageskurs wird pro Sitzung gespeichert)<br>
      Originalpreise der Anbieter sind in USD. Alle Beträge hier in Euro umgerechnet.<br>
      AssemblyAI: <a href="${PRICING.assemblyai.source}" target="_blank" style="color:var(--accent)">assemblyai.com/pricing</a> ·
      Claude: <a href="${PRICING.claude.source}" target="_blank" style="color:var(--accent)">platform.claude.com/docs/pricing</a><br>
      Claude-Kosten werden erst nach einer Analyse angezeigt (Token-Tracking ab v2.2).
      Bestehende Sitzungen ohne Token-Daten zeigen nur AssemblyAI-Kosten.
    </div>
  </div>`;
}

function costCard(title, model, amount, pricing, source) {
  return `<div style="background:var(--surface2); border:1px solid var(--border); border-radius:12px; padding:18px">
    <div style="font-size:0.75rem; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.06em">${title}</div>
    <div style="font-size:1.6rem; font-weight:800; color:var(--text); margin-bottom:6px">${amount}</div>
    <div style="font-size:0.68rem; color:var(--muted); margin-bottom:4px">${model}</div>
    <div style="font-size:0.68rem; color:var(--muted); border-top:1px solid var(--border); padding-top:8px; margin-top:8px">
      ${pricing}<br>
      <a href="${source}" target="_blank" style="color:var(--accent)">Preisseite →</a>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════
