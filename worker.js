/**
 * Distill Voice – Cloudflare Worker
 * ===================================
 * Handles two routes:
 *
 *   DELETE /:transcriptId?region=eu
 *     → CORS-Proxy für AssemblyAI DELETE-Requests (GitHub Pages → AssemblyAI)
 *
 *   GET /proxy?url=https://...
 *     → Holt beliebige URLs serverseitig und gibt Inhalt mit CORS-Headern zurück.
 *       Wird für Design-Link-Vorschauen (claude.ai Share-Links) genutzt.
 *
 * Deployment:
 *   1. https://dash.cloudflare.com → Workers & Pages → neuen Worker erstellen
 *   2. Diesen Code einfügen und deployen
 *   3. Worker-URL in Distill Voice unter Einstellungen → Cloudflare Worker eintragen
 *      (Basis-URL reicht, z.B. https://abc.workers.dev)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // ── GET /proxy?url=https://... ─────────────────────────────────────────────
  // Holt eine externe URL serverseitig (kein CORS-Problem) und gibt den Inhalt zurück.
  // Client erstellt daraus eine Blob-URL für iframe-Vorschauen.
  if (request.method === 'GET' && url.pathname === '/proxy') {
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Nur HTTP/HTTPS erlauben
    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (!['http:', 'https:'].includes(parsedTarget.protocol)) {
      return new Response(JSON.stringify({ error: 'Only http/https allowed' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    try {
      const resp = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,*/*',
        },
      });

      const contentType = resp.headers.get('content-type') || 'text/html; charset=utf-8';
      const body = await resp.arrayBuffer();

      return new Response(body, {
        status: resp.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=300', // 5 Minuten cachen
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Proxy fetch failed: ' + e.message }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  }

  // ── DELETE /:transcriptId?region=eu ───────────────────────────────────────
  // Löscht ein AssemblyAI-Transkript. GitHub Pages darf keine Cross-Origin
  // DELETE-Requests senden – der Worker übernimmt das.
  if (request.method === 'DELETE') {
    // Pfad: /abc123 oder /delete/abc123 (beides akzeptieren)
    const parts = url.pathname.replace(/^\//, '').split('/').filter(Boolean);
    const transcriptId = parts[parts.length - 1]; // letztes Segment = ID

    if (!transcriptId) {
      return new Response(JSON.stringify({ error: 'Missing transcript ID' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const region = url.searchParams.get('region');
    const assemblyBase = region === 'eu'
      ? 'https://api.eu.assemblyai.com'
      : 'https://api.assemblyai.com';

    const assemblyUrl = `${assemblyBase}/v2/transcript/${transcriptId}`;
    const authHeader = request.headers.get('authorization') || '';

    try {
      const resp = await fetch(assemblyUrl, {
        method: 'DELETE',
        headers: { authorization: authHeader },
      });

      const body = await resp.text();
      return new Response(body, {
        status: resp.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Delete failed: ' + e.message }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Not found', {
    status: 404,
    headers: CORS_HEADERS,
  });
}
