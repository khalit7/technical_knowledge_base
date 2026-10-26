"""Turn the master ledger (drafted from the three-part JavaScript and TypeScript page before the 2026-10-26 split) into this
page's ledger: merge each child's src/from_master.json, then label the units the children left (kept here, or fat).
Units kept here are "core" when their key is in the page's open text and "depth" when it is only inside a closed
<details> block (decided from the built index.html, so rebuild first).
Run from the repo root after `sh src/build.sh`: python3 <page>/src/merge_ledger.py. Idempotent: it rewrites labels from the same inputs."""
import html, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
KIDS = ["the_language_for_python_programmers", "event_loop_promises_and_streams", "typescript", "llm_apps_and_agents"]

# units no child claimed and this page keeps, with the key that appears in its static text
HERE_KEYS = {
    2: "Data as of October 2026", 7: "Node 22.22.2, 24.21.0 and 26.10.0, Bun 1.4.2, Deno 2.9.7",
    8: "speaks the real Anthropic and OpenAI wire formats", 23: "wrong data with no error in 2 cases",
    24: "37,722 lines in 520 ms", 25: "6 of 114 events", 26: "queued 2,070 KiB in memory",
    27: "with the same program written in all four", 28: "Harness design is in", 29: "The sibling language pages are",
    30: "every claim from them was checked",
    46: "nothing runs in parallel with your code", 47: "run every microtask, take the next task",
    48: "a long loop freezes everything", 50: "has no files, network or processes: a runtime adds them",
    51: "Bun about 9 and Deno about 11", 55: 'false friend "TypeScript types vanish at run time"',
    56: "took Google's V8 engine out of the browser", 57: "Node is both the interpreter", 58: "hello Khalid, count is 4",
    59: "Use ES modules for anything new", 60: "reruns on every save", 61: "pauses on the first line",
    62: "Even-numbered releases become long-term support", 63: "due to become LTS on 2026-10-28",
    64: "Install it with a version manager", 65: "has the dated release grid", 66: "Green boxes are Node's real output",
    67: "SpiderMonkey in Firefox",
    206: "imported with a node: prefix", 207: "Five modules cover most scripts and services", 208: "is Python's bytes",
    209: "ENOENT open true", 210: "Prefer setting process.exitCode", 211: "the Node equivalent of Python's for line in open(path)",
    212: "byte-identical to the spec's expected output", 213: "The root's TypeScript version is this file plus types",
    214: "const isMessage = v =>", 215: "users 176 tokens 44698", 216: "lines 2000 ok 1992 malformed 8",
    217: "about five times the memory", 218: "An HTTP error status does not throw", 219: "raise_for_status()",
    220: "503 false overloaded", 221: "shares nothing by default and talks by messages",
    222: "closer to Python's multiprocessing than to threading", 223: "a 10 ms heartbeat timer measures how long the event loop was stuck",
    224: "worst gap 438 ms", 225: "package.json is pyproject.toml", 226: "5.x.y, at least 5.2.1",
    227: "install from it in CI with npm ci", 228: "no virtual environment to activate",
    229: "Bun includes its own npm-compatible installer", 230: "prefer packages with few dependencies",
    231: "Node is not the only runtime", 232: "bundler in one binary", 233: "Claude Code ships as a Bun executable",
    234: "by Node's original author", 235: "the whole Deno team joined Cloudflare", 236: "run most Node code and npm packages",
    237: "The same script in all three", 238: "read my own 284 bytes", 239: "31.4 ms", 240: "bun -e 0 6.6 ms",
    241: "within about 3 ms", 242: "governance by the OpenJS Foundation", 243: "or you want one tool instead of five",
    244: "Check that your native add-ons", 245: "development is scheduled to end about a year",
    246: "this page does not repeat it",
    274: '"__proto__" key from JSON onto Object.prototype', 275: "merge into Object.create(null)",
    276: "Never pass input to eval", 277: "a brand-new object says isAdmin = true",
    278: "Temporal (on by default in Node 26) fixes all three", 279: "Temporal: 2026-02-28",
    281: '"0x10" still parses as hexadecimal', 282: "Bun's own announcement is dated 2025-12-02",
    283: "Node 24 Active LTS and Node 26 becoming LTS",
    285: "Design space (JavaScript false friends)", 289: "what to build with Node's HTTP and how to load-test it",
    290: "Testing and quality", 291: "(MCP): the systems most of", 298: "about 2 h for fs, process, stream, worker_threads",
    301: "Deno security and permissions",
}
FAT = {1: "old title and subtitle", 3: "the old part bar and tab names", 4: "the old part bar and tab names",
       5: "Start here intro, replaced by the core idea and the header", 6: "part-bar instruction",
       9: "Part 1 card time", 10: "Part 1 tab list", 11: "Part 1 contents list, now the child cards",
       13: "Part 2 card time", 14: "Part 2 tab list", 15: "Part 2 contents list, now the TypeScript child's card",
       16: "pointer to the removed LLM JSON lab tab", 17: "Part 3 card time", 18: "Part 3 tab list",
       19: "Part 3 contents list, now the LLM apps child's card", 20: "pointer to the dropped MCP message flow tab",
       21: "three routes through the old parts (plan: fat)", 31: "Part 1 intro and reading time", 35: "Part 1 section nav",
       49: "section pointer", 52: "section pointer", 272: "section pointer", 284: "pointer to Parts 2 and 3, now the child list",
       287: "time for a Python tab that no longer exists (the stepper is inline on the Python concurrency child)"}
