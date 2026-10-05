// Count tokens per user in a JSONL chat log; print the top 5. Spec: ../../PROGRAM.md
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

interface Message {
  user: string;
  text: string;
}

// JSON.parse returns `any`; we take it as `unknown` and prove its shape.
// After this check returns true, TypeScript treats `v` as a Message.
function isMessage(v: unknown): v is Message {
  return (
    typeof v === "object" && v !== null && !Array.isArray(v) &&
    typeof (v as Record<string, unknown>).user === "string" &&
    typeof (v as Record<string, unknown>).text === "string"
  );
}

/** Number of maximal runs of ASCII letters and digits. */
function countTokens(text: string): number {
  let n = 0;
  let inside = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    const tok = (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c >= 48 && c <= 57);
    if (tok && !inside) n++;
    inside = tok;
  }
  return n;
}

async function main(path: string): Promise<number> {
  const perUser = new Map<string, number>();
  let lines = 0, ok = 0, bad = 0, firstBad = 0;
  const stream = createReadStream(path, { encoding: "utf8" });
  const opened = new Promise<void>((resolve, reject) => {
    stream.once("open", () => resolve());
    stream.once("error", reject);
  });
  try {
    await opened;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    console.error(`error: cannot open ${path}: ${err.code}`);
    return 1;
  }
  for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) {
    lines++;
    let rec: unknown;
    try {
      rec = JSON.parse(line);
    } catch {
      rec = undefined;
    }
    if (!isMessage(rec)) {
      bad++;
      if (firstBad === 0) firstBad = lines;
      continue;
    }
    ok++;
    perUser.set(rec.user, (perUser.get(rec.user) ?? 0) + countTokens(rec.text));
  }
  let total = 0;
  for (const n of perUser.values()) total += n;
  const top = [...perUser.entries()].sort((a, b) =>
    b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  console.log(`lines ${lines}  ok ${ok}  malformed ${bad} (first at line ${firstBad})`);
  console.log(`users ${perUser.size}  tokens ${total}`);
  console.log("top 5 users by tokens:");
  top.slice(0, 5).forEach(([user, n], i) => {
    console.log(`${String(i + 1).padStart(2)}. ${user}  ${n}`);
  });
  return 0;
}

main(process.argv[2] ?? "chat.jsonl").then((code) => { process.exitCode = code; });
