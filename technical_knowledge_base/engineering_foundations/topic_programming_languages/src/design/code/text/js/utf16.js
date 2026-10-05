const s = "héllo👍";
console.log(s.length, [...s].length);          // 7 UTF-16 units, 6 code points
console.log(JSON.stringify(s[6]), s.at(-1));    // half of the emoji
console.log(s.split("").reverse().join(""));    // breaks the emoji
console.log([...s].reverse().join(""));
