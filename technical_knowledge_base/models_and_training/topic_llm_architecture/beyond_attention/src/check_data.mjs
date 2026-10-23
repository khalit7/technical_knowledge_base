// Proves the built page embeds exactly the recorded data and that its JavaScript agrees with the Python references:
//  - window.BAD fields against src/*/out/*.json (runs, write rules, state calc, recall probes, MQAR, inside);
//  - MM.cache (root window.CC + this page's KDA / Qwen3.5 additions) against src/mem/statecalc.py at every context;
//  - BA_WR (the write-rule animation) end cosines against src/state/state_rules.py for 5 rules x 4 key sizes;
//  - every data-v number in the prose equals what BA_V computes from window.BAD (the prose is static HTML since 2026-10-23,
//    so the ledger and other pages can see it; 22_js_rd_1fill.js marks a disagreeing number with data-stale);
//  - the static tables and summaries (hybrid table, runs table, copy, phone book, name recall, MQAR, half-lives, tiny
//    presets) against the recorded outputs; and the hand-written prose numbers listed below.
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_llm_architecture/beyond_attention/src/check_data.mjs
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const DIR = path.resolve('technical_knowledge_base/models_and_training/topic_llm_architecture/beyond_attention');
const J = p => JSON.parse(fs.readFileSync(path.join(DIR, 'src', p), 'utf8')); const EX = p => fs.existsSync(path.join(DIR, 'src', p));
const fails = []; let checks = 0; const ok = (c, msg) => { checks++; if (!c) fails.push(msg) };
const b = await puppeteer.launch({ headless: 'shell' });
try {
  const p = await b.newPage(); await p.goto('file://' + path.join(DIR, 'index.html')); await new Promise(r => setTimeout(r, 400));
  const BAD = await p.evaluate(() => window.BAD);
  // runs
  if (EX('runs/out/runs.json')) for (const r of J('runs/out/runs.json').runs) {
    const x = BAD.runs.find(z => z.run === r.run); ok(x && x.val === r.val && x.rs === r.rs && x.params === r.params, 'run ' + r.run) }
  // write rules: data and JS
  const st = J('state/out/state_rules.json');
  for (const [k, v] of Object.entries(st.rules)) ok(Math.abs(BAD.wr[k].mean - v.mean) < 6e-4, 'wr data ' + k);
  const js = await p.evaluate(() => { const o = {}; for (const dk of [4, 8, 16, 32]) for (const r of ['softmax', 'linear', 'decay', 'delta', 'gated']) { const s = BA_WR(dk, r); o[r + '_d' + dk] = s.steps[s.steps.length - 1].cos } return o });
  for (const [k, v] of Object.entries(st.rules)) for (const [w, c] of Object.entries(v.cos)) ok(Math.abs(js[k][w] - c) < 1e-6, `wr js ${k} ${w} ${js[k][w]} vs ${c}`);
  // state vs KV: JS against Python
  const sc = J('mem/out/statecalc.json');
  const mm = await p.evaluate(ctxs => BAD.mem.models.map(m => ({ key: m.key, at: Object.fromEntries(ctxs.map(c => [c, MM.cache(m.cfg, c)])), one: MM.cache(m.cfg, 1), cross: MM.cross(m.cfg) })), sc.ctxs);
  for (const m of sc.models) { const x = mm.find(z => z.key === m.key);
    ok(x.one.kv === m.kv_per_token && x.one.state === m.state && x.cross === m.kv_equals_state_at, 'mem ' + m.key + ' per-token/state/cross');
    for (const c of sc.ctxs) ok(x.at[c].total === m.at[String(c)].total, `mem ${m.key} @${c}: js ${x.at[c].total} py ${m.at[String(c)].total}`) }
  // recall and inside
  if (EX('recall/out/pretrained_copy.json')) { const c = J('recall/out/pretrained_copy.json'); ok(JSON.stringify(BAD.copy) === JSON.stringify(c), 'copy data') }
  if (EX('recall/out/tiny_recall.json')) { const c = J('recall/out/tiny_recall.json'); ok(JSON.stringify(BAD.tiny_recall) === JSON.stringify(c), 'tiny recall data') }
  if (EX('recall/out/mqar')) for (const f of fs.readdirSync(path.join(DIR, 'src/recall/out/mqar'))) { const q = J('recall/out/mqar/' + f);
    ok(BAD.mqar.some(z => z.model === q.model && z.pairs === q.pairs && z.acc === q.acc), 'mqar ' + f) }
  const ins = J('inside/out/ssm_inside.json'); ok(BAD.inside.dual === ins.dual_vs_recurrent_max_abs_logit_diff, 'inside dual');
  ok(JSON.stringify(BAD.inside.layers.map(l => l.half_life)) === JSON.stringify(ins.layers.map(l => l.half_life)), 'inside half-lives');
  // prose
  const txt = await p.$eval('#t-read', e => { e.querySelectorAll('details').forEach(d => d.open = true); return e.innerText });
  const stale = await p.$$eval('[data-v]', els => els.filter(e => e.dataset.stale !== undefined).map(e => e.dataset.v + ' shows ' + e.textContent + ', data ' + e.dataset.stale));
  ok(stale.length === 0, 'stale data-v: ' + stale.join('; '));
  // static tables and summaries against the recorded outputs
  const cell = await p.evaluate(() => { const o = {}; for (const id of ['rd-hyb', 'rd-runs', 'rc-mq', 'mm-tiny']) { const t = document.getElementById(id); o[id] = t ? [...t.querySelectorAll('tbody tr')].map(r => [...r.cells].map(c => c.textContent.trim())) : [] } return o });
  const fi = n => Math.round(n).toLocaleString('en-GB'), pc = x => Math.round(100 * x) + '%';
  for (const m of sc.models.filter(m => m.group === 'hybrid')) { const r = cell['rd-hyb'].find(c => c[0] === m.label);
    ok(r && r[5] === (m.state / 1048576).toFixed(1) + ' MiB' && r[6] === fi(m.kv_equals_state_at) && r[7] === (m.at['131072'].total / 2 ** 30).toFixed(2) + ' GiB', 'hybrid row ' + m.key) }
  if (EX('runs/out/runs.json')) for (const r of J('runs/out/runs.json').runs) { const c = cell['rd-runs'].find(x => x[0].startsWith(r.run + ' '));
    ok(c && c[2] === fi(r.params) && c[3] === r.val.toFixed(3) && c[4] === r.rs.toFixed(3), 'runs row ' + r.run) }
  if (EX('recall/out/pretrained_copy.json')) { const C = J('recall/out/pretrained_copy.json'), py = C.models[0], mb = C.models[1];
    ok(/pythia/.test(py.name) && /mamba/.test(mb.name), 'copy model order');
    for (let i = 0; i < py.copy.length; i++) ok(txt.includes(fi(py.copy[i].words) + ' words ' + pc(py.copy[i].acc) + ' / ' + pc(mb.copy[i].acc)), 'copy point ' + py.copy[i].words);
    for (let i = 0; i < py.phonebook.length; i++) ok(txt.includes(py.phonebook[i].entries + ' entries ' + pc(py.phonebook[i].acc) + ' / ' + pc(mb.phonebook[i].acc)), 'book point ' + py.phonebook[i].entries);
    const at = (m, w) => pc(m.copy.find(z => z.words === w).acc);
    ok(txt.includes(`at 32 words: Pythia ${at(py, 32)}, Mamba ${at(mb, 32)}; at 256: ${at(py, 256)} and ${at(mb, 256)}; at 1,000: ${at(py, 1000)} and ${at(mb, 1000)}`), 'copy headline');
    for (const f of mb.phonebook.find(z => z.entries === 40).fails.slice(0, 3)) ok(txt.includes(f.query + ': wanted ' + f.want + ', got "' + f.got + '"'), 'failure ' + f.query) }
  if (EX('recall/out/tiny_recall.json')) { const T = J('recall/out/tiny_recall.json');
    for (const d of [64, 128]) { const i = T.dist.indexOf(d); for (const m of T.models) ok(txt.includes(m.run + ' ' + (m.unseen[i] - m.seen[i]).toFixed(2)), `name recall ${m.run} @${d}`) } }
  if (EX('recall/out/mqar')) for (const f of fs.readdirSync(path.join(DIR, 'src/recall/out/mqar'))) { const q = J('recall/out/mqar/' + f);
    const NM = { attn: '2 attention layers', ssm16: '2 SSM layers, state 16', ssm64: '2 SSM layers, state 64', hybrid: 'SSM then attention' };
    const r = cell['rc-mq'].find(c => c[0] === NM[q.model]), col = [8, 32, 64].indexOf(q.pairs) + 1; ok(r && r[col] === pc(q.acc), 'mqar cell ' + f) }
  { const hl = ins.layers.flatMap(l => l.half_life.filter(h => h !== null)).sort((a, b) => a - b);
    ok(txt.includes(`half-lives from ${hl[0].toFixed(1)} to ${fi(hl[hl.length - 1])} tokens, median ${hl[Math.floor(hl.length / 2)].toFixed(1)}; ${hl.filter(h => h >= 64).length} heads`), 'half-life summary') }
  for (const t of sc.tiny) { const r = cell['mm-tiny'].find(c => c[0] === t.preset); ok(r && r[3] === t.state_fp32.toLocaleString('en-GB') + ' B', 'tiny preset ' + t.preset) }
  const nem = sc.models.find(m => m.key === 'nemotron-h-8b'), tiny = sc.tiny, ll = sc.models.find(m => m.key === 'llama-3.1-8b'), kl = sc.models.find(m => m.key === 'kimi-linear-48b');
  const demos = fs.readFileSync(path.join(DIR, 'src/code/out/demos.txt'), 'utf8');
  const prose = [
    ['98.8 MiB', (nem.state / 1048576).toFixed(1) === '98.8'], ['6,144 bytes per token', tiny[0].kv_per_token_bf16 === 6144],
    ['38 tokens', Math.round(tiny[1].state_fp32 / tiny[0].kv_per_token_bf16) === 38], ['235,776 bytes', tiny[1].state_fp32 === 235776],
    ['128 KiB per token', ll.kv_per_token === 131072], ['16 GiB at 131,072', ll.at['131072'].total === 16 * 2 ** 30],
    ['1,079,296 numbers', (nem.state / 4 / 24) === 1079296], ['7.9 KiB per token', (kl.kv_per_token / 1024).toFixed(1) === '7.9'],
    ['252 GiB', Math.round(32 * 2 ** 20 * kl.kv_per_token / 2 ** 30) === 252], ['about 6,300 tokens', Math.abs(nem.kv_equals_state_at - 6300) < 50],
    ['4.4e-16', /4\.44e-16/.test(demos)], ['272 numbers', /272 numbers/.test(demos)], ['max error 0.22', /bfloat16.*2\.195e-01/.test(demos)],
    ['0.0017', /segment sum, max error 1\.721e-03/.test(demos)], ['3.7e-6', /3\.680e-06/.test(demos)], ['5.8e-8', /5\.794e-08/.test(demos)]];
  for (const [s, cond] of prose) ok(txt.includes(s) && cond, 'prose "' + s + '"');
  console.log('checks', checks, fails.length ? fails : 'all pass');
} finally { await b.close() }
process.exit(fails.length ? 1 : 0);
