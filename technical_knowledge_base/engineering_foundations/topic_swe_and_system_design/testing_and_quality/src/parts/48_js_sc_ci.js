// ---- Scene: Fig. 4, CI cheapest first (stg-ci): the jobs of the page's workflow (experiments/ci/ci.yml, written 2026-10-04 and parsed as YAML, not run on
// GitHub) in their needs: order, a change flowing through them, a bad change stopped at the first job, the unit matrix, the PostgreSQL service
// container, a newer push cancelling the older run (concurrency), and the nightly GPU tier on its schedule. Job names, versions and triggers are the
// workflow's; block sizes and the lint error are illustrative, as the step text says. ----
(function () {
  if (!document.getElementById('stg-ci') || !window.TQK) return;
  const { mix } = S3, { lab, block, win, seg, poly } = TQK;
  const J = { pc: [-4.4, 0, 0], st: [-2.6, 0, 0], u1: [-.6, 0, -.62], u2: [-.6, 0, .62], it: [1.4, 0, 0], pg: [1.4, 0, -1.7], mg: [3.3, 0, 0], ng: [.7, 0, 2.3] };
  const SZ = { pc: [1.2, .34, .9], st: [1.2, .34, .9], u1: [1.3, .5, .8], u2: [1.3, .5, .8], it: [1.4, .62, 1.0], pg: [1.0, .5, .8], mg: [1.2, .36, .9], ng: [1.4, .8, 1.0] };
  const top = (id, dy) => [J[id][0], SZ[id][1] * .6 + (dy || 0), J[id][2]];
  const right = id => [J[id][0] + SZ[id][0] / 2, SZ[id][1] * .5, J[id][2]], left = id => [J[id][0] - SZ[id][0] / 2, SZ[id][1] * .5, J[id][2]];
  TQN.ci = { jobs: ['static', 'unit', 'integration', 'gpu-nightly'], matrix: ['3.12', '3.13'], service: 'postgres:17', runner: 'gpu-t4', cron: '0 3 * * *' };
  function draw(R, k, e) {
    const P = R.P; R.grid(-5.6, 4.6, -2.8, 3, .5);
    const ok = P.good, bad = P.bad, cc = P.c2;
    // how lit each job is in this step
    const A = id => {
      if (k === 0) return id === 'ng' ? .3 : .85;
      if (k === 1) return id === 'st' || id === 'pc' ? 1 : id === 'ng' ? .15 : .22;
      if (k === 2) return id === 'u1' || id === 'u2' || id === 'st' ? 1 : id === 'ng' ? .15 : .3;
      if (k === 3) return id === 'it' || id === 'pg' ? 1 : id === 'ng' ? .15 : .4;
      if (k === 4) return id === 'ng' ? .15 : .5;
      return id === 'ng' || id === 'mg' ? 1 : .3;
    };
    const fail = k === 1 ? win(e, .45, .7) : 0;
    const NM = { pc: ['pre-commit', 'laptop: ruff'], st: ['static', 'ruff, mypy: seconds'], u1: ['unit · 3.12', ''], u2: ['unit · 3.13', 'pytest -n auto -p randomly'], it: ['integration', '-m integration'], pg: ['postgres:17', 'service container'], mg: ['review, merge', 'a human reads the tests'], ng: ['gpu-nightly', 'gpu-t4: smoke, slow, evals'] };
    Object.keys(J).forEach(id => { const a = A(id), c = id === 'st' && k === 1 ? mix(P.c1, bad, fail) : id === 'ng' ? P.c4 : id === 'pg' ? P.c3 : id === 'pc' ? P.c5 : P.c1;
      block(R, J[id], SZ[id], c, null, { a, t: id === 'st' && k === 1 ? .3 + .4 * fail : .3 });
      const hot = a >= .99;
      lab(R, [J[id][0], SZ[id][1], J[id][2] - SZ[id][2] / 2], NM[id][0], { mono: 1, b: 1, fs: 12.5, dy: -11, c: hot ? P.ink : P.mute, a: Math.max(.45, a), ph: hot ? 1 : 0, grp: hot && R.W < 520 ? undefined : 'jobs' });
      if (NM[id][1] && hot) lab(R, [J[id][0], 0, J[id][2] + SZ[id][2] / 2], NM[id][1], { fs: 12, c: P.mute, dy: 14, wide: 1, mono: id === 'u2' || id === 'it' });
    });
    // the needs: edges
    [['st', 'u1'], ['st', 'u2'], ['u1', 'it'], ['u2', 'it'], ['it', 'mg']].forEach(([a, b]) => R.line([right(a), left(b)], { c: P.line, w: 1.4, head: 6, a: .7 }));
    R.line([[J.pc[0] + .55, .15, 0], [J.st[0] - .55, .15, 0]], { c: P.line, w: 1.4, head: 6, a: .7, dash: [4, 4] });
    // 1. a push enters at the cheapest check
    if (k === 0) R.flow(poly([[J.pc[0] - .9, .2, 0], left('st'), right('st'), left('u1'), right('u1'), left('it'), right('it'), left('mg')], 8), { c: cc, r: .07, speed: 1.6, a: Math.min(1, e * 2) });
    // 2. a bad change stops at static; nothing after it starts
    if (k === 1) { R.flow(seg([J.pc[0] - .9, .2, 0], [J.st[0], .2, 0], 12), { c: bad, r: .08, speed: 1.4, a: 1 });
      lab(R, top('st', .3), 'lint error (illustrative)', { fs: 12, b: 1, c: bad, dy: -30, a: fail, ph: 1 });
      lab(R, top('it', .1), 'never started (needs: static)', { fs: 12, c: P.mute, dy: -30, a: fail, wide: 1 }); }
    // 3. the unit matrix: one job per Python version, fail-fast: false
    if (k === 2) { R.flow(seg([J.pc[0] - .9, .2, 0], right('st'), 10), { c: ok, r: .07, speed: 1.6, a: 1 });
      ['u1', 'u2'].forEach(id => R.flow(poly([right('st'), left(id), right(id)], 8), { c: ok, r: .07, speed: 1.4, a: win(e, .2, .5) })); }
    // 4. integration next to its PostgreSQL service container
    if (k === 3) { R.flow(poly([right('u1'), left('it'), J.it], 8), { c: ok, r: .07, speed: 1.4, a: 1 });
      R.flowArc([J.it[0] - .2, .5, J.it[2] - .4], [J.pg[0] - .2, .45, J.pg[2] + .3], .4, { c: P.c3, r: .07, speed: 1.1, a: win(e, .3, .6) });
      R.flowArc([J.pg[0] + .2, .45, J.pg[2] + .3], [J.it[0] + .2, .5, J.it[2] - .4], .4, { c: P.c3, r: .07, speed: 1.1, a: win(e, .4, .7) }); }
    // 5. a newer push to the same branch cancels the older run
    if (k === 4) { const ghost = 1 - win(e, .4, .9);
      R.flow(poly([left('st'), right('st'), left('u1'), right('u1'), left('it')], 8), { c: P.mute, r: .07, speed: 1.4, a: .25 + .6 * ghost });
      R.flow(seg([J.pc[0] - .9, .2, .0], left('st'), 10), { c: cc, r: .08, speed: 1.8, a: win(e, .1, .4) });
      lab(R, top('u2', .1), 'older run: cancelled', { fs: 12, b: 1, c: P.mute, dy: -30, a: win(e, .4, .8), ph: 1 });
      lab(R, [J.pc[0] - .6, .3, 0], 'newer push', { fs: 12, b: 1, c: cc, dy: -16, a: win(e, .1, .4), ph: 1 }); }
    // 6. merge, and the nightly tier on its own trigger
    if (k === 5) { R.flow(poly([right('it'), left('mg'), right('mg')], 8), { c: ok, r: .07, speed: 1.4, a: 1 });
      R.flowArc([J.ng[0] - 2.8, .2, J.ng[2]], [J.ng[0] - .72, .4, J.ng[2]], .5, { c: P.c4, r: .07, speed: 1.1, a: win(e, .3, .6) });
      lab(R, [J.ng[0] - 2.8, 0, J.ng[2]], "schedule: cron '0 3 * * *'", { mono: 1, fs: 12, c: P.c4, b: 1, dy: 14, a: win(e, .3, .7), ph: 1 }); }
  }
  S3.stage({ id: 'stg-ci', list: 'sx-ci', fig: 'Fig. 4 · cheapest checks first, the slow tiers later', cam: [.3, .72], bounds: [[-5.2, 0, -2.2], [4.2, .9, 2.6]], aspect: .52, dur: 1600, hold: 4600, draw,
    margin: w => w < 520 ? [26, 8, 14, 8] : [36, 18, 22, 18] });
})();
