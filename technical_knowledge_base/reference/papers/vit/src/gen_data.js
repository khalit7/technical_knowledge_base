// Write the toy task's data with the page's own generator (parts/21_js_gen.js).
// usage: node gen_data.js <outdir> [ntrain=64000]   -> train.u8, val.u8, test.u8 (each record: 1 label byte + 784 pixel bytes)
// Seeds: train 1..N, validation 2^29 + i, test 2^29 + 10^6 + i; the page's in-browser test draws from 2^30 up.
const G = require('./parts/21_js_gen.js'), fs = require('fs'), path = require('path');
const out = process.argv[2] || '.', N = +(process.argv[3] || 64000);
function write(name, seeds) {
  const buf = Buffer.alloc(seeds.length * 785);
  seeds.forEach((s, j) => { const { img, label } = G.sample(s); buf[j * 785] = label; for (let i = 0; i < 784; i++) buf[j * 785 + 1 + i] = Math.round(img[i] * 255); });
  fs.writeFileSync(path.join(out, name), buf); console.log(name, seeds.length);
}
const R = (a, n) => Array.from({ length: n }, (_, i) => a + i);
write('train.u8', R(1, N)); write('val.u8', R(2 ** 29, 2000)); write('test.u8', R(2 ** 29 + 1e6, 5000));
if (process.argv[4] === 'show') for (let s = 1; s <= 2; s++) { const { img, label, L } = G.sample(s); console.log('label', G.KINDS[label], JSON.stringify(L));
  for (let y = 0; y < 28; y++) { let r = ''; for (let x = 0; x < 28; x++) r += img[y * 28 + x] > .5 ? '#' : img[y * 28 + x] > .2 ? '.' : ' '; console.log(r); } }
