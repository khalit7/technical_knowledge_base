// BigInt: arbitrary-size integers, written with a trailing n. Python ints behave like this by default.
const big = 2n ** 64n;
console.log(big, typeof big);
console.log(9007199254740993n + 1n);          // exact, unlike the number version
try { console.log(1n + 1); }                  // no silent mixing of the two kinds
catch (e) { console.log(e.name + ": " + e.message); }
console.log(BigInt("1234567890123456789") + 1n, Number(10n) + 1);
console.log(JSON.stringify({ n: 5 }), (() => { try { return JSON.stringify({ n: 5n }); } catch (e) { return e.message; } })());
