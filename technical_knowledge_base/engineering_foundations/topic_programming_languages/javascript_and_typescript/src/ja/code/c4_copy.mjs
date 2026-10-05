// Assignment never copies (as in Python). Spread copies one level; structuredClone copies everything.
const conv = { id: 1, msgs: [{ role: "user", text: "hi" }], when: new Date(0) };
const alias = conv, shallow = { ...conv }, deep = structuredClone(conv);
conv.msgs.push({ role: "assistant", text: "hello" });
console.log(alias.msgs.length, shallow.msgs.length, deep.msgs.length);
const viaJson = JSON.parse(JSON.stringify({ when: new Date(0), n: undefined, f() {}, big: NaN }));
console.log(viaJson);                           // the JSON round trip loses types: date becomes a string, the rest vanish or change
console.log(deep.when instanceof Date, typeof viaJson.when);