# new units written for this page (the hero, the table, the trap map, the cards)
NEW = [
    ("the idea", "Hero: count.ts has its types erased (stripped by node, Bun or Deno, or compiled by tsc) to count.js, which runs on one thread: call stack, microtask queue, task queue, the event loop; libuv's readiness API and 4-thread pool; worker threads.", "core", "Types stop at the dashed line"),
    ("the idea", "New terms: runtime, event loop, task and microtask, libuv, type stripping, ES module and CommonJS, lockfile, LTS.", "core", "deleting TypeScript's annotations so the file runs as JavaScript"),
    ("1. running javascript", "node app.ts strips the types and runs the file; npx tsc --noEmit is what checks them.", "core", "strips the types and runs the file"),
    ("3. runtimes and packages", "Node with npm, pnpm, Bun and Deno in one table: engine, TypeScript, start-up, node_modules layout, CI reinstall time, install scripts, permissions, status in October 2026, when to choose each.", "core", "CI reinstall from the lockfile"),
    ("3. runtimes and packages", "The exports map is taught on the TypeScript child with publishing.", "core", "is on the TypeScript page with publishing"),
    ("4. traps", "Trap map: each trap owned by a child links to the section that shows it; a cast on model output is the TypeScript child's section 7.", "core", "Trusting a cast"),
    ("5. the four child pages", "Child cards with each child's core idea, measured reading time and one measured finding.", "core", "Reading: 27 min, plus 49 in closed details"),
]


def text(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip().lower()


def main():
    page = (HERE.parent / "index.html").read_text()
    page = re.sub(r"<script.*?</script>|<style.*?</style>", " ", page, flags=re.S)
    closed = " ".join(text(m) for m in re.findall(r"<details.*?</details>", page, flags=re.S))
    opened = text(re.sub(r"<details.*?</details>", " ", page, flags=re.S))
    units = json.loads((HERE / "ledger.json").read_text())
    master = [u for u in units if u["id"] < 10000]
    claims = {}
    for k in KIDS:
        for x in json.loads((HERE.parent / k / "src" / "from_master.json").read_text()):
            claims.setdefault(x["id"], []).append((k, x))
    for u in master:
        u["where"] = ""
        u.pop("note", None)
        if u["id"] in claims:
            cs = claims[u["id"]]
            k, x = cs[0]
            if len(cs) > 1:
                u["note"] = "claimed by " + " and ".join(c[0] for c in cs) + "; owner kept: " + x["label"]
            u["label"], u["key"] = x["label"], x.get("key", "")
            if x["label"] == "fat":
                u["note"] = "fat (labelled by " + k + ")"
        elif u["id"] in HERE_KEYS:
            key = HERE_KEYS[u["id"]]
            n = text(key)
            u["label"] = "core" if n in opened else "depth" if n in closed else "core"
            u["key"] = key
        elif u["id"] in FAT:
            u["label"], u["key"], u["note"] = "fat", "", FAT[u["id"]]
        else:
            raise SystemExit(f"unit {u['id']} has no label")
    for i, (sec, t, lab, key) in enumerate(NEW):
        master.append({"id": 10001 + i, "tab": "t-read", "section": sec, "text": t, "label": lab, "key": key, "where": ""})
    (HERE / "ledger.json").write_text(json.dumps(master, indent=1, ensure_ascii=False) + "\n")
    c = {}
    for u in master:
        c[u["label"].split(":")[0]] = c.get(u["label"].split(":")[0], 0) + 1
    print(len(master), "units", c)


main()
