"""Turn the master ledger (drafted from the three-part C++ page before the 2026-10-26 split) into this page's ledger:
merge each child's src/from_master.json, then label the units the children left (kept here, or fat).
Units kept here are "core" when their key is in the page's open text and "depth" when it is only inside a closed
<details> block (decided from the built index.html, so rebuild first).
Run from the repo root after `sh src/build.sh`: python3 <page>/src/merge_ledger.py. Idempotent: it rewrites labels from the same inputs."""
import html, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
KIDS = ["ownership_moves_and_lifetimes", "classes_templates_and_the_standard_library", "the_machine_underneath", "reading_llama_cpp"]

# units no child claimed and this page keeps, with the key that appears in its static text
HERE_KEYS = {
    2: "Data as of October 2026",
    6: "llama.cpp pinned at commit 8e16421",
    20: "Kernels and CUDA C++ are in",
    21: "a double free crashed at", 23: "52 to 56 times slower", 24: "21 to 22 times slower",
    25: "run zero times", 26: "Metal generated tokens more slowly than 4 CPU threads",
    27: "the same program in Python, C++, Rust and TypeScript", 28: "the KV cache, batching and serving in",
    29: "The sibling language pages are", 30: "every claim from them was checked",
    32: "PyTorch's core, llama.cpp, ONNX Runtime", 34: "src/ca/run_all.sh",
    35: "the machine's own representation of data", 36: "Python decides both for you",
    37: "Values sit inline in memory, with no per-object header", 44: "LLVM clang 23.1.2 for the gallery and sanitizers",
    45: "finds tokens.py at run time", 46: "C++ has no run-time import",
    47: "most confusing C++ errors come from not knowing which stage complained",
    48: "pastes the whole file in, literally", 49: "called a translation unit",
    50: "machine code plus a table of the names", 51: "matching every needed symbol to exactly one definition",
    52: "declares the function (its name and types: a promise)", 53: "7-line main.cpp", 54: "55693",
    55: "recompiles that header from text", 56: "is used here and defined elsewhere",
    57: "on the header's promise alone", 58: "Undefined symbols for architecture arm64",
    59: "may be defined once in the whole program", 60: "gives each object file its own copy",
    61: "implicitly inline", 62: "never a run-time", 64: "de facto standard build description",
    65: "project(hello LANGUAGES CXX)", 66: "ones do not", 67: "the single most useful idea in CMake",
    68: "an archive of object files", 69: "editing a header recompiles everything that includes it",
    70: "each file compiles once, in parallel", 71: "you maintain declarations and definitions separately",
    72: "global flags instead of per-target properties", 73: "Function body in a header",
    226: "reading an uninitialised variable", 227: "no meaning at all", 228: "assume UB never happens",
    229: "work today and break after a compiler upgrade", 230: "either impossible or an exception",
    231: "will_overflow(INT_MAX)", 232: "compiled the function to", 233: "Neither build reported anything",
    234: "UndefinedBehaviorSanitizer (UBSan) catches this one", 235: "they wrap around by definition",
    236: 'The uninitialised case printed "not seen"', 237: "the compiler warned only with",
    238: "Reference into a reallocated vector", 239: "-Wall -Wextra always", 240: "They caught the uninitialised read, the dangling",
    241: "UBSan (overflow, bad shifts, missing return)", 242: "5 to 15 times for TSan", 243: "Apple's own ASan did not start",
    244: "_LIBCPP_HARDENING_MODE_FAST", 245: "erroneous behaviour", 246: "Prefer what cannot be misused",
    247: "sanitizers find only what your tests execute", 248: "Rust moves most of this list into compile errors",
    249: "Python has pip install and wheels", 250: "no official package manager", 251: "silent memory corruption",
    252: "copy the source in", 253: "nlohmann/json, Catch2, Eigen", 254: "costs compile time in every file that includes it",
    255: "like libtokens.a in section 1", 256: "every program carries its own copy", 257: "loaded when the program starts",
    258: "Smaller binaries and shared updates", 259: "libSystem.B.dylib", 260: "pybind11 and nanobind",
    261: "three-year train", 262: "a subset you choose to write", 263: "a feature needs both",
    264: "differs between compilers and even versions of one compiler", 265: "199711L",
    266: "target_compile_features(t PUBLIC cxx_std_20)", 267: "feature-test macros", 268: "__cpp_lib_ranges",
    269: "GCC 16 implements reflection", 270: "compiler support tables are the place to check",
    271: "attacking the 55,000-line problem", 272: "is still experimental and must be enabled by -fmodules",
    273: "Headers remain the pragmatic default in 2026", 274: "the technical work finished on 2026-03-28",
    275: "Apple clang 17 here to C++14", 276: "14.51 in Visual Studio 2026 18.10.3", 277: "the two that change day-to-day safety",
    278: "Each of these compiles", 280: "Views do not own", 281: "dangles at the semicolon",
    282: "extended the lifetime of every temporary in the range-for initializer", 283: "Growth reallocates and frees the old buffer",
    284: "Use indices, or", 285: "Slicing a derived object into a base by value", 286: "Pass polymorphic objects by reference or pointer",
    287: "non-virtual destructor in a base used through pointers", 288: "initialised in an unspecified order",
    289: "function-local", 290: "18,446,744,073,709,551,615", 291: "An empty vector makes even the first value huge",
    292: "converts the signed side to unsigned", 293: "sometimes a wrong value", 294: "instead of 2000000",
    295: "Cycles leak", 296: "Valid but unspecified", 297: "Assign to it or let it die", 298: "no naked",
    299: "if you must write one, write all five", 300: "concrete types at API boundaries", 301: "clang-format and clang-tidy",
    311: "About 40 h for the sequence", 312: "the short, authoritative overview", 313: "about 7.5 h",
    314: "it stops at C++14", 315: "its compiler support tables answer", 316: "About 1 h to learn to navigate",
    317: "the hygiene canon", 318: "About 3 h for a full read", 319: "the best learning tool in the language",
    320: "Sean Parent's Better Code series", 321: "About 1 h per talk", 322: "what ASan, UBSan and TSan catch",
    323: "Agner Fog's manuals", 324: "Book about 9.5 h", 325: "the language that made these lifetime rules compile-time checks",
    327: "CMake 4.4.4 with Ninja",
    328: "bars are to scale by line count", 329: "the real line counts, sizes, symbol tables and messages",
    330: "Forgot tokens.o", 331: "is defined here", 332: "linked dynamically", 333: 'two is "duplicate symbol"',
    334: "names decoded by", 345: "ten bugs that compile", 346: "the tool that catches it", 347: "Every output is the real one",
    348: "how often a buggy program prints something plausible", 349: "each run had a 5-second time limit",
    386: "what does will_overflow(INT_MAX) return", 387: "will_overflow(INT_MAX) = 0", 388: "the test said 1",
    390: "GNU ld says", 391: "gives each object file its own copy", 392: "or only a declaration in the header",
    406: "widening it to 64 bits",
}
FAT = {1: "old title and subtitle", 3: "the old part bar and tab names", 4: "Start here intro, replaced by the core idea",
       5: "part-bar instruction", 7: "Part 1 card time", 8: "Part 1 tab list", 9: "Part 1 contents list, now the child cards",
       10: "pointer to the Build pipeline tab, now inline", 11: "Part 2 card time", 12: "Part 2 tab list",
       13: "Part 2 contents list, now the machine child's card", 14: "pointer to the removed Roofline tab", 15: "Part 3 card time",
       16: "Part 3 tab list", 17: "Part 3 contents list, now the llama.cpp child's card", 18: "pointer to the Code tour tab",
       19: "routes through the old parts (plan: fat)", 31: "Part 1 section nav", 33: "Part 1 intro", 38: "section pointer",
       39: "how to use Part 1's tabs", 40: "how to use the Predict boxes", 41: "Part 1 reading time", 42: "pointer to the root (kept as the Elsewhere line)",
       43: "pointers to Parts 2 and 3", 63: "CMake wind-up", 279: "pointer to the gallery tab",
       302: "learning path intro (plan: s16 is fat)", 303: "learning path, gates (plan: fat; no quizzes)", 304: "pointer to the gates",
       305: "learning path table header", 306: "learning path stage 0 (plan: fat)", 307: "learning path stage 1 (plan: fat)",
       308: "learning path stage 2 (plan: fat)", 309: "learning path stage 3 (plan: fat)", 310: "learning path stage 4 (plan: fat)",
       326: "Part 1 footer label", 350: "how to scroll a sanitizer report (the reports are now closed blocks)",
       351: "drill tab title", 352: "drill instructions", 353: "drill score line", 389: "gates intro (plan: fat)", 393: "pointer to the Build pipeline tab"}
