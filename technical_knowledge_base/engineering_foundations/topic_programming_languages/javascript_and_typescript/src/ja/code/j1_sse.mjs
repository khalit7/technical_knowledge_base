// How an LLM token stream arrives: server-sent events (SSE) over HTTP, read with fetch.
// A local server stands in for the model API: it sends six "data:" events, but the network
// delivers bytes in arbitrary chunks (here: 19-byte slices, 15 ms apart), cutting events and even characters in half.
import { createServer } from "node:http";
const TOKENS = ["Hello", ",", " wörld", "!", " 🚀", " done"];
const BODY = Buffer.from(TOKENS.map(t => `data: ${JSON.stringify({ delta: t })}\n\n`).join("") + "data: [DONE]\n\n");
const server = createServer(async (req, res) => {
  res.writeHead(200, { "content-type": "text/event-stream" });
  for (let i = 0; i < BODY.length; i += 19) { res.write(BODY.subarray(i, i + 19)); await new Promise(r => setTimeout(r, 15)); }
  res.end();
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/v1/stream`;

// Wrong: treat each chunk as text on its own and as whole events
const naive = { chunks: [], lens: [], events: [], errors: [] };
for await (const chunk of (await fetch(url)).body) {        // a web ReadableStream is an async iterable of Uint8Array
  const text = new TextDecoder().decode(chunk);             // a fresh decoder per chunk breaks split characters
  naive.chunks.push(text); naive.lens.push(chunk.length);
  for (const part of text.split("\n\n")) {
    if (!part.startsWith("data: ") || part === "data: [DONE]") continue;
    try { naive.events.push(JSON.parse(part.slice(6)).delta); } catch (e) { naive.errors.push(e.message.split(" in JSON")[0]); }
  }
}
// Right: one streaming decoder, a buffer, and only complete events (ending in a blank line) are parsed
async function* sseEvents(body) {
  const dec = new TextDecoder(); let buf = "";
  for await (const chunk of body) {
    buf += dec.decode(chunk, { stream: true });              // stream: true keeps half a character for the next chunk
    let end;
    while ((end = buf.indexOf("\n\n")) >= 0) { const ev = buf.slice(0, end); buf = buf.slice(end + 2); yield ev; }
  }
}
const good = [];
for await (const ev of sseEvents((await fetch(url)).body)) {
  const data = ev.slice(6);
  if (data === "[DONE]") break;
  good.push(JSON.parse(data).delta);
}
server.close();
console.log(`${BODY.length} bytes arrived in ${naive.chunks.length} chunks; the first three:`);
naive.chunks.slice(0, 3).forEach((c, i) => console.log(`  chunk ${i + 1}: ${JSON.stringify(c)}`));
console.log("naive parser, tokens:", JSON.stringify(naive.events.join("")), "| errors:", naive.errors.length, naive.errors.slice(0, 2));
console.log("buffered parser, tokens:", JSON.stringify(good.join("")));
if (process.argv[2]) (await import("node:fs")).writeFileSync(process.argv[2], JSON.stringify({ body: BODY.toString(), slice: 19, chunks: naive.chunks, lens: naive.lens, naive: naive.events, naiveErrors: naive.errors, good }));
