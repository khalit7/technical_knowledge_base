// End-to-end smoke test of the AI buddy (html_utils/kb_buddy.js), in Chromium and in WebKit (the engine of Safari on the iPad).
// usage: node html_utils/buddy_test.mjs [chromium|webkit]      (no argument: Chromium, then WebKit)
// Serves the repo on a free local port and opens the Activation functions page from the working tree, so the page's loader fetches
// html_utils/kb_buddy.js as it is now. Nothing leaves the machine: api.anthropic.com is a fake Claude (it answers with the line a check
// queued, streamed as the API streams it, or as one JSON message when the request does not ask for a stream; every request is kept so
// a check can read it), api.github.com is an in-memory notes repo behind the contents API as the buddy uses it, the handwriting font's
// stylesheet is empty, and any other outside request is aborted and fails the visit. The key and the token are made-up test values.
// Seven visits, each in a fresh browser context (its own storage, fake Claude and fake repo), so they do not depend on each other:
//   first visit  1  no key and no token: the toolbar loads (and nothing else), its Claude and sync buttons say Claude key and Sync key;
//                   a pen stroke is a note (nothing opens, nothing is sent, no Send button); Claude key opens Settings with the cursor
//                   in the key field and saving it goes back to the page; a key the API refuses turns the button into Fix Claude key
//                   (at once on a new page too); Sync key opens the token field; a refused token says Fix sync key; a good one syncs
//   reading      2  with a key the toolbar appears
//                3  a passage selected with the mouse and asked about: the request (model, headers, the page as a cached document with
//                   citations on) and the streamed answer in a note; a follow-up in the note sends the earlier turn with it
//                4  after a reload the note still holds both questions and both answers
//                5  a pen stroke on the page makes a mark, which waits for Send (nothing goes to Claude by itself); Undo removes it
//                6  the notebook: ink sent with Send gets Claude's reply on the paper
//                7  Tom Riddle's diary: a typed line gets its reply, written out in full
//                8  Conversations lists the note; a paragraph hidden from its Ask box gives Conversations its Page changes button,
//                   and the Page changes list opens from it (with no change on the page there is no way in)
//                9  Settings has the Claude key field, the GitHub token field and the line about how long this browser keeps them
//                   (in WebKit, which reads as Safari, the Safari warning, unless the engine grants persistent storage)
//   asking       15 Ask on the toolbar: a card just under it with the cursor in its box, nothing kept before a question; the question
//                   asks about the page (no passage) and its answer streams into the card, which stays put while the page scrolls; a
//                   follow-up sends the earlier turn; Ask again starts another; a drawing can be a first question; an empty answer
//                   leaves Ask working; Conversations lists them; after a reload no card is open and one opens in full from Conversations
//   landing page 16 on the built site: the landing page's toolbar has Ask and nothing to draw with; Ask there is about the whole
//                   knowledge base (Claude is told to search it and link its pages, with the tools to do so); Conversations lists it
//                17 Continue reading goes back to the same tab and the same place on the page
//   syncing      10 with a token: the note and a mark are saved to pages/<page path>.json in the repo; a note added and a mark
//                   deleted there by another device show after a reload; the next save, turned away once as if the file had changed
//                   meanwhile, is retried and leaves the deletion a deletion
//   two tabs     11 another tab of the same page deletes the store within 3 s: the first tab saves what it shows again by itself and
//                   goes on saving; the other tab upgrades the store within 3 s: the first tab says to reload, and says it again
//                   after a stroke (which clears the notice) whose save cannot happen
//   held store   12 a tab that never lets go of the store, with a delete waiting on it: the page says so after about 6 s, and again
//                   after a stroke; once that tab is closed the notice clears and the page saves again by itself, and the mark made
//                   during the wait is kept: on the page, in the store and after a reload
//   failed open  13 a mark is saved, then a visit whose first open of the store fails: the mark is shown again, is never written
//                   over in the store, and is there with the mark made meanwhile at the next visit
//   newer store  14 a store at version 4, one above this buddy's, made before the page loads: the page says to reload at start-up
//                   and at a save, and leaves the store as it is
// A notice about the store (11, 12, 14) must also be whole: not cut off, and inside the screen.
// Every visit also fails on a script error, a console error, or a request to Claude that no check asked for.
// Prints one line per check and one summary per engine; exits 1 when a check failed.
import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const ENGINES = { chromium, webkit }, only = process.argv[2];
if (process.argv.length > 3 || (only && !ENGINES[only])) { console.error('usage: node html_utils/buddy_test.mjs [chromium|webkit]'); process.exit(2) }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY = 'sk-ant-test-not-a-real-key', TOKEN = 'github_pat_test_not_a_real_token';
const PAGE = 'models_and_training/topic_ml_fundamentals/activation_functions';
const PAGE_ID = `/technical_knowledge_base/${PAGE}/`, PAGE_FILE = `pages/${PAGE}.json`;   // the buddy's name for the page, and its file in the notes repo

