const values = [["[]", []], ["{}", {}], ['""', ""], ['"0"', "0"], ["0", 0], ["null", null], ["NaN", NaN]];
for (const [label, v] of values) console.log(label, Boolean(v));
// empty array and empty object are truthy: test xs.length instead
