// Three ways to write a function. All are objects you can pass around, as in Python.
function add(a, b = 10) { return a + b; }        // declaration: hoisted, usable above this line
const mul = function (a, b) { return a * b; };   // expression
const sq = x => x * x;                           // arrow: short, and no own `this` (below)
const sum = (...nums) => nums.reduce((s, n) => s + n, 0);   // rest parameter: Python's *args
console.log(add(1), add(1, 2), mul(3, 4), sq(5), sum(1, 2, 3));
console.log(add(1, 2, 99), add());               // extra arguments are ignored; missing ones are undefined
function push(x, xs = []) { xs.push(x); return xs; }
console.log(push(1), push(2));                   // defaults are evaluated on EVERY call (Python: once, at def)
