// ---- Scene (section 4, Fig. 5): one 800 x 400 synthetic scene (gr_02; the processor makes it 800 x 384), the question about its red circle,
// Qwen3.5's recorded answer as four numbers in the text, and the same four numbers drawn under three readings (0 to 1,000 of the image,
// pixels of the original, pixels of the resized image mapped back), then SmolVLM's answer. Boxes: VM_DATA.groundParsed (score_ground.py);
// IoU computed here from those boxes and the known true box (inputs/synthetic.json). ----
(function () {
  if (!document.getElementById('stg-gr') || !window.VMK) return;
  const K = VMK, { tw, la, lab, seg, img, iou, mix } = K, D = K.D;
  const sc = (D.syn && D.syn.ground || []).find(g => g.key === 'gr_02'); if (!sc) return;
  const OBJ = 'red circle', truth = sc.objects.find(o => o.obj === OBJ).box, rq = D.runs.qwen.ground.rows.find(r => r.key === sc.key && r.obj === OBJ),
    rs = D.runs.smol.ground.rows.find(r => r.key === sc.key && r.obj === OBJ), bq = D.groundParsed['qwen:' + sc.key + ':' + OBJ], bs = D.groundParsed['smol:' + sc.key + ':' + OBJ];
  const nums = a => (a.match(/"bbox_2d":\s*\[([^\]]*)\]/) || ['', ''])[1].split(',').map(x => x.trim());
  const nq = nums(rq.answer), ns = nums(rs.answer);
  // [box in original pixels, colour key, label]
  const READ = [null, null, [bq.k1000, 'c2', 'as 0 to 1,000 of the image'], [bq.orig, 'c5', 'as pixels of the original 800 × 400'], [bq.resized, 'c4', 'as pixels of the resized 800 × 384, mapped back'], [bs.orig, 'acc', 'SmolVLM']];
  const PW = 4.4, PH = PW * sc.h / sc.w, PX = -2.6, PY = .2;
  const fr = b => [b[0] / sc.w, b[1] / sc.h, b[2] / sc.w, b[3] / sc.h];
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.6, 4.6, -2.2, 2, .5);
    const boxes = [[...fr(truth), P.good, 2, [6, 4]]];
    // the box the current reading draws (the previous one fades out)
    [st.pk, k].forEach((s, j) => { const r = READ[s]; if (!r) return; const a = j ? (st.pk === k || e >= 1 ? 1 : e) : (st.pk === k ? 0 : 1 - e); if (a <= .01) return;
      const b = r[0].slice(); if (s === 5) { b[2] = Math.max(b[2], b[0] + 4); b[3] = Math.max(b[3], b[1] + 4); } boxes.push([...fr(b), P[r[1]], 2.6, null, a]); });
    img(R, K.pic(sc.thumb), [PX, PY, 0], [PW, 0, 0], [0, PH, 0], { boxes, sub: 3 });
    const l = s => la(st, e, q => q === s ? 1 : 0);
    lab(R, [PX + PW / 2, PY + PH, 0], 'Locate the red circle: {"bbox_2d": [x1, y1, x2, y2]}', { mono: 1, fs: 12.5, b: 1, dy: -14, a: l(0) });
    lab(R, [PX + (truth[2] / sc.w) * PW, PY + PH * (1 - truth[3] / sc.h), 0], 'true box', { fs: 12, c: P.good, al: 'left', dx: 6, dy: 8, a: tw(st, e, q => q === 0 || q === 1 ? 1 : 0) });
    // the answer: four numbers in the text, as tokens above the image (then read three ways)
    const ta = tw(st, e, q => q === 0 ? .15 : q === 5 ? 0 : 1), sa = tw(st, e, q => q === 5 ? 1 : 0), ty = PY + PH + .55;
    const chips = (vals, a, c) => vals.forEach((v, i) => { const x = -1.35 + i * .9; R.box([x, ty, 0], [.78, .2, .3], { fill: mix(P.paper, c, .5), a, shadow: false }); lab(R, [x, ty + .2, 0], v, { mono: 1, fs: 13, b: 1, dy: -10, a }); });
    chips(nq, ta, P.c4); chips(ns, sa, P.acc);
    if (k === 1) R.flow(seg([PX + PW / 2, PY + PH, 0], [-1.35, ty, 0], 8), { c: P.c4, a: e, r: .07 });
    if (k >= 2 && k <= 4) { const b = READ[k][0], cA = [PX + PW * b[0] / sc.w, PY + PH * (1 - b[1] / sc.h), .02], cB = [PX + PW * b[2] / sc.w, PY + PH * (1 - b[3] / sc.h), .02];
      R.flow([[-1.35, ty, 0], cA], { c: P[READ[k][1]], a: e * .9, r: .06, n: 5 }); R.flow([[1.35, ty, 0], cB], { c: P[READ[k][1]], a: e * .9, r: .06, n: 5 }); }
    lab(R, [-1.8, ty + .1, 0], 'Qwen3.5 wrote', { fs: 12.5, b: 1, c: P.c4, al: 'right', dx: -4, a: tw(st, e, q => q >= 1 && q <= 4 ? 1 : 0) });
    lab(R, [-1.8, ty + .1, 0], 'SmolVLM wrote', { fs: 12.5, b: 1, c: P.acc, al: 'right', dx: -4, a: l(5) });
    // what each reading gives: the box drawn on the image and its overlap with the true box
    READ.forEach((r, s) => { if (!r) return; const v = iou(r[0], truth);
      lab(R, [PX + PW / 2, PY, 0], (s === 5 ? 'SmolVLM wrote ' + ns.join(', ') + ': IoU ' : 'read ' + r[2] + ': IoU ') + v.toFixed(2), { fs: 13, b: 1, c: P[r[1]], dy: 16, a: l(s) }); });
  }
  const st = S3.stage({ id: 'stg-gr', list: 'sx-gr', fig: 'Fig. 5 · one answer, three readings', cam: [.06, .3], bounds: [[-2.8, 0, -.3], [2.8, PY + PH + 1.1, .3]], aspect: .62, dur: 1300, hold: 5000, draw, margin: K.margin });
  K.onPic(() => st && st.draw());
})();
