// function* makes a generator, exactly like a Python function with yield: lazy, paused between values.
function* naturals() { let n = 0; while (true) yield n++; }
function* take(it, k) { for (const x of it) { if (k-- <= 0) return; yield x; } }
function* map(it, f) { for (const x of it) yield f(x); }
console.log([...take(map(naturals(), n => n * n), 5)]);
const g = naturals();
console.log(g.next(), g.next(), typeof g[Symbol.iterator]);
// Iterator helpers (ES2025, Node 22+): the same lazy pipeline as methods
console.log(naturals().map(n => n * n).filter(n => n % 2).take(4).toArray());
