// Serving an LLM app: a Node HTTP endpoint that streams the model's tokens to a browser as SSE,
// and stops the upstream model call when the browser goes away (AbortController).
import Anthropic from "@anthropic-ai/sdk";
import { createServer } from "node:http";
import { startMock } from "./mock_model.ts";

const mock = await startMock({ delayMs: 20 });                  // the "model" sends one event every 20 ms
const client = new Anthropic({ baseURL: mock.url, apiKey: "mock-key", defaultHeaders: { "x-mock-scenario": "long" } });
const t0 = performance.now(); const log = (s: string) => console.log(`${String(Math.round(performance.now() - t0)).padStart(5)} ms  ${s}`);
let propagate = true;

const app = createServer(async (req, res) => {
  const ac = new AbortController();
  res.on("close", () => { if (!res.writableFinished) { log("server: browser went away"); if (propagate) ac.abort(); } });
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  const q = new URL(req.url ?? "", "http://x").searchParams.get("q") ?? "";
  const stream = client.messages.stream({ model: "claude-sonnet-5-5", max_tokens: 1024, messages: [{ role: "user", content: q }] },
    { signal: ac.signal });                                      // aborting the signal closes the upstream HTTP request
  let sent = 0;
  try {
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") { res.write(`data: ${JSON.stringify(ev.delta.text)}\n\n`); sent++; }
    }
    res.end("event: done\ndata: {}\n\n");
    log(`server: upstream finished; ${sent} deltas forwarded${res.destroyed ? " (most of them to a closed socket)" : ""}`);
  } catch (e) {
    if (e instanceof Anthropic.APIUserAbortError) log(`server: upstream call aborted after ${sent} deltas`);
    else throw e;
  }
});
await new Promise<void>(r => app.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${(app.address() as any).port}/ask?q=tell+me+about+TypeScript`;

// The browser side (this code also runs unchanged in a browser): read events, give up after three.
async function browser(stopAfter: number) {
  const ac = new AbortController(); const got: string[] = [];
  const res = await fetch(url, { signal: ac.signal });
  const dec = new TextDecoder(); let buf = "";
  try {
    for await (const chunk of res.body!) {
      buf += dec.decode(chunk, { stream: true });
      let i; while ((i = buf.indexOf("\n\n")) >= 0) { const ev = buf.slice(0, i); buf = buf.slice(i + 2); if (ev.startsWith("data: ")) got.push(JSON.parse(ev.slice(6))); }
      if (got.length >= stopAfter) { log(`browser: got ${got.length} deltas ${JSON.stringify(got.join(""))}, closing the tab`); ac.abort(); }
    }
  } catch (e) { if ((e as Error).name !== "AbortError") throw e; }
}
for (const p of [true, false]) {
  propagate = p; mock.log.length = 0;
  console.log(`\n--- ${p ? "with" : "WITHOUT"} abort propagation`);
  await browser(3);
  await new Promise(r => setTimeout(r, p ? 200 : 2500));
  const e = mock.log[0]!;
  log(`model API: ${e.closedEarly ?? `sent all ${e.sse!.split("\n\n").length - 1} events`}`);
}
app.close(); await mock.close();
