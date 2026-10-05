// JavaScript: calling an async function runs its body at once, up to the first await.
async function hello(tag) {
  console.log(`   ${tag}: body runs`);
  return 42;
}
console.log('1. calling hello("a")');
const p = hello("a");
console.log(`2. holding a ${p.constructor.name}; its body HAS already run`);
console.log("3. awaited it:", await p);
hello("b"); // never awaited: still runs
console.log("4. end of module");
