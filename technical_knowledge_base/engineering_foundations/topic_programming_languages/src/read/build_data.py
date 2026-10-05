"""Build parts/22_js_rd_data.js from the real code and the real outputs in read/code/ (run code/run_all.sh first).
Nothing shown on the page is typed by hand: every snippet and every output is read from these files.
Edits made for display, all mechanical and said on the page: absolute paths shortened to the file name,
sanitizer stack frames inside the standard library collapsed into one "[... N frames omitted]" line.
Run: python3 read/build_data.py (from src/)."""
import json, re, pathlib

HERE = pathlib.Path(__file__).parent
CODE = HERE / "code"
SRC = HERE.parent
OUT = SRC / "parts" / "22_js_rd_data.js"


def rd(p):
    return (CODE / p).read_text()


def clean(t, folder):
    t = t.replace(str(CODE / folder) + "/", "")
    t = re.sub(r"/Users/[^\s\"']*/src/read/code/[a-z_]+/", "", t)
    t = re.sub(r"\n?exit (\d+)\s*$", r"\n[exit status \1]", t.rstrip())
    return t.rstrip() + "\n"


def trim_san(t, keep_frames=("in main ", "main::", "main counter", " main dangle", " main oob")):
    """Collapse sanitizer frames that are not in our own code into one line per run."""
    out, skipped = [], 0
    for line in t.splitlines():
        if re.match(r"\s+#\d+ ", line):
            if re.match(r"\s+#\d+ (0x[0-9a-f]+ in )?main[ :]", line):
                if skipped:
                    out.append(f"    [... {skipped} frame{'s' if skipped > 1 else ''} in library code omitted]")
                    skipped = 0
                line = re.sub(r" \(counter_tsan:arm64\+0x[0-9a-f]+\)", "", line)
                out.append(line)
            else:
                skipped += 1
            continue
        if skipped:
            out.append(f"    [... {skipped} frame{'s' if skipped > 1 else ''} in library code omitted]")
            skipped = 0
        out.append(line)
    return "\n".join(out)


def asan_short(t):
    """Keep the report up to SUMMARY (the shadow-byte map after it is omitted)."""
    t = t.split("Shadow bytes around")[0].rstrip()
    return trim_san(t) + "\n[shadow-memory map omitted]\n" + (re.search(r"\[exit status \d+\]|exit \d+", t) and "" or "")


def tsan_short(t):
    head = t.split("  Thread T2 (tid")[0].rstrip()
    tail = [l for l in t.splitlines() if l.startswith("expected") or l.startswith("ThreadSanitizer:")]
    return trim_san(head) + "\n  [thread-creation stacks omitted]\n==================\n" + "\n".join(tail) + "\n"


def asm_body(t):
    """Function body only, assembler directives dropped."""
    keep = [l for l in t.splitlines() if l.strip() and not re.match(r"\s*\.(loh|cfi|build_version|section|p2align|subsections|file|globl|ident)", l)
            and not l.startswith("\t.") and not l.startswith("Lfunc_end") and not l.startswith("; -- End")]
    return "\n".join(keep) + "\n"


def v8_excerpt(t):
    L = t.splitlines()
    a = next(i for i, l in enumerate(L) if "ldrb w4, [x4, x0]" in l) - 1
    b = next(i for i, l in enumerate(L) if "#0x39 (57)" in l) + 4
    return "\n".join(re.sub(r"^0x[0-9a-f]+\s+", "", l)[:90] for l in L[a:b]) + "\n"


def quad(folder, items):
    """items: lang -> (source file, [(command shown, output file, cleaner)])"""
    res = {}
    for lang, (src, runs) in items.items():
        res[lang] = {"src": src, "code": rd(f"{folder}/{src}"), "runs": []}
        for cmd, outf, *f in runs:
            o = clean(rd(f"{folder}/out/{outf}"), folder)
            if f:
                o = f[0](o)
            res[lang]["runs"].append({"cmd": cmd, "out": o})
    return res


def strip_uvx(t):
    return "\n".join(l for l in t.splitlines() if not re.match(r"\s*(Downloading|Downloaded|Installed|WARN ty is pre-release)", l)) + "\n"


