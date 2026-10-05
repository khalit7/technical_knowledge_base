// Losing this
const counter = { n: 41, next() { return this?.n + 1; } };
const next = counter.next;
console.log(counter.next(), next(), [1].map(counter.next, counter));
