console.log(typeof null);                       // "object": an early quirk, never fixed
console.log([1, [2, [3]]].flat(Infinity));       // named flat, not flatten (SmooshGate, 2018)
console.log(typeof [].flatten, typeof [].contains);
