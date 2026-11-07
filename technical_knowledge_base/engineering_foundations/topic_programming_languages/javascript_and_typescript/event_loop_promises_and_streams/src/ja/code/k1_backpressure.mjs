// Backpressure in a Node stream pipeline: a fast source, a pass-through Transform, a slow sink (20 ms per 1 KiB chunk).
// Every buffer's highWaterMark is 2 KiB. Mode "pipeline": stream.pipeline() pauses the source when the buffers are full.
// Mode "ignore": a loop calls sink.write() for every chunk and ignores the false it returns, so the sink's buffer grows.
// Each event is stamped with ms since the start and the bytes waiting in every buffer; the Reading stage replays them.
import { Readable, Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { writeFileSync } from "node:fs";
const N = 20, KB = 1024, HWM = 2 * KB, SLOW = 20;
const chunk = i => Buffer.alloc(KB, 97 + (i % 26));
async function run(mode) {
  const EV = [], T0 = performance.now(); let src = null, xf = null, sink = null;
  const lv = () => [src ? src.readableLength : 0, xf ? xf.writableLength : 0, xf ? xf.readableLength : 0, sink.writableLength];
  const ev = (what, i, ok) => EV.push([what, i, +(performance.now() - T0).toFixed(1), ...lv(), ok === undefined ? null : ok]);
  sink = new Writable({ highWaterMark: HWM, write(c, _e, cb) { const i = c[0] - 97; ev("write", i); setTimeout(() => { ev("done", i); cb(); }, SLOW); } });
  if (mode === "pipeline") {
    let i = 0;
    src = new Readable({ highWaterMark: HWM, read() {             // called whenever the source's buffer has room
      ev("read", i);
      while (i < N) { const ok = this.push(chunk(i)); ev("push", i, ok); i++; if (!ok) return; }   // false: stop until read() is called again
      this.push(null);
    } });
    xf = new Transform({ highWaterMark: HWM, transform(c, _e, cb) { cb(null, c); } });
    await pipeline(src, xf, sink);
  } else {
    let falses = 0;
    for (let i = 0; i < N; i++) { const ok = sink.write(chunk(i)); ev("push", i, ok); if (!ok) falses++; }   // ignores false
    await new Promise(r => sink.end(r));
    ev("end", N);
    console.log(`ignore: write() returned false ${falses} times`);
  }
  const peak = Math.max(...EV.map(e => e[3] + e[4] + e[5] + e[6]));
  console.log(`${mode}: ${N} chunks of 1 KiB, highWaterMark 2 KiB, sink 20 ms a chunk: ${EV.at(-1)[2].toFixed(0)} ms, peak buffered ${(peak / KB).toFixed(0)} KiB, peak in the sink ${(Math.max(...EV.map(e => e[6])) / KB).toFixed(0)} KiB`);
  return { events: EV, total_ms: EV.at(-1)[2], peak_kib: peak / KB };
}
const out = { n: N, hwm_kib: HWM / KB, slow_ms: SLOW, cols: ["what", "chunk", "ms", "source", "transform in", "transform out", "sink"] };
out.pipeline = await run("pipeline");
out.ignore = await run("ignore");
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(out));
