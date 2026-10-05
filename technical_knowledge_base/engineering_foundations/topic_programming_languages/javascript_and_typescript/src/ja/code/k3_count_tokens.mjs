// The root page's running program (count tokens per user in a JSONL chat log, print the top 5), in plain JavaScript.
// It streams the file line by line, so memory stays flat whatever the file size. Part 2 adds the types.
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

const isMessage = v => typeof v === "object" && v !== null && !Array.isArray(v)
  && typeof v.user === "string" && typeof v.text === "string";
const countTokens = text => (text.match(/[A-Za-z0-9]+/g) ?? []).length;

const path = process.argv[2] ?? "chat.jsonl";
const perUser = new Map();
let lines = 0, ok = 0, bad = 0, firstBad = 0;
try {
  const input = createReadStream(path, { encoding: "utf8" });
  for await (const line of createInterface({ input, crlfDelay: Infinity })) {
    lines++;
    let rec;
    try { rec = JSON.parse(line); } catch { rec = undefined; }
    if (!isMessage(rec)) { bad++; firstBad ||= lines; continue; }
    ok++;
    perUser.set(rec.user, (perUser.get(rec.user) ?? 0) + countTokens(rec.text));
  }
} catch (e) {
  console.error(`error: cannot open ${path}: ${e.code}`);
  process.exit(1);
}
let total = 0;
for (const n of perUser.values()) total += n;
const top = [...perUser].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
console.log(`lines ${lines}  ok ${ok}  malformed ${bad} (first at line ${firstBad})`);
console.log(`users ${perUser.size}  tokens ${total}`);
console.log("top 5 users by tokens:");
top.slice(0, 5).forEach(([user, n], i) => console.log(`${String(i + 1).padStart(2)}. ${user}  ${n}`));
