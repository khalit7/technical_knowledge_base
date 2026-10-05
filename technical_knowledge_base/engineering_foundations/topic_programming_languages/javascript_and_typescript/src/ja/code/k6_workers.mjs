// CPU work blocks the event loop; a worker thread runs it on another core. A 10 ms heartbeat timer shows the difference.
import { Worker } from "node:worker_threads";
function primes(n) { let c = 0; for (let i = 2; i < n; i++) { let p = true; for (let j = 2; j * j <= i; j++) if (i % j === 0) { p = false; break; } if (p) c++; } return c; }
async function heartbeat(label, work) {
  let last = performance.now(), worst = 0, beats = 0;
  const t = setInterval(() => { const now = performance.now(); worst = Math.max(worst, now - last); last = now; beats++; }, 10);
  const t0 = performance.now(); const result = await work();
  await new Promise(r => setTimeout(r, 30)); clearInterval(t);
  console.log(`${label.padEnd(24)} result ${result}  took ${Math.round(performance.now() - t0 - 30)} ms  heartbeats ${beats}  worst gap ${Math.round(worst)} ms`);
}
const N = 3_000_000;
await heartbeat("on the main thread:", async () => primes(N));
await heartbeat("in a worker thread:", () => new Promise((ok, fail) => {
  const w = new Worker(`const { parentPort, workerData } = require("node:worker_threads");
    ${primes.toString()}
    parentPort.postMessage(primes(workerData));`, { eval: true, workerData: N });
  w.once("message", ok); w.once("error", fail);
}));
