// Check the page's simulators outside the browser: the process-tree model against OSTEP fork.py's recorded
// final trees (inputs/ostep_fork_cases.json), and every descriptor script runs to the end without an error
// and ends in the stated state. Run from src/: node check_sim.mjs
import fs from 'node:fs';
global.window = global; global.document = { getElementById: () => null };
global.RD = { esc: s => String(s), t: () => '', svg: () => '' };
const code = f => fs.readFileSync('parts/' + f, 'utf8');
eval(code('22_js_data.js')); eval(code('30_js_fdsim.js')); eval(code('33_js_lab.js'));
let bad = 0, ok = 0;
for (const c of PD.ostep) {
  const md = c.flags === '-R' ? 'ostepR' : c.flags === '-L' ? 'ostepL' : 'ostep';
  const st = TREESIM.run(c.actions.split(','), md, {});
  const same = JSON.stringify(TREESIM.flat(st[st.length - 1])) === JSON.stringify(c.final);
  if (same) ok++; else { bad++; console.log('DIFF', c.seed, c.flags, c.actions, JSON.stringify(TREESIM.flat(st[st.length - 1])), JSON.stringify(c.final)); }
}
console.log('fork.py final trees matched:', ok, 'of', PD.ostep.length);
// Linux rule: the real reparent run (me -> b -> c -> d, b exits): c moves to PID 1, d stays under c
const L = TREESIM.run('a+b,b+c,c+d,b-'.split(','), 'linux', {});
const fl = TREESIM.flat(L[L.length - 1]).map(x => x.join(':')).join(' ');
if (fl !== '0:a 1:b 1:c 2:d') { bad++; console.log('linux reparent wrong:', fl); } else console.log('linux reparent ok:', fl);
for (const [k, s] of Object.entries(FDSCRIPTS)) {
  try { const st = FDSIM.run(s.steps); const last = st[st.length - 1];
    if ((k === 'leak' || k === 'cloexec') && !/end of file/.test(last.res)) { bad++; console.log(k, 'does not end in EOF'); }
    if (k === 'leak' && !/blocks/.test(st[11].res)) { bad++; console.log('leak step 12 should block:', st[11].res); }
    console.log('fd script ok:', k, '->', last.res);
  } catch (e) { bad++; console.log('fd script error', k, e.message); }
}
process.exit(bad ? 1 : 0);