# new units written for this page (the hero, the map, the widgets moved inline, the anchors)
NEW = [
    ("the idea in one screen", "Hero: std::vector<float> v{1, 2, 3} is a 24-byte owner on the stack (pointer, size, capacity) and a 12-byte heap buffer freed by its destructor at the closing brace; the Python list is 88 bytes with a reference count and three 24-byte float objects.", "core", "12 bytes in C++ and 88 + 3"),
    ("the idea in one screen", "The hero's real runs: a replaced operator new and delete print the 12-byte allocation and its free at the brace; sys.getsizeof on CPython 3.14.8.", "depth", "operator new: 12 bytes on the heap"),
    ("the idea in one screen", "New terms: translation unit, object file and symbol, linker, ODR, UB, sanitizer, ABI.", "core", "the binary contract (layouts, calling convention, names)"),
    ("six ideas, and where each is taught", "Each of the six ideas points at the section here or the child page that teaches it; the six findings point at the child section that measures each.", "core", "Where it is shown"),
    ("1. how a c++ program is built", "The Build pipeline stepper is inline in section 1 (four scenarios), never plays by itself, and shows the real command and output for each step in a closed block.", "core", "The real commands and output for this step"),
    ("2. undefined behaviour", "The UB gallery is inline in section 2 with ten cases; each case button has an anchor (es-ub-double-free, es-ub-string-view, es-ub-lambda, es-ub-dangling-vec and others) so other pages can link one case.", "core", "Dangling lambda capture"),
    ("5. mistakes", "Each mistake points at the gallery case or the child section that shows it; the rule of zero means members that clean up after themselves and no special member at all.", "core", "hold members that clean up after themselves"),
    ("6. the child pages", "Child cards with each child's core idea and measured reading time.", "core", "Reading: 33 min, plus 36 in closed details"),
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
            n = re.sub(r"\s+", " ", key).strip().lower()
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
