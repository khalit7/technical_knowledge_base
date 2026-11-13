// ---- Scenes (sections 6 and 7, Figs. 5 and 6): one real config's RoPE pairs as a bank of dials (PES.bank), frequencies from its config.json via
// PE_DATA.presets and the ports of Hugging Face's functions (ROPE). Fig. 5 walks plain RoPE through eight distances, from a quarter of the trained
// length L to the config's own target s x L; Fig. 6 holds the distance at s x L and swaps the frequencies for each extension method in turn.
// The chips pick the config; the numbers in each step list are filled from the same computation (data-pp spans; static text is Llama 3.1 8B). ----
(function () {
  if (!window.PES || !document.getElementById('stg-past')) return;
  const { tw, la, lab, bank, bankBounds, fmt, f2, inv, states, TAU } = PES, D = PE_DATA;
  const CFG = [['llama31', 'Llama 3.1 8B'], ['tiny', 'Tiny GPT'], ['qwen3', 'Qwen3-8B'], ['dsv3', 'DeepSeek-V3 key'], ['dsv4', 'DeepSeek-V4-Pro key'], ['oss', 'gpt-oss-120b'], ['phi3', 'Phi-3-mini-128k'], ['gemma3', 'Gemma 3 global']];
  const MNAME = { yarn: 'YaRN', llama3: 'Llama 3 scaling', pi: 'PI', longrope: 'LongRoPE' };
  const M = ['plain', 'pi', 'ntk', 'yarn', 'llama3'];
  const S = { past: 'llama31', ext: 'llama31' };
  // everything a step list says about a config
  function facts(key) {
    const P = D.presets[key], L = P.L, s = P.s, plain = inv(P, 'plain'), n = plain.length, seen = ROPE.seenArc(P), nf = seen.filter(a => a >= TAU - 1e-9).length;
    const dists = [L / 4, L / 2, L - 1]; for (let j = 1; j <= 5; j++) dists.push(L * Math.pow(s, j / 5));
    const sl = L * s - 1, IV = M.map(m => inv(P, m, s, sl + 1)), fac = IV.map(iv => plain.map((f, i) => f / iv[i]));
    const cnt = (k, f) => fac[k].filter(f).length, near = x => Math.abs(x - s) < 1e-3, kept = x => x < 1.0005;
    const over = nf < n ? s / fac[2][nf] : null;   // NTK-aware: how many times its trained angle the fastest slow pair turns at s x L (plain: s times)
    return { P, L, s, n, nf, dists, sl, IV, fac, unseen: dists.map(d => states(P, plain, d).filter(x => x === 2).length), out: IV.map(iv => states(P, iv, sl).filter(x => x === 2).length),
      ntkBase: ROPE.ntkBase(P, s), over, yk: cnt(3, kept), yf: cnt(3, near), lk: cnt(4, kept), lf: cnt(4, near), ln: n - cnt(4, kept) - cnt(4, near), ymid: n - cnt(3, kept) - cnt(3, near),
      own: MNAME[P.method] || P.method, temp: ROPE.mscale(s) };
  }
  const txt = (lid, F) => {
    const set = (k, v) => document.querySelectorAll('#' + lid + ' [data-pp="' + k + '"]').forEach(el => el.textContent = v);
    set('name', F.P.name.replace(' (this topic)', '').replace(' (decoupled key)', '’s decoupled key').replace(' (global layers)', '’s global layers'));
    set('base', fmt(F.P.base)); set('n', F.n); set('L', fmt(F.L)); set('s', F.s); set('nf', F.nf); set('sL', fmt(F.L * F.s)); set('L4', fmt(F.L / 4)); set('own', F.own);
    F.dists.forEach((d, k) => set('d' + k, fmt(d))); F.unseen.forEach((u, k) => set('u' + k, u)); F.out.forEach((u, k) => set('o' + k, u));
    set('ntk', fmt(F.ntkBase)); set('over', F.over == null ? '1 (this config has no slow pair)' : f2(F.over, 1)); set('yk', F.yk); set('yf', F.yf); set('ym', F.ymid); set('lk', F.lk); set('lf', F.lf); set('ln', F.ln);
  };
  function chips(id, which, stg, lid) {
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = CFG.map(([k, t]) => '<button data-k="' + k + '" class="' + (k === S[which] ? 'on' : '') + '" aria-pressed="' + (k === S[which]) + '">' + t + '</button>').join('');
    el.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; S[which] = b.dataset.k;
      [...el.children].forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b) }); F[which] = facts(S[which]); txt(lid, F[which]); stg.list(lid); });
  }
  const F = { past: facts(S.past), ext: facts(S.ext) };
  // Fig. 5: plain RoPE through growing distances
  function drawPast(R, k, e, st) {
    const P = R.P, f = F.past; R.grid(-6, 6, -1.2, 3.2, .5);
    const d = tw(st, e, q => f.dists[q]), plain = f.IV[0];
    bank(R, f.P, plain, d, { lab: e >= 1 ? 1 : .0 + Math.max(0, 2 * e - 1) });
    const t = ['a quarter of L', 'half of L', 'the trained length L', '', '', '', '', 's × L, the config’s target'][k];
    lab(R, [0, PES.bankBounds[1][1], 0], 'distance ' + fmt(d) + (t && e >= 1 ? ' · ' + t : ''), { fs: 13, b: 1, c: k >= 3 ? P.bad : P.ink, dy: -60 });
  }
  const stP = S3.stage({ id: 'stg-past', list: 'sx-past', fig: 'Fig. 5 · plain RoPE past the trained length', cam: [-.05, .6], bounds: bankBounds, aspect: .35, dur: 1600, hold: 5000, draw: drawPast,
    margin: w => w < 520 ? [56, 8, 12, 8] : [80, 130, 26, 90] });
  chips('pe-pastC', 'past', stP, 'sx-past'); txt('sx-past', F.past);
  // Fig. 6: the methods at s x L
  if (document.getElementById('stg-ext')) {
    const drawExt = (R, k, e, st) => {
      const P = R.P, f = F.ext; R.grid(-6, 6, -1.2, 3.2, .5);
      const iv = f.IV[0].map((_, i) => tw(st, e, q => f.IV[q][i])), ls = Math.log(f.s), h = iv.map((v, i) => Math.min(1, Math.log(f.IV[0][i] / v) / ls));
      bank(R, f.P, iv, f.sl, { slow: k > 0, height: h, lab: e >= 1 ? 1 : Math.max(0, 2 * e - 1) });
      const t = ['plain RoPE', 'Position Interpolation ÷' + f.s, 'NTK-aware: base ' + fmt(f.ntkBase), 'YaRN ×' + f.s, 'Llama 3 scaling ×' + f.s][k];
      lab(R, [0, PES.bankBounds[1][1], 0], t + ' at ' + fmt(f.L * f.s), { fs: 13, b: 1, c: P.ink, dy: -60, a: la(st, e, q => q === k ? 1 : 0) });
      lab(R, [0, 0, PES.ZS + .3], 'strip height: how much each pair is slowed (log scale, full height ÷' + f.s + ')', { fs: 12, c: P.mute, dy: 16, wide: 1, a: la(st, e, q => q > 0 ? 1 : 0) });
    };
    const stE = S3.stage({ id: 'stg-ext', list: 'sx-ext', fig: 'Fig. 6 · each method reshapes the dials', cam: [-.05, .6], bounds: bankBounds, aspect: .35, dur: 1600, hold: 5200, draw: drawExt,
      margin: w => w < 520 ? [56, 8, 12, 8] : [80, 130, 26, 90] });
    chips('pe-extC', 'ext', stE, 'sx-ext'); txt('sx-ext', F.ext);
  }
})();
