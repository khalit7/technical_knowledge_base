// Equality of objects
const a = { id: 1 }, b = { id: 1 };
console.log(a == b, a === b, a === a, new Set([a, b, a]).size);
console.log([NaN].includes(NaN), [NaN].indexOf(NaN));
