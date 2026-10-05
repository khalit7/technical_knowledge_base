// The same count, but reading the whole file into one string first (the mistake everyone makes once).
import { readFile } from "node:fs/promises";
const text = await readFile(process.argv[2], "utf8");
const perUser = new Map(); let ok = 0;
for (const line of text.split("\n")) {
  if (!line) continue;
  let rec; try { rec = JSON.parse(line); } catch { continue; }
  if (typeof rec?.user !== "string" || typeof rec?.text !== "string") continue;
  ok++; perUser.set(rec.user, (perUser.get(rec.user) ?? 0) + (rec.text.match(/[A-Za-z0-9]+/g) ?? []).length);
}
console.log(`ok ${ok}  users ${perUser.size}`);
