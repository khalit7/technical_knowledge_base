class Counter {
  n = 0;
  inc() { this.n += 1; return this.n; }
}
const c = new Counter();
const f = c.inc;                  // just the function: this is lost
console.log(c.inc.bind(c)(), c.n);
console.log(f());
