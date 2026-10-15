// The Mesh designer's JavaScript (window.SS_MESH.calc in the built page) against runs/ss_mesh.py (out/mesh_ref.json).
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const require = createRequire(path.resolve('../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const ref = JSON.parse(fs.readFileSync('out/mesh_ref.json', 'utf8'));
const b = await puppeteer.launch({ headless: 'shell' }); const p = await b.newPage();
await p.goto('file://' + path.resolve('../index.html'));
const res = await p.evaluate(ref => {
  const G = {}; SS.specs.gens.forEach(g => G[g.gen] = g);
  const chip = gen => { const g = G[gen]; const c = { bf16: g.bf16, hbm: g.hbm, link: g.sb.link_oneway }; if (gen === '7x') { c.bf16 /= 2; c.hbm /= 2 } return c };
  const bad = [];
  for (const [k, v] of Object.entries(ref.params)) if (SS_MESH.nParams(SS_MESH.MODELS[k]) !== v) bad.push('params ' + k);
  for (const c of ref.cases) {
    const r = SS_MESH.calc(SS_MESH.MODELS[c.model], chip(c.gen), c.phys, c.B, c.X, c.Y, c.remat);
    for (const [k, v] of Object.entries(c.out)) {
      const j = r[k];
      if (typeof v === 'number' ? Math.abs(j - v) > 1e-9 * Math.max(1, Math.abs(v)) : j !== v) bad.push(c.model + ' ' + c.gen + ' ' + k + ': js ' + j + ' py ' + v);
    }
  }
  return bad;
}, ref);
console.log(res.length ? res.join('\n') : 'check_mesh: all ' + ref.cases.length + ' cases and ' + Object.keys(ref.params).length + ' parameter counts agree');
await b.close();
process.exit(res.length ? 1 : 0);