// ---------------- the repo over http (WebKit needs http, and the loader finds html_utils/kb_buddy.js from the page's address)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const served = [];
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split(/[?#]/)[0]), f = path.join(ROOT, url); served.push(url);
  if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`, PAGE_URL = ORIGIN + PAGE_ID + 'index.html';
// the reading site as GitHub Pages serves it (build_site.py into a temporary folder): the landing page exists only there
const SITE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-site-'));
{ const r = spawnSync('python3', [path.join(ROOT, 'html_utils/build_site.py'), path.join(SITE_DIR, 'technical_knowledge_base'), '/technical_knowledge_base/'], { encoding: 'utf8' }); if (r.status) { console.error('the site did not build:\n' + r.stdout + r.stderr); process.exit(2) } }
const site = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split(/[?#]/)[0]); if (url.endsWith('/')) url += 'index.html'; const f = path.join(SITE_DIR, url);
  if (!f.startsWith(SITE_DIR + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => site.listen(0, '127.0.0.1', r));
const SITE = `http://127.0.0.1:${site.address().port}`, LOCAL = new Set([ORIGIN, SITE]);

// ---------------- the outside world, faked
const CORS = { 'access-control-allow-origin': '*' };
// Claude: each request gets the next line a check queued with say(); a request with nothing queued is one nobody asked for
function fakeClaude(complain) {
  const requests = [], lines = [];
  const sse = (type, d) => `event: ${type}\ndata: ${JSON.stringify({ type, ...d })}\n\n`;
  const fake = { requests, refuse: false, say: line => lines.push(line),
    answer(route) {
      if (fake.refuse) return route.fulfill({ status: 401, headers: CORS, json: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } } });
      if (route.request().method() === 'GET') return route.fulfill({ headers: CORS, json: { data: [], has_more: false } });   // the free check of the key: the models list
      const body = route.request().postDataJSON(), text = lines.length ? lines.shift() : 'Nobody asked for this.';
      if (text === 'Nobody asked for this.') complain('a request to Claude that no check asked for');
      requests.push({ body, headers: route.request().headers() });
      const message = { id: 'msg_test', type: 'message', role: 'assistant', model: body.model }, usage = { input_tokens: 900, output_tokens: 12 };
      if (!body.stream) return route.fulfill({ headers: CORS, json: { ...message, content: [{ type: 'text', text }], stop_reason: 'end_turn', usage } });
      return route.fulfill({ headers: CORS, contentType: 'text/event-stream', body:
        sse('message_start', { message: { ...message, content: [], stop_reason: null, usage: { ...usage, output_tokens: 1 } } }) +
        sse('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }) +
        (text.match(/\S+\s*/g) || []).map(w => sse('content_block_delta', { index: 0, delta: { type: 'text_delta', text: w } })).join('') +
        sse('content_block_stop', { index: 0 }) +
        sse('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 12 } }) +
        sse('message_stop', {}) });
    } };
  return fake;
}
// the notes repo: path -> {sha, content (base64)}. write() is a save from another device; conflictOnce turns the next good save away
// once, as GitHub does when the file changed after it was read
function fakeRepo() {
  const files = new Map(), repo = { files, saves: [], conflictOnce: false }; let n = 0;
  const put = (p, content) => files.set(p, { sha: 'sha' + ++n, content });
  repo.read = p => files.has(p) ? JSON.parse(Buffer.from(files.get(p).content, 'base64').toString()) : null;
  repo.write = (p, data) => put(p, Buffer.from(JSON.stringify(data)).toString('base64'));
  repo.answer = route => {
    const rq = route.request(), m = new URL(rq.url()).pathname.match(/^\/repos\/khalit7\/kb-notes(?:\/contents\/(.+))?$/);
    const send = (status, json) => route.fulfill({ status, headers: CORS, json });
    if (rq.headers().authorization !== 'Bearer ' + TOKEN) return send(401, { message: 'Bad credentials' });
    if (!m || !/^(GET|PUT)$/.test(rq.method())) return send(404, { message: 'Not Found' });
    if (!m[1]) return send(200, { full_name: 'khalit7/kb-notes' });   // the repo itself: asked for when a file is missing
    const p = decodeURIComponent(m[1]), f = files.get(p);
    if (rq.method() === 'GET') return f ? send(200, { path: p, sha: f.sha, content: f.content, encoding: 'base64' }) : send(404, { message: 'Not Found' });
    const body = rq.postDataJSON();
    if (f && body.sha === f.sha && repo.conflictOnce) { repo.conflictOnce = false; put(p, f.content) }   // the same content under a new sha
    const fits = !f || body.sha === files.get(p).sha; repo.saves.push((fits ? 'saved ' : 'turned away ') + p);
    if (!fits) return send(409, { message: p + ' does not match ' + body.sha });
    put(p, body.content); return send(f ? 200 : 201, { content: { path: p, sha: files.get(p).sha } });
  };
  return repo;
}

// ---------------- checks
let ok = 0, failed = 0;
async function check(name, fn) {
  try { await fn(); ok++; console.log('ok   ' + name) }
  catch (e) { failed++; console.log('FAIL ' + name + ': ' + why(e)) }
}
// an error in one line; a Playwright timeout also says what it was waiting for
const why = e => { const l = String(e.message || e).split('\n'), w = l.find(x => /^\s*- waiting for /.test(x)); return l[0] + (w ? ' (' + w.trim().slice(2) + ')' : '') };
const same = (got, want, what) => assert.deepEqual(got, want, `${what} is ${JSON.stringify(got)}, not ${JSON.stringify(want)}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// wait for something that is not on screen: a record saved in the browser, a file in the fake repo
async function until(what, fn, ms = 6000) {
  for (const t0 = Date.now(); ; await sleep(60)) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('timed out waiting for ' + what) }
}
const live = (recs, k) => Object.values(recs || {}).filter(r => r.k === k && !r.del);
const texts = message => typeof message.content === 'string' ? message.content : message.content.filter(b => b.type === 'text').map(b => b.text).join('\n');

// one visit: a fresh context with these localStorage values and the fakes in place of the outside world; it ends with the check every visit shares
async function visit(browser, name, prefs, fn, origin = ORIGIN) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 },
    storageState: { cookies: [], origins: [{ origin, localStorage: Object.entries(prefs).map(([name, value]) => ({ name, value })) }] } });
  context.setDefaultTimeout(8000);
  const errors = [], claude = fakeClaude(e => errors.push(e)), repo = fakeRepo();
  // WebKit reports a request to the test's own server that a reload cancels as "access control checks"; a same-origin request cannot fail
  // those checks for real, so only that case is let through
  context.on('weberror', e => { const m = e.error().message; if (!/127\.0\.0\.1:\d+\/\S* due to access control checks/.test(m)) errors.push('script error: ' + m) });
  // the browser logs every 404 and 409 as a console error. Expected ones: a file not in the fake repo yet, a save turned away, and
  // kb_index.json (the search index build_site.py writes at the site's root, not in the working tree: the buddy looks for it and goes on)
  context.on('console', m => { if (m.type() === 'error' && !(m.text().startsWith('Failed to load resource') && /^https:\/\/api\.(github|anthropic)\.com\/|\/kb_index\.json$|\/pagefind\//.test(m.location().url))) errors.push('console error: ' + m.text()) });
  await context.route(url => /^https?:$/.test(url.protocol) && !LOCAL.has(url.origin), route => {
    const host = new URL(route.request().url()).hostname;
    if (host === 'api.anthropic.com') return claude.answer(route);
    if (host === 'api.github.com') return repo.answer(route);
    if (host === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', body: '' });
    errors.push('outside request: ' + route.request().url()); return route.abort();
  });
  try { await fn({ context, claude, repo }) } catch (e) { errors.push('the visit stopped: ' + why(e)) }
  await check(name + ': no script error, console error, outside request or Claude request nobody asked for', () => assert(!errors.length, errors.join('; ')));
  await context.close();
}
const openPage = async context => { const page = await context.newPage(); await page.goto(PAGE_URL); return page };

// ---------------- what a reader does, and what the page shows
// the buddy has read its records: the notebook's first page is mounted
const ready = page => page.waitForSelector('#kbBuddy .kd-pg', { state: 'attached' });
// the first n paragraphs of running text on screen: wide, several lines, nothing over them
async function paragraphs(page, n) {
  const at = await page.evaluate(() => [...document.querySelectorAll('p')].map((p, i) => { const r = p.getBoundingClientRect();
    return r.width > 300 && r.height > 50 && r.top > 100 && r.bottom < innerHeight && p.textContent.trim().length > 150 && p.contains(document.elementFromPoint(r.left + 30, r.top + 14)) ? i : -1 }).filter(i => i >= 0));
  assert(at.length >= n, `the page shows ${at.length} plain paragraphs on its first screen, the test needs ${n}`);
  return at.slice(0, n).map(i => page.locator('p').nth(i));
}
// press on an element and drag to the right: with the pen that draws a stroke, with the hand it selects text
async function drag(page, el, { x = 30, y = 14, dx = 170, dy = 0 } = {}) {
  await el.hover({ position: { x, y } });   // waits until the element is laid out and nothing covers the spot
  const b = await el.boundingBox();
  await page.mouse.down(); await page.mouse.move(b.x + x + dx, b.y + y + dy, { steps: 8 }); await page.mouse.up();
}
async function tool(page, t) { const b = page.locator(`#kbBar [data-t=${t}]`); if (await b.getAttribute('aria-pressed') !== 'true') await b.click() }   // a second tap would put it back
const stroke = async (page, el) => { await tool(page, 'pen'); await drag(page, el, { dy: 16 }) };   // a slanted line over its first lines
const select = async (page, para) => { await tool(page, 'hand'); await drag(page, para, { x: 12, dx: 250 }) };   // part of its first line: the Ask box opens
async function ask(page, para, question) { await select(page, para); await page.fill('#kbAskPop input', question); await page.press('#kbAskPop input', 'Enter') }
// wait for a condition in the page; a timeout says what was wanted
const shows = (page, what, fn, arg, timeout) => page.waitForFunction(fn, arg, { timeout }).catch(() => { throw new Error(what) });
// wait until the elements matching a selector are shown and read exactly these texts, in order
const reads = (page, sel, ...want) => page.waitForFunction(([sel, want]) => { const es = [...document.querySelectorAll(sel)];
  return es.length === want.length && es.every((e, i) => e.getClientRects().length && e.textContent.trim() === want[i]) }, [sel, want])
  .catch(async () => { throw new Error(`${sel} reads ${JSON.stringify(await page.$$eval(sel, es => es.map(e => e.textContent.trim().slice(0, 80))))}, not ${JSON.stringify(want)}`) });
// a notice about the notes store in the toast: it says this, whole (not cut off, inside the screen)
async function notice(page, part, timeout) {
  await shows(page, `the toast never said "${part}"`, part => { const t = document.getElementById('kbToast'); return t && !t.hidden && t.textContent.includes(part) }, part, timeout);
  const wrong = await page.$eval('#kbToast', t => { const r = t.getBoundingClientRect();
    return t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1 ? 'cut off' : r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight ? 'partly off the screen' : '' });
  assert(!wrong, `the toast saying "${part}" is ${wrong}`);
}
// the pen strokes showing on the page (a highlight made from a selection is drawn from its words, its own stroke hidden)
const strokes = page => page.$$eval('#kbMarks > path', ps => ps.filter(p => p.style.display !== 'none').length);
// the notes store in IndexedDB as [version, rows], read through a connection of our own that is closed at once ([0, []]: there is none).
// While something holds the store this read would wait for ever, so it gives up after 3 s
const store = page => page.evaluate(() => new Promise((res, rej) => {
  const r = indexedDB.open('kbDiary');
  setTimeout(() => rej(new Error('the notes store cannot be read: something holds it')), 3000);
  r.onupgradeneeded = () => r.transaction.abort();   // none there now: do not make one
  r.onerror = () => res([0, []]);
  r.onsuccess = () => { const d = r.result, done = rows => { d.close(); res([d.version, rows]) };
    try { const q = d.transaction('recs').objectStore('recs').getAll(); q.onsuccess = () => done(q.result); q.onerror = () => done([]) } catch (e) { done([]) } };
}));
// this page's records as the buddy saved them there
const savedRecs = async page => ((await store(page))[1].find(row => row.page === PAGE_ID) || {}).recs || {};
const saved = (page, what, test) => until(what + ' to be saved in the browser', async () => test(await savedRecs(page)));

// ---------------- the visits
async function firstVisit({ context, claude, repo }) {
  served.length = 0; const page = await openPage(context);
  const focused = () => page.evaluate(() => document.activeElement && document.activeElement.id);
  let para = [];
  await check('1 no key and no token: the toolbar loads, and its Claude and sync buttons say Claude key and Sync key', async () => {
    await page.waitForSelector('#kbBar'); await ready(page);
    assert(served.includes('/html_utils/kb_buddy.js'), 'the buddy did not come from html_utils/kb_buddy.js');
    same(await page.locator('#kbBuddyGo').count(), 0, 'the number of floating AI buddy buttons');
    await reads(page, '#kbBar [data-b=claude] span', 'Claude key'); await reads(page, '#kbBar [data-b=sync] .kb-lbl', 'Sync key');
    same([await page.getAttribute('#kbBar [data-b=claude]', 'data-k'), await page.getAttribute('#kbBar [data-b=sync]', 'data-s')], ['missing', 'missing'], 'the two buttons\' states');
  });
  await check('1 without a key a pen stroke is a note: nothing opens, nothing is sent, no Send button', async () => {
    para = await paragraphs(page, 1); await stroke(page, para[0]); await sleep(4000);   // longer than Claude's usual 3 s pause
    assert(await page.$eval('#kbBuddy', P => P.hidden), 'a panel opened by itself'); same(claude.requests.length, 0, 'the requests to Claude');
    assert(await page.locator('#kbBar [data-b=send]').isHidden(), 'Send shows without a key');
    await saved(page, 'the mark', R => live(R, 'mark').length === 1);
  });
  await check('1 Claude key on the toolbar: Settings with the cursor in the key field; saving it goes back to the page', async () => {
    await tool(page, 'hand'); await page.click('#kbBar [data-b=claude]'); await reads(page, '#kbBuddy .kb-h > b', 'Settings');
    same(await focused(), 'kbBuddyKey', 'the field with the cursor');
    await page.fill('#kbBuddyKey', KEY); await page.click('#kbBuddy [data-a=save]');
    assert(await page.$eval('#kbBuddy', P => P.hidden), 'Settings stayed open'); await reads(page, '#kbBar [data-b=claude] span', 'Ask');
    await sleep(4000); same(claude.requests.length, 0, 'the requests to Claude (the mark made without a key stays a note)');
  });
  await check('1 a key the API refuses turns the Claude button into Fix Claude key, which opens the key field', async () => {
    claude.refuse = true; await ask(page, para[0], 'Is this key good?');
    await reads(page, '#kbBar [data-b=claude] span', 'Fix Claude key'); same(await page.getAttribute('#kbBar [data-b=claude]', 'data-k'), 'bad', 'the Claude button\'s state');
    claude.refuse = false; await page.click('#kbBar [data-b=claude]'); await reads(page, '#kbBuddy .kb-h > b', 'Settings');
    same(await focused(), 'kbBuddyKey', 'the field with the cursor'); await page.fill('#kbBuddyKey', KEY); await page.click('#kbBuddy [data-a=save]');
    await reads(page, '#kbBar [data-b=claude] span', 'Ask');
  });
  await check('1 a refused key shows Fix Claude key as soon as a page opens (checked once per tab, before any question)', async () => {
    claude.refuse = true; const other = await openPage(context); await other.waitForSelector('#kbBar');
    await reads(other, '#kbBar [data-b=claude] span', 'Fix Claude key'); claude.refuse = false; await other.close();
  });
  await check('1 Sync key opens the token field; a refused token says Fix sync key; a good one syncs', async () => {
    await page.click('#kbBar [data-b=sync]'); await reads(page, '#kbBuddy .kb-h > b', 'Settings'); same(await focused(), 'kbBuddyGh', 'the field with the cursor');
    await page.fill('#kbBuddyGh', 'github_pat_test_refused'); await page.click('#kbBuddy [data-a=ghsave]');
    assert(await page.$eval('#kbBuddy', P => P.hidden), 'Settings stayed open'); await reads(page, '#kbBar [data-b=sync] .kb-lbl', 'Fix sync key');
    await page.click('#kbBar [data-b=sync]'); same(await focused(), 'kbBuddyGh', 'the field with the cursor');
    await page.fill('#kbBuddyGh', TOKEN); await page.click('#kbBuddy [data-a=ghsave]');
    await shows(page, 'the sync button never said synced', () => document.querySelector('#kbBar [data-b=sync]').dataset.s === 'ok');
    assert(live((repo.read(PAGE_FILE) || {}).records, 'mark').some(m => !m.sel), 'the pen mark made without a key is not in the notes repo');
  });
}

async function reading({ context, claude }) {
  const page = await openPage(context);
  const Q1 = 'Why does this matter?', A1 = 'Because the gradient passes through it.', Q2 = 'And in one line?', A2 = 'A flat slope stops learning.';
  let para = [], before = 0;
  await check('2 with a key: the toolbar appears', async () => { await page.waitForSelector('#kbBar'); await ready(page); para = await paragraphs(page, 2) });
  await check('3 ask about a selected passage: the request to Claude, and the streamed answer in a note', async () => {
    claude.say(A1); await ask(page, para[0], Q1);
    await reads(page, '.kb-note .kb-nq', Q1); await reads(page, '.kb-note .kb-na', A1);
    const { body, headers } = claude.requests.at(-1), doc = body.messages[0].content[0];
    same(body.model, 'claude-opus-5-5', 'the model'); same(headers['x-api-key'], KEY, 'the x-api-key header');
    same(headers['anthropic-dangerous-direct-browser-access'], 'true', 'the anthropic-dangerous-direct-browser-access header');
    same([body.messages[0].role, doc.type], ['user', 'document'], 'the start of the first message');
    same(doc.citations, { enabled: true }, 'citations on the page document'); same(doc.cache_control, { type: 'ephemeral', ttl: '1h' }, 'cache_control on the page document');
    assert(texts(body.messages.at(-1)).includes(Q1), 'the question is not in the request');
    await saved(page, 'the answer', R => live(R, 'note').some(n => n.turns.length === 1 && n.turns[0].a === A1));
  });
  await check('3 a follow-up in the note sends the earlier turn, and its answer shows too', async () => {
    claude.say(A2); await page.fill('.kb-note .kb-nf input', Q2); await page.press('.kb-note .kb-nf input', 'Enter');
    await reads(page, '.kb-note .kb-nq', Q1, Q2); await reads(page, '.kb-note .kb-na', A1, A2);
    const { messages } = claude.requests.at(-1).body;
    for (const t of [Q1, A1, Q2]) assert(texts(messages.at(-1)).includes(t), `"${t}" is not in the follow-up's message`);
    same(messages[0].content[0].type, 'document', 'the start of the first message');
  });
  await check('4 after a reload the note is still there, questions and answers', async () => {
    await saved(page, 'the follow-up', R => live(R, 'note').some(n => n.turns.length === 2 && n.turns[1].a === A2));
    await page.reload(); await ready(page);
    await page.click('.kb-note .kb-dot');   // a note not being read is a numbered dot
    await reads(page, '.kb-note .kb-nq', Q1, Q2); await reads(page, '.kb-note .kb-na', A1, A2);
    await page.click('.kb-note [data-n=close]');
  });
  await check('4 x on a note beside a passage closes it to its dot; Delete is in its full screen, and Undo brings it back', async () => {
    await page.click('.kb-note .kb-dot'); await page.waitForSelector('.kb-note.kb-active'); await page.click('.kb-note.kb-active [data-n=close]');
    await shows(page, 'x did not close the note to its dot', () => !document.querySelector('.kb-note.kb-active') && document.querySelectorAll('.kb-note').length === 1);
    await page.click('.kb-note .kb-dot'); await page.click('.kb-note.kb-active [data-n=max]'); await page.click('.kb-note.kb-max [data-n=gdel]');
    await shows(page, 'Delete did not delete the note', () => !document.querySelector('.kb-note'));
    await page.click('#kbUndo button'); await shows(page, 'Undo did not bring the note back', () => document.querySelectorAll('.kb-note').length === 1);
    await reads(page, '#kbUndo span', 'Note deleted').catch(() => {});
  });
  await check('5 a pen stroke on the page makes a mark', async () => {
    before = await strokes(page); await stroke(page, para[1]);
    same(await strokes(page), before + 1, 'the number of strokes on the page'); await saved(page, 'the mark', R => live(R, 'mark').some(m => !m.sel));
  });
  await check('5 nothing goes to Claude by itself: the stroke waits, and Send shows (on a minimised toolbar too)', async () => {
    const n = claude.requests.length; await sleep(4000); same(claude.requests.length, n, 'the requests to Claude 4 s after the stroke');
    assert(await page.locator('#kbBar [data-b=send]').isVisible(), 'Send does not show');
    await page.click('#kbBar [data-b=min]'); assert(await page.locator('#kbBar [data-b=send]').isVisible(), 'Send does not show on the minimised toolbar'); await page.click('#kbBar [data-b=min]');
  });
  await check('5 Undo removes it', async () => { await page.click('#kbBar [data-b=undo]'); same(await strokes(page), before, 'the number of strokes on the page') });
  await check('5 a mark made just before leaving the page is kept', async () => {
    const n0 = await strokes(page); await stroke(page, para[1]); await page.reload(); await ready(page);
    await shows(page, 'the mark made just before leaving is gone', n => document.querySelectorAll('#kbMarks > path').length >= n + 1, n0);
    await page.click('#kbBar [data-b=undo]');
  });
  await check('6 notebook: ink sent to Claude gets its reply on the paper', async () => {
    const reply = 'A line, drawn with care.';
    await page.click('#kbBar [data-b=notebook]'); await tool(page, 'pen'); await drag(page, page.locator('#kbBuddy .kd-pg canvas').first(), { x: 80, y: 90, dy: 16 });
    claude.say('<at>A</at><read>[a slanted line]</read>' + reply); await page.click('#kbBar [data-b=send]');
    await reads(page, '#kbBuddy .kd-reply', reply);
    assert(claude.requests.at(-1).body.messages.at(-1).content.some(b => b.type === 'image' && b.source.media_type === 'image/png'), 'the ink was not sent as a picture');
  });
  await check('7 Tom Riddle\'s diary: a typed line gets its reply, written out in full', async () => {
    const reply = 'How curious. Do go on.';
    await page.click('#kbBuddy [data-a=riddle]'); claude.say('<read>Hello, diary</read>' + reply);
    await page.fill('#kbBuddy .kr-form input', 'Hello, diary'); await page.press('#kbBuddy .kr-form input', 'Enter');
    await shows(page, 'the diary did not write its reply out', t => { const s = document.querySelector('#kbBuddy .kr-say'), ls = [...s.querySelectorAll('.kr-w > span')];
      return s.textContent === t && ls.every(l => l.classList.contains('kr-in')) }, reply);
    assert(texts(claude.requests.at(-1).body.messages.at(-1)).includes('Hello, diary'), 'the typed line is not in the request');
  });
  await check('8 Conversations lists the note', async () => {
    await page.click('#kbBar [data-b=over]'); await reads(page, '#kbOvw .kb-ovc b', Q1);
    assert((await page.textContent('#kbOvw .kb-ovc')).includes(A1), 'the answer is not on the note\'s card'); await page.click('#kbOvw [data-o=close]');
  });
  await check('8 a paragraph hidden from its Ask box: the Page changes list opens from Conversations and holds it', async () => {
    await select(page, para[1]); await page.click('#kbAskPop .kb-blk [data-k=hide]');
    await page.click('#kbBar [data-b=over]'); await page.click('#kbOvw [data-o=chg]');
    await reads(page, '#kbBuddy .kb-h > b', 'Page changes'); same(await page.locator('#kbBuddy .kd-ov .kd-edi').count(), 1, 'the number of changes listed');
    await page.click('#kbBuddy [data-a=close]');
  });
  await check('9 Settings: the key field, the token field and the line on how long this browser keeps them', async () => {
    await page.click('#kbBar [data-b=set]'); await reads(page, '#kbBuddy .kb-h > b', 'Settings');
    await page.waitForSelector('#kbBuddyKey'); await page.waitForSelector('#kbBuddyGh');
    same(await page.locator('#kbBuddyWait, #kbBuddyQ').count(), 0, 'the settings for answering by itself (a wait, a question mark)');
    const kept = await page.evaluate(() => navigator.storage && navigator.storage.persisted ? navigator.storage.persisted() : false);
    const want = kept ? ['are kept on this device'] : context.browser().browserType().name() === 'webkit' ? ['Safari clears a site\'s saved data', 'It starts empty'] : [];
    if (want.length) await shows(page, `#kbKeep does not say "${want.join('" and "')}"`, want => { const e = document.getElementById('kbKeep'); return e && !e.hidden && want.every(w => e.textContent.includes(w)) }, want);
    else same(await page.$eval('#kbKeep', e => e.hidden ? '' : e.textContent), '', 'the line in #kbKeep');
  });
}

async function asking({ context, claude }) {
  const page = await openPage(context), card = '.kb-note.kb-gen.kb-active', box = card + ' .kb-nf input';
  const Q1 = 'What is this page about?', A1 = 'How a slope decides learning.', Q2 = 'And the gist in one line?', A2 = 'A flat slope stops learning.', Q3 = 'Which one do LLMs use?', A3 = 'Mostly SwiGLU.';
  const askIn = async (q, a) => { claude.say(a); await page.fill(box, q); await page.press(box, 'Enter') };
  await check('15 Ask on the toolbar: a card just under it on the right, the cursor in its box; nothing is kept before a question', async () => {
    await ready(page); await reads(page, '#kbBar [data-b=claude] span', 'Ask');
    same(await page.$eval('#kbBar [data-b=claude] svg', e => getComputedStyle(e).opacity), '1', 'the opacity of Ask\'s icon before it is tapped (it must not look switched off)');
    await page.click('#kbBar [data-b=claude]'); await page.waitForSelector(card);
    same(await page.evaluate(() => { const a = document.activeElement; return a && a.closest('.kb-gen') ? a.placeholder : null }), 'Ask Claude about this page…', 'the box with the cursor');
    const at = await page.evaluate(() => { const c = document.querySelector('.kb-note.kb-gen.kb-active').getBoundingClientRect(), b = document.getElementById('kbBar').getBoundingClientRect(); return {gap:c.top - b.bottom, right:innerWidth - c.right} });
    assert(at.gap >= 0 && at.gap < 30 && at.right < 40, 'the card is not just under the toolbar on the right: ' + JSON.stringify(at));
    await sleep(600); same(live(await savedRecs(page), 'note').length, 0, 'the notes kept');
  });
  await check('15 a question: Claude is asked about the page (no passage), the answer streams into the card, which stays put while the page scrolls', async () => {
    await askIn(Q1, A1); await reads(page, card + ' .kb-nq', Q1); await reads(page, card + ' .kb-na', A1);
    const last = texts(claude.requests.at(-1).body.messages.at(-1));
    assert(last.includes(Q1) && last.includes('not about one passage'), 'the request does not ask about the page');
    const t0 = await page.$eval(card, e => Math.round(e.getBoundingClientRect().top)); await page.mouse.wheel(0, 900); await sleep(400);
    same(await page.$eval(card, e => Math.round(e.getBoundingClientRect().top)), t0, 'the card\'s top after the page scrolled');
    await saved(page, 'the conversation', R => live(R, 'note').some(n => n.g && n.turns.length === 1 && n.turns[0].a === A1));
  });
  await check('15 a follow-up in the card sends the earlier turn', async () => {
    await askIn(Q2, A2); await reads(page, card + ' .kb-na', A1, A2);
    const last = texts(claude.requests.at(-1).body.messages.at(-1)); for (const t of [Q1, A1, Q2]) assert(last.includes(t), `"${t}" is not in the follow-up`);
  });
  let moved = null;
  await check('15 the card can be dragged by its header; x closes it, and the conversation stays in Conversations', async () => {
    const b = await page.locator(card + ' .kb-nh b').boundingBox(); await page.mouse.move(b.x + 5, b.y + 5); await page.mouse.down(); await page.mouse.move(b.x - 300, b.y + 180, { steps: 8 }); await page.mouse.up();
    moved = await page.$eval(card, e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top) } });
    await page.click(card + ' [data-n=close]'); await shows(page, 'x did not close the card', () => !document.querySelector('.kb-note.kb-gen.kb-active'));
    await page.click('#kbBar [data-b=over]'); await reads(page, '#kbOvw .kb-ovc b', Q1); await page.click('#kbOvw [data-o=close]');
  });
  await check('15 Ask again starts a new conversation, where the last card was put; Conversations lists both, as about the page', async () => {
    await page.click('#kbBar [data-b=claude]'); await page.waitForSelector(card);
    same(await page.$eval(card, e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top) } }), moved, 'where the new card opened'); await shows(page, 'no new empty card', () => { const c = document.querySelector('.kb-note.kb-gen.kb-active'); return c && !c.querySelector('.kb-turn') });
    await askIn(Q3, A3); await reads(page, card + ' .kb-na', A3);
    const sent = claude.requests.at(-1).body.messages; same(sent.length, 1, 'the messages sent with a new conversation\'s first question');
    assert(![Q1, A1].some(x => JSON.stringify(sent).includes(x)), 'the other conversation on the page went with the new one');
    await page.click('#kbBar [data-b=over]'); await reads(page, '#kbOvw .kb-ovc b', Q1, Q3);
    same((await page.$$eval('#kbOvw .kb-ovc small', es => es.map(e => e.textContent))).filter(t => t.startsWith('About the page')).length, 2, 'the cards that say they are about the page');
    await page.click('#kbOvw [data-o=close]');
  });
  await check('15 a card dragged to the bottom stays on the screen as its answer grows', async () => {
    await page.click('#kbBar [data-b=claude]'); await page.waitForSelector(card);
    const b = await page.locator(card + ' .kb-nh b').boundingBox(); await page.mouse.move(b.x + 5, b.y + 5); await page.mouse.down(); await page.mouse.move(b.x + 5, 880, { steps: 8 }); await page.mouse.up();
    claude.say('A long answer. '.repeat(26)); await page.fill(box, 'Tell me at length?'); await page.press(box, 'Enter');
    await shows(page, 'the long answer was not written out', () => /^(A long answer\. ){25}A long answer\.$/.test(((document.querySelector('.kb-note.kb-gen.kb-active .kb-na') || {}).textContent || '').trim()), undefined, 20000);
    await sleep(300); const r = await page.$eval(card, e => { const q = e.getBoundingClientRect(); return { top: Math.round(q.top), bottom: Math.round(q.bottom), H: innerHeight } });
    assert(r.bottom <= r.H && r.top >= 0, 'the card runs off the screen: ' + JSON.stringify(r));
    await page.click(card + ' [data-n=max]'); await page.click('.kb-note.kb-max [data-n=gdel]'); await page.evaluate(() => localStorage.removeItem('kbBuddy.askAt'));
  });
  await check('15 a drawing can be the first question of a new conversation', async () => {
    const A4 = 'A curve that bends once.'; await page.click('#kbBar [data-b=claude]'); await page.click(card + ' [data-n=draw]');
    await drag(page, page.locator(card + ' .kb-ndraw canvas'), { x: 30, y: 20, dx: 120, dy: 10 });
    claude.say(A4); await page.click(card + ' .kb-nf [type=submit]'); await reads(page, card + ' .kb-na', A4);
    assert(claude.requests.at(-1).body.messages.at(-1).content.some(b => b.type === 'image'), 'the drawing was not sent');
  });
  await check('15 an empty answer keeps the question, with Try again; Ask keeps working', async () => {
    await page.click('#kbBar [data-b=claude]'); claude.say(''); await page.fill(box, 'Say nothing?'); await page.press(box, 'Enter');
    await shows(page, 'the question was not kept with No reply and Try again', () => { const c = document.querySelector('.kb-note.kb-gen.kb-active'); return c && /Say nothing\?/.test(c.textContent) && /No reply/.test(c.textContent) && c.querySelector('[data-n=retry]') });
    await page.click(card + ' [data-n=max]'); await page.click('.kb-note.kb-max [data-n=gdel]'); await shows(page, 'Delete in full screen did not delete it', () => !document.querySelector('.kb-note.kb-gen.kb-active'));
    await page.click('#kbBar [data-b=claude]'); await page.waitForSelector(card);
    same(await page.evaluate(() => { const a = document.activeElement; return a && a.closest('.kb-gen') ? a.placeholder : null }), 'Ask Claude about this page…', 'the box with the cursor after Ask');
    await page.keyboard.press('Escape'); await shows(page, 'Escape did not close the card', () => !document.querySelector('.kb-note.kb-gen.kb-active'));
  });
  await check('15 after a reload no card is open, Conversations holds both, and one opens in full', async () => {
    await saved(page, 'the three conversations', R => live(R, 'note').filter(n => n.g).length === 3 && live(R, 'note').every(n => n.turns.every(t => t.a)));
    await page.reload(); await ready(page);
    same(await page.$$eval('.kb-note.kb-gen', es => es.filter(e => getComputedStyle(e).display !== 'none').length), 0, 'the conversation cards shown');
    await page.click('#kbBar [data-b=over]'); await reads(page, '#kbOvw .kb-ovc b', Q1, Q3, 'Drawing');
    await page.locator('#kbOvw .kb-ovc').first().click(); await reads(page, '.kb-note.kb-max .kb-na', A1, A2);
  });
}

