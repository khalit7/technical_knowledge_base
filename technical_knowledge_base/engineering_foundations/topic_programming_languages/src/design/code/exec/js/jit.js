// cmd: node --trace-opt jit.js | grep -E 'marking.*add|completed optimizing.*add' | sed -E 's/ ?0x[0-9a-f]+//g; s/ \(sfi =\)//; s/, ConcurrencyMode::kConcurrent//' | head -2; node jit.js
function add(a, b) {
  return a + b;
}
let s = 0;
for (let i = 0; i < 1e6; i++) s = add(s, i); // hot: V8 recompiles add
console.log(s);
