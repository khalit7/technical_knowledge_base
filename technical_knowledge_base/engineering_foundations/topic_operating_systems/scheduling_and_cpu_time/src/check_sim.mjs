// Runs the page's simulator (parts/30_js_fair_core.js) on every scenario of simref.py and requires the same schedule,
// CPU totals, wake-up waits and switch counts. Usage: python3 simref.py simref_out.json && node check_sim.mjs
import fs from 'fs'; import vm from 'vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('parts/30_js_fair_core.js', 'utf8'), ctx);
const F = ctx.window.FAIR, ref = JSON.parse(fs.readFileSync('simref_out.json', 'utf8'));
let bad = 0, n = 0;
for (const key of Object.keys(ref)) {
  const [name, pol] = key.split('/'); const sc = F.SCEN[name];
  const r = F.simulate(pol, sc.tasks, sc.horizon); n++;
  const same = JSON.stringify(r.segs) === JSON.stringify(ref[key].segs) && JSON.stringify(r.cpu) === JSON.stringify(ref[key].cpu)
    && JSON.stringify(r.waits) === JSON.stringify(ref[key].waits) && r.switches === ref[key].switches;
  if (!same) { bad++; console.log('MISMATCH', key, JSON.stringify(r.segs).slice(0, 300), '\n   ref', JSON.stringify(ref[key].segs).slice(0, 300)); }
  else console.log('same', key, 'segments', r.segs.length, 'switches', r.switches);
}
console.log(`check_sim: ${n - bad}/${n} scenarios identical`); process.exit(bad ? 1 : 0);
