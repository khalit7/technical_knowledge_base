// JavaScript with real threads: worker_threads sharing memory through a SharedArrayBuffer.
import { Worker, isMainThread, workerData } from "node:worker_threads";
const N = 1_000_000, T = 4;
if (isMainThread) {
  for (const mode of ["plain", "atomics"]) {
    const shared = new Int32Array(new SharedArrayBuffer(4));
    await Promise.all(Array.from({ length: T }, () => new Promise((ok) =>
      new Worker(new URL(import.meta.url), { workerData: { shared, mode, N } }).on("exit", ok))));
    console.log(`${T} worker threads, ${mode.padEnd(7)}: expected ${N * T}  got ${shared[0]}`);
  }
} else {
  const { shared, mode, N } = workerData;
  if (mode === "plain") for (let i = 0; i < N; i++) shared[0]++;
  else for (let i = 0; i < N; i++) Atomics.add(shared, 0, 1);
}
