// Runs OSTEP's real malloc.py (../inputs/ostep_malloc.py, ostep-homework vm-freespace) and the page's port
// (../parts/31_js_fl_core.js) on the same options and compares the full printed output.  Usage: node check_freelist.mjs
import fs from 'fs'; import {execFileSync} from 'child_process';
new Function(fs.readFileSync(new URL('../parts/31_js_fl_core.js', import.meta.url), 'utf8'))();
const cases = [];
const pols = ['BEST', 'WORST', 'FIRST'], ords = ['ADDRSORT', 'SIZESORT+', 'SIZESORT-', 'INSERT-FRONT', 'INSERT-BACK'];
let k = 0;
for (const seed of [0, 1, 2, 3, 7, 42, 123456789, 4294967297])
  for (const policy of pols) for (const order of ords) for (const coalesce of [false, true]) {
    k++; if (k % 3 && seed > 3) continue;
    cases.push({seed, size: 100, base: 1000, header: (k % 4 === 0) ? 4 : 0, align: (k % 5 === 0) ? 4 : -1, policy, order, coalesce,
      numOps: 10 + (k % 4) * 10, range: 10 + (k % 3) * 10, pAlloc: [50, 30, 70][k % 3], list: ''});
  }
for (const list of ['+10,-0,+5', '+20,+20,+20,-1,+15,-0,+25,-2', '+10,+10,+10,+10,+10,-0,-2,-4,+30,-1,-3,+30'])
  for (const policy of pols) for (const coalesce of [false, true])
    cases.push({seed: 0, size: 100, base: 1000, header: 0, align: -1, policy, order: 'ADDRSORT', coalesce, numOps: 10, range: 10, pAlloc: 50, list});
let bad = 0;
for (const c of cases) {
  const args = ['../inputs/ostep_malloc.py', '-s', c.seed, '-S', c.size, '-b', c.base, '-H', c.header, '-a', c.align, '-p', c.policy,
    '-l', c.order, '-n', c.numOps, '-r', c.range, '-P', c.pAlloc, '-c'].map(String);
  if (c.coalesce) args.push('-C'); if (c.list) args.push('-A', c.list);
  const py = execFileSync('python3', args).toString().replace(/\s+$/, '');
  const js = globalThis.FREELIST.run(c).text.replace(/\s+$/, '');
  if (py !== js) { bad++; if (bad < 3) { console.log('MISMATCH', JSON.stringify(c)); const a = py.split('\n'), b = js.split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { console.log(' py:', a[i]); console.log(' js:', b[i]); break; } } }
}
console.log(`malloc.py cases ${cases.length}, mismatches ${bad}`);
