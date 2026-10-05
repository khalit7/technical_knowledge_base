// A promise is an object for a value that is not there yet: pending, then fulfilled or rejected (once).
const p = new Promise((resolve) => {
  console.log("the executor runs immediately: a promise is eager (a Python coroutine is lazy)");
  setTimeout(() => resolve(42), 10);
});
console.log("pending now:", p);
p.then(v => v + 1)                               // .then returns a NEW promise: chains read top to bottom
 .then(v => { console.log("then got", v); throw new Error("boom"); })
 .catch(e => console.log("catch got", e.message))
 .finally(() => console.log("finally"));
const sleep = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));   // wrap a callback API once
async function main() {                          // async/await: the same chain, written like synchronous code
  const v = await sleep(20, "awaited value");
  console.log(v, "| p is now", p);
  try { await Promise.reject(new Error("rejected")); } catch (e) { console.log("try/catch works with await:", e.message); }
}
main();
