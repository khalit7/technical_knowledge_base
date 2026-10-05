// Task: count tokens in 4 chunks on 4 worker threads, merge the per-user counts.
// JavaScript runs your code on one thread with an event loop; for CPU work in
// parallel you start workers, which share no objects: data is copied in messages.
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { readFileSync } from "node:fs";

function countTokens(text: string): number {
  return (text.match(/[A-Za-z0-9]+/g) ?? []).length;
}

if (isMainThread) {
  const lines = readFileSync(process.argv[2] ?? "chat.jsonl", "utf8").split("\n").slice(0, -1);
  const T = 4;
  const jobs = Array.from({ length: T }, (_, t) => {
    const chunk = lines.filter((_, i) => i % T === t);
    return new Promise<Map<string, number>>((resolve, reject) => {
      const w = new Worker(new URL(import.meta.url), { workerData: chunk });
      w.once("message", resolve);
      w.once("error", reject);
    });
  });
  const parts = await Promise.all(jobs); // wait for all four, concurrently
  const total = new Map<string, number>();
  for (const p of parts) for (const [u, n] of p) total.set(u, (total.get(u) ?? 0) + n);
  const top = [...total].sort((a, b) => b[1] - a[1])[0];
  let sum = 0;
  for (const n of total.values()) sum += n;
  console.log("users", total.size, "tokens", sum, "top", top);
} else {
  const m = new Map<string, number>();
  for (const line of workerData as string[]) {
    try {
      const r = JSON.parse(line);
      if (typeof r?.user === "string" && typeof r?.text === "string")
        m.set(r.user, (m.get(r.user) ?? 0) + countTokens(r.text));
    } catch { /* malformed: skip */ }
  }
  parentPort!.postMessage(m); // a Map is copied to the main thread (structured clone)
}
