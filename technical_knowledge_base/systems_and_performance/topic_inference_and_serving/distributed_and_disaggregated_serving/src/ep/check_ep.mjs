// usage: node check_ep.mjs   (after balance.py wrote out/balance.json)
// Runs the page's JavaScript port of EPLB (parts/32_js_ep.js, window.DDEPLB) on every layer's history for every
// (GPUs, redundant) setting and compares phy2log and logcnt with DeepSeek's eplb.py (the plans balance.py saved).
// Also compares the imbalance of the plans on the traffic sum. Writes out/port_check.json.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import vm from 'vm';
const here = path.dirname(fileURLToPath(import.meta.url));
const B = JSON.parse(fs.readFileSync(path.join(here, 'out', 'balance.json')));
const src = fs.readFileSync(path.join(here, '..', 'parts', '32_js_ep.js'), 'utf8');
const ctx = { window: {}, Math, Array, Infinity }; vm.createContext(ctx);
vm.runInContext(src.split('\n(function(){')[0], ctx);
const E = ctx.window.DDEPLB;
let same = 0, equiv = 0, total = 0, imbDiff = 0; const diffs = [];
for (const p of B.plans) {
  for (let l = 0; l < B.L; l++) {
    total++;
    const r = E.plan(B.hist[l], B.E + p.R, p.G);
    const ok = JSON.stringify(r.phy2log) === JSON.stringify(p.phy2log[l]) && JSON.stringify(r.logcnt) === JSON.stringify(p.logcnt[l]);
    if (ok) same++;
    else {
      // same GPU loads on the history the plan was made from: only copies with equal load sit in a different order (torch's sort leaves ties unordered)
      const a = E.loads(r.phy2log, r.logcnt, B.hist[l], p.G).map(v => Math.round(v * 1e6)).join(), b = E.loads(p.phy2log[l], p.logcnt[l], B.hist[l], p.G).map(v => Math.round(v * 1e6)).join();
      if (a === b && JSON.stringify(r.logcnt) === JSON.stringify(p.logcnt[l])) equiv++; else diffs.push({ G: p.G, R: p.R, l });
    }
    const a = E.imb(E.loads(r.phy2log, r.logcnt, B.traffic_sum[l], p.G)), b = E.imb(E.loads(p.phy2log[l], p.logcnt[l], B.traffic_sum[l], p.G));
    imbDiff = Math.max(imbDiff, Math.abs(a - b));
  }
}
const say = `identical plans for ${same} of ${total} layer-settings, the other ${equiv} differing only in the order of copies with equal load (torch's sort leaves ties unordered), which changes the measured imbalance by at most ${imbDiff.toFixed(3)}`;
fs.writeFileSync(path.join(here, 'out', 'port_check.json'), JSON.stringify({ same, total, imbDiff, diffs, say }));
console.log(say, diffs);
process.exit(same + equiv === total ? 0 : 1);
