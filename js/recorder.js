// DIREKTAUFNAHME
// ═══════════════════════════════════════════════════
let mediaRecorder = null;
let recordedChunks = [];
let recordTimer = null;
let recordSeconds = 0;

async function toggleRecording() {
  if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
    stopRecording();
  } else {
    await startRecording();
  }
}

// v6.8: Pause / Resume
function togglePause() {
  if (!mediaRecorder) return;
  if (mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    clearInterval(recordTimer);
    const lbl = document.getElementById('pauseBtnLabel');
    if (lbl) lbl.innerHTML = icon('play',13,'') + ' Fortsetzen';
    const dot = document.getElementById('recordDot');
    if (dot) dot.classList.remove('pulse');
    document.getElementById('recordBtnLabel').textContent = `⏸ Pausiert (${formatMs(recordSeconds*1000)})`;
  } else if (mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
    recordTimer = setInterval(() => {
      recordSeconds++;
      document.getElementById('recordBtnLabel').textContent = `⏹ Stopp (${formatMs(recordSeconds*1000)})`;
    }, 1000);
    const lbl = document.getElementById('pauseBtnLabel');
    if (lbl) lbl.innerHTML = icon('pause',13,'') + ' Pause';
    const dot = document.getElementById('recordDot');
    if (dot) dot.classList.add('pulse');
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      const file = new File([blob], `Aufnahme_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`, { type: 'audio/webm' });
      processFile(file);
      resetRecordBtn();
    };
    mediaRecorder.start();
    recordSeconds = 0;
    const btn = document.getElementById('recordBtn');
    const dot = document.getElementById('recordDot');
    btn.classList.add('recording');
    dot.classList.add('pulse');
    // Pause-Button einblenden
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
      pauseBtn.style.display = 'block';
      pauseBtn.innerHTML = '<span id="pauseBtnLabel" style="display:inline-flex;align-items:center;gap:5px">' + icon('pause',13,'') + ' Pause</span>';
    }
    recordTimer = setInterval(() => {
      recordSeconds++;
      document.getElementById('recordBtnLabel').textContent = `⏹ Stopp (${formatMs(recordSeconds*1000)})`;
    }, 1000);
    document.getElementById('recordBtnLabel').textContent = '⏹ Aufnahme läuft…';
  } catch(e) {
    showToast('Mikrofon-Zugriff verweigert: ' + e.message, 'error');
  }
}

function stopRecording() {
  if (mediaRecorder) mediaRecorder.stop();
  clearInterval(recordTimer);
}

function resetRecordBtn() {
  clearInterval(recordTimer);
  const btn = document.getElementById('recordBtn');
  const dot = document.getElementById('recordDot');
  if (btn) btn.classList.remove('recording');
  if (dot) dot.classList.remove('pulse');
  const lbl = document.getElementById('recordBtnLabel');
  if (lbl) lbl.innerHTML = icon('mic',13,'margin-right:5px') + ' Direkt aufnehmen';
  // Pause-Button ausblenden + zurücksetzen
  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) {
    pauseBtn.style.display = 'none';
    const pauseLbl = document.getElementById('pauseBtnLabel');
    if (pauseLbl) pauseLbl.innerHTML = icon('pause',13,'') + ' Pause';
  }
}

// ═══════════════════════════════════════════════════
// VORLAGEN-POPOVER
// ═══════════════════════════════════════════════════
function toggleTemplatePopover(wrapId) {
  const popover = document.querySelector(`#${wrapId} .template-popover`);
  if (!popover) return;
  const isOpen = popover.classList.contains('open');
  // Alle schließen
  document.querySelectorAll('.template-popover').forEach(p => p.classList.remove('open'));
  if (!isOpen) popover.classList.add('open');
}

// Schließt Popover bei Klick außerhalb
document.addEventListener('click', e => {
  if (!e.target.closest('.claude-btn-wrap')) {
    document.querySelectorAll('.template-popover').forEach(p => p.classList.remove('open'));
  }
});

// ═══════════════════════════════════════════════════