async function landing({ context, claude }) {
  const page = await context.newPage(); await page.goto(SITE + '/technical_knowledge_base/');
  const card = '.kb-note.kb-gen.kb-active', box = card + ' .kb-nf input', Q = 'Where do I start with attention?', A = 'Read [[Attention variants]] after the transformer page.';
  await check('16 the landing page has the toolbar with Ask and nothing to draw with', async () => {
    await page.waitForSelector('#kbBar'); await reads(page, '#kbBar [data-b=claude] span', 'Ask');
    assert(await page.locator('#kbBar [data-t=pen]').isHidden() && await page.locator('#kbBar [data-b=undo]').isHidden(), 'the drawing tools show on the landing page');
  });
  await check('16 Ask there is about the whole knowledge base: Claude is told to search it and link its pages', async () => {
    await page.click('#kbBar [data-b=claude]'); await page.waitForSelector(card);
    same(await page.getAttribute(box, 'placeholder'), 'Ask about the knowledge base…', 'the placeholder');
    claude.say(A); await page.fill(box, Q); await page.press(box, 'Enter'); await shows(page, 'the answer did not show', () => /after the transformer page/.test((document.querySelector('.kb-note.kb-gen.kb-active .kb-na') || {}).textContent || ''));
    const { body } = claude.requests.at(-1), last = texts(body.messages.at(-1));
    assert(last.includes(Q) && last.includes('knowledge base as a whole') && last.includes('search_kb'), 'the request does not ask about the knowledge base');
    assert(body.tools.some(t => t.name === 'search_kb') && body.tools.some(t => t.name === 'read_kb_page'), 'the knowledge-base tools are not offered');
  });
  await check('16 Conversations on the landing page lists it, as about the knowledge base', async () => {
    await page.click('#kbBar [data-b=over]'); await reads(page, '#kbOvw .kb-ovc b', Q);
    assert((await page.textContent('#kbOvw .kb-ovc small')).startsWith('About the knowledge base'), 'the card does not say it is about the knowledge base');
  });
  await check('16 links to pages in a saved answer work after a reload (they wait for the index, then become links)', async () => {
    await until('the landing conversation to be saved in the browser', async () => (((await store(page))[1].find(r => r.page === '/technical_knowledge_base/') || {}).recs ? Object.values((await store(page))[1].find(r => r.page === '/technical_knowledge_base/').recs).some(n => n.k === 'note' && n.g && !n.del && n.turns.every(x => x.a)) : false));
    await page.reload(); await page.waitForSelector('#kbBar'); await ready(page);
    await page.click('#kbBar [data-b=over]'); await page.locator('#kbOvw .kb-ovc').first().click();
    await shows(page, 'the page link in the saved answer never became a link', () => { const a = document.querySelector('.kb-note.kb-max .kb-na a.kb-kbl'); return a && /attention_variants\/$/.test(a.getAttribute('href')) }, undefined, 9000);
    await page.keyboard.press('Escape');
  });
  await check('16 a pen chosen on a page is not chosen on the landing page, where there is nothing to draw with', async () => {
    await page.evaluate(() => localStorage.setItem('kbBuddy.tool', 'pen')); await page.reload(); await page.waitForSelector('#kbBar');
    assert(!await page.evaluate(() => document.documentElement.classList.contains('kb-pen')), 'the pen is on on the landing page');
  });
  await check('17 a page opened from Continue reading while the saved place names another page still has a working buddy', async () => {
    const p = await context.newPage(); await p.goto(SITE + '/technical_knowledge_base/'); await p.evaluate(() => localStorage.setItem('kb.last', JSON.stringify({ p: '/technical_knowledge_base/elsewhere/', t: 'Elsewhere' })));
    await p.goto(SITE + PAGE_ID + '#kb-resume'); await p.waitForSelector('#kbBar'); await ready(p);
    await p.click('#kbBar [data-b=claude]'); await p.waitForSelector('.kb-note.kb-gen.kb-active'); await p.keyboard.press('Escape'); await p.close();
  });
  await check('17 Continue reading on the landing page goes back to the same tab and the same place on the page', async () => {
    const p = await context.newPage(); await p.goto(SITE + PAGE_ID); await p.waitForSelector('#kbBar'); await ready(p);
    const tabs = p.locator('[role=tab]'); if (await tabs.count() > 1) await tabs.nth(1).click();
    await p.evaluate(() => window.scrollBy(0, 1800)); await sleep(2600);   // a place counts once they have stayed on it for 2 s
    const where = () => p.evaluate(() => { const t = document.querySelector('[role=tab][aria-selected=true]'), y = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--kb-room')) || 0;
      const e = document.elementFromPoint(document.querySelector('.w').getBoundingClientRect().left + 24, y + 70); return { tab: t && t.dataset.t, block: e && e.textContent.trim().slice(0, 60) } });
    const before = await where(); assert(await p.evaluate(() => scrollY) > 1000, 'the page did not scroll'); await p.close();
    await page.reload(); await page.waitForSelector('#kb-last:not([hidden])');
    same(await page.getAttribute('#kb-last a', 'href'), PAGE_ID + '#kb-resume', 'the link'); same((await page.textContent('#kb-last a')).trim(), 'Activation functions', 'the title shown');
    await page.click('#kb-last a'); await page.waitForURL(u => !String(u).includes('#kb-resume')); await sleep(1600);
    const after = await (async () => { const p2 = page; return p2.evaluate(() => { const t = document.querySelector('[role=tab][aria-selected=true]'), y = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--kb-room')) || 0;
      const e = document.elementFromPoint(document.querySelector('.w').getBoundingClientRect().left + 24, y + 70); return { tab: t && t.dataset.t, block: e && e.textContent.trim().slice(0, 60) } }) })();
    same(after, before, 'the tab and the block at the top of the screen');
  });
}

