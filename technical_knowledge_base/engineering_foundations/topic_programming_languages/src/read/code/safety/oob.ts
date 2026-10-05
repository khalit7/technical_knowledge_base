const top: number[] = [9491, 4816, 3499];
console.log(top[5]);                 // no error: undefined
const x: number = top[5];            // tsc accepts this unless noUncheckedIndexedAccess is on
console.log(x * 2);
