// The cost of shapes: the same loop over objects of 1 shape and of 8 shapes (V8 inline caches, measured).
function sumX(objs) { let s = 0; for (let r = 0; r < 200; r++) for (let i = 0; i < objs.length; i++) s += objs[i].x; return s; }
function make(nShapes, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const o = {}; const k = i % nShapes;
    for (let j = 0; j < k; j++) o["p" + j] = j;    // k extra properties BEFORE x: a different hidden class per k
    o.x = 1; out.push(o);
  }
  return out;
}
function time(label, objs) {
  sumX(objs); sumX(objs);                          // warm up: let the JIT compile sumX for what it has seen
  const t = []; for (let k = 0; k < 7; k++) { const t0 = performance.now(); sumX(objs); t.push(performance.now() - t0); }
  t.sort((p, q) => p - q);
  console.log(`${label.padEnd(36)} median ${t[3].toFixed(1)} ms per 2,000,000 property reads`);
}
time("1 shape (monomorphic call site)", make(1, 10_000));
time("4 shapes (polymorphic)", make(4, 10_000));
time("8 shapes (megamorphic)", make(8, 10_000));
