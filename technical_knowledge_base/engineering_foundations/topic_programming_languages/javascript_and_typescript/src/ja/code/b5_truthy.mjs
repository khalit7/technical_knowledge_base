// Falsy: false, 0, -0, 0n, "", null, undefined, NaN. Everything else is truthy, including [] and {}.
const cases = { "false": false, "0": 0, '""': "", "null": null, "undefined": undefined, "NaN": NaN,
                "0n": 0n, "[]": [], "{}": {}, '"0"': "0", '"false"': "false", "-1": -1 };
// (the row "0" prints first: integer-like keys always come first in an object, section 3)
for (const [label, v] of Object.entries(cases)) console.log(label.padEnd(10), Boolean(v));
const items = [];
if (items) console.log("[] is truthy: test items.length, not items");
