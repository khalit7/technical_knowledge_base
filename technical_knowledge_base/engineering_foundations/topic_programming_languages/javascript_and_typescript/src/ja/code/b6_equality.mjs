// == converts types before comparing; === never does. Use === (and !==).
console.log(1 == "1", 1 === "1");
console.log(0 == "", 0 == "0", "" == "0");     // == is not even transitive
console.log(null == 0, null >= 0);              // and comparisons convert differently again
console.log([1, 2] === [1, 2], [1, 2] == "1,2"); // objects compare by identity
const a = [1, 2], b = a;
console.log(a === b);                           // same object: true (Python's `a is b`)
console.log(Object.is(NaN, NaN), Object.is(0, -0), 0 === -0);
console.log(JSON.stringify([1, 2]) === JSON.stringify([1, 2]));  // a cheap deep compare for plain data
