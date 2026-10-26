// for...of walks VALUES (Python's for x in xs). for...in walks KEYS, as strings, and is rarely what you want.
const xs = ["a", "b"];
for (const x of xs) console.log("of:", x);
for (const k in xs) console.log("in:", k, typeof k);
for (const [k, v] of Object.entries({ u1: 3, u2: 9 })) console.log(k, v);   // dict.items()
for (const ch of "h🚀") console.log(ch, ch.length);                         // strings iterate by code point
const it = xs[Symbol.iterator]();               // the iterator protocol, by hand: iter(xs) and next()
console.log(it.next(), it.next(), it.next());
