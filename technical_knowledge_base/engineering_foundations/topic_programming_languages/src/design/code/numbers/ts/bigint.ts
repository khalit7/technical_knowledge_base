// run: always
const tokens: number = 1;
const total: bigint = 2n ** 64n;
console.log(total + tokens);      // the checker refuses to mix them; so does the runtime
