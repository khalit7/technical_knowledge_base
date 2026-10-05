// Backpressure: res.write() returns false when the socket cannot keep up. Ignore it and Node queues the bytes in memory.
import { createServer, request } from "node:http";
import { once } from "node:events";

const EVENTS = 20000, EVENT = `data: ${JSON.stringify("x".repeat(90))}\n\n`;   // about 2 MB in total
async function run(respect: boolean) {
  let peak = 0, falses = 0;
  const server = createServer(async (_req, res) => {
    res.writeHead(200, { "content-type": "text/event-stream" });
    for (let i = 0; i < EVENTS; i++) {
      const ok = res.write(EVENT);
      peak = Math.max(peak, res.writableLength);              // bytes queued inside this process
      if (!ok) { falses++; if (respect) await once(res, "drain"); }
    }
    res.end();
  });
  await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
  const t0 = performance.now();
  await new Promise<void>(done => request({ port: (server.address() as any).port, path: "/" }, async (res) => {
    res.pause(); await new Promise(r => setTimeout(r, 300));    // a slow reader: reads nothing for 300 ms
    res.resume(); res.on("end", done);
  }).end());
  server.close();
  console.log(`${respect ? "awaits drain " : "ignores false"}: write() returned false ${String(falses).padStart(5)} times, peak queued in the server ${(peak / 1024).toFixed(0).padStart(5)} KiB, ${Math.round(performance.now() - t0)} ms`);
}
console.log(`${EVENTS} events of ${EVENT.length} bytes = ${(EVENTS * EVENT.length / 1024).toFixed(0)} KiB to a client that waits 300 ms before reading`);
await run(false);
await run(true);
