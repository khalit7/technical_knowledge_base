const perUser = new Map<string, number>([["u0029", 9491]]);
const n = perUser.get("nobody");    // number | undefined
console.log(n);
const next: number = n + 1;         // strictNullChecks: rejected at compile time
console.log(next);                  // at run time: undefined + 1 is NaN
