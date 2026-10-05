// What the SDK does when the API fails: retries (429, 5xx, timeouts) and typed errors you can catch.
import Anthropic from "@anthropic-ai/sdk";
import { createServer } from "node:http";

let attempts = 0, mode = "";
const t0 = Date.now(); const log = (s: string) => console.log(`${String(Date.now() - t0).padStart(5)} ms  ${s}`);
const server = createServer((req, res) => {
  attempts++; req.resume();
  log(`server: attempt ${attempts} (${mode}), retry-count header ${req.headers["x-stainless-retry-count"]}`);
  if (mode === "429" && attempts <= 2) return res.writeHead(429, { "content-type": "application/json", "retry-after-ms": "100" })
    .end(JSON.stringify({ type: "error", error: { type: "rate_limit_error", message: "slow down" } }));
  if (mode === "400") return res.writeHead(400, { "content-type": "application/json" })
    .end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "max_tokens: must be at least 1" } }));
  if (mode === "hang") return;   // never answers
  res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ id: "msg_1", type: "message", role: "assistant",
    model: "m", content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }));
}).listen(0);
const client = new Anthropic({ baseURL: `http://127.0.0.1:${(server.address() as any).port}`, apiKey: "mock-key" });
const ask = (opts?: Anthropic.RequestOptions) =>
  client.messages.create({ model: "claude-sonnet-5-5", max_tokens: 64, messages: [{ role: "user", content: "hi" }] }, opts);

for (const [m, opts] of [["429", undefined], ["400", undefined], ["hang", { timeout: 300, maxRetries: 1 }]] as const) {
  mode = m; attempts = 0; console.log(`\n--- server answers ${m}${opts ? " (timeout 300 ms, maxRetries 1)" : ""}`);
  try {
    const r = await ask(opts);
    log(`client: success after ${attempts} attempts: ${r.content[0]?.type === "text" ? r.content[0].text : ""}`);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) log(`client: RateLimitError ${e.status}`);
    else if (e instanceof Anthropic.BadRequestError) log(`client: BadRequestError ${e.status}, not retried: ${e.message}`);
    else if (e instanceof Anthropic.APIConnectionTimeoutError) log(`client: APIConnectionTimeoutError after ${attempts} attempts`);
    else throw e;
  }
}
server.closeAllConnections(); server.close();
