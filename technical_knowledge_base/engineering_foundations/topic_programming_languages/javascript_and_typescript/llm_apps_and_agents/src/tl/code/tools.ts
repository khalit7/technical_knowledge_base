// The two tools the agent may call. count_tokens is the root page's running program (PROGRAM.md) as a function;
// user_profile asks a small local HTTP service (synthetic data) and can be slow, to show timeouts.
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { createServer } from "node:http";
import { z } from "zod";

export const CountArgs = z.object({
  path: z.string().describe("JSONL chat log, one message per line"),
  top: z.number().int().min(1).max(50).describe("how many users to return"),
});
export const ProfileArgs = z.object({ user: z.string().regex(/^u\d{4}$/) });

const tokens = (t: string) => t.match(/[A-Za-z0-9]+/g)?.length ?? 0;

export async function countTokens({ path, top }: z.infer<typeof CountArgs>) {
  const per = new Map<string, number>();
  let lines = 0, ok = 0, malformed = 0;
  const stream = createReadStream(path, { encoding: "utf8" });
  await new Promise((res, rej) => { stream.once("open", res); stream.once("error", rej); });
  for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) {
    lines++;
    let r: any; try { r = JSON.parse(line); } catch { r = null; }
    if (typeof r?.user !== "string" || typeof r?.text !== "string") { malformed++; continue; }
    ok++; per.set(r.user, (per.get(r.user) ?? 0) + tokens(r.text));
  }
  const sorted = [...per].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return { lines, ok, malformed, users: per.size, tokens: sorted.reduce((s, [, n]) => s + n, 0),
    top: sorted.slice(0, top).map(([user, n]) => ({ user, tokens: n })) };
}

// A stand-in "profile service" (synthetic teams). slowMs delays every answer, like a struggling upstream.
const TEAMS: Record<string, string> = { u0029: "research", u0005: "platform", u0042: "evals" };
export async function startProfileService(slowMs = 0) {
  const s = createServer(async (req, res) => {
    const user = new URL(req.url ?? "", "http://x").searchParams.get("user") ?? "";
    if (slowMs) await new Promise(r => setTimeout(r, slowMs));
    if (res.destroyed) return;
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ user, team: TEAMS[user] ?? "unknown" }));
  });
  await new Promise<void>(r => s.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(s.address() as any).port}`;
  return { url, close: () => new Promise(r => { s.closeAllConnections(); s.close(r); }) };
}

export async function userProfile(base: string, { user }: z.infer<typeof ProfileArgs>, signal?: AbortSignal) {
  const r = await fetch(`${base}/profile?user=${user}`, { signal });
  return await r.text();
}
