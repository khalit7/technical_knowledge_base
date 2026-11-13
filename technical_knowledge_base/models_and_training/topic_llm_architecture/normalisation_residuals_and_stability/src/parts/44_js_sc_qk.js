// ---- Scene (section 4, Fig. 4): the largest attention logit in each of the 6 layers during training, the pre-norm tiny GPT at lr 3e-2 with
// clipping off (back row) against the same model, seed and batches with one change (front row: QK-norm by default; z-loss, a logit cap of 50 or
// the default lr 3e-3 from the chips). Every height is the recorded probe (window.NSD.runs[...].pl: 8 held-out windows every 10 steps, Apple
// M1 Pro, MPS), log scale from 1 to 100,000 against the glass wall behind, one decade per band. Each step plays one stretch of training. ----
(function () {
  if (!document.getElementById('stg-qk') || !window.NSK || !window.NSD) return;
  const { mix } = S3, { la, lab, fmt } = NSK, S = NSD.spike, A = NSD.runs[S.base];
  const NAME = { qk: '+ QK-norm', z: '+ z-loss 1e-4', cap: '+ logit cap 50', ok: 'lr 3e-3 instead' };
  let cmp = S.def, B = NSD.runs[S.comps[cmp]];
  const T = [0, 3, 10, 24, 60, 149], L = A.pl.ml[0].length, DX = 1.1, X = l => (l - (L - 1) / 2) * DX, HM = 2.2, H = v => Math.max(.02, Math.log10(Math.max(v, 1)) / 5 * HM);
  const ZA = -.5, ZB = .9, ZW = -1.55;
  const at = (Rn, i) => { const n = Rn.pl.ml.length - 1, j = Math.min(i, n); return { ml: Rn.pl.ml[j], ent: Rn.pl.ent[j], step: Rn.pl.step[j] }; };
  function idx(k, e, st) { const from = st.pk === k - 1 ? T[st.pk] : T[k]; return Math.round(S3.lerp(from, T[k], e)); }
  function row(R, Rn, i, z, C, name, P, a) {
    const s = at(Rn, i); let top = 0;
    s.ml.forEach((v, l) => { const h = H(v); if (v > s.ml[top]) top = l;
      R.box([X(l), 0, z], [.55, .05, .55], { a, shadow: false });
      R.box([X(l), .05, z], [.4, h, .4], { fill: mix(P.paper, C, .6), a, shadow: false, lw: .8 }); });
    lab(R, [X(0) - .45, .1, z], name, { fs: 12.5, b: 1, c: C, al: 'right', dx: -14, a: Math.max(a, .5), grp: 'rows' });
    lab(R, [X(top), .05 + H(s.ml[top]), z], fmt(s.ml[top]), z === ZB ? { fs: 12.5, b: 1, c: C, al: top ? 'right' : 'left', dx: top ? -14 : 14, dy: 6, a } : { fs: 12.5, b: 1, c: C, dy: -12, a }); // the front row's value sits beside its bar, clear of the row behind
    lab(R, [X(L - 1) + .4, .05, z], 'lowest entropy ' + Math.min(...s.ent).toFixed(2) + ' nats', { fs: 12, c: C, al: 'left', dx: 8, a, wide: 1 });
    return s;
  }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.4, 4.8, -2.0, 1.8, .5); const i = idx(k, e, st);
    // the wall: one band per decade, 1 to 100,000
    R.glass([X(0) - .5, 0, ZW], [X(L - 1) - X(0) + 1, 0, 0], [0, HM, 0], { c: P.mute, a: .55, nu: 1, nv: 5 });
    ['1', '10', '100', '1,000', '10,000', '100,000'].forEach((t, d) => lab(R, [X(L - 1) + .5, d / 5 * HM, ZW], t, { fs: 12, c: P.mute, al: 'left', dx: 6 }));
    for (let l = 0; l < L; l++) lab(R, [X(l), 0, ZB + .3], 'layer ' + (l + 1), { fs: 12, c: P.mute, dy: 12, wide: l % 2 === 1 });
    const sa = row(R, A, i, ZA, P.bad, 'no fix', P, 1);
    row(R, B, i, ZB, P.c1, NAME[cmp], P, 1);
    // training batches arriving while a stretch plays
    if (e < 1 && k > 0) [ZA, ZB].forEach((z, n) => R.flow([[X(0) - .9, .03, z + .36], [X(L - 1) + .4, .03, z + .36]], { c: n ? P.c1 : P.bad, a: .7, r: .045, n: 10, speed: 2 }));
    lab(R, [X(0) - .5, HM, ZW], 'training step ' + sa.step.toLocaleString('en-GB'), { fs: 13, b: 1, c: P.ink, al: 'left', dy: -14 });
    // step 3: layer 1 is first past 1,000; step 4: past 10,000, where Wortsman et al.'s runs all diverged
    lab(R, [X(0), .05 + H(sa.ml[0]), ZA], 'layer 1 first', { fs: 12, b: 1, c: P.bad, al: 'right', dx: -14, dy: -2, a: la(st, e, q => q === 2 ? 1 : 0) });
    const w4 = la(st, e, q => q === 3 ? 1 : 0);
    if (w4 > .01) { R.line([[X(0) - .5, 4 / 5 * HM, ZW + .02], [X(L - 1) + .5, 4 / 5 * HM, ZW + .02]], { c: P.bad, w: 1.6, dash: [5, 4], a: w4 });
      lab(R, [X(L - 1) + .5, HM, ZW], 'dashed: 1e4, past which every run diverged (Wortsman et al.)', { fs: 12, b: 1, c: P.bad, al: 'right', dy: -16, a: w4, wide: 1 }); }
  }
  const full = { cam: [.22, .48], bounds: [[-3.7, 0, -1.6], [4.0, 2.3, 1.3]] };
  const stg = S3.stage({ id: 'stg-qk', list: 'sx-qk', fig: 'Fig. 4 · largest attention logit per layer, lr 3e-2', cam: full.cam, bounds: full.bounds, aspect: .52, dur: 2600, hold: 4400, draw,
    margin: w => w < 520 ? [22, 8, 14, 8] : [30, 70, 20, 110] });
  // the other comparisons: their step lists are written from the recorded captions (the first four stretches are the same run)
  const ol = document.getElementById('sx-qk'), titles = [...ol.children].map(li => li.querySelector('b').textContent);
  const T5 = { z: 'Steps 240 to 600: z-loss does not reach attention.', cap: 'Steps 240 to 600: the cap bounds what the softmax sees.', ok: 'Steps 240 to 600: at the default rate, no runaway.' };
  ['z', 'cap', 'ok'].forEach(m => { const x = document.createElement('ol'); x.className = 'sx'; x.id = 'sx-qk-' + m; x.hidden = true;
    x.innerHTML = S.caps[m].map((c, j) => '<li><b>' + (j === 4 ? T5[m] : j === 0 ? 'Step 0: the same start.' : titles[j]) + '</b> ' + (j >= 1 && j < 4 ? ol.children[j].innerHTML.replace(/^<b>.*?<\/b>\s*/, '') : c[1].replace(/^Step 0: /, '')) + '</li>').join(''); ol.after(x); });
  const chips = document.getElementById('qk-cmp');
  if (chips && stg) chips.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; chips.querySelectorAll('button').forEach(y => y.classList.toggle('on', y === b));
    cmp = b.dataset.m; B = NSD.runs[S.comps[cmp]]; const id = cmp === 'qk' ? 'sx-qk' : 'sx-qk-' + cmp;
    document.querySelectorAll('ol[id^="sx-qk"]').forEach(o => { o.hidden = o.id !== id; }); stg.list(id); });
})();
