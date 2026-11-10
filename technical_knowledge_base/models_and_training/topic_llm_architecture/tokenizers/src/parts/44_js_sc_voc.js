// ---- Scene (Fig. 4, section 7): what the vocabulary tables are of a model, as one strip from input table to output table with length in
// proportion to parameters. The tiny GPT at 4,096 and at GPT-2's 50,257 entries are derived (V x 256 against its 4,721,920 other parameters,
// TKN.sweepMeta.nonemb; running-text token counts from TKN.compare.running); Gemma 3 1B, Llama 3.1 8B and gpt-oss-20b are the root Config
// calculator's recorded results (TKN.calc, from src/vocab/calc_embed.py). ----
(function () {
  if (!document.getElementById('stg-voc') || !window.TKS) return;
  const { la, tw, lab, int } = TKS, { mix, lerp } = S3, N = TKN, C = k => N.calc.find(x => x.key === k), NE = N.sweepMeta.nonemb;
  const mb = v => v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : (v / 1e6).toFixed(v >= 1e8 ? 0 : 2) + 'M', pc = v => Math.round(100 * v) + '%';
  const tiny = (V, run) => ({ name: 'tiny GPT, ' + int(V) + ' entries', V, d: 256, tied: true, E: V * 256, U: 0, rest: NE, run, flops: 2 * V * 256 / (2 * V * 256 + 2 * NE) });
  const cm = (k, name, act) => { const c = C(k), t = c.embedding + c.unembedding, base = act ? c.active : c.total;
    return { name, V: c.V, d: c.d, tied: c.tied, E: c.embedding, U: c.unembedding, rest: base - t, idle: act ? c.total - c.active : 0, act, flops: c.head_flops_per_token / c.decode_flops_1 }; };
  const MS = [tiny(4096, N.compare.running.ours), tiny(50257, N.compare.running.gpt2), cm('gemma-3-1b', 'Gemma 3 1B'), cm('llama-3.1-8b', 'Llama 3.1 8B'), cm('gpt-oss-20b', 'gpt-oss-20b, all weights'), cm('gpt-oss-20b', 'gpt-oss-20b, per token', 1)];
  MS.forEach(m => { m.tot = m.E + m.U + m.rest; m.share = (m.E + m.U) / m.tot; });
  const LEN = 11, X0 = -LEN / 2, ZS = 0, WD = 1.9;
  const seg = m => { const s = LEN / m.tot; return { e: m.E * s, b: m.rest * s, u: m.U * s }; };
  function draw(R, k, e, st) {
    const P = R.P, L = f => la(st, e, f), m = MS[k], g = kk => seg(MS[kk]); R.grid(-6.6, 6.6, -2.2, 3.4, .5);
    const le = tw(st, e, kk => g(kk).e), lb = tw(st, e, kk => g(kk).b), lu = tw(st, e, kk => g(kk).u);
    const xE = X0, xB = X0 + le, xU = xB + lb, xEnd = xU + lu;
    // the input table, the blocks, the output table (absent when tied: the same table scores the output)
    R.glass([xE, .26, ZS + WD / 2], [Math.max(.03, le), 0, 0], [0, 0, -WD], { c: P.c1, a: 1, nu: Math.max(1, Math.min(8, Math.round(le * 2))), nv: 6, th: .06 });
    R.box([(xB + xU) / 2, 0, ZS], [Math.max(.03, lb - .06), .5, WD * .9], { fill: P.paper, lw: .9 });
    if (lu > .02) R.glass([xU, .26, ZS + WD / 2], [lu, 0, 0], [0, 0, -WD], { c: P.c4, a: 1, nu: Math.max(1, Math.min(8, Math.round(lu * 2))), nv: 6, th: .06 });
    const ia = L(kk => MS[kk].act ? 1 : 0);
    if (ia > .01) { R.box([X0 + LEN / 2, .62, ZS - WD * .9], [LEN * .96, .3, .5], { fill: P.paper, a: .3 * ia, shadow: false, lw: .6 });
      lab(R, [X0 + LEN, .92, ZS - WD * .9], 'idle this token: ' + mb(MS[5].idle) + ' expert weights', { al: 'right', fs: 12.5, dy: -10, c: P.mute, a: ia }); }
    // labels: the headline at the top, the parts under the front edge of the strip (input left, output right, blocks centred above)
    const A = L(kk => kk === k ? 1 : 0), fz = ZS + WD / 2;
    lab(R, [0, 1.5, ZS - WD / 2], R.W < 520 ? m.name + ': tables ' + pc(m.share) : m.name + ': vocabulary tables ' + pc(m.share) + (m.act ? ' of the weights each token uses' : ' of the parameters'), { fs: 15, b: 1, c: P.ink, dy: -40, a: A });
    lab(R, [0, 1.5, ZS - WD / 2], 'output layer: ' + pc(m.flops) + ' of the FLOPs per token', { fs: 12.5, dy: -18, c: P.mute, a: A });
    lab(R, [xE, .26, fz], (R.W < 520 ? 'input ' : 'input table ' + int(m.V) + ' × ' + int(m.d) + ' = ') + mb(m.E), { al: 'left', dx: 0, dy: 24, fs: 12.5, b: 1, c: P.c1, a: A });
    lab(R, [xEnd, .26, fz], m.tied ? (R.W < 520 ? 'output: tied' : 'output: the same table (tied)') : (R.W < 520 ? 'output ' : 'output table = ') + mb(m.U), { al: 'right', dx: 0, dy: 24, fs: 12.5, b: 1, c: m.tied ? P.c1 : P.c4, a: A });
    lab(R, [(xB + xU) / 2, .5, ZS], (m.act ? 'blocks, active: ' : 'blocks: ') + mb(m.rest), { fs: 12.5, dy: -12, b: 1, a: A });
    // data moving through the model: in through the table, through the blocks, out through the output table (or back to the tied table)
    R.flow([[xE + .05, .35, ZS + .3], [xU - .05, .6, ZS + .3], [xEnd - .05, .35, ZS + .3]], { c: P.c1, r: .05, n: 12, speed: 1.4 });
    if (lu <= .02) R.flowArc([xU, .6, ZS - .3], [xE + Math.max(.03, le) / 2, .35, ZS - .3], 1.0, { c: P.c1, a: .8, r: .045, n: 10, speed: 1.4 });
    // the running text's tokens for the two tiny-GPT tokenizers: twelve times the table for 11% fewer tokens
    const ra = L(kk => kk <= 1 ? 1 : 0);
    if (ra > .01) { const n = Math.round(tw(st, e, kk => MS[Math.min(kk, 1)].run)), w = LEN / 290;
      for (let i = 0; i < n; i++) R.box([X0 + (i + .5) * w, 0, ZS + 3.0], [w * .78, .18, .5], { fill: i % 2 ? mix(P.paper, P.c2, .45) : mix(P.paper, P.c2, .25), a: ra, shadow: false, lw: .4 });
      lab(R, [X0 + n * w, .18, ZS + 3.0], 'running text: ' + n + ' tokens', { al: 'left', dx: 10, dy: 0, fs: 12.5, b: 1, c: P.c2, a: ra }); }
  }
  S3.stage({ id: 'stg-voc', list: 'sx-voc', fig: 'Fig. 4 · the vocabulary tables against the rest of the model', cam: [.08, .78], bounds: [[-5.7, 0, -1.6], [5.7, 1.5, 3.4]], aspect: .5, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [44, 10, 30, 10] : [52, 24, 40, 24] });
  window.TKS_VOC = MS;
})();
