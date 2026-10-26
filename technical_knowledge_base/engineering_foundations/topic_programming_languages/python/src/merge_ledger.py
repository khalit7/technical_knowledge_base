"""Turn the master ledger (drafted from the language page before the 2026-10-26 split) into this page's ledger:
merge each child's src/from_master.json, then label the units the children left (kept here, or fat).
Run once from the repo root: python3 <page>/src/merge_ledger.py. Idempotent: it rewrites labels from the same inputs."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
PAGE = "engineering_foundations/topic_programming_languages/python"
KIDS = ["data_model_and_protocols", "concurrency_asyncio_and_the_gil", "cpython_internals_and_performance", "typing_packaging_and_toolchain"]

# units no child claimed: kept on this page (core, with the key that appears in its static text) or fat
HERE_KEYS = {
    6: "CPython 3.13.16, 3.14.8, 3.14.8t and 3.15.0rc3 on an Apple M1 Pro",
    15: "Does this run on my version?",
    19: "without the GIL every run lost 24k to 36k", 20: "A lock fixed both",
    21: "asyncio.to_thread removed the delay", 22: "peaked at 1.1 KiB", 23: "from 268 to 64 imported modules",
    24: "silently turns the GIL back on when imported",
    25: "with the same program written in all four", 26: "The sibling language pages are",
    27: "Python: staying current (3.12 to 3.15)",
    32: "Almost every surprise a working Python programmer meets",
    34: "gives one object a second name", 35: "Copies happen only when you ask",
    44: "The GIL makes threads useful for waiting, not for computing",
    46: "Annotations are not checked when the program runs",
    51: "How Python compares with C++, Rust and TypeScript",
    52: "a block of memory that knows its type, its value and how many references point at it",
    53: "an entry in a namespace, a dict-like table from strings to objects",
    54: "writes a second entry pointing at the same object", 55: "Two names for one object are",
    56: "whether the object can change after it is made", 57: "Lists, dicts, sets and most of your own classes are mutable",
    58: "builds a new object and rebinds the name", 59: "Use is only for singletons such as None",
    60: "breaks in production with large ones",
    297: "Traps that catch experienced people", 298: "Lookup falls through to the class",
    322: "PEP 20", 326: "Reliability engineering",
    555: "3.12 for libraries, the newest bugfix line (3.14) for applications",
    579: "beyond pytest's mechanics",
}
FAT = {1: "old title and subtitle", 2: "the header's date line, rewritten", 3: "the old part bar and tab names",
       4: "Start here intro, replaced by the core idea", 5: "part-bar instruction", 7: "Part 1 card time", 8: "Part 1 tab list",
       9: "Part 1 contents list, now the child cards", 10: "pointer to a removed section", 11: "pointer to the removed Predict tab",
       12: "Part 2 card time", 13: "Part 2 tab list", 16: "pointer to the Runtime lab tab, dissolved into the children",
       17: "routes through the old parts", 28: "Part 1 intro", 29: "Part 1 provenance line, now the page foot", 30: "how to use the Predict boxes",
       31: "Part 1 section nav", 33: "In one screen pointer", 36: "section pointer", 45: "section pointer", 48: "section pointer",
       49: "how to use Part 1", 50: "pointer to Part 2", 299: "self-check question (no quizzes, teaching contract)",
       300: "self-check question (no quizzes)", 301: "self-check question (no quizzes)"}
# new units written for this page (the hero and the rewritten sections)
NEW = [
    ("the idea in one screen", "Hero: y = x copies nothing (STORE_NAME, refs 1 to 2); y.append(3) calls type(y).append and mutates the one list; z = x + [4] calls type(x).__add__ and builds a new list with 1 reference.", "core", "type(x).__add__(x, [4])"),
    ("the idea in one screen", "The hero's real run on CPython 3.14.8: reference counts, the methods called, and the dis listing.", "depth", "LOAD_SMALL_INT"),
    ("2. names, objects and references", "Default values are evaluated once when def runs and stored on the function object; a call that passes its own list leaves the shared one alone.", "core", "stored on the function object"),
    ("3. traps that catch experienced people", "Trusting a type hint at run time, and pip install inside a uv project, are cross-cutting traps owned by the toolchain child.", "core", "Installs outside the lock"),
    ("4. choosing: which tool for which job", "A new project: uv, ruff, a type checker and pytest in CI.", "core", "uv, ruff, a type checker and pytest in CI"),
    ("5. the child pages", "Child cards with each child's core idea and measured reading time.", "core", "Reading: 23 min, plus 21 in closed details"),
]

def main():
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
            if len(cs) > 1:   # both children name the same owner; keep it and say so
                owners = {c[1]["label"] for c in cs}
                k, x = next(c for c in cs if c[1]["label"].endswith(c[0])) if len(owners) > 1 else cs[0]
                u["note"] = "claimed by " + " and ".join(c[0] for c in cs) + "; owner kept: " + x["label"]
            u["label"], u["key"] = x["label"], x.get("key", "")
        elif u["id"] in HERE_KEYS:
            u["label"], u["key"] = "core", HERE_KEYS[u["id"]]
        elif u["id"] in FAT:
            u["label"], u["key"], u["note"] = "fat", "", FAT[u["id"]]
        else:
            raise SystemExit(f"unit {u['id']} has no label")
    for i, (sec, text, lab, key) in enumerate(NEW):
        master.append({"id": 10001 + i, "tab": "t-read", "section": sec, "text": text, "label": lab, "key": key, "where": ""})
    (HERE / "ledger.json").write_text(json.dumps(master, indent=1, ensure_ascii=False) + "\n")
    print(len(master), "units")

main()
