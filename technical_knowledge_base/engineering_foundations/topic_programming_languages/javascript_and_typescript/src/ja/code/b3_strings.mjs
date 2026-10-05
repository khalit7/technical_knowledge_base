// Strings are immutable sequences of UTF-16 code units (Python: sequences of code points).
const s = "héllo 🚀";
console.log(s.length);                        // 8: the rocket is TWO UTF-16 units (a surrogate pair)
console.log([...s].length);                   // 7: spreading iterates by code point
console.log(s.slice(0, 7), "|", s.slice(0, 8)); // slicing in the middle of the pair leaves half a character
console.log(s.codePointAt(6).toString(16), s.charCodeAt(6).toString(16));
console.log(new TextEncoder().encode(s).length, "bytes in UTF-8");
console.log("a,b,,c".split(","), "  pad ".trim(), "ab".repeat(3), "abc".at(-1));
console.log("10" + 1, "10" - 1, "3" * "4");   // + concatenates if either side is a string; - * / convert to numbers
