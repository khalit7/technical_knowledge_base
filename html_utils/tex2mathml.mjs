// Build-time LaTeX to MathML (no runtime library; MathML renders natively in current browsers).
// Usage: node html_utils/tex2mathml.mjs < page.html > page.out.html
// Converts \( ... \) to inline math and \[ ... \] to display math. Text inside <script> and <style> is left alone.
// Fails loudly on a LaTeX error so a broken formula never ships.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), 'package.json'));
const temml = require('temml');
let src = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) src += chunk;
const parts = src.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/i);
let n = 0;
const conv = (tex, display) => {
  n++;
  try { return temml.renderToString(tex, { displayMode: display, throwOnError: true, annotate: true }); }
  catch (e) { process.stderr.write(`tex2mathml: error in formula ${n}: ${tex}\n${e.message}\n`); process.exit(1); }
};
const out = parts.map((p, i) => (i % 2 === 1) ? p :
  p.replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => conv(t.trim(), true))
   .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => conv(t.trim(), false))).join('');
process.stdout.write(out);
process.stderr.write(`tex2mathml: ${n} formulas\n`);