async function syncing({ context, claude, repo }) {
  const page = await openPage(context);
  const Q = 'What is this about?', A = 'About one slope.', Q9 = 'Asked on the other device?', A9 = 'Answered on the other device.';
  const penMarks = f => live(f && f.records, 'mark').filter(m => !m.sel);
  let para = [], gone = '';
  await check('10 sync: the note and a mark are saved to the page\'s file in the notes repo', async () => {
    await ready(page); para = await paragraphs(page, 2);
    claude.say(A); await ask(page, para[0], Q); await saved(page, 'the answer', R => live(R, 'note').some(n => n.turns[0].a === A));
    await page.click('.kb-note [data-n=close]'); await stroke(page, para[1]); await page.click('#kbBar [data-b=sync]');
    const file = await until('the note and the mark in the notes repo', () => { const f = repo.read(PAGE_FILE);
      return f && live(f.records, 'note').some(n => n.turns[0].q === Q && n.turns[0].a === A) && penMarks(f).length && f });
    same(file.page, PAGE, 'the page named in the file'); same([...repo.files.keys()].sort(), [PAGE_FILE, 'settings.json'], 'the files in the notes repo');
  });
  await check('10 a note added and a mark deleted on another device show after a reload', async () => {
    const shown = await strokes(page), file = repo.read(PAGE_FILE), now = Date.now(), note = live(file.records, 'note')[0];
    gone = penMarks(file)[0].id;
    file.records.other1 = { ...note, id: 'other1', marks: [], turns: [{ q: Q9, a: A9, t: now }], t: now, u: now };
    file.records[gone] = { k: 'mark', id: gone, del: true, u: now };
    file.records.oldq = { k: 'entry', id: 'oldq', kind: 'page', typed: 'An old question', read: '', reply: 'An old answer.', t: now - 5000, u: now };   // kept by an earlier version
    repo.write(PAGE_FILE, file);
    await page.reload(); await ready(page);
    await shows(page, 'the other device\'s note is not on the page', () => document.querySelectorAll('.kb-note').length === 2);
    same(await strokes(page), shown - 1, 'the number of strokes on the page');
    await page.click('#kbBar [data-b=over]'); await reads(page, '#kbOvw .kb-ovc b', Q, Q9); await page.click('#kbOvw [data-o=close]');
  });
  await check('10 the next save, turned away once because the file changed, is retried and leaves the deletion a deletion', async () => {
    repo.conflictOnce = true; repo.saves.length = 0;
    await stroke(page, para[1]); await page.click('#kbBar [data-b=sync]');
    const file = await until('the new mark in the notes repo', () => { const f = repo.read(PAGE_FILE); return penMarks(f).some(m => m.id !== gone) && f });
    const was = file.records[gone], saves = repo.saves.filter(s => s.endsWith(PAGE_FILE));
    assert(was && was.del === true && !was.p, 'the mark deleted on the other device is live again in the repo'); assert(!file.records.other1.del, 'the other device\'s note was deleted');
    assert(file.records.oldq && file.records.oldq.del === true, 'the exchange an earlier version kept for a question on the page was not removed');
    assert(saves[0] === 'turned away ' + PAGE_FILE && saves.includes('saved ' + PAGE_FILE), 'the saves went: ' + saves.join(', '));
  });
  await check('10 a change from another device arriving while an Ask card is open leaves the card open, and Ask working', async () => {
    await page.click('#kbBar [data-b=claude]'); await page.waitForSelector('.kb-note.kb-gen.kb-active');
    const file = repo.read(PAGE_FILE), now = Date.now(); file.records.other2 = { ...file.records.other1, id: 'other2', turns: [{ q: 'From the iPad?', a: 'Yes.', t: now }], t: now, u: now }; repo.write(PAGE_FILE, file);
    await page.click('#kbBar [data-b=sync]'); await shows(page, 'the other device\'s second note never arrived', () => document.querySelectorAll('.kb-note:not(.kb-gen)').length === 3);
    assert(await page.$eval('.kb-note.kb-gen.kb-active', e => getComputedStyle(e).display !== 'none'), 'the Ask card is hidden after the sync');
    await page.click('#kbBar [data-b=claude]'); same(await page.evaluate(() => { const a = document.activeElement; return a && a.closest('.kb-gen') ? a.placeholder : null }), 'Ask Claude about this page…', 'the box with the cursor after Ask');
  });
}

