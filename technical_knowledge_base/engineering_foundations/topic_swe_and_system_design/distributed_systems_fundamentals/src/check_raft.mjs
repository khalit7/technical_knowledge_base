// Fuzz the Raft lab's model (parts/31_js_raft_model.js) for Raft's safety properties.
// Run: node check_raft.mjs [runs]   Random crashes, restarts, partitions and writes; after every event checks
//  Election Safety (at most one leader per term), Log Matching on committed prefixes (State Machine Safety),
//  committed entries never change; and at the end, after healing, that a write commits (liveness under a good network).
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {}, Math, Set, Error, Infinity, console }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(H, 'parts/31_js_raft_model.js'), 'utf8'), ctx);
const RAFT = ctx.window.RAFT;
const runs = +(process.argv[2] || 300); let bad = 0, commits = 0, elections = 0, maxTerm = 0;
function rnd(seed) { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 } }
for (let r = 0; r < runs; r++) {
  const sim = RAFT.create(1000 + r), R = rnd(r * 7 + 3); const committed = {};
  const check = () => {
    for (const t in sim.leadersByTerm) if (sim.leadersByTerm[t].length > 1) throw new Error('two leaders in term ' + t);
    for (const s of sim.S) for (let i = 1; i <= s.commit; i++) {
      const e = s.log[i - 1]; const k = e.term + ':' + e.cmd;
      if (committed[i] && committed[i] !== k) throw new Error('committed entry ' + i + ' differs: ' + committed[i] + ' vs ' + k);
      committed[i] = k;
    }
  };
  try {
    for (let t = 0; t < 40; t++) {
      const x = R();
      if (x < 0.25) sim.write(); else if (x < 0.4) sim.crash(Math.floor(R() * 5)); else if (x < 0.6) sim.restart(Math.floor(R() * 5));
      else if (x < 0.7) { const g = [0, 0, 0, 0, 0].map(() => R() < 0.5 ? 0 : 1); sim.partition(g) } else if (x < 0.8) sim.partition(null);
      const until = sim.now + 50 + Math.floor(R() * 400);
      while (sim.nextAt() <= until) { sim.step(); check() }
      sim.runTo(until);
    }
    sim.partition(null); for (let i = 0; i < 5; i++) sim.restart(i);
    let tEnd = sim.now + 3000; while (sim.nextAt() <= tEnd) { sim.step(); check() }
    const L = sim.leader(); if (!L) throw new Error('no leader after healing');
    const c = sim.write(); const before = L.commit; tEnd = sim.now + 1000; while (sim.nextAt() <= tEnd) { sim.step(); check() }
    if (!(L.commit > before)) throw new Error('write did not commit after healing');
    commits += Object.keys(committed).length; maxTerm = Math.max(maxTerm, ...sim.S.map(s => s.term)); elections += Object.keys(sim.leadersByTerm).length;
  } catch (e) { bad++; console.log('run', r, 'FAIL', e.message) }
}
console.log(`runs=${runs} failures=${bad} committed entries checked=${commits} leaders elected=${elections} max term=${maxTerm}`);
process.exit(bad ? 1 : 0);
