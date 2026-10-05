const a = [1, 2, 3];
const b = a;          // same array, like Python
b.push(4);
const c = [...a];     // a shallow copy
c.push(5);
console.log(a, c, a === b);