async function twoTabs({ context }) {
  const a = await openPage(context);
  const within3s = (page, what) => page.evaluate(what => Promise.race([
    new Promise((_, rej) => setTimeout(() => rej(new Error('still waiting for the other tab to let go of the store after 3 s')), 3000)),
    (async () => { const newer = what === 'upgrade' && (await indexedDB.databases()).find(d => d.name === 'kbDiary').version + 1;   // one above the buddy's own
      await new Promise((res, rej) => { const r = newer ? indexedDB.open('kbDiary', newer) : indexedDB.deleteDatabase('kbDiary');
        r.onsuccess = () => { if (newer) r.result.close(); res() }; r.onerror = () => rej(r.error) }) })()]), what);
  let b = null, para = [];
  await check('11 another tab deletes the store within 3 s, and the first tab saves what it shows again by itself', async () => {
    await ready(a); para = await paragraphs(a, 2);
    await stroke(a, para[0]); await saved(a, 'the first mark', R => live(R, 'mark').length === 1);
    b = await openPage(context); await ready(b);   // opened once the mark is saved, so both tabs hold the same records
    await within3s(b, 'delete'); await saved(b, 'the mark again, with nothing done in the first tab', R => live(R, 'mark').length === 1);
  });
  await check('11 the first tab goes on saving', async () => {
    await stroke(a, para[1]); await saved(a, 'the second mark', R => live(R, 'mark').length === 2);
    await a.reload(); await ready(a); same(await strokes(a), 2, 'the number of strokes after the reload');
  });
  await check('11 the other tab upgrades the store within 3 s, and the first tab says to reload', async () => { await within3s(b, 'upgrade'); await notice(a, 'Reload this page') });
  await check('11 after a stroke in the first tab, whose save cannot happen, the notice shows again', async () => { await stroke(a, para[1]); await notice(a, 'Reload this page') });
}

