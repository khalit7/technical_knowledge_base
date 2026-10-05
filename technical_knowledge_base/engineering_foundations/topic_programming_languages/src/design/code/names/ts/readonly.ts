// run: always
const a: readonly number[] = [1, 2];
a.push(3);                   // rejected by the checker
(a as number[]).push(4);     // a cast silences it; at run time the array is ordinary
console.log(a);
