// Prints the step lists of Fig. 2 (the narrowing stage, section 4) from TB.narrow, one <ol class="sx"> per program,
// one item per probed line plus tsc's verdict. The output is pasted unchanged into parts/20_read_c.html (between the
// sx-nr-p1 and sx-nr-p4 lists); src/check_stages.mjs checks that every list still carries each step's recorded type and the verdict.
// usage: node src/tb/gen_steplists.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
globalThis.window = {};
eval(fs.readFileSync(path.resolve(here, '../parts/22_js_tb_0data.js'), 'utf8'));
const N = window.TB.narrow, esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const V = { p1: ['helper returns "v is string"', 'helper returns boolean'], p2: ['discriminated union', 'one type, optional fields'], p3: ['one version'], p4: ['name never reassigned', 'name reassigned later'] };
for (const p of ['p1', 'p2', 'p3', 'p4']) {
  const a = N[p + '_after'], b = N[p + '_before'], out = [];
  a.steps.forEach((s, i) => {
    const l = a.code[s.line - 1].trim(), com = l.startsWith('//');
    let h = `<li><b>Line ${s.line}${com ? '' : ': <code>' + esc(l) + '</code>'}.</b> ${esc(s.cap)} <code>${esc(s.expr)}</code> is <code>${esc(s.type)}</code>.`;
    if (b) { const t = b.steps[i]; if (t.type !== s.type || t.expr !== s.expr) h += ` Before: ${esc(t.cap[0].toLowerCase() + t.cap.slice(1))} <code>${esc(t.expr)}</code> is <code>${esc(t.type)}</code>.`; }
    out.push(h + '</li>');
  });
  const verdict = d => d.tsc.length ? `tsc fails: <code>${esc(d.tsc.filter(x => /^narrow/.test(x)).join('</code> and <code>'))}</code>` : `tsc accepts it and Node prints <code>${esc(d.run.trim())}</code>`;
  const dot = t => /[.]<\/code>$/.test(t) ? t : t + '.';
  out.push(`<li><b>The verdict.</b> After: ${dot(verdict(a))}${b ? ' Before: ' + dot(verdict(b)) : ''}</li>`);
  console.log(`<ol class="sx" id="sx-nr-${p}"${p === 'p1' ? '' : ' hidden'}>\n${out.join('\n')}\n</ol>`);
}
