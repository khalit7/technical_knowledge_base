// 20 requests of 50 ms each, at most 4 in flight: a worker-pool limiter in eight lines (no library).
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length); let next = 0, inFlight = 0, peak = 0;
  async function worker() {
    while (next < items.length) { const i = next++; inFlight++; peak = Math.max(peak, inFlight); results[i] = await fn(items[i]); inFlight--; }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return { results, peak };
}
const items = Array.from({ length: 20 }, (_, i) => i);
for (const limit of [1, 4, 20]) {
  const t0 = performance.now();
  const { results, peak } = await mapLimit(items, limit, async i => { await sleep(50); return i * i; });
  console.log(`limit ${String(limit).padStart(2)}: ${Math.round(performance.now() - t0)} ms, peak in flight ${peak}, last result ${results.at(-1)}`);
}
