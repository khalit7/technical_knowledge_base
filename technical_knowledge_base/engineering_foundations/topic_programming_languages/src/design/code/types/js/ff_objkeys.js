const d = { 1: "int key", "1": "str key" };   // object keys are strings: the same key
console.log(Object.keys(d).length, d[1], Object.keys(d));
const m = new Map([[1, "int key"], ["1", "str key"]]);   // Map keeps them apart
console.log(m.size);
