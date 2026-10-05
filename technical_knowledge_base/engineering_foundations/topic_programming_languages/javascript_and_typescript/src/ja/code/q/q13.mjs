// for...in over an array
const xs = ["a", "b"];
xs.extra = "surprise";
for (const k in xs) console.log("in", k);
for (const v of xs) console.log("of", v);
