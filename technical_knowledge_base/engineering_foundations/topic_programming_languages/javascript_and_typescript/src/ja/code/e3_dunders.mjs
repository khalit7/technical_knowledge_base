// Python's dunder methods have a few JavaScript counterparts, keyed by well-known Symbols.
class Range {
  constructor(n) { this.n = n; }
  *[Symbol.iterator]() { for (let i = 0; i < this.n; i++) yield i; }   // __iter__
  [Symbol.toPrimitive](hint) { return hint === "number" ? this.n : `Range(${this.n})`; }
}
const r = new Range(3);
console.log([...r], `${r}`, +r, r * 2);
const a = new Range(1), b = new Range(1);
console.log(a == b, a + b);                     // no __eq__ or __add__ overloading: == is identity, + uses toPrimitive
