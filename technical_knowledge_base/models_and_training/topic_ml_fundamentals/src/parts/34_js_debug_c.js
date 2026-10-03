// ---- When training goes wrong: shared chart helpers, symptom map, debugger, gallery, recipe checks ----
(function (DG) {
  if (!DG || !DG.R || !DG.symptoms) return;
  const $ = id => document.getElementById(id), R = DG.R;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const fmt = (v, p) => {
    if (v === null || v === undefined || (typeof v === 'number' && !isFinite(v))) return 'NaN';
    if (typeof v === 'string') return v;
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) { const e = Math.floor(Math.log10(a)), m = v / Math.pow(10, e); return (+m.toFixed(1)) + ' &times; 10<sup>' + e + '</sup>'; }
    return (+v.toPrecision(p || 3)).toLocaleString('en-US');
  };
  const fmtT = (v) => { // plain-text version for SVG labels
    if (v === null || v === undefined || !isFinite(v)) return 'NaN';
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e4 || a < 1e-3)) { const e = Math.floor(Math.log10(a)); return (+(v / Math.pow(10, e)).toFixed(1)) + 'e' + e; }
    return String(+v.toPrecision(3));
  };
  DG.fmt = fmt; DG.fmtT = fmtT; DG.esc = esc;
  const bandOf = k => DG.bands.find(b => b.k === k);
  const bandChip = k => { const b = bandOf(k); return '<span class="dg-band"><i style="background:' + b.c + '"></i>' + b.n + '</span>'; };

  // ---- log-scale line chart, laid out from the container's measured width ----
  function ticksLog(lo, hi) {
    const dec = Math.log10(hi / lo), out = [];
    if (dec >= 1.2) {
      const step = Math.max(1, Math.ceil(dec / 5));
      for (let e = Math.ceil(Math.log10(lo)); e <= Math.floor(Math.log10(hi)); e += step) out.push(Math.pow(10, e));
      return out;
    }
    const raw = (hi - lo) / 4, m = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 5, 10].map(x => x * m).find(x => x >= raw);
    for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-12; v += st) out.push(+v.toPrecision(6));
    return out;
  }
  function chart(el, o) {
    const W = Math.max(240, el.clientWidth - 2), H = o.h || (W < 480 ? 190 : 230);
    const ml = 44, mr = o.mr || 12, mt = 14, mb = 26, iw = W - ml - mr, ih = H - mt - mb;
    let lo = Infinity, hi = -Infinity, xmax = o.xmax || 1;
    o.series.forEach(s => s.pts.forEach(p => { if (p[1] !== null && p[1] > 0 && isFinite(p[1])) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); } xmax = Math.max(xmax, p[0]); }));
    if (o.xmax) xmax = o.xmax;
    if (!isFinite(lo)) { lo = 1; hi = 10; }
    if (o.cap && hi > o.cap) hi = o.cap;
    if (o.ylo) lo = Math.min(lo, o.ylo); if (o.yhi) hi = Math.max(hi, o.yhi);
    if (hi / lo < 1.05) { lo /= 1.03; hi *= 1.03; } else { lo /= Math.pow(hi / lo, 0.04); hi *= Math.pow(hi / lo, 0.04); }
    const lx = o.logx, x0 = lx ? Math.log10(o.xmin) : 0, x1 = lx ? Math.log10(xmax) : xmax;
    const X = x => ml + iw * ((lx ? Math.log10(x) : x) - x0) / (x1 - x0), Y = v => mt + ih * (1 - Math.log10(v / lo) / Math.log10(hi / lo));
    let s = '';
    ticksLog(lo, hi).forEach(t => { const y = Y(t); if (y < mt - 1 || y > mt + ih + 1) return;
      s += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" style="stroke:var(--line)"/>' +
        '<text x="' + (ml - 4) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="10.5" style="fill:var(--mute)">' + fmtT(t) + '</text>'; });
    const xt = o.xticks || (() => { const r = [], st = [1, 2, 5].map(m => m * Math.pow(10, Math.floor(Math.log10(xmax / 4)))).find(v => xmax / v <= (W < 400 ? 4.5 : 7)) || xmax; for (let v = 0; v <= xmax; v += st) r.push(v); return r; })();
    xt.forEach(t => { const x = X(t); s += '<text x="' + x.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" style="fill:var(--mute)">' + (o.xfmt ? o.xfmt(t) : fmtT(t)) + '</text>'; });
    s += '<text x="' + (W - mr) + '" y="' + (H - 8 - 12) + '" text-anchor="end" font-size="10.5" style="fill:var(--mute)">' + (o.xlabel || 'step') + '</text>';
    s += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + (mt + ih) + '" y2="' + (mt + ih) + '" style="stroke:var(--mute)"/>';
    const top = [];
    o.series.forEach(se => {
      let d = '', pen = false;
      se.pts.forEach(p => {
        if (p[0] > xmax || (lx && p[0] <= 0)) return;
        const v = p[1];
        if (v === null || !isFinite(v) || v <= 0) { pen = false; return; }
        const c = v > hi; if (c) top.push([p[0], v, se.c]);
        d += (pen ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(Math.max(lo, Math.min(hi, v))).toFixed(1); pen = true;
      });
      s += '<path d="' + d + '" fill="none" style="stroke:' + se.c + ';stroke-width:' + (se.w || 1.4) + (se.dash ? ';stroke-dasharray:5 3' : '') + (se.op ? ';opacity:' + se.op : '') + '"/>';
      if (se.dots) se.pts.forEach(p => { if (p[1] !== null && isFinite(p[1]) && p[1] > 0 && p[1] <= hi) s += '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="3" style="fill:' + se.c + '"/>'; });
      if (se.nanAt) { const x = X(se.nanAt); s += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + mt + '" y2="' + (mt + ih) + '" style="stroke:' + se.c + ';stroke-dasharray:2 3"/>' +
        '<text x="' + Math.min(W - mr - 2, x + 4).toFixed(1) + '" y="' + (mt + 10) + '" text-anchor="' + (x > W - 90 ? 'end' : 'start') + '" font-size="10.5" font-weight="600" class="dg-nan" style="fill:' + se.c + '">' + (se.nanLabel || 'NaN') + '</text>'; }
    });
    if (top.length) { const t = top.reduce((a, b) => (b[1] > a[1] ? b : a)); const x = X(t[0]);
      s += '<text x="' + Math.min(W - mr - 2, x + 4).toFixed(1) + '" y="' + (mt + 22) + '" text-anchor="' + (x > W - 110 ? 'end' : 'start') + '" font-size="10.5" style="fill:' + t[2] + '">&#8593; ' + fmtT(t[1]) + '</text>'; }
    (o.marks || []).forEach(m => { const x = X(m.x), y = m.y ? Y(m.y) : mt + ih; s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" style="fill:none;stroke:' + m.c + ';stroke-width:1.6"/>';
      if (m.t) s += '<text x="' + Math.min(W - mr - 2, x + 6).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="' + (x > W - 120 ? 'end' : 'start') + '" font-size="10.5" style="fill:' + m.c + '">' + m.t + '</text>'; });
    if (o.extra) s += o.extra(X, Y, {W, H, ml, mr, mt, ih, lo, hi});
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(o.label || 'chart') + '">' + s + '</svg>';
  }
  DG.chart = chart;
  const legItem = (c, dash, t) => '<span><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" style="stroke:' + c + ';stroke-width:2' + (dash ? ';stroke-dasharray:5 3' : '') + '"/></svg>' + t + '</span>';
  DG.legItem = legItem;
  const run = id => R.runs[id];

  // ---- symptom map ----
  const st = {sym: 'nan', open: -1, view: 'both'};
  function drawMap() {
    let h = '<table><thead><tr><th class="sy">Symptom</th>' + DG.bands.map(b => '<th><i style="background:' + b.c + '"></i>' + b.n.replace(' and ', ' &amp; ').replace(' (any band)', '') + '</th>').join('') + '</tr></thead><tbody>';
    DG.symptoms.forEach(sy => {
      h += '<tr' + (sy.id === st.sym ? ' class="on"' : '') + '><th class="sy"><a href="#" data-sy="' + sy.id + '">' + sy.n + '</a></th>';
      DG.bands.forEach(b => {
        const ix = []; sy.causes.forEach((c, i) => { if (c.b === b.k) ix.push(i); });
        h += '<td>' + (ix.length ? '<button style="background:' + b.c + ';width:auto;min-width:26px;padding:0 4px" data-sy="' + sy.id + '" data-ci="' + ix[0] + '" class="' + (sy.id === st.sym && ix.indexOf(st.open) >= 0 ? 'on' : '') + '" title="' + esc(ix.map(i => (i + 1) + '. ' + sy.causes[i].t).join('; ')) + '">' + ix.map(i => i + 1).join(',') + '</button>' : '') + '</td>';
      });
      h += '</tr>';
    });
    $('dg-map').innerHTML = h + '</tbody></table>';
  }
  function drawChips() {
    $('dg-syms').innerHTML = DG.symptoms.map(sy => '<button data-sy="' + sy.id + '" class="' + (sy.id === st.sym ? 'on' : '') + '" aria-pressed="' + (sy.id === st.sym) + '">' + sy.n + '</button>').join('');
  }
  function pairFor(sy) {
    const c = st.open >= 0 ? sy.causes[st.open] : null;
    return (c && c.run) || sy.run;
  }
  function runCaption(id, label) {
    const r = run(id); if (!r) return '';
    const f = r.fin, parts = ['Loss before the first update ' + fmt(r.init, 4)];
    if (r.div) parts.push('<b>non-finite at step ' + r.div + '</b>');
    else parts.push('final training loss ' + fmt(f.train) + ', validation ' + fmt(f.val) + ', accuracy ' + (typeof f.acc === 'number' ? Math.round(f.acc * 1000) / 10 + '%' : f.acc));
    if (r.vdiv && !r.div) parts.push('validation non-finite from step ' + r.vdiv);
    if (r.best && !r.div) parts.push('best validation ' + fmt(r.best[1]) + ' at step ' + r.best[0]);
    return '<b>' + label + '</b>: ' + DG.runDesc[id] + '. ' + parts.join('; ') + '.';
  }
  function drawRunChart() {
    const sy = DG.symptoms.find(s => s.id === st.sym), el = $('dg-chart'); if (!el) return;
    if (sy.id === 'imb') return drawImb(el);
    if (sy.id === 'spike') return drawSpikeMini(el);
    const pr = pairFor(sy); if (!pr) { el.innerHTML = ''; return; }
    const [b, f] = pr.map(run), ser = [];
    const showB = st.view !== 'fix', showF = st.view !== 'bug' && f;
    if (showF) { ser.push({pts: f.tr, c: 'var(--dg-fix)', op: .9}); ser.push({pts: f.va, c: 'var(--dg-fix)', dash: 1}); }
    if (showB) { ser.push({pts: b.tr, c: 'var(--dg-bug)', nanAt: b.div, nanLabel: 'NaN at step ' + b.div}); ser.push({pts: b.va, c: 'var(--dg-bug)', dash: 1, nanAt: !b.div && b.vdiv ? b.vdiv : 0, nanLabel: 'validation inf from step ' + b.vdiv}); }
    const xmax = Math.max(...[b, f].filter(Boolean).map(r => Math.max(r.tr.length ? r.tr[r.tr.length - 1][0] : 1, r.va.length ? r.va[r.va.length - 1][0] : 1)));
    const marks = [];
    if (showB && b.best && pr[0] === 'overfit' && !b.div) marks.push({x: b.best[0], y: b.best[1], c: 'var(--dg-bug)', t: 'best validation, step ' + b.best[0]});
    chart(el, {series: ser, xmax: b.div && f ? xmax : xmax, cap: 1e6, marks, label: 'Recorded training and validation loss: ' + sy.n});
    $('dg-chartleg').innerHTML = legItem('var(--dg-bug)', 0, 'with the bug, training') + legItem('var(--dg-bug)', 1, 'validation') + (f ? legItem('var(--dg-fix)', 0, 'with the fix, training') + legItem('var(--dg-fix)', 1, 'validation') : '');
    $('dg-chartcap').innerHTML = runCaption(pr[0], 'Bug') + (f ? '<br>' + runCaption(pr[1], 'Fix') : '');
  }
  function drawImb(el) {
    const I = R.imb, M = [['plain', 'plain cross-entropy'], ['weighted', 're-weighted (positives x20)'], ['focal', 'focal loss (&gamma; 2, &alpha; 0.25)'], ['oversample', 'oversampled to 50:50 batches'], ['prior_bias', 'output bias at the prior']];
    const K = [['acc', 'accuracy'], ['rec', 'recall'], ['prec', 'precision'], ['f1', 'F1'], ['auprc', 'AUPRC']];
    let h = '<div class="tw"><table class="dg-t"><thead><tr><th>Remedy (mean of 3 seeds)</th>' + K.map(k => '<th class="num">' + k[1] + '</th>').join('') + '</tr></thead><tbody>';
    h += '<tr><td class="mute">"always no"</td><td class="num">' + (I.always_no * 100).toFixed(1) + '%</td><td class="num">0%</td><td class="num">n/a</td><td class="num">0</td><td class="num mute">n/a</td></tr>';
    M.forEach(([k, n]) => { const m = I.m[k].mean; h += '<tr><td>' + n + '</td>' + K.map(([kk]) => { const v = m[kk]; const w = Math.round(v * 100);
      return '<td class="num" style="background:linear-gradient(90deg,color-mix(in srgb,var(--dg-fix) 26%,transparent) ' + w + '%,transparent ' + w + '%)">' + (kk === 'f1' || kk === 'auprc' ? v.toFixed(2) : (v * 100).toFixed(1) + '%') + '</td>'; }).join('') + '</tr>'; });
    el.innerHTML = h + '</tbody></table></div>';
    $('dg-chartleg').innerHTML = '';
    const p = I.m.plain.mean, w = I.m.weighted.mean, fo = I.m.focal.mean, pb = I.m.prior_bias.mean;
    $('dg-chartcap').innerHTML = 'Recorded: "is this digit a 9?", ' + I.n_train[1] + ' nines among ' + (I.n_train[0] + I.n_train[1]) + ' training images and ' + I.n_val[1] + ' among ' + (I.n_val[0] + I.n_val[1]) + ' validation images (1:20), MLP 64-32-1, 300 Adam steps, threshold 0.5. Plain cross-entropy scores ' + (p.acc * 100).toFixed(1) + '% accuracy, above "always no", while finding only ' + (p.rec * 100).toFixed(1) + '% of the nines. Re-weighting finds ' + (w.rec * 100).toFixed(1) + '% at precision ' + (w.prec * 100).toFixed(1) + '%: it mostly moves the threshold, which is why AUPRC (threshold-free) barely changes. Focal loss with the detection paper\'s &alpha; = 0.25, which weights positives <i>down</i>, found fewer nines (' + (fo.rec * 100).toFixed(1) + '%): settings tuned for 1:1000 dense detection do not transfer. Starting the output bias at the prior gave the best AUPRC (' + pb.auprc.toFixed(2) + '). Per-seed numbers in <code>src/debug/runs_imbalance.json</code>.';
  }
  function drawSpikeMini(el) {
    const S = R.spike.main, dec = DG.decode; if (!dec) { el.innerHTML = ''; return; }
    const pick = (k, c, w) => ({pts: dec(S[k].q.loss, 'loss').map((v, i) => [i + 1, v]), c, w});
    chart(el, {series: [pick('base', 'var(--dg-bug)', 1), pick('both', 'var(--dg-fix)', 1)], label: 'Toy Transformer training loss with and without QK-norm and z-loss'});
    $('dg-chartleg').innerHTML = legItem('var(--dg-bug)', 0, 'no QK-norm, no z-loss') + legItem('var(--dg-fix)', 0, 'QK-norm + z-loss');
    const pk = k => { const a = dec(S[k].q.loss, 'loss'); let j = 30; for (let i = 30; i < a.length; i++) if ((a[i] || 0) > (a[j] || 0)) j = i; return [j + 1, a[j]]; }, pb = pk('base'), pf = pk('both');
    $('dg-chartcap').innerHTML = 'Recorded: the toy character Transformer at peak learning rate ' + S.base.lr.toExponential(0) + ', every step. Without QK-norm and z-loss the loss spikes to ' + fmt(pb[1]) + ' at step ' + pb[0] + ' and never returns to its earlier level (final validation loss ' + fmt(S.base.fv) + '); with them, a spike to ' + fmt(pf[1]) + ' at step ' + pf[0] + ' recovers (final ' + fmt(S.both.fv) + '). Largest attention logit ' + fmt(S.base.mx) + ' against ' + fmt(S.both.mx) + '. The section {{Loss spikes at scale|#t-debug}} below has the sweep and the spike score.';
  }
  function drawDet() {
    const sy = DG.symptoms.find(s => s.id === st.sym);
    let h = '<h3>' + sy.n + '</h3><p>' + sy.lead + '</p>';
    h += '<div class="dg-plot"><div class="seg" id="dg-view" role="group" aria-label="Show"' + (sy.id === 'imb' || sy.id === 'spike' ? ' hidden style="display:none"' : '') + '><button data-v="both" class="' + (st.view === 'both' ? 'on' : '') + '">Both</button><button data-v="bug" class="' + (st.view === 'bug' ? 'on' : '') + '">With the bug</button><button data-v="fix" class="' + (st.view === 'fix' ? 'on' : '') + '">With the fix</button></div><div class="dg-leg" id="dg-chartleg"></div><div id="dg-chart"></div><p class="dg-cap" id="dg-chartcap"></p></div>';
    h += '<p class="small mute" style="margin:6px 0 0">Likely causes, most common first. Open one to see the check and the fix' + (sy.id === 'imb' || sy.id === 'spike' ? '' : '; a cause marked "recorded" swaps the chart to its own run') + '.</p><ol class="dg-causes">';
    sy.causes.forEach((c, i) => {
      const b = bandOf(c.b), op = i === st.open;
      h += '<li class="dg-cause' + (op ? ' open' : '') + '"><button aria-expanded="' + op + '" data-ci="' + i + '"><span class="rk">' + (i + 1) + '</span><span class="tt">' + c.t + '</span><span class="bb">' + bandChip(c.b) + (c.run ? '<span class="rec">recorded</span>' : '') + '</span></button>';
      if (op) {
        h += '<div class="body"><p>' + c.w + '</p><p><span class="k">Check:</span> ' + c.ch + '</p><p><span class="k">Fix:</span> ' + c.fx + '</p>';
        if (c.note) h += '<p class="dg-note">' + c.note + '</p>';
        const pg = b.pid ? DG.NP[b.pid] : null;
        if (pg) h += '<p class="small"><span class="k">Owned by:</span> <a href="https://app.notion.com/p/' + pg.slice(2) + '" target="_blank" rel="noopener noreferrer">' + b.page + '</a></p>';
        if (c.lab) h += '<p class="small"><span class="k">Reproduce it:</span> in the <a href="#" data-tab="t-lab" class="dg-tablink">Training lab</a>, ' + c.lab + '.</p>';
        h += '</div>';
      }
      h += '</li>';
    });
    $('dg-det').innerHTML = h + '</ol>';
    drawRunChart();
  }
  function select(id, ci, scroll) {
    st.sym = id; st.open = ci === undefined ? -1 : ci; drawMap(); drawChips(); drawDet();
    if (scroll) { const d = $('dg-det'); if (d.scrollIntoView) d.scrollIntoView({block: 'start', behavior: 'smooth'}); }
  }
  DG.select = select;
  const tab = $('t-debug');
  tab.addEventListener('click', e => {
    const t = e.target.closest('[data-sy],[data-ci],[data-v],.dg-tablink,a[data-tab="t-debug"]'); if (!t || !tab.contains(t)) return;
    if (t.matches('a[data-tab="t-debug"]')) { e.preventDefault(); e.stopPropagation(); const h = $('dg-h-spike'); if (h) h.scrollIntoView({block: 'start'}); return; }
    if (t.classList.contains('dg-tablink')) { e.preventDefault(); const b = document.querySelector('#tabs button[data-t="t-lab"]'); if (b) { b.click(); b.scrollIntoView({block: 'start'}); } return; }
    if (t.closest('#dg-map,#dg-syms') && t.dataset.sy) { e.preventDefault(); select(t.dataset.sy, t.dataset.ci === undefined ? -1 : +t.dataset.ci, !!t.closest('#dg-map') && t.dataset.ci !== undefined && false); return; }
    if (t.closest('#dg-det') && t.dataset.ci !== undefined) { const i = +t.dataset.ci; st.open = st.open === i ? -1 : i; drawMap(); drawDet(); return; }
    if (t.closest('#dg-view') && t.dataset.v) { st.view = t.dataset.v; drawDet(); return; }
  });

  // ---- gallery ----
  const GAL = [
    ['healthy', null, 'Healthy reference', 'smooth fall; validation flattens near 0.06'],
    ['nan_log', 'nan', 'NaN mid-run', 'log of a softmax that underflowed'],
    ['explode_init', 'exp', 'NaN at step 2', 'weights N(0, 1) in 20 layers'],
    ['nan_lr', 'plat', 'Blow-up, then dead', 'stuck at ln 10 = 2.303'],
    ['flat_lowlr', 'flat', 'Flat: rate too low', 'Adam at 1e-6'],
    ['flat_stale_opt', 'flat', 'Flat: weights never move', 'optimiser holds another copy'],
    ['flat_shuffled_labels', 'flat', 'Labels misaligned', 'memorises; validation climbs'],
    ['flat_double_softmax', 'plat', 'Floor at 1.461', 'softmax applied twice'],
    ['osc_lr', 'osc', 'Oscillates: rate too high', 'Adam at 0.03'],
    ['osc_bs', 'osc', 'Oscillates: batch of 2', 'noisy gradients'],
    ['osc_unscaled', 'osc', 'Oscillates: unscaled inputs', 'raw pixels 0 to 16'],
    ['plateau_dead', 'plat', 'Plateau: dead ReLUs', 'biases at -3; escapes late'],
    ['plateau_decay', 'plat', 'Plateau: rate decayed to 0', 'schedule ends at step 30'],
    ['vanish_sigmoid', 'van', 'Vanishing gradients', '20 sigmoid layers'],
    ['overfit', 'over', 'Overfitting', '300 images, 30% wrong labels'],
    ['val_scaler_bug', 'over', 'Validation wrong from step 0', 'scaler divides by 1e-6'],
    ['underfit_tiny', 'under', 'Underfitting: too small', '2-unit bottleneck'],
    ['underfit_wd', 'under', 'Underfitting: decay 30', 'regularised into the ground'],
    ['spike', 'spike', 'Spikes at a high rate', 'toy Transformer, no QK-norm']
  ];
  function drawGal() {
    const g = $('dg-gal');
    if (!g.dataset.built) {
      g.innerHTML = GAL.map((t, i) => '<button class="dg-tile" data-gi="' + i + '"' + (t[1] ? '' : ' disabled') + '><div class="h">' + t[2] + '</div><div data-gp="' + i + '"></div><div class="s">' + t[3] + '</div></button>').join('');
      g.dataset.built = 1;
      g.addEventListener('click', e => { const b = e.target.closest('[data-gi]'); if (!b) return; const t = GAL[+b.dataset.gi]; if (!t[1]) return;
        const sy = DG.symptoms.find(s => s.id === t[1]); let ci = sy.causes.findIndex(c => c.run && c.run[0] === t[0]); select(t[1], ci, true); });
    }
    GAL.forEach((t, i) => {
      const el = g.querySelector('[data-gp="' + i + '"]'); if (!el) return;
      if (t[0] === 'spike') { const dec = DG.decode; if (!dec) return; const v = dec(R.spike.main.base.q.loss, 'loss').map((x, j) => [j + 1, x]);
        chart(el, {series: [{pts: v, c: 'var(--dg-bug)', w: 1}], h: 110, label: t[2]}); return; }
      const r = run(t[0]);
      chart(el, {series: [{pts: r.tr, c: t[1] ? 'var(--dg-bug)' : 'var(--dg-fix)', w: 1.1, nanAt: r.div, nanLabel: 'NaN'}, {pts: r.va, c: t[1] ? 'var(--dg-bug)' : 'var(--dg-fix)', dash: 1, w: 1.1}], h: 110, cap: 1e6, label: t[2]});
    });
  }

  // ---- recipe: loss at init, overfit one batch ----
  function drawK() {
    const K = Math.max(2, Math.round(+$('dg-k').value || 2)), L = Math.log(K);
    $('dg-kout').innerHTML = 'Uniform predictions over ' + K.toLocaleString('en-US') + ' classes give cross-entropy -ln(1/' + K.toLocaleString('en-US') + ') = ln ' + K.toLocaleString('en-US') + ' = <b>' + L.toFixed(3) + '</b> nats' + (K > 1000 ? ' (a language model\'s first logged loss should be close to this)' : '') + '. Much higher means the initial logits are too large (an overconfident random guess); much lower, before any training, means a leak or a bug in the loss.';
    $('dg-kp').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.k === K));
  }
  function drawInitRows() {
    const rows = [['healthy', 'MLP 64-128-128-10, PyTorch default initialisation', 'about ln 10 = 2.303: the default initialisation spreads probability evenly'],
      ['plateau_dead_fix', 'same MLP, He initialisation on every layer', 'He initialisation on the output layer too: logits too large, an overconfident random guess (Karpathy\'s "init well": scale the last layer down or start it at 0)'],
      ['vanish_fix_relu_he', '20 hidden layers of 64, ReLU, He initialisation', '20 He-initialised layers: the logits are larger still; this run trains, but its first steps are spent undoing the start'],
      ['explode_init', '20 hidden layers of 64, ReLU, weights N(0, 1)', 'the forward pass has already exploded before any update']];
    $('dg-initrows').innerHTML = rows.map(r => '<tr><td>' + r[1] + '</td><td class="num">' + fmt(run(r[0]).init, 4) + '</td><td>' + r[2] + '</td></tr>').join('');
  }
  function drawOB() {
    const a = run('overfit_one_batch_ok'), b = run('overfit_one_batch_stale'), c = run('overfit_one_batch_shuffled');
    chart($('dg-ob'), {series: [{pts: b.tr, c: 'var(--dg-bug)'}, {pts: c.tr, c: 'var(--dg-b5)', w: 2.2, op: .8}, {pts: a.tr, c: 'var(--dg-fix)'}], label: 'Overfit one batch, three versions of the code'});
    $('dg-obcap').innerHTML = '<span class="dg-leg" style="display:flex">' + legItem('var(--dg-fix)', 0, 'healthy code: ' + fmt(a.fin.train) + ' after 200 steps') + legItem('var(--dg-bug)', 0, 'stale optimiser: stays at ' + fmt(b.fin.train)) + legItem('var(--dg-b5)', 0, 'shuffled labels: ' + fmt(c.fin.train)) + '</span>The check splits the two bugs of "loss flat from the start". The stale optimiser cannot fit even 8 images: the bug is in the code. Shuffled labels fit 8 images perfectly (8 wrong labels are as easy to memorise as 8 right ones), so the check passes and the problem must be in the data.';
  }
  $('dg-k').addEventListener('input', drawK);
  $('dg-kp').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; $('dg-k').value = b.dataset.k; drawK(); });

  function render() { if (tab.hidden) return; drawMap(); drawChips(); drawDet(); drawGal(); drawK(); drawInitRows(); drawOB(); }
  DG.renderC = render;
  window.TAB_RENDER = window.TAB_RENDER || {}; (window.TAB_RENDER['t-debug'] = window.TAB_RENDER['t-debug'] || []).push(render);
  let rw = 0; addEventListener('resize', () => { const w = tab.clientWidth; if (!tab.hidden && Math.abs(w - rw) > 20) { rw = w; drawRunChart(); drawGal(); drawOB(); } });
  if (!tab.hidden) render();
})(window.DG);
