"""Build the Knob lab's data from the raw runs of session.sh (one.sh outputs in $VL_WORK/knob).

Copies compact results into results/ (summaries, the 1-second metric scrapes reduced to the fields drawn,
/metrics HELP lines with before/after values, process list, start-up log lines with paths removed), then
writes out/knob_data.json and ../parts/201_js_vl_knobdata.js (window.VL_KNOB).
usage: python3 -I build_knob.py <raw dir>     (run from src/knob)
"""
import json, os, re, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "results")
RES = os.path.join(HERE, "results")
os.makedirs(RES, exist_ok=True)
TS_FIELDS = ["vllm:num_requests_running", "vllm:num_requests_waiting", "vllm:kv_cache_usage_perc",
             "vllm:num_preemptions_total", "vllm:generation_tokens_total", "vllm:prompt_tokens_total",
             "vllm:prefix_cache_queries_total", "vllm:prefix_cache_hits_total", "vllm:prefix_cache_evicted_blocks_total"]


def load(path):
    return json.load(open(path)) if os.path.exists(path) else None


def parse_metrics(txt):
    """name -> {type, help, value (summed over label sets; histograms: count and sum)}"""
    m = {}
    for line in txt.splitlines():
        if line.startswith("# HELP "):
            _, _, n, h = line.split(" ", 3)
            m.setdefault(n, {})["help"] = h
        elif line.startswith("# TYPE "):
            _, _, n, t = line.split(" ", 3)
            m.setdefault(n, {})["type"] = t
        elif line.startswith("vllm:"):
            nl, _, v = line.rpartition(" ")
            n = nl.split("{")[0]
            try:
                v = float(v)
            except ValueError:
                continue
            if n in m and not n.endswith("_created"):
                m[n]["value"] = m[n].get("value", 0) + v
                continue
            for suf, key in (("_bucket", None), ("_count", "count"), ("_sum", "sum"), ("_created", None)):
                if n.endswith(suf):
                    base = n[: -len(suf)]
                    if key and base in m:
                        m[base][key] = m[base].get(key, 0) + v
                    break
            else:
                if n in m:
                    m[n]["value"] = m[n].get("value", 0) + v
    return {k: v for k, v in m.items() if k.startswith("vllm:") and not k.endswith("_created")}


def strip(s):
    return re.sub(r"/(?:Users|private|tmp)[^\s'\"]*", "<path>", s)


def run_summary(tag):
    meta = load(os.path.join(RAW, tag + ".meta.json"))
    a = load(os.path.join(RAW, tag + "_A.json"))
    if not meta or not a:
        return None
    b = load(os.path.join(RAW, tag + "_B.json"))
    rows = [json.loads(l) for l in open(os.path.join(RAW, tag + ".scrape.jsonl")) if l.strip()]
    rows = [r for r in rows if "err" not in r]
    ts = [[r["t"]] + [r.get(f) for f in TS_FIELDS] for r in rows]
    mb = parse_metrics(open(os.path.join(RAW, tag + ".metrics_before.txt")).read())
    ma = parse_metrics(open(os.path.join(RAW, tag + ".metrics_after.txt")).read())
    def delta(n, k="value"):
        return round(ma.get(n, {}).get(k, 0) - mb.get(n, {}).get(k, 0), 4)
    log = open(os.path.join(RAW, tag + ".server.log")).read()
    kvl = re.search(r"KV cache size: ([\d,]+) tokens, Maximum concurrency for ([\d,]+) tokens per request: ([\d.]+)x", log)
    keep = lambda d: {k: (round(v, 4) if isinstance(v, float) else v) for k, v in d["summary"].items()}
    out = {"tag": tag, "serve_args": meta["serve_args"], "kv_gib": int(meta["kv_gib"]), "loadgen_A": meta["loadgen_A"],
           "loadgen_B": meta["loadgen_B"], "load_before": meta["loadavg_before"], "load_after": meta["loadavg_after"],
           "patched": meta["patched"], "A": keep(a), "B": keep(b) if b else None,
           "prompt_tokens_A": sorted(set(r.get("prompt_tokens") for r in a["requests"]))[:3],
           "gap_max": round(max(x for q in a["requests"] for x in q.get("gaps", [0])), 4),
           "gaps_over_1s": sum(1 for q in a["requests"] for x in q.get("gaps", []) if x > 1.0),
           "n_gaps": sum(len(q.get("gaps", [])) for q in a["requests"]),
           "prompt_tokens_B": sorted(set(r.get("prompt_tokens") for r in b["requests"]))[:3] if b else None,
           "deltas": {n: delta(n) for n in ["vllm:num_preemptions_total", "vllm:prompt_tokens_total", "vllm:generation_tokens_total",
                                            "vllm:prefix_cache_queries_total", "vllm:prefix_cache_hits_total", "vllm:prefix_cache_evicted_blocks_total",
                                            "vllm:prompt_tokens_cached_total"]},
           "peaks": {f.split(":")[1]: max((r.get(f) or 0) for r in rows) if rows else None for f in TS_FIELDS[:3]},
           "kv_tokens": int(kvl.group(1).replace(",", "")) if kvl else None,
           "max_conc": float(kvl.group(3)) if kvl else None, "ts": ts}
    return out, mb, ma, log


