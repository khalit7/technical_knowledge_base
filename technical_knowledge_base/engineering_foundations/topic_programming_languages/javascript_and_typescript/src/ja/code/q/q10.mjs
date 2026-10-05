// Aliasing and copies
const a = [1, [2, 3]];
const b = a, c = [...a], d = structuredClone(a);
a.push(4); a[1].push(5);
console.log(b, c, d);