async function heldStore({ context }) {
  const holder = await context.newPage(); await holder.goto(ORIGIN + '/html_utils/package.json');   // same origin, no buddy
  await holder.evaluate(() => new Promise((res, rej) => { const r = indexedDB.open('kbDiary'); r.onerror = () => rej(r.error);
    r.onsuccess = () => { window.held = r.result; window.waiting = indexedDB.deleteDatabase('kbDiary'); res() } }));   // no versionchange handler, and kept on window: it never lets go
  const t0 = Date.now(), page = await openPage(context), WAITING = 'waiting for this browser\'s notes store';
  let para = [];
  await check('12 the store held by another tab: the page says so after about 6 s', async () => {
    await notice(page, WAITING, 9000); assert(Date.now() - t0 > 5000, `the notice came after only ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  });
  await check('12 after a stroke, which cannot be saved yet, the notice shows again', async () => {
    para = await paragraphs(page, 2); await stroke(page, para[0]); await notice(page, WAITING, 3000);
  });
  await check('12 that tab closed: the notice clears and the page saves again by itself', async () => {
    await holder.close(); await shows(page, 'the notice stayed', () => document.getElementById('kbToast').hidden); await ready(page);
    const t = Date.now(); await stroke(page, para[1]); await saved(page, 'the new mark', R => live(R, 'mark').some(m => m.t >= t));
  });
  await check('12 the mark made while the store was held is kept too: on the page, in the store and after a reload', async () => {
    await until('both marks on the page', async () => await strokes(page) === 2); same(live(await savedRecs(page), 'mark').length, 2, 'the number of marks in the store');
    await page.reload(); await ready(page); same(await strokes(page), 2, 'the number of strokes after the reload');
  });
}

async function failedOpen({ context }) {
  let page = await openPage(context);
  await check('13 a visit whose first open of the store fails: the mark saved before is shown again, and never written over', async () => {
    await ready(page); await stroke(page, (await paragraphs(page, 1))[0]);
    const old = (await saved(page, 'the first mark', R => live(R, 'mark')[0])).id, kept = R => { assert(R[old] && !R[old].del, 'the saved mark was written over in the store'); return R };
    await page.close(); page = await context.newPage();
    // in this tab the first open of the store asks for a version below the store's: a real request that fails; later ones go through
    await page.addInitScript(() => { const open = IDBFactory.prototype.open; let failed = false;
      IDBFactory.prototype.open = function (name, version) { if (name !== 'kbDiary' || !version || failed) return open.apply(this, arguments); failed = true; return open.call(this, name, 1) } });
    await page.goto(PAGE_URL); await ready(page);
    kept(await savedRecs(page)); await until('the saved mark on the page', async () => await strokes(page) === 1);
    await stroke(page, (await paragraphs(page, 2))[1]); await saved(page, 'the new mark', R => live(kept(R), 'mark').length === 2);
  });
  await check('13 the next visit shows that mark and the one made meanwhile', async () => {
    await page.close(); page = await openPage(context); await ready(page); same(await strokes(page), 2, 'the number of strokes on the page');
  });
}

async function newerStore({ context }) {
  const row = { page: PAGE_ID, recs: { later1: { k: 'entry', id: 'later1', t: 1, kind: 'note', typed: 'A question', reply: 'An answer.', u: 1 } }, dirty: false };
  const other = await context.newPage(); await other.goto(ORIGIN + '/html_utils/package.json');   // same origin, no buddy
  await other.evaluate(row => new Promise((res, rej) => { const r = indexedDB.open('kbDiary', 4);   // the buddy asks for version 3
    r.onupgradeneeded = () => r.result.createObjectStore('recs', { keyPath: 'page' }).put(row);
    r.onsuccess = () => { r.result.close(); res() }; r.onerror = () => rej(r.error) }), row);
  const page = await openPage(context);
  await check('14 a store newer than this buddy: the page says to reload, at start-up and at a save, and leaves the store as it is', async () => {
    await notice(page, 'Reload this page'); await stroke(page, (await paragraphs(page, 1))[0]); await notice(page, 'Reload this page');
    same(await store(other), [4, [row]], 'the store');
  });
}

// ---------------- run
const WITH_KEY = { 'kbAsk.key': KEY };
let bad = 0;
setTimeout(() => { console.log('FAIL the run did not end within 15 minutes: stopped'); process.exit(1) }, 15 * 60000).unref();
for (const engine of only ? [only] : Object.keys(ENGINES)) {
  ok = failed = 0; const t0 = Date.now();
  console.log(engine);
  const browser = await ENGINES[engine].launch();
  await visit(browser, 'first visit', {}, firstVisit);
  await visit(browser, 'reading', WITH_KEY, reading);
  await visit(browser, 'asking', WITH_KEY, asking);
  await visit(browser, 'landing page', WITH_KEY, landing, SITE);
  await visit(browser, 'syncing', { ...WITH_KEY, 'kbBuddy.ghToken': TOKEN }, syncing);
  await visit(browser, 'two tabs', WITH_KEY, twoTabs);
  await visit(browser, 'held store', WITH_KEY, heldStore);
  await visit(browser, 'failed open', WITH_KEY, failedOpen);
  await visit(browser, 'newer store', WITH_KEY, newerStore);
  await browser.close();
  console.log(`${engine}: ${ok} ok, ${failed} failed, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  bad += failed;
}
server.close(); site.close(); fs.rmSync(SITE_DIR, { recursive: true, force: true });
process.exit(bad ? 1 : 0);
