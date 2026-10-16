// The page embeds exactly src/oc_data.json; the planner's JS equals scripts/recompute.py; numbers written in prose match the data.
// usage (repo root): node <this> <page folder>
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const require = createRequire(path.resolve(process.cwd(), 'html_utils/package.json')); const puppeteer = require('puppeteer');
const dir = process.argv[2]; const data = JSON.parse(fs.readFileSync(path.join(dir, 'src/oc_data.json'))); const rc = JSON.parse(fs.readFileSync(path.join(dir, 'src/recompute.json')));
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const b = await puppeteer.launch({ headless: 'shell' });
try {
  const p = await b.newPage(); await p.goto('file://' + path.resolve(dir, 'index.html'));
  const emb = await p.evaluate(() => window.OC);
  ok(JSON.stringify(emb) === JSON.stringify(data), 'embedded window.OC equals src/oc_data.json');
  const js = await p.evaluate(() => { const P = OCP, m = P.MODELS.l405, k = { params: m[1], tokens_t: 15.6, gpu: 'h100', mfu: .4, price: 5.97, rate_k: +P.LLAMA_RATE.toFixed(3), stall_s: 60, restart_min: 10, idle: 0 };
    const n = P.gpusFor(90, k), r = P.runYD(k, n), f = P.fleet(n, r.paid_h, 1, .5, .85), o = P.own(OC.buy);
    const rk = Object.assign({}, k, { rate_k: P.LLAMA_RATE });
    return { n, paid: r.paid_h, gp: r.goodput, fleet: f.gpus, own: o.annual, root: P.runYD(rk, 16384).paid_h / 30.84e6 - 1 }; });
  const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
  ok(js.n === rc.gpus, 'GPUs for 90 days ' + js.n + ' = ' + rc.gpus);
  ok(near(js.paid, rc.run.paid_h) && near(js.gp, rc.run.goodput), 'paid GPU-hours and goodput match recompute.py');
  ok(js.fleet === rc.fleet.gpus && near(js.own, rc.own.annual), 'fleet and owned annual cost match');
  ok(near(js.root, rc.root_check), 'root Cost lab check +' + (js.root * 100).toFixed(1) + '%');
  const txt = await p.evaluate(() => document.body.innerText);
  const S = {}; data.scen.forEach(s => S[s.id] = s);
  const fire = (s, n) => s.alerts.find(a => a[0] === n && a[2] === 'firing')[3];
  const mk = (s, re) => s.marks.find(m => re.test(m[2]))[0];
  const hz = mk(S.hang, /sigstop/), lat = fire(S.hang, 'TrainingStalled') - hz, end = mk(S.hang, /terminal/) - hz;
  ok(Math.round(lat) === 33 && /33 s after a rank froze/.test(txt), 'hang alert 33 s: ' + lat.toFixed(1));
  ok(Math.round(end) === 83 && /83 s/.test(txt), 'hang ended 83 s after freeze: ' + end.toFixed(1));
  ok(Math.round(fire(S.slow, 'TrainingSlowdown') - mk(S.slow, /throttle/)) === 39 || Math.round(fire(S.slow, 'TrainingSlowdown') - mk(S.slow, /throttle/)) === 40, 'slowdown alert about 40 s');
  const sa = data.sacct; const wait = (Date.parse(sa[2].start) - Date.parse(sa[2].submit)) / 1000;
  ok(wait === 66 && /66 s/.test(txt), 'carol waited 66 s: ' + wait);
  ok(sa[1].billing === 4 && sa[1].cpu === 1 && sa[1].gpu === 4, 'bob billing truncated to 4');
  ok(data.scrape.kueue[0] === 2516 && data.scrape.kueue[1] === 299 && /2,516/.test(txt) && /299/.test(txt), 'Kueue scrape 2,516 / 299');
  const cad = Object.keys(data.scrape).filter(k => k.startsWith('cadvisor')).map(k => data.scrape[k][0]);
  ok(Math.min(...cad) >= 900 && Math.min(...cad) <= 1000, 'idle cAdvisor about 950: ' + cad.join(','));
  ok(Math.abs(data.prom.tsdb_series - 1500) < 60, 'about 1,500 series: ' + data.prom.tsdb_series);
  const cpuH = Object.values(S.hang.s.cpu).map(v => Math.min(...v.filter(x => x != null)));
  ok(Math.max(...cpuH) < 0.02, 'hung pods CPU fell to about 0.01: ' + cpuH.join(','));
  const thr = Math.max(...Object.values(S.slow.s.thr).flatMap(v => v.filter(x => x != null)));
  ok(thr > 0.9, 'throttled up to ' + thr);
  const ev = data.kueue_events.map(e => e[2]).join(' ');
  ok(/528Mi more needed/.test(ev) && /was 39s/.test(ev) && /was 76s/.test(ev), 'Kueue message and waits 39, 76 s');
  ok(data.gp[1].rg < 0.13 && data.gp[0].rg > 0.83, 'runtime goodput 84% and 12%');
  const mf = data.mfu.map(m => m.mfu_6N); ok(Math.min(...mf) > 0.33 && Math.max(...mf) < 0.37, 'MFU 34 to 37%: ' + mf.join(','));
  ok(/\$1\.40 per H100/.test(txt) && Math.abs(rc.own.per_hour - 1.40) < 0.005, 'owned $1.40 per hour');
  ok(!/\bNaN\b|undefined/.test(txt), 'no NaN or undefined in text');
} finally { await b.close(); }
console.log(bad ? 'FAIL ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
