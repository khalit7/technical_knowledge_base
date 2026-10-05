// node:fs/promises: the async file API (open, read, write, stat, readdir, mkdir, rm), with node:path and node:os.
import { mkdtemp, writeFile, readFile, readdir, stat, rm, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
const dir = await mkdtemp(join(tmpdir(), "ja-"));
await writeFile(join(dir, "a.jsonl"), '{"user":"u1","text":"hi"}\n');
await appendFile(join(dir, "a.jsonl"), '{"user":"u2","text":"hello there"}\n');
const text = await readFile(join(dir, "a.jsonl"), "utf8");          // without "utf8" you get a Buffer of bytes
console.log(text.trim().split("\n").map(l => JSON.parse(l).user), (await stat(join(dir, "a.jsonl"))).size, "bytes");
console.log(await readdir(dir));
try { await readFile(join(dir, "missing.txt")); }
catch (e) { console.log(e.code, e.syscall, e instanceof Error); }   // errors carry a code: test e.code, not the message
await rm(dir, { recursive: true });
