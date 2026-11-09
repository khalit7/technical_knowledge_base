// ---- Scene (section 0, Fig. 1): five released stacks as towers, one slab per layer, from each model's own config (AG.by: mix, per, W, kv, kvw).
// A slab's height is the same in every tower (so a tower's height is its layer count) and its footprint is proportional to the bytes that layer
// keeps per token, so a tower's volume is its KV cache per token. Windowed slabs shrink to their share at 131,072 tokens (AG.cache with windows
// credited); linear layers, which keep a fixed state and nothing per token, are hollow. Flows: one new token's entries going up the stack. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.AGS) return;
  const { tw, la, lab, mc, B, nm, row, G } = AGS, T = 131072;
  const M = ['Llama 3.1 8B', 'DeepSeek V3', 'Gemma 3 27B', 'Qwen3 Next 80B-A3B', 'Kimi K3'].map(row), X = [-4.6, -2.3, 0, 2.3, 4.6], DY = .042, TH = .03;
  const side = b => 1.3 * Math.sqrt(b / 8192);
  const attB = r => { const c = [...r.mix].find(c => r.per[c]); return r.per[c]; };
  const top = r => r.L * DY;
  // which tower a step is about, and when each tower first appears
  const FOC = [0, 1, 2, 3, -1];
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-6.4, 6.4, -1.6, 2.2, .5);
    const shrink = tw(st, e, s => s >= 2 ? 1 : 0);   // windowed slabs at their 131K share from step 3 on
    M.forEach((r, m) => {
      const x = X[m], a = tw(st, e, s => s < m ? 0 : (FOC[s] === m || FOC[s] < 0) ? 1 : .22), la1 = la(st, e, s => s < m ? 0 : (FOC[s] === m || FOC[s] < 0) ? 1 : 0);
      if (a <= .01) return; const sa = side(attB(r));
      for (let i = 0; i < r.L; i++) { const c = r.mix[i], y = i * DY;
        if (c === 'L' || c === 'H') { R.box([x, y, 0], [sa, TH, sa], { fill: P.paper, fa: .1, ec: mc(P, c), ea: .9, a, shadow: i === 0, lw: .8 }); continue; }
        let b = r.per[c] || 0; const b0 = b; if (c === 'S' && r.W) b = S3.lerp(b, b * Math.min(T, r.W) / T, shrink);
        const s = Math.max(.12, side(b)); R.box([x, y, 0], [s, TH, s], { fill: mc(P, c), a, shadow: i === 0, lw: .6 });
        // a windowed layer's card-convention footprint stays as a ghost outline, so the shrink is visible
        if (b < b0 - 1) R.box([x, y, 0], [side(b0), TH, side(b0)], { fill: P.paper, fa: .06, ec: mc(P, c), ea: .55 * shrink, a, shadow: false, lw: .6 }); }
      // the new token's entries going up the stack
      const fa = la(st, e, s => FOC[s] === m || FOC[s] < 0 ? 1 : 0);
      if (fa > .01) { const z = Math.max(sa, side(r.per.S || 0)) / 2 + .12; R.flow([[x, .02, z + .7], [x, .02, z], [x, top(r), z]], { c: P.acc, a: fa * (k === 4 ? .55 : .9), r: .05, n: Math.round(r.L / 5) + 6, speed: 1.2 }); }
      const na = a > .3 ? 1 : .55, held = G.cache(r, T, true) / T;
      const sg = R.W < 520 && m % 2 ? 42 : 0;   // on a phone, every other name sits lower so neighbours never overlap
      lab(R, [x, 0, 1.0], nm(r.n), { fs: 12.5, b: 1, c: P.ink, dy: 14 + sg, a: na });
      lab(R, [x, 0, 1.0], B(held < r.kv - 1 ? held : r.kv) + (held < r.kv - 1 ? ' held' : ''), { mono: true, fs: 12.5, b: 1, c: P.acc, dy: 30 + sg, a: na });
    });
    // one annotation per step, on the tower it is about
    const note = (m, s, text, y, o) => { const al = la(st, e, q => q === s ? 1 : 0); if (al > .01) lab(R, [X[m] + side(attB(M[m])) / 2 + .15, y, 0], text, Object.assign({ fs: 12.5, al: 'left', dx: 8, c: P.ink, a: al, wide: 1 }, o)); };
    const r0 = M[0], r1 = M[1], r2 = M[2], r3 = M[3];
    note(0, 0, r0.L + ' layers × ' + B(r0.per.G), top(r0) * .5);
    note(1, 1, r1.L + ' MLA layers × ' + AGS.int(r1.per.M) + ' B', top(r1) * .5);
    note(2, 2, (r2.mix.match(/S/g) || []).length + ' windowed (teal) shrink to their share', top(r2) * .62);
    note(2, 2, 'card ' + B(r2.kv) + ' per token', top(r2) * .38, { c: P.mute });
    note(3, 3, (r3.mix.match(/L/g) || []).length + ' linear layers: hollow, nothing per token', top(r3) * .62);
    note(3, 3, (r3.mix.match(/G/g) || []).length + ' attention layers × ' + B(r3.per.G), top(r3) * .38, { c: P.mute });
  }
  const close = m => { const r = M[m], x = X[m]; return { cam: [.42, .3], bounds: [[x - 1.3, 0, -1], [x + 3.2, top(r) + .4, 1.3]] }; };
  const full = { cam: [.32, .24], bounds: [[-5.6, 0, -.7], [5.6, 4.0, 1.0]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · five released stacks, one slab per layer', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1500, hold: 5200, draw,
    margin: w => w < 520 ? [14, 8, 80, 8] : [16, 20, 50, 20],
    view: k => k === 4 ? full : k === 1 ? { cam: [.38, .3], bounds: [[-5.8, 0, -1], [-.4, 2.9, 1.3]] } : close(k) });
})();
