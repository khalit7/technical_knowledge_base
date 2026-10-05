// tokens.js: an ES module (this folder's package.json says "type": "module")
export const TOKEN = /[A-Za-z0-9]+/g;
export function countTokens(text) { return (text.match(TOKEN) ?? []).length; }
export default function top(map, k) { return [...map].sort((a, b) => b[1] - a[1]).slice(0, k); }
console.log("tokens.js evaluated (once, however many times it is imported)");
