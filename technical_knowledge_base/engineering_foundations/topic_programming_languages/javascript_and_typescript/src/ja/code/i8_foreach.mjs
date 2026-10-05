// await inside forEach does not wait: forEach ignores the promises its callback returns.
const sleep = ms => new Promise(r => setTimeout(r, ms));
let t0 = performance.now(); const took = () => `${Math.round(performance.now() - t0)} ms`;
const ids = [1, 2, 3];
ids.forEach(async id => { await sleep(20); console.log("  forEach item", id, "done at", took()); });
console.log("forEach returned after", took());     // prints first: nothing was awaited
await sleep(40);
t0 = performance.now();
for (const id of ids) { await sleep(20); }        // sequential: one after another
console.log("for...of with await:", took());
t0 = performance.now();
await Promise.all(ids.map(id => sleep(20)));        // concurrent: all at once
console.log("Promise.all over map:", took());
