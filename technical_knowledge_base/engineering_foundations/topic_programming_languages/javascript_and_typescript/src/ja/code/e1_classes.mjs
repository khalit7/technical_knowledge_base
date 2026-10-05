// class: syntax over prototypes. Fields, #private fields, static members, getters, extends and super.
class Counter {
  #counts = new Map();                          // # = truly private (Python's _ is only a convention)
  static created = 0;
  constructor(name) { this.name = name; Counter.created++; }   // Python's __init__; `this` is self
  add(user, n = 1) { this.#counts.set(user, (this.#counts.get(user) ?? 0) + n); return this; }
  get total() { let t = 0; for (const v of this.#counts.values()) t += v; return t; }   // like @property
  toString() { return `${this.name}: ${this.total}`; }   // like __str__ (used by template strings)
}
class TopCounter extends Counter {
  constructor(name, k) { super(name); this.k = k; }
  add(user, n) { return super.add(user, Math.min(n, this.k)); }
}
const c = new TopCounter("demo", 5).add("u1", 3).add("u2", 9);
console.log(`${c}`, c.total, Counter.created, c instanceof Counter);
console.log(Object.keys(c), c.counts, typeof Counter);   // private fields are invisible; a class is a function
