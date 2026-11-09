// ---- Scene (section 2, Fig. 3): CLIP B/32's learned position table and what interpolate_pos_encoding does with it. Heights are the cosine
// similarity of the chosen slot's position vector to every slot's, from the released table at 224 (7 x 7) and from the model's own bicubic
// resize at 448 (14 x 14), recorded by runs/resolution.py (VE.res.clip.pos224, pos448, x 100); the cost numbers come from the page's MACs
// formula (VEU.macs) and the recorded 448-pixel run (VE.res.clip.runs). ----
(function () {
  if (!document.getElementById('stg-pos') || !window.VEK) return;
  const { mix, lerp } = S3, { tw, la, lab, image, cell, f2, int } = VEK, C = VE.res.clip, run = C.runs['448'];
  let slot = 0;
  const IX = -3.1, S = 2.8, FX = 1.8, H = 1.0, GX = 4.6;
  const m224 = VEU.macs(224, 32, 768, 12, 3072, 1).total, m448 = VEU.macs(448, 32, 768, 12, 3072, 1).total;
  function bars(R, g, val, a, on, o) { o = o || {}; for (let r = 0; r < g; r++) for (let c = 0; c < g; c++) { const i = r * g + c; if (o.only && !o.only(i)) continue; const v = val(i), t = cell(g, FX, 0, S, .04, r, c);
    R.box([t[0], 0, t[1]], [t[2] * .8, Math.max(.01, v / 100 * H), t[2] * .8], { fill: i === on ? mix(P0(R), R.P.c5, .85) : mix(R.P.paper, R.P.acc, .12 + .7 * Math.max(0, v) / 100), a, shadow: false, lw: .5 }); } }
  const P0 = R => R.P.paper;
  function draw(R, k, e, st) {
    const P = R.P, r0 = Math.floor(slot / 7), c0 = slot % 7, s448 = 2 * r0 * 14 + 2 * c0, A = C.pos224[String(slot)], B = C.pos448[String(slot)];
    R.grid(-4.8, 5.8, -2.0, 2.0, .5);
    // the image at 224 (7 x 7 patches) or at 448 (14 x 14), the chosen slot outlined
    const fine = k >= 1, g = fine ? 14 : 7;
    image(R, 'p01_cat', 28, IX, 0, S, { g, gap: .04, a: tw(st, e, q => q === 4 || q === 2 ? .4 : 1), hl: fine ? [2 * r0, 2 * c0] : [r0, c0], hc: P.c5 });
    lab(R, [IX, 0, S / 2], fine ? '448 px · 14 × 14 = 196 patches' : '224 px · 7 × 7 = 49 patches', { fs: 12.5, b: 1, c: P.ink, dy: 16, a: la(st, e, q => q <= 1 ? 1 : 0) });
    // the table: 7 x 7 at 224; at 448 the same 49 rows meet 196 slots (the rest have none); then the bicubic resize to 14 x 14
    const a0 = tw(st, e, q => q === 0 ? 1 : 0), a1 = tw(st, e, q => q === 1 ? 1 : 0), a2 = tw(st, e, q => q >= 2 ? 1 : 0);
    if (a0 > .01) bars(R, 7, i => A[i], a0, slot);
    if (a1 > .01) { for (let i = 0; i < 196; i++) { const t = cell(14, FX, 0, S, .04, i / 14 | 0, i % 14); if (i >= 49) R.quad([[t[0] - t[2] * .4, .01, t[1] - t[2] * .4], [t[0] + t[2] * .4, .01, t[1] - t[2] * .4], [t[0] + t[2] * .4, .01, t[1] + t[2] * .4], [t[0] - t[2] * .4, .01, t[1] + t[2] * .4]], { a: a1, ec: P.bad, ea: .6, lw: .8, dash: [3, 3] }); }
      bars(R, 14, i => A[i], a1, slot, { only: i => i < 49 }); }
    if (a2 > .01) { const up = i => A[((i / 14 | 0) >> 1) * 7 + ((i % 14) >> 1)], t = k === 2 && st.pk < 2 ? e : 1; bars(R, 14, i => lerp(up(i), B[i], t), a2, s448); }
    lab(R, [FX, 0, S / 2], k === 0 ? 'learned table · 49 rows (+1 for [CLS])' : k === 1 ? '49 rows for 196 slots' : 'bicubic → 14 × 14', { mono: 1, fs: 12.5, b: 1, c: k === 1 ? P.bad : P.acc, dy: 16, a: la(st, e, q => q <= 2 ? 1 : 0) });
    lab(R, [FX + S / 2, H, -S / 2], 'height: cosine with the chosen slot', { fs: 12, c: P.mute, al: 'left', dx: 6, a: la(st, e, q => q === 0 || q === 3 ? 1 : 0), wide: 1 });
    lab(R, [FX, 0, S / 2], 'none of these 196 rows was trained', { fs: 12.5, b: 1, c: P.acc, dy: 16, a: la(st, e, q => q === 3 ? 1 : 0) });
    // the cost: four times the tokens and the compute, and an image embedding that moves
    const ca = tw(st, e, q => q === 4 ? 1 : 0);
    if (ca > .01) { const hh = v => v / m448 * 1.6; R.box([GX - .35, 0, 0], [.45, hh(m224), .45], { fill: mix(P.paper, P.acc, .35), a: ca }); R.box([GX + .35, 0, 0], [.45, hh(m448), .45], { fill: mix(P.paper, P.c2, .55), a: ca });
      lab(R, [GX - .35, hh(m224), 0], f2(m224 / 1e9) + ' G', { mono: 1, fs: 12, c: P.acc, dy: -10, a: ca }); lab(R, [GX + .35, hh(m448), 0], f2(m448 / 1e9) + ' G', { mono: 1, fs: 12, b: 1, c: P.c2, dy: -10, a: ca });
      lab(R, [GX, 0, .4], 'MACs: 224 · 448', { fs: 12, c: P.mute, dy: 14, a: ca });
      lab(R, [FX, 0, S / 2], 'embedding at 448 vs 224: cosine ' + f2(run.cos_to_224) + ' (min ' + f2(run.cos_to_224_min) + ')', { fs: 12.5, b: 1, c: P.c2, dy: 16, a: la(st, e, q => q === 4 ? 1 : 0) }); }
  }
  const st = S3.stage({ id: 'stg-pos', list: 'sx-pos', fig: 'Fig. 3 · CLIP B/32\'s position table, resized', cam: [.22, 1.12], bounds: [[-4.6, 0, -1.6], [5.4, 1.1, 1.9]], aspect: .55, dur: 1500, hold: 4800, draw, margin: VEK.margin,
    view: k => k === 2 ? { cam: [.3, 1.0], bounds: [[.2, 0, -1.6], [3.6, 1.1, 1.9]] } : null });
  const ch = document.getElementById('ve-pos-slot');
  if (ch) ch.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; ch.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); slot = +b.dataset.m; st && st.draw(); });
  VEK.onImage(() => st && st.draw());
})();
