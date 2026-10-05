// Task: how V8 stores two arrays. Run with: node --allow-natives-syntax memory.js
// (%DebugPrint is a V8 internal, not TypeScript or standard JavaScript.)
const small = [3, 1, 4, 1, 5];
const ts = Array.from({ length: 8 }, (_, i) => 1759650000 + 7 * i);
%DebugPrint(small);
%DebugPrint(ts);
