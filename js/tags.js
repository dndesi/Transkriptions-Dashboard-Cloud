// TAGS
// ═══════════════════════════════════════════════════
function handleTagInput(e) {
  if (e.key !== 'Enter' && e.key !== ',') return;
  e.preventDefault();
  const val = e.target.value.trim().replace(/,/g,'');
  if (!val) return;
  addTag(val);
  e.target.value = '';
}

function addTag(tag) {
  const s = getSession();
  if (!s) return;
  if (!s.tags) s.tags = [];
  if (s.tags.includes(tag)) return;
  s.tags.push(tag);
  saveSessions();
  saveToArchive(s);
  renderTagChips(s);
  updateTagFilter();
}

function removeTag(tag) {
  const s = getSession();
  if (!s || !s.tags) return;
  s.tags = s.tags.filter(t => t !== tag);
  saveSessions();
  saveToArchive(s);
  renderTagChips(s);
  updateTagFilter();
}

function renderTagChips(session) {
  const wrap = document.getElementById('tagChips');
  if (!wrap) return;
  wrap.innerHTML = '';
  (session.tags || []).forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${escHtml(tag)}<span class="tag-remove" onclick="removeTag('${escHtml(tag)}')">×</span>`;
    wrap.appendChild(chip);
  });
}

function updateTagFilter() {
  const sel = document.getElementById('tagFilter');
  if (!sel) return;
  const allTags = [...new Set(sessions.flatMap(s => s.tags || []))].sort();
  const cur = sel.value;
  sel.innerHTML = '<option value="">Alle Tags</option>';
  allTags.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = '🏷 ' + t;
    if (t === cur) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ═══════════════════════════════════════════════════
