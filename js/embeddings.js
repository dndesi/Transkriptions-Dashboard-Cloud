// ═══════════════════════════════════════════════════
// EMBEDDINGS.JS – Lokale Semantiksuche via Transformers.js v6.25
// Modell: paraphrase-multilingual-MiniLM-L12-v2 (~118 MB, einmalig geladen)
// Vektoren werden in IndexedDB gecacht (key: 'emb_<sessionId>')
// Kein API-Call, kein Token-Verbrauch — läuft vollständig im Browser
// ═══════════════════════════════════════════════════

const EMB_MODEL  = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const EMB_PREFIX = 'emb_';

// Singleton-Promise: Modell wird nur einmal geladen
let _embPipelinePromise = null;

// ── Modell laden (lazy, Singleton) ───────────────────
async function embInit(onProgress) {
  if (!_embPipelinePromise) {
    _embPipelinePromise = (async () => {
      const mod = await import(
        'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js'
      );
      const { pipeline, env } = mod;
      env.allowLocalModels = false;

      return pipeline('feature-extraction', EMB_MODEL, {
        progress_callback: (p) => {
          if (onProgress && p.status === 'downloading' && p.total) {
            const pct = Math.round((p.loaded / p.total) * 100);
            onProgress(`Modell lädt: ${pct}%`);
          }
        }
      });
    })();
  }
  return _embPipelinePromise;
}

// ── Kompakten Suchtext aus Session extrahieren ────────
// Wird gecacht — daher maximal ~512 Zeichen (Modell-Limit)
function embBuildText(session) {
  const parts = [
    session.label || '',
    session.privateAnalysis?.kernbefund || session.privateAnalysis?.summary?.slice(0, 200) || '',
    session.workAnalysis?.kernbefund    || session.workAnalysis?.summary?.slice(0, 200)    || '',
    (session.tags        || []).join(' '),
    (session.claudeTopics || []).map(t => typeof t === 'object' ? t.text : t).join(' '),
    (session.persons     || []).join(' '),
  ];
  return parts.filter(Boolean).join(' ').slice(0, 512);
}

// ── Embedding-Vektor berechnen ────────────────────────
async function embGetVector(text, onProgress) {
  const pipe   = await embInit(onProgress);
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data); // Float32Array → normales Array (IDB-kompatibel)
}

// ── Cosine Similarity (beide Vektoren normalisiert → einfaches Dot-Produkt) ──
function embCosineSim(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // Bei normalisierten Vektoren = cosine similarity
}

// ── Vektor aus IDB-Cache holen oder neu berechnen ─────
async function embGetOrCompute(session, onProgress) {
  const key = EMB_PREFIX + session.id;
  let vec = await _idbGet(key);
  if (!vec || !Array.isArray(vec)) {
    const text = embBuildText(session);
    if (!text.trim()) return null;
    vec = await embGetVector(text, onProgress);
    await _idbSet(key, vec);
  }
  return vec;
}

// ── Vektor einer Session invalidieren ─────────────────
// Aufrufen wenn kernbefund/tags der Session sich ändern
async function embInvalidate(sessionId) {
  try { await _idbSet(EMB_PREFIX + sessionId, null); } catch(e) {}
}

// ── Semantische Suche ─────────────────────────────────
// Gibt Top-N Sessions sortiert nach Relevanz zurück
async function embSearch(query, sessions, topN = 8, onProgress) {
  // 1. Query embedden (Modell wird hier ggf. geladen)
  if (onProgress) onProgress('Analysiere Anfrage…');
  const queryVec = await embGetVector(query);

  // 2. Alle Session-Vektoren berechnen/aus Cache laden
  const scored = [];
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    if (onProgress) onProgress(`Vergleiche ${i + 1} / ${sessions.length}…`);
    const vec = await embGetOrCompute(s);
    if (!vec) continue;
    const score = embCosineSim(queryVec, vec);
    scored.push({ session: s, score });
  }

  // 3. Filtern + sortieren
  return scored
    .filter(x => x.score > 0.20)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
