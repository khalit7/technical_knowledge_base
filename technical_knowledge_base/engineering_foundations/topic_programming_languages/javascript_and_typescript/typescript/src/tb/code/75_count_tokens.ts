// data: chat
// cmd: node count_tokens.ts chat.jsonl; node count_tokens.ts nope.jsonl
// Part 1's count_tokens.mjs with types: the same program, now checked by tsc.
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { z } from "zod";

const Message = z.object({ user: z.string(), text: z.string() });  // replaces the hand-written isMessage
type Message = z.infer<typeof Message>;

const countTokens = (text: string): number => (text.match(/[A-Za-z0-9]+/g) ?? []).length;

type Stats = { lines: number; ok: number; bad: number; firstBad: number; perUser: Map<string, number> };

async function count(path: string): Promise<Stats> {
  const s: Stats = { lines: 0, ok: 0, bad: 0, firstBad: 0, perUser: new Map() };
  const input = createReadStream(path, { encoding: "utf8" });
  for await (const line of createInterface({ input, crlfDelay: Infinity })) {
    s.lines++;
    let raw: unknown;
    try { raw = JSON.parse(line); } catch { raw = undefined; }
    const r = Message.safeParse(raw);
    if (!r.success) { s.bad++; s.firstBad ||= s.lines; continue; }
    const m: Message = r.data;
    s.ok++;
    s.perUser.set(m.user, (s.perUser.get(m.user) ?? 0) + countTokens(m.text));
  }
  return s;
}

const path = process.argv[2] ?? "chat.jsonl";
try {
  const s = await count(path);
  const total = [...s.perUser.values()].reduce((a, b) => a + b, 0);
  const top = [...s.perUser].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  console.log(`lines ${s.lines}  ok ${s.ok}  malformed ${s.bad} (first at line ${s.firstBad})`);
  console.log(`users ${s.perUser.size}  tokens ${total}`);
  console.log("top 5 users by tokens:");
  top.slice(0, 5).forEach(([user, n], i) => console.log(`${String(i + 1).padStart(2)}. ${user}  ${n}`));
} catch (e) {
  const code = e instanceof Error && "code" in e ? String(e.code) : String(e);
  console.error(`error: cannot open ${path}: ${code}`);
  process.exit(1);
}
