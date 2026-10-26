"""Turn the master ledger (drafted from the Rust language page before the 2026-10-26 split) into this page's ledger:
merge each child's src/from_master.json, then label the units the children left (kept here as core or depth, or fat).
Run from the repo root: python3 <page>/src/merge_ledger.py. Idempotent: it rewrites labels from the same inputs
(the master units are those with id < 10000; units 10001 and up are this page's new text)."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
KIDS = ["enums_traits_and_errors", "lifetimes_smart_pointers_and_unsafe", "pyo3_python_extensions", "async_services_and_clis"]

# units no child claimed, kept here: id -> (label, key that appears in this page's static text)
C, D = "core", "depth"
HERE_KEYS = {
    4: (C, "this page starts from zero for a Python programmer"),
    6: (C, "PyO3 0.29.3, tokio 1.53.2, axum 0.8.9 and clap 4.6.7"),
    14: (C, "from 1.36 s to 0.059 s step by step"),
    19: (C, "Three ways through"), 20: (C, "profile first, because its section 1 shows when porting does not help"),
    21: (C, "CPython took 71.4 ns for the same loop"), 22: (C, "releasing the GIL with 8 threads to 0.059 s (23 times faster)"),
    23: (C, "Port the whole pipeline, not one function"), 24: (C, "raised \"Already borrowed\" on 13% of calls"),
    25: (C, "4,804 against 206 requests/s"), 26: (C, "brought it back to 0.44 ms"),
    27: (C, "with the same program written in all four"), 28: (C, "Rust on the GPU (cutile-rs, cuda-oxide, CubeCL)"),
    29: (C, "Rust: zero to expert"),
    31: (C, "pydantic-core, Hugging Face tokenizers, polars"), 33: (C, "rustc 1.99.0 (edition 2024) and run on an Apple M1 Pro (macOS 27)"),
    34: (C, "exactly one owner"), 35: (C, "Python gets memory safety from reference counting and a garbage collector at run time; C++ trusts you"),
    36: (C, "then runs with no collector at all"), 37: (C, "Rules out dangling references, iterator invalidation and data races at compile time"),
    38: (C, "fifteen real compiler errors"), 41: (C, "green border"),
    43: (C, "turns source files into a machine-code program before anything runs"), 44: (C, "You rarely call it yourself"),
    45: (C, "Cargo is the build tool and package manager"), 46: (C, "the public registry is crates.io"),
    47: (C, "a new stable ships every six weeks"), 48: (C, "gave stable 1.98 (2026-08-20) as current"),
    49: (C, "edition = \"2024\""), 50: (C, "Always measure with cargo run --release"), 51: (C, "cargo doc --open"),
    52: (D, "clippy has opinions"), 53: (D, "unneeded `return` statement"),
    54: (D, "Cargo.lock pins the exact versions resolved"), 55: (D, "Commit it"),
    56: (C, "for a 0.x crate the minor number is the breaking one"), 57: (D, "Much of the ecosystem is at 0.x"),
    58: (D, "rand 0.8 and 0.9"), 59: (D, "two types with the same name that are not the same type"),
    60: (D, "features = [\"derive\"]"), 61: (D, "if any crate in the build turns one on, everyone gets it"),
    62: (D, "RustSec advisory database"),
    63: (C, "immutable by default"), 64: (C, "assigned once later"), 65: (C, "x=5 y=6 spaces=3 max=4096"),
    66: (C, "the default integer type"), 67: (C, "cannot assign twice to immutable variable"), 68: (C, "makes a new variable that hides the old one"),
    69: (C, "it is not mutation"), 70: (C, "Rust is expression-based"), 71: (C, "is a macro"),
    72: (C, "Python's int grows as needed"), 73: (C, "the pointer-sized types used for lengths and indexes"), 74: (C, "Floats are f32 and f64"),
    75: (C, "cannot multiply u32 by f64"), 76: (C, "read the value at run time so the compiler cannot see the overflow coming"),
    77: (C, "checked_add"), 78: (C, "wrapping_add"), 79: (C, "saturating_add"), 80: (C, "overflowing_add"),
    81: (C, "In a debug build, what does ./overflow 255 print on its last line?"), 82: (C, "say what you want"),
    83: (C, "exits with code 101"), 84: (C, "this arithmetic operation will overflow"),
    85: (D, "1e20f64 as i32"), 86: (C, "Use TryFrom when a value might not fit"), 87: (C, "IEEE 754 doubles"),
    88: (C, "First, where values live"), 89: (C, "stack frame"), 90: (C, "which someone must release explicitly"),
    91: (C, "three machine words"), 92: (C, "every object is on the heap and names are references to it"),
    93: (C, "Rust Book 4.1"), 94: (C, "explicit deep copy: a second heap buffer"), 95: (C, "i32 is Copy"),
    96: (C, "c = hello, d = HELLO"), 97: (C, "The heap buffer was not copied and not freed"), 98: (C, "borrow of moved value"),
    99: (C, "Rust refuses the second name, so it never needs a count"), 100: (C, "handing over the only key"),
    101: (C, "have no heap part"), 102: (C, "visible in the code on purpose"), 103: (C, "Passing to a function moves"),
    104: (C, "files close, locks release and buffers free themselves"), 105: (C, "struct Noisy"), 106: (C, "consume got"),
    107: (C, "inner scope ends"), 108: (C, "b moved into consume"), 109: (C, "In what order are the four drop lines printed?"),
    110: (C, "C++'s RAII (resource acquisition is initialisation) made the default"),
    112: (C, "Use after free and double free, with no garbage collector and no reference counts"),
    113: (C, "You must decide who owns each value"), 114: (C, "until it compiles"), 115: (C, "in a hot loop it allocates on every iteration"),
    116: (C, "borrows it without taking ownership"), 117: (C, "any number at once"), 118: (C, "a and b are no longer used, so this is allowed"),
    119: (C, "[3, 4, 5, 1] total 13"), 120: (C, "to its last use"), 121: (C, "a and b are never used again"),
    122: (C, "The old page's \"gate\" question"), 123: (C, "cannot borrow `v` as mutable because it is also borrowed as immutable"),
    124: (C, "In C++ the same code compiles and reads freed memory"), 125: (C, "every bar runs from a borrow's creation to its last use"),
    126: (C, "Two fixes, both recorded"), 127: (C, "if you knew the list might move"), 128: (C, "say which rule broke"),
    129: (C, "The labels are a story in source order"), 130: (C, "That third label is the key"),
    131: (C, "The fix is nearly always one of four"), 133: (C, "Dangling references, iterator invalidation"),
    134: (C, "graph-shaped data"), 135: (C, "Fighting usually means two parts of the code both want to own or change the same data"),
    136: (C, "store indexes instead of references"),
    277: (C, "A crate is the unit the compiler builds at once"), 278: (C, "A crate is the unit the compiler builds at once"),
    279: (C, "loads src/tokenize.rs"), 280: (C, "like Python's from x import y"), 281: (C, "pub(crate)"),
    282: (C, "Python's leading underscore is a convention; this is enforced"), 283: (C, "tokenizer::count"),
    284: (C, "function `split` is private"), 285: (D, "split into modules so that each part can be tested on its own"),
    286: (D, "cannot open {path}"), 287: (D, "Per-user totals"),
    373: (C, "If you know some C++"), 374: (C, "what the C++ Core Guidelines only recommend"),
    375: (D, "valid but unspecified"), 376: (D, "the block is searchable"), 377: (D, "self-referential structs are the design Rust refuses"),
    378: (C, "Cloning until it compiles"), 379: (C, "allocates and copies"), 380: (C, "Ask first whether the callee could borrow"),
    381: (C, "Clone small things freely"), 382: (C, "everywhere to recreate Python's object graph"), 383: (C, "It compiles and then panics at run time"),
    384: (C, "refer to items by index"), 385: (C, "they accept more callers and are what clippy suggests"),
    386: (C, "panics inside a character"), 387: (C, "the token counter works on bytes because tokens are ASCII"),
    388: (C, "reserve expect(\"reason\") for states you can prove impossible"), 389: (C, "Expecting dict order from HashMap"),
    390: (C, "Its order changes between runs"), 391: (C, "Sort, or use BTreeMap"), 392: (C, "Timing a debug build"),
    393: (C, "a release build silently wraps on overflow"), 394: (C, "Lifetimes in every struct"),
    395: (C, "borrow in structs only when a profile says the copies matter"), 396: (C, "Blocking inside async code"),
    397: (C, "stalls every task on that thread"),
    404: (D, "Chapter 4 (ownership) is the one not to skim"), 405: (D, "Chapter 4 (ownership) is the one not to skim"),
    406: (D, "Rustlings"), 407: (D, "cheats.rs"), 408: (D, "Entirely Too Many Linked Lists"), 409: (D, "Rust for Rustaceans"),
    410: (D, "The Rustonomicon"), 411: (D, "Rust API Guidelines"), 412: (D, "Compiler error index"), 413: (D, "One post per six-week release"),
    414: (D, "Design space, Rosetta, Benchmark, Toolchain atlas tabs"), 416: (D, "Testing and quality and Code design in the SWE topic"),
    417: (C, "Rust on the GPU (cutile-rs, cuda-oxide, CubeCL)"),
    418: (C, "One small program, stepped line by line"), 419: (C, "is a 24-byte header on the stack (pointer, capacity, length)"),
    420: (C, "was printed by the program itself when it ran"), 421: (C, "names pointing at one object, and a reference count"),
    422: (D, "Borrowing never copies"), 423: (D, "Growth moves the buffer"), 424: (D, "refuses a reference into the buffer across a push"),
    425: (D, "A move copies 24 bytes, not the data"), 426: (D, "Clone allocates"), 427: (D, "Reusing freed memory is normal"),
    428: (D, "Drop frees at a known line"), 429: (D, "the count rises to 4"),
    430: (D, "stack={:p} heap={:p}"), 431: (D, "Vec::with_capacity(3)"), 432: (D, "r points to {:p}"), 433: (D, "wrote m[0]=11"),
    434: (D, "data=[10, 20, 30]"),
    435: (C, "Fifteen first-week mistakes"), 436: (C, "decide what you think happens, then reveal"),
    437: (C, "Fourteen are refused at compile time"), 438: (C, "file, line and column of the main conflict"),
    439: (C, "marks inserted text"), 441: (C, "every output in src/ra/out/"),
}
FAT = {1: "old title and subtitle", 2: "the header's date line, rewritten", 3: "the old part bar and tab names",
       5: "part-bar instruction", 7: "Parts 2 and 3 assume Part 1: the children now say what they assume",
       8: "Part 1 card time", 9: "Part 1 card contents, now the child cards", 10: "pointer to the Borrow-checker tab, now inline",
       11: "Part 2 card time", 12: "Part 2 tab list", 13: "Part 2 card contents, now the PyO3 child card",
       15: "Part 3 card time", 16: "Part 3 tab list", 17: "Part 3 card contents, now the async child card",
       18: "pointer to the Async replay tab (moved to the async child, now tokio only)",
       30: "Part 1 section nav", 32: "Part 1 intro", 39: "pointer to the drill tab (its items are inline, here and on the enums child)",
       40: "how long Part 1 takes (the header time replaces it)", 42: "pointer to Parts 2 and 3, now the child cards",
       111: "pointer to the Ownership tab, now the hero", 132: "pointer to the Borrow-checker tab, now inline",
       398: "the old staged path with gates: quiz-like (teaching contract: no quizzes); the child cards give the order",
       399: "gate (path table)", 400: "gate (path table)", 401: "gate (path table)", 402: "gate (path table)", 403: "gate (path table)",
       415: "pointer to Parts 2 and 3", 440: "the lab's score line (interface, not knowledge)"}
# a child's key that ledger.py cannot match (a "<" inside a key is stripped as if it were a tag): the same unit, a
# shorter key that is on the owner's page
KEY_FIX = {727: "its type decides parsing"}
NEW = [
    ("top", "Core idea: one owner per value, every borrow checked before the program runs; the price is deciding who owns what.", C, "the price is that you decide who owns what"),
    ("top", "Hero prediction: after a move, the stack slot changes and the heap block does not.", C, "which address changes, the stack slot or the heap block?"),
    ("3. variables and numbers", "Prediction d12: 2 ** 64 in u64 panics in debug, wrapping_pow gives 0, u128 holds it.", C, "u128</code> holds it"),
    ("3. variables and numbers", "Prediction d03: -7 / 2 truncates to -3; flooring a float after integer division changes nothing; div_euclid gives Python's -4.", C, "flooring <code>-3.0</code> changes nothing"),
    ("4. ownership and moves", "Prediction d02: a move kills a, a clone leaves a unchanged, a &mut borrow behaves like Python's alias while it is used.", C, "behaves like Python's alias for as long as it is used"),
    ("7. traps", "Each trap names the page and section that teaches its mechanism.", C, "Taught on"),
    ("9. the child pages", "Child cards with each child's core idea and measured reading time.", C, "Reading: 34 min, plus 13 in closed details"),
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
            if len(cs) > 1:
                raise SystemExit(f"unit {u['id']} claimed by {[c[0] for c in cs]}")
            k, x = cs[0]
            u["label"], u["key"] = x["label"], KEY_FIX.get(u["id"], x.get("key", ""))
            if x["label"] == "fat":
                u["note"] = "fat by " + k + (": " + x["note"] if x.get("note") else "")
        elif u["id"] in HERE_KEYS:
            u["label"], u["key"] = HERE_KEYS[u["id"]]
        elif u["id"] in FAT:
            u["label"], u["key"], u["note"] = "fat", "", FAT[u["id"]]
        else:
            raise SystemExit(f"unit {u['id']} has no label")
    for i, (sec, text, lab, key) in enumerate(NEW):
        master.append({"id": 10001 + i, "tab": "t-read", "section": sec, "text": text, "label": lab, "key": key, "where": ""})
    (HERE / "ledger.json").write_text(json.dumps(master, indent=1, ensure_ascii=False) + "\n")
    print(len(master), "units")


main()
