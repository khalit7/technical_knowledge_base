"""Turn the raw results in results/ into results/summary.json and ../parts/32_js_bm_data.js.
Every number the Benchmark tab shows comes from summary.json; nothing is typed by hand."""
import json
import re
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
RES = HERE / "results"
PART = HERE.parent / "parts" / "32_js_bm_data.js"

# id: (label, language family, group, short note)
META = {
    "py313_loop": ("CPython 3.13, plain loop", "py", "python", "The Rosetta program as written: a for loop over every character"),
    "py314_loop": ("CPython 3.14, plain loop", "py", "python", "Same file, newer interpreter"),
    "py314t_loop": ("CPython 3.14t (free-threaded), plain loop", "py", "python", "Same file on the no-GIL build, one thread"),
    "py313_re": ("CPython 3.13, regex", "py", "python", "Idiomatic: one compiled regex finds the tokens, so the loop runs in C"),
    "py314_re": ("CPython 3.14, regex", "py", "python", "Idiomatic, newer interpreter"),
    "py314_thr1": ("3.14 with GIL, 1 thread", "py", "threads", "Plain loop in a thread pool of 1 (all lines read first)"),
    "py314_thr4": ("3.14 with GIL, 4 threads", "py", "threads", "4 threads, but the GIL lets one run Python at a time"),
    "py314t_thr1": ("3.14t free-threaded, 1 thread", "py", "threads", "No GIL, one thread"),
    "py314t_thr4": ("3.14t free-threaded, 4 threads", "py", "threads", "No GIL: 4 threads run Python in parallel"),
    "py314t_thr8": ("3.14t free-threaded, 8 threads", "py", "threads", "8 threads on 8 performance cores"),
    "cpp_O2": ("C++, Apple clang++ 14 -O2", "cpp", "native", "Rosetta C++ with its hand-written JSON parser (json_lite.hpp), because the standard library has none"),
    "cpp_O3": ("C++, Apple clang++ 14 -O3", "cpp", "native", "Same source, more aggressive optimisation"),
    "cpp23_O2": ("C++, LLVM clang++ 23 -O2", "cpp", "native", "Same Rosetta source, parser and standard library (the macOS SDK's libc++); only the compiler is newer"),
    "cpp_simdjson": ("C++ with simdjson, Apple clang++ 14 -O2", "cpp", "native", "Benchmark-only variant: the hand-written parser replaced by simdjson 3.13.0, same compiler"),
    "rust": ("Rust, cargo --release", "rs", "native", "Rosetta Rust with serde_json"),
    "node_js": ("TypeScript on Node 22 (tsc to JS)", "ts", "js", "Compiled by tsc, run by V8's JIT"),
    "node_ts": ("TypeScript on Node 22 (types stripped)", "ts", "js", "Node runs the .ts file directly, erasing the types"),
    "bun_ts": ("TypeScript on Bun", "ts", "js", "Bun runs the .ts file (JavaScriptCore engine)"),
    "pyrs_percall": ("Python + Rust (PyO3), one call per message", "mix", "interop", "Python parses JSON; Rust counts each message: 199,992 crossings"),
    "pyrs_batch": ("Python + Rust (PyO3), one call for all messages", "mix", "interop", "Python parses JSON, then one call with a list"),
    "pyrs_file": ("Python + Rust (PyO3), whole file in Rust", "mix", "interop", "One call: Rust reads, parses, counts"),
    "pyrs_file4": ("Python + Rust (PyO3), whole file, 4 Rust threads", "mix", "interop", "The GIL released, 4 OS threads in Rust"),
    "pypb_percall": ("Python + C++ (pybind11), one call per message", "mix", "interop", "199,992 crossings"),
    "pypb_batch": ("Python + C++ (pybind11), one call for all messages", "mix", "interop", "One crossing"),
    "pypb_file": ("Python + C++ (pybind11), whole file in C++", "mix", "interop", "Rosetta's C++ parser inside the extension"),
    "pynb_percall": ("Python + C++ (nanobind), one call per message", "mix", "interop", "199,992 crossings"),
    "pynb_batch": ("Python + C++ (nanobind), one call for all messages", "mix", "interop", "One crossing"),
    "pynb_file": ("Python + C++ (nanobind), whole file in C++", "mix", "interop", "Rosetta's C++ parser inside the extension"),
}


def hf(name):
    d = json.loads((RES / name).read_text())
    out = {}
    for r in d["results"]:
        t = sorted(r["times"])
        out[r["command"]] = {"median": statistics.median(t), "min": t[0], "max": t[-1], "n": len(t),
                             "times": [round(x, 5) for x in r["times"]]}
    return out


def kv(name):
    out = {}
    for line in (RES / name).read_text().splitlines():
        k, _, v = line.partition(" ")
        out[k] = v
    return out


