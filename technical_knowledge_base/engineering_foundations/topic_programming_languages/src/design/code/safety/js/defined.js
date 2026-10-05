const a = [1, 2, 3];
console.log(a[10]);            // past the end: undefined, not garbage
a[10] = 5;                     // writing past the end grows the array, with holes
console.log(a.length, a);
console.log([] + {}, 1 / 0, "b" - 1);   // odd, but all defined by the spec
