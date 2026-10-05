// Three jobs, A, B and C, wait 100, 200 and 300 ms (the same three as the Python page's asyncio replay).
// Four ways to run them; every event is stamped with ms since the start. The Reading animation replays this file's output.
import { Worker } from "node:worker_threads";
import { setTimeout as sleep } from "node:timers/promises";      // a promise-returning setTimeout
let T0 = 0, EV = [];
const ev = (who, what, note = "") => EV.push([who, what, +(performance.now() - T0).toFixed(1), note]);
const busyWait = ms => { const end = performance.now() + ms; while (performance.now() < end); };  // holds the thread

async function job(name, ms) { ev(name, "start"); ev(name, "await", `sleep(${ms})`); await sleep(ms); ev(name, "resume"); ev(name, "done"); }
async function jobBlocking(name, ms) { ev(name, "start"); ev(name, "block", `busyWait(${ms})`); busyWait(ms); ev(name, "done"); }
async function jobWorker(name, ms) {
  ev(name, "start"); ev(name, "await", `a worker thread busy-waits ${ms} ms`);
  await new Promise((ok, fail) => {
    const w = new Worker(`const e = performance.now() + ${ms}; while (performance.now() < e); require("node:worker_threads").parentPort.postMessage(1)`, { eval: true });
    w.once("message", ok); w.once("error", fail);
  });
  ev(name, "resume"); ev(name, "done");
}
const MODES = {
  sequential: async () => { await job("A", 100); await job("B", 200); await job("C", 300); },
  all: () => Promise.all([job("A", 100), job("B", 200), job("C", 300)]),
  all_blocking: () => Promise.all([job("A", 100), jobBlocking("B", 200), job("C", 300)]),
  all_worker: () => Promise.all([job("A", 100), jobWorker("B", 200), job("C", 300)]),
};
const out = {};
for (const [mode, run] of Object.entries(MODES)) {
  EV = []; T0 = performance.now();
  await run();
  const total = +(performance.now() - T0).toFixed(1);
  out[mode] = { events: EV, total_ms: total };
  console.log(`${mode.padEnd(13)} ${total.toFixed(1).padStart(6)} ms  ` + EV.map(e => `${e[0]}:${e[1]}`).join(" "));
}
if (process.argv[2]) (await import("node:fs")).writeFileSync(process.argv[2], JSON.stringify(out));
