// Write each step-through's step list from window.DTSTEP (parts/22_js_anim.js) into the Reading parts as static text:
// every <ol class="sx" ... data-mode="X"> gets one <li> per step, "<b>title.</b> text". Run from src/: node mk_lists.mjs (then sh build.sh).
// check_stages.mjs fails if a list and DTSTEP disagree, so rerun this after editing a step.
import fs from 'fs';
globalThis.window = globalThis;
eval(fs.readFileSync('parts/22_js_anim.js', 'utf8'));
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const item = s => '<li><b>' + esc(s.t) + '.</b> ' + esc(s.p) + '</li>';
let n = 0;
for (const f of fs.readdirSync('parts').filter(f => /^20_read.*\.html$/.test(f))) {
  const p = 'parts/' + f, s = fs.readFileSync(p, 'utf8');
  const t = s.replace(/(<ol class="sx" id="[^"]+" data-mode="([^"]+)"[^>]*>)[\s\S]*?(<\/ol>)/g, (m, open, mode, close) => { n++; return open + '\n' + window.DTSTEP.steps(mode).map(item).join('\n') + '\n' + close });
  if (t !== s) fs.writeFileSync(p, t);
}
console.log(n + ' step lists written');
