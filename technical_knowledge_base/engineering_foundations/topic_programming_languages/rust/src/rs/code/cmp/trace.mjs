// The same three jobs on Node's event loop (one thread). There is no sleep that yields
// and no sleep that blocks, so: a timer promise to wait, a busy loop to block.
// Prints one summary line per mode; with a path argument, writes all events as JSON.
import { writeFileSync } from "node:fs";
let T0 = 0, EV = [];
const ev = (who, what, note = "") => EV.push([who, what, Math.round((performance.now() - T0) * 10) / 10, note]);
const wait = ms => new Promise(r => setTimeout(r, ms));
async function job(n, ms) { ev(n, "start"); ev(n, "await", `await timer(${ms} ms)`); await wait(ms); ev(n, "resume"); ev(n, "done"); return n; }
async function jobBlocking(n, ms) { ev(n, "start"); ev(n, "block", `busy loop ${ms} ms`); const end = performance.now() + ms; while (performance.now() < end) {} ev(n, "done"); return n; }
const out = {};
for (const [mode, f] of [
  ["sequential", async () => [await job("A", 100), await job("B", 200), await job("C", 300)]],
  ["Promise.all", () => Promise.all([job("A", 100), job("B", 200), job("C", 300)])],
  ["Promise.all, B blocks", () => Promise.all([job("A", 100), jobBlocking("B", 200), job("C", 300)])],
]) {
  EV = []; T0 = performance.now(); const res = await f();
  const total = Math.round((performance.now() - T0) * 10) / 10;
  out[mode] = { events: EV, total_ms: total, result: res };
  console.log(`${mode.padEnd(22)} ${total.toFixed(1).padStart(6)} ms  order of events: ${EV.map(e => e[0] + ":" + e[1]).join(" ")}`);
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(out));