D = {}
# ---- How code runs: the token loop through four pipelines
dis = rd("howrun/out/py_dis.txt")
before, after = dis.split("=== after")
D["howrun"] = {
    "py_src": rd("howrun/tokens.py"),
    "py_before": before.split("=== before running ===\n")[1],
    "py_after": after.split("\n", 1)[1],
    "py_version": dis.splitlines()[0],
    "cpp_src": rd("howrun/tokens.cpp"),
    "cpp_asm": asm_body(rd("howrun/out/cpp_O2.s")),
    "rs_src": rd("howrun/tokens.rs"),
    "rs_asm": asm_body(rd("howrun/out/rust_O3.s")),
    "ts_src": rd("howrun/tokens.ts"),
    "ts_js": rd("howrun/out/tokens.js"),
    "ts_node": rd("howrun/out/node_strip_run.txt"),
    "v8_bytecode": rd("howrun/out/v8_bytecode.txt"),
    "v8_trace": rd("howrun/out/v8_trace_opt.txt"),
    "v8_opt": v8_excerpt(rd("howrun/out/v8_optcode.txt")),
    "v8_opt_size": re.search(r"Instructions \(size = (\d+)\)", rd("howrun/out/v8_optcode.txt")).group(1),
    "versions": rd("howrun/out/versions.txt"),
}
PY, CPP, RS, TSN = "python3.14", "clang++ -std=c++20", "rustc --edition 2024", "node"
TSC = "tsc --noEmit --strict"
D["types"] = quad("types", {
    "py": ("wrong.py", [(f"{PY} wrong.py", "py_run.txt"), ("mypy --strict wrong.py   (mypy 2.4.0)", "py_mypy.txt", strip_uvx), ("ty check wrong.py   (ty 0.0.84)", "py_ty.txt", strip_uvx)]),
    "cpp": ("wrong.cpp", [(f"{CPP} wrong.cpp", "cpp_compile.txt")]),
    "rs": ("wrong.rs", [(f"{RS} wrong.rs", "rust_compile.txt")]),
    "ts": ("wrong.ts", [(f"{TSC} wrong.ts", "ts_tsc.txt"), (f"{TSN} wrong.ts   (Node strips the types and runs it anyway)", "ts_node_run.txt")]),
})
D["values"] = quad("values", {
    "py": ("alias.py", [(f"{PY} alias.py", "py.txt")]),
    "cpp": ("alias.cpp", [(f"{CPP} alias.cpp && ./a.out", "cpp.txt")]),
    "rs": ("alias.rs", [(f"{RS} alias.rs", "rust.txt")]),
    "ts": ("alias.ts", [(f"{TSN} alias.ts", "ts.txt")]),
})
D["missing"] = quad("errors", {
    "py": ("missing.py", [(f"{PY} missing.py", "py_missing.txt")]),
    "cpp": ("missing.cpp", [(f"{CPP} missing.cpp && ./a.out", "cpp_missing.txt")]),
    "rs": ("missing.rs", [(f"{RS} missing.rs", "rust_missing.txt")]),
    "ts": ("missing.ts", [(f"{TSC} missing.ts", "ts_missing_tsc.txt"), (f"{TSN} missing.ts", "ts_missing_run.txt")]),
})
D["parse"] = quad("errors", {
    "py": ("parse_line.py", [(f"{PY} parse_line.py", "py_parse.txt")]),
    "cpp": ("parse_line.cpp", [("clang++ -std=c++23 parse_line.cpp && ./a.out", "cpp_parse.txt")]),
    "rs": ("parse_line.rs", [("cargo run   (serde 1, serde_json 1)", "rust_parse.txt")]),
})
D["nums"] = quad("numtext", {
    "py": ("nums.py", [(f"{PY} nums.py", "py.txt")]),
    "cpp": ("nums.cpp", [(f"{CPP} -O2 nums.cpp && ./a.out", "cpp_O2.txt"), ("clang++ -fsanitize=undefined nums.cpp && ./a.out   (LLVM 23)", "cpp_ubsan.txt")]),
    "rs": ("nums.rs", [(f"{RS} nums.rs && ./nums   (debug build)", "rust_debug.txt"), (f"{RS} -O nums.rs && ./nums   (release build)", "rust_release.txt"), (f"{RS} index.rs   (index.rs: let c = \"café\"[3];)", "rust_index.txt")]),
    "ts": ("nums.ts", [(f"{TSN} nums.ts", "ts.txt")]),
})
D["oob"] = quad("safety", {
    "py": ("oob.py", [(f"{PY} oob.py", "py.txt")]),
    "cpp": ("oob.cpp", [(f"{CPP} oob.cpp && ./a.out   (stderr is printed before buffered stdout)", "cpp.txt"), ("clang++ -fsanitize=address oob.cpp && ./a.out   (LLVM 23)", "cpp_asan.txt", asan_short)]),
    "rs": ("oob.rs", [(f"{RS} oob.rs && ./oob", "rust.txt")]),
    "ts": ("oob.ts", [(f"{TSN} oob.ts", "ts.txt"), (f"{TSC} --noUncheckedIndexedAccess oob.ts", "ts_tsc_unchecked.txt")]),
})
D["shape"] = quad("abstraction", {
    "py": ("shape.py", [(f"{PY} shape.py", "py.txt")]),
    "cpp": ("shape.cpp", [(f"{CPP} shape.cpp", "cpp.txt")]),
    "rs": ("shape.rs", [(f"{RS} shape.rs", "rust.txt")]),
    "ts": ("shape.ts", [(f"{TSN} shape.ts", "ts.txt")]),
})
# ---- Memory layout and the scan
D["mem"] = {k: rd(f"memory/out/{k}.txt") for k in ["py_layout", "cpp_layout", "rust_layout", "cpp_scan", "py_scan", "cacheline"]}
D["mem"]["py_src"] = rd("memory/layout.py")
D["mem"]["cpp_src"] = rd("memory/layout.cpp")
D["mem"]["rs_src"] = rd("memory/layout.rs")
# ---- Ownership: the same dangling reference
D["own"] = {
    "cpp_src": rd("ownership/dangle.cpp"), "rs_src": rd("ownership/dangle.rs"), "py_src": rd("ownership/dangle.py"),
    "cpp_plain": clean(rd("ownership/out/cpp_plain.txt"), "ownership"),
    "cpp_asan": asan_short(clean(rd("ownership/out/cpp_asan.txt"), "ownership")),
    "rs_err": clean(rd("ownership/out/rust_compile.txt"), "ownership"),
    "py_out": clean(rd("ownership/out/py.txt"), "ownership"),
}
# ---- Concurrency: the shared counter
cc = "concurrency/out/"
D["conc"] = {
    "py_src": rd("concurrency/counter.py"), "py_lock_src": rd("concurrency/counter_lock.py"),
    "js_async_src": rd("concurrency/counter_async.mjs"), "js_workers_src": rd("concurrency/counter_workers.mjs"),
    "cpp_src": rd("concurrency/counter.cpp"), "cpp_atomic_src": rd("concurrency/counter_atomic.cpp"),
    "rs_bad_src": rd("concurrency/counter_bad.rs"), "rs_ok_src": rd("concurrency/counter_ok.rs"),
    "py": rd(cc + "py.txt"), "py_lock": rd(cc + "py_lock.txt"), "js_async": rd(cc + "js_async.txt"),
    "js_workers": rd(cc + "js_workers.txt"), "cpp_O0": rd(cc + "cpp_O0.txt"), "cpp_O2": rd(cc + "cpp_O2.txt"),
    "cpp_atomic": rd(cc + "cpp_atomic.txt"), "cpp_tsan": tsan_short(clean(rd(cc + "cpp_tsan.txt"), "concurrency")),
    "rs_bad": clean(rd(cc + "rust_bad.txt"), "concurrency"), "rs_ok": rd(cc + "rust_ok.txt"),
}
# ---- llama.cpp excerpts (pinned commit)
D["llama"] = {p.stem: p.read_text() for p in sorted((CODE / "llama/out").glob("*.txt"))}
# ---- Language composition of ML-stack repositories
D["repos"] = json.loads(rd("repo_langs/repo_langs.json"))
# ---- Benchmark tab numbers this tab quotes (read from the Benchmark agent's results, so the two tabs agree)
try:
    B = json.loads((SRC / "bench/results/summary.json").read_text())
    D["bench"] = {"date": B["env"]["date"], "input": B["input"],
                  "v": {v["id"]: {"t": v["t_med"], "label": v["label"], "rss": v.get("rss_mb")} for v in B["variants"]}}
except Exception as e:
    D["bench"] = {"error": str(e)}
# ---- Toolchain versions
D["versions"] = rd("versions.txt")

js = "// Generated by src/read/build_data.py from read/code/ (real code, real outputs). Do not edit by hand.\nwindow.RDD=" + json.dumps(D, ensure_ascii=False, separators=(",", ":")) + ";\n"
js = js.replace("</", "<\\/").replace("{{", "{\\u007b")
OUT.write_text(js)
print(OUT, len(js), "bytes")
