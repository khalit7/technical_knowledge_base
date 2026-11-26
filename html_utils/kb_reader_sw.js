// ---- The paper reader's service worker: build_site.py publishes it as paper/sw.js next to each reader page, so it controls only the
// reader page (paper/). It only steps in when the network fails: then it answers from the cache the reader fills
// (html_utils/kb_reader.js: the page, the reader, the buddy, pdf.js and the arXiv PDF). Only GET requests to this site
// or to arxiv.org are handled; the Claude and GitHub calls (notes, keys) never pass through it and nothing of theirs is ever stored.
const CACHE = 'kb-reader-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const q = e.request; if (q.method !== 'GET') return;
  const u = new URL(q.url); if (u.origin !== self.location.origin && u.hostname !== 'arxiv.org') return;
  e.respondWith((async () => {
    try {
      const r = await fetch(q);
      // a file the reader kept is refreshed when it comes back from the network
      // (pdf.js's fonts, character maps and decoders, in a folder named by its version, are kept as a paper asks for them)
      if (r.ok && (r.type === 'basic' || r.type === 'cors')) { const cp = r.clone(), lib = u.origin === self.location.origin && /\/lib\/pdfjs-[^/]+\/(standard_fonts|cmaps|wasm|iccs)\//.test(u.pathname); e.waitUntil(caches.open(CACHE).then(async c => { if (lib || await c.match(q.url)) await c.put(q.url, cp) }).catch(() => {})) }
      return r;
    } catch(err) {
      const c = await caches.open(CACHE), key = q.url.split('#')[0];
      return (await c.match(key)) || (q.mode === 'navigate' && await c.match(key, {ignoreSearch:true})) || Response.error();
    }
  })());
});
