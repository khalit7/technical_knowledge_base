console.log([1, 2] === [1, 2], { a: 1 } == { a: 1 });   // compares identity, never contents
const seen = new Set([[1, 2]]);
console.log(seen.has([1, 2]));
