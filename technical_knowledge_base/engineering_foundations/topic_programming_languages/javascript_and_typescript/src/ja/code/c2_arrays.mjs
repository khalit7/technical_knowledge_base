// Arrays: Python lists. The functional methods return new arrays; a few mutate in place.
const xs = [3, 1, 10, 2];
console.log(xs.map(x => x * 2), xs.filter(x => x > 1), xs.reduce((a, b) => a + b, 0));
console.log(xs.find(x => x > 2), xs.findIndex(x => x > 2), xs.some(x => x > 5), xs.every(x => x > 0));
console.log(xs.includes(10), xs.indexOf(99), xs.at(-1), xs.slice(1, 3), [[1, 2], [3]].flat());
console.log([...xs].sort(), xs.toSorted((a, b) => a - b));   // sort() compares as STRINGS by default
xs.push(7); xs.reverse();                       // push, pop, sort, reverse, splice mutate xs itself
console.log(xs, xs.length);
const words = ["b", "a", "c"];
for (const [i, w] of words.entries()) console.log(i, w);    // Python's enumerate
console.log(Array.from({ length: 4 }, (_, i) => i * i), Object.groupBy([1, 2, 3, 4], n => n % 2 ? "odd" : "even"));
