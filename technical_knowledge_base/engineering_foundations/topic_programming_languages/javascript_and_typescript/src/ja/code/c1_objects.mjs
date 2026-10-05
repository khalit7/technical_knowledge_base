// An object literal looks like a dict, but its keys are strings (or symbols), and it has a prototype.
const msg = { role: "user", text: "hi", 1: "one" };
msg.tokens = 2;                                 // add a property: just assign
console.log(msg, Object.keys(msg));            // integer-like keys come first, as strings
console.log(msg[1] === msg["1"], "role" in msg, msg.missing);
delete msg.tokens;
const counts = new Map();                       // Map: a real hash map with keys of any type, in insertion order
counts.set(1, "number one").set("1", "string one").set(msg, "an object as key");
console.log(counts.size, counts.get(1), counts.get("1"), counts.has(msg));
const seen = new Set([3, 1, 3, 2]);
console.log(seen, seen.has(2), [...seen]);
console.log(new Set([[1], [1]]).size);          // two different arrays: a Set compares by identity
