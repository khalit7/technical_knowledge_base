// Run the page's simulator core (parts/31_js_sim_b_core.js) on every case in ref_out.json and require the
// same results as the Python references. Usage: node check_js.mjs   (writes check_js.txt)
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import vm from 'vm';
const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, '../parts/31_js_sim_b_core.js'), 'utf8'), ctx);
const SC = ctx.SIMCORE, R = JSON.parse(fs.readFileSync(path.join(here, 'ref_out.json'), 'utf8'));
const tally = {}, bad = [];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const close = (a, b) => Object.keys(a).every(k => Math.abs(a[k] - b[k]) < 1e-9);
function ok(name, good, d) { const t = tally[name] = tally[name] || [0, 0]; t[0] += good ? 1 : 0; t[1]++; if (!good && bad.length < 20) bad.push(name + ': ' + d) }
for (const c of R.sched) { const r = SC.schedule(c.jobs, c.policy, { q: c.q, io_time: c.io_time });
  ok('schedule ' + c.policy, eq(r.timeline, c.res.timeline) && eq(r.jobs, c.res.jobs) && close(r.avg, c.res.avg), JSON.stringify(c.jobs)) }
for (const c of R.mlfq) { const r = SC.mlfq(c.jobs, c.quanta, c.allot, c.boost, c.io_time);
  ok('mlfq', eq(r.timeline, c.res.timeline) && eq(r.levels, c.res.levels) && eq(r.jobs, c.res.jobs), JSON.stringify(c.jobs)) }
for (const c of R.tlb) { const r = SC.tlbTrace(SC.arrayTrace(c.rows, c.cols, c.order, c.base), c.page, c.entries);
  ok('tlb', r.hits === c.hits && eq(r.seq, c.seq), `${c.rows}x${c.cols} ${c.order}`) }
for (const c of R.replace) { const r = SC.replace(c.refs, c.frames, c.policy);
  ok('replace ' + c.policy, r.hits === c.hits && eq(r.seq.map(s => s.evict), c.evict) && eq(r.seq.map(s => s.mem), c.mem), JSON.stringify(c.refs)) }
for (const c of R.linear) { ok('translate', eq(SC.translateLinear(c.va, c.page, c.pt), c.res), c.va) }
for (const c of R.cow) { ok('cow', SC.cowCopied(c.n, c.kind, c.action) === c.copied, `${c.n} ${c.kind} ${c.action}`) }
for (const c of R.x86) { const r = SC.runX86(SC.PROGS[c.prog], c.loops, c.interval, 2, c.seed);
  ok('x86 ' + c.prog, r.count === c.count && r.steps === c.steps && (!c.trace || eq(r.trace, c.trace)), `${c.loops} ${c.interval} ${c.seed}`) }
ok('deadlock', eq(SC.deadlockCount(false), R.deadlock.opposite) && eq(SC.deadlockCount(true), R.deadlock.ordered), '');
for (const m in R.crash) { const t = SC.crashTable(m); ok('crash ' + m, eq(t, R.crash[m]), m) }
const lines = Object.entries(tally).map(([k, [g, n]]) => `${k}: ${g}/${n} identical`).concat(bad);
fs.writeFileSync(path.join(here, 'check_js.txt'), lines.join('\n') + '\n'); console.log(lines.join('\n'));
