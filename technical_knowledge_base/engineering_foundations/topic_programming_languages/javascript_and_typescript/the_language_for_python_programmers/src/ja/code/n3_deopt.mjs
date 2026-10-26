// Run with: node --trace-opt --trace-deopt n3_deopt.mjs | grep add   (V8 tells you when it optimises and when it gives up)
function add(a, b) { return a + b; }
let s = 0;
for (let i = 0; i < 200_000; i++) s = add(i, 1);       // only small integers: V8 compiles add for that
console.log("now call it with strings");
add("a", "b");                                         // assumption broken: deoptimise, back to the interpreter
for (let i = 0; i < 200_000; i++) s = add(i, 2);
console.log(s);
