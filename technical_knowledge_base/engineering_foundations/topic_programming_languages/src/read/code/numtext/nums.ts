const big: number = 2 ** 53;            // every JS number is a 64-bit float
console.log("2**53 + 1 =", big + 1);    // cannot be represented: stays 2**53
console.log("2n**63n =", 2n ** 63n);    // BigInt: a separate integer type
console.log("-7 / 2 =", -7 / 2, "  Math.trunc =", Math.trunc(-7 / 2), "  -7 % 2 =", -7 % 2);
console.log("0.1 + 0.2 =", 0.1 + 0.2);
const s = "café 日本 😀";
console.log("length:", s.length, " code points:", [...s].length, " s[8] =", JSON.stringify(s[8]));
