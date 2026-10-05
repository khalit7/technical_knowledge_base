// JavaScript: four async tasks on ONE thread share a counter. The event loop runs one at a time.
const N = 1_000_000, T = 4;
let counter = 0;
async function work() {
  for (let i = 0; i < N; i++) {
    counter++;                          // never interrupted: no other code runs until we await
    if (i % 1000 === 0) await null;     // yield to the event loop now and then
  }
}
await Promise.all(Array.from({ length: T }, work));
console.log(`one thread, ${T} async tasks: expected ${N * T}  got ${counter}`);
