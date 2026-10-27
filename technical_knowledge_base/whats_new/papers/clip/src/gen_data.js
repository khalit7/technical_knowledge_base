// Write the toy task's data with the page's own generator (parts/21_js_gen.js).
// usage: node gen_data.js <outdir> [ntrain=120000]
// Each record: 5 attribute bytes (shape, colour, size, pos, style) + LMAX caption token bytes (padded with 0) + 24*24*3 pixel bytes.
// Files: web.u8 (the training stream, 30% drawings), photo.u8 (the same seeds, photos only: the "ImageNet-like" stream),
// val.u8 (mixed, seeds 2^29 + i), test_photo.u8 and test_drawing.u8 (seeds 2^29 + 10^6 + i). The page's own tests draw seeds from 2^30 up.
const G = require('./parts/21_js_gen.js'), fs = require('fs'), path = require('path');
const out = process.argv[2] || '.', N = +(process.argv[3] || 120000), R = 5 + G.LMAX + G.S * G.S * 3;
function write(name, seeds, o) {
  const fd = fs.openSync(path.join(out, name), 'w'), CH = 5000;
  for (let c = 0; c < seeds.length; c += CH) {
    const part = seeds.slice(c, c + CH), buf = Buffer.alloc(part.length * R);
    part.forEach((s, j) => { const p = G.sample(s, o), b = j * R, a = p.a; buf[b] = a.shape; buf[b + 1] = a.colour; buf[b + 2] = a.size; buf[b + 3] = a.pos; buf[b + 4] = a.style;
      G.tokens(p.cap).forEach((t, k) => buf[b + 5 + k] = t);
      for (let i = 0; i < p.img.length; i++) buf[b + 5 + G.LMAX + i] = Math.round(p.img[i] * 255); });
    fs.writeSync(fd, buf);
  }
  fs.closeSync(fd); console.log(name, seeds.length);
}
const Rg = (a, n) => Array.from({ length: n }, (_, i) => a + i);
write('val.u8', Rg(2 ** 29, 2000), {});
write('test_photo.u8', Rg(2 ** 29 + 1e6, 5000), { style: 0 });
write('test_drawing.u8', Rg(2 ** 29 + 1e6, 5000), { style: 1 });
write('web.u8', Rg(1, N), {});
write('photo.u8', Rg(1, N), { pDrawing: 0 });
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({ N, R, LMAX: G.LMAX, S: G.S, VOCAB: G.VOCAB, SHAPES: G.SHAPES, COLOURS: G.COLOURS }));
