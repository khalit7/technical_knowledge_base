// What survives JSON.stringify?
console.log(JSON.stringify({ a: undefined, b: NaN, c: () => 1, d: new Date(0), e: [undefined] }));
