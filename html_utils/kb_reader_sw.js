// ---- The paper reader's service worker: build_site.py publishes it as paper/sw.js next to each reader page, so it controls only the
// reader pages (paper/ and paper/pdf/). It only steps in when the network fails: then it answers from the cache the reader fills
// (html_utils/kb_reader.js: the page, the reader, the buddy, pdf.js, the arXiv file and its figures). Only GET requests to this site
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
      if (r.ok && (r.type === 'basic' || r.type === 'cors')) { const cp = r.clone(); e.waitUntil(caches.open(CACHE).then(async c => { if (await c.match(q.url)) await c.put(q.url, cp) }).catch(() => {})) }
      return r;
    } catch(err) {
      const c = await caches.open(CACHE), key = q.url.split('#')[0];
      return (await c.match(key)) || (q.mode === 'navigate' && await c.match(key, {ignoreSearch:true})) || Response.error();
    }
  })());
});