data = {"runs": {}, "ts_fields": [f.split(":")[1] for f in TS_FIELDS]}
for f in sorted(glob.glob(os.path.join(RAW, "*.meta.json"))):
    tag = os.path.basename(f)[:-10]
    r = run_summary(tag)
    if not r:
        continue
    s, mb, ma, log = r
    data["runs"][tag] = s
    json.dump(s, open(os.path.join(RES, tag + ".json"), "w"), separators=(",", ":"))
    if tag in ("k0_default", "evict_patched"):
        data["metrics_" + tag] = {n: {"type": v.get("type"), "help": v.get("help"),
                                      "before": {k: mb.get(n, {}).get(k) for k in ("value", "count", "sum")},
                                      "after": {k: v.get(k) for k in ("value", "count", "sum")}} for n, v in ma.items()}
        ps = open(os.path.join(RAW, tag + ".ps.txt")).read().splitlines()[1:]
        procs = [re.sub(r"\s+", " ", strip(l.strip())) for l in ps if "ps -eo" not in l]
        data["ps_" + tag] = procs
        lines = [strip(l.strip()) for l in log.splitlines() if re.search(r"KV cache size|init engine|Explicitly set|Initializing a V1 LLM engine|Model Runner|Using .* KV cache layout", l)]
        data["log_" + tag] = [l[:400] for l in lines]
        open(os.path.join(RES, tag + ".ps.txt"), "w").write("\n".join(procs) + "\n")
        open(os.path.join(RES, tag + ".log_lines.txt"), "w").write("\n".join(data["log_" + tag]) + "\n")
for t, s_ in data["runs"].items():  # the time-series chart only offers these runs
    if t not in ("seqs16_r1", "kv1_r1", "seqs2_r1", "chunk128_r1"):
        s_["ts"] = []
diff = open(os.path.join(HERE, "..", "patch", "eviction_metric.diff")).read()
data["diff"] = diff
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
json.dump(data, open(os.path.join(HERE, "out", "knob_data.json"), "w"), separators=(",", ":"))
with open(os.path.join(HERE, "..", "parts", "201_js_vl_knobdata.js"), "w") as f:
    f.write("// generated by src/knob/build_knob.py from the Knob lab runs (vLLM v0.31.0 CPU image, measured 2026-10-08)\n")
    f.write("window.VL_KNOB=" + json.dumps(data, separators=(",", ":")) + ";\n")
for t, s in data["runs"].items():
    print(t, s["A"]["out_tok_per_s"], s["A"]["ttft_p50"], s["A"]["tpot_p50"], s["deltas"]["vllm:num_preemptions_total"], s["peaks"], s["kv_tokens"])