def main():
    full = hf("time_200k.json")
    start = hf("startup.json")
    cold = hf("startup_cold.json")
    mem = {}
    for line in (RES / "memory.tsv").read_text().splitlines():
        i, _, rss, fp = line.split("\t")
        mem.setdefault(i, []).append((int(rss), int(fp)))
    variants = []
    for vid, (label, lang, group, note) in META.items():
        f = full[vid]
        m = mem[vid]
        v = {"id": vid, "label": label, "lang": lang, "group": group, "note": note,
             "t_med": round(f["median"], 4), "t_min": round(f["min"], 4), "t_max": round(f["max"], 4), "runs": f["n"], "ts": [round(x, 4) for x in f["times"]],
             "rss_mb": round(statistics.median(r for r, _ in m) / 2**20, 1),
             "foot_mb": round(statistics.median(p for _, p in m) / 2**20, 1)}
        if vid in start:
            s = start[vid]
            v.update({"s_med": round(s["median"] * 1000, 1), "s_min": round(s["min"] * 1000, 1), "s_max": round(s["max"] * 1000, 1)})
        variants.append(v)
    base = {"python -c pass": start["python3.14 -c pass"], "node -e 0": start["node -e 0"], "bun -e 0": start["bun -e 0"]}
    startup_extra = [{"label": k, "s_med": round(s["median"] * 1000, 1), "s_min": round(s["min"] * 1000, 1),
                      "s_max": round(s["max"] * 1000, 1)} for k, s in base.items()]
    cold_rows = [{"label": k.replace("(no .pyc)", "(no bytecode cache)"), "s_med": round(s["median"] * 1000, 1), "s_min": round(s["min"] * 1000, 1),
                  "s_max": round(s["max"] * 1000, 1)} for k, s in cold.items()]
    compile_rows = []
    for name, lang in (("compile_cpp.json", "cpp"), ("compile_simdjson.json", "cpp"), ("compile_rust.json", "rs"), ("compile_ts.json", "ts"),
                       ("compile_pyo3.json", "mix"), ("compile_cppext.json", "mix")):
        for k, s in hf(name).items():
            if k.startswith("clang++"):
                k = "Apple " + k.replace("clang++", "clang++ 14", 1)
            compile_rows.append({"label": k, "lang": lang, "med": round(s["median"], 2), "min": round(s["min"], 2),
                                 "max": round(s["max"], 2), "n": s["n"]})
    cross = json.loads((RES / "crossing.json").read_text())
    b314 = json.loads((RES / "breakdown_314.json").read_text())
    b313 = json.loads((RES / "breakdown_313.json").read_text())
    probe = (RES / "loop_probe.txt").read_text()
    pr = {"cpp_v0": float(re.search(r"v0 ([\d.]+) ns/byte", probe).group(1)),
          "cpp_v1": float(re.search(r"v1 ([\d.]+) ns/byte", probe).group(1)),
          "rust": float(re.search(r"rust ([\d.]+) ns/byte", probe).group(1)),
          "cpp23_v0": float(re.search(r"c23v0 ([\d.]+) ns/byte", probe).group(1)),
          "cpp23_v1": float(re.search(r"c23v1 ([\d.]+) ns/byte", probe).group(1))}
    asm = probe.split("## C++ inner loop, scalar form")[1].split("\n", 1)[1]
    pr["cpp_scalar_asm"] = [ln.strip().replace("\t", " ") for ln in asm.splitlines() if ln.strip() and not ln.startswith("LBB")]
    # bytes loaded per vectorised iteration: clang loads single bytes into vector lanes; rustc loads
    # 16-byte register pairs (ldp q, q) from the input pointer x8
    pr["cpp_vec_lane_loads"] = probe.split("## C++ inner loop, Apple clang -O2")[1].split("## Rust inner loop")[0].count(chr(9) + "ld1.b")
    rs = probe.split("## Rust inner loop")[1].split("## C++ inner loop, scalar")[0]
    pr["rust_vec_bytes"] = 32 * len(re.findall(r"ldp\tq\d+, q\d+, \[x8", rs))
    cmds = dict(line.split("\t", 1) for line in (RES / "commands.tsv").read_text().splitlines())
    for v in variants:
        v["cmd"] = cmds[v["id"]]
    sizes = {k: int(v) for k, v in kv("sizes.txt").items()}
    loc = json.loads((RES / "loc.json").read_text())
    env = kv("env.txt")
    def r1(x):
        return round(x, 1)
    summary = {
        "env": env,
        "input": {"lines": 200000, "bytes": 38792775, "sha256": (RES / "input_sha256.txt").read_text().strip(),
                  "messages": b314["messages"], "text_chars": b314["text_chars"], "tokens": b314["tokens_total"]},
        "variants": variants,
        "startup_extra": startup_extra,
        "cold": cold_rows,
        "compile": compile_rows,
        "crossing": {"noop_ns": {k: r1(v["median_ns"]) for k, v in cross["noop"].items()},
                     "per_message_ns": {k: r1(v["median_ns"]) for k, v in cross["per_message"].items()},
                     "avg_message_chars": cross["avg_message_chars"], "n_messages": cross["n_messages"], "n_calls": cross["n_calls"]},
        "breakdown": {
            "py314": {k: round(b314[k], 3) for k in ("read_lines_s", "json_loads_s", "tokens_loop_s", "tokens_regex_s", "dict_tally_s")},
            "py313": {k: round(b313[k], 3) for k in ("read_lines_s", "json_loads_s", "tokens_loop_s", "tokens_regex_s", "dict_tally_s")},
            "ns_per_char_loop_314": r1(b314["tokens_loop_s"] / b314["text_chars"] * 1e9),
            "ns_per_char_regex_314": r1(b314["tokens_regex_s"] / b314["text_chars"] * 1e9),
            "trace_sample": b314["trace_sample"], "trace_opcodes_total": b314["trace_opcodes_total"],
            "trace_opcodes_per_char": b314["trace_opcodes_per_char"],
            "trace_short": b314["trace_short"], "trace_short_per_char": b314["trace_short_per_char"]},
        "loop_probe": pr,
        "sizes": sizes,
        "loc": {k: v["total"] for k, v in loc.items()},
        "loc_files": {k: v["files"] for k, v in loc.items()},
        "loc_json_lite": loc["cpp"]["files"]["json_lite.hpp"],
    }
    (RES / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
    PART.write_text("// Generated by src/bench/summarize.py from src/bench/results/: do not edit by hand.\n"
                    "window.BM_DATA=" + json.dumps(summary, separators=(",", ":"), ensure_ascii=False) + ";\n")
    print("wrote", RES / "summary.json", "and", PART)


if __name__ == "__main__":
    main()
