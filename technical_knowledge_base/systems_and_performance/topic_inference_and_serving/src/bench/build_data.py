"""Build the Engine bench tab's data from the raw benchmark results.

usage: python3 -I build_data.py <raw results dir>
Writes:
  results/        compact copies of every run (paths replaced by <models>/..., per-request records kept,
                  per-token gaps dropped except for the streaming examples)
  data.json       everything the page shows, in one file
  ../parts/32_js_bch_0data.js   the same data as window.BCH_DATA
Every number on the tab comes from data.json; check_data.py confirms the page embeds it unchanged.
"""
import glob, json, os, re, statistics as st, sys

RAW = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "results")
os.makedirs(OUT, exist_ok=True)

PATH_RE = re.compile(r"/[^\s'\"]*/scratchpad/inf/models/")
ANY_PRIVATE = re.compile(r"/(private/tmp|Users)/[^\s'\"]*")


def clean(s):
    if not isinstance(s, str):
        return s
    s = PATH_RE.sub("<models>/", s)
    s = re.sub(r"/[^\s'\"]*/mlxenv/bin/python", "python", s)
    s = ANY_PRIVATE.sub("<scratch>", s)
    return s


def deep_clean(o):
    if isinstance(o, dict):
        return {k: deep_clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [deep_clean(v) for v in o]
    return clean(o)


def r3(x, n=3):
    return None if x is None else round(x, n)


def load_short(l):
    if not l:
        return None
    return {"t": l["t"], "load1": l["loadavg"][0], "idle": l.get("cpu_idle_pct")}


sys.path.insert(0, HERE)
from recompute import facts  # noqa: E402

data = {"meta": {}, "runs": []}
run_id = [0]


def add_run(kind, engine, what, cmd, lb=None, la=None, extra=None):
    run_id[0] += 1
    r = {"id": run_id[0], "kind": kind, "engine": engine, "what": what, "cmd": clean(cmd),
         "t": (lb or {}).get("t"), "load_before": (lb or {}).get("loadavg", [None])[0],
         "load_after": (la or {}).get("loadavg", [None])[0]}
    if extra:
        r.update(extra)
    data["runs"].append(r)
    return r["id"]


# ---------- llama-bench ----------
QNAME = {"F16": "F16", "BF16": "BF16", "Q8_0": "Q8_0", "Q4_K - Medium": "Q4_K_M"}
data["lb"] = []
for f in sorted(glob.glob(os.path.join(RAW, "lb_*.json"))):
    d = json.load(open(f))
    rid = add_run("llama-bench", "llama.cpp", d["name"], d["cmd"], d["load_before"], d["load_after"])
    for r in d["results"]:
        mt = r["model_type"]  # e.g. "qwen3 0.6B Q4_K - Medium"
        m = re.match(r"qwen3 (\S+) (.*)", mt)
        data["lb"].append({"run": rid, "set": d["name"], "model": "Qwen3-" + m.group(1), "quant": QNAME.get(m.group(2), m.group(2)),
                           "bytes": r["model_size"], "params": r["model_n_params"], "pp": r["n_prompt"], "tg": r["n_gen"],
                           "depth": r.get("n_depth", 0), "fa": r.get("flash_attn"), "ts": r3(r["avg_ts"], 1), "sd": r3(r["stddev_ts"], 1),
                           "samples": [round(x, 1) for x in r["samples_ts"]]})
    json.dump(deep_clean(d), open(os.path.join(OUT, os.path.basename(f)), "w"))

# ---------- llama-batched-bench ----------
data["bb"] = []
for f in sorted(glob.glob(os.path.join(RAW, "bb_*.json"))):
    d = json.load(open(f))
    rid = add_run("llama-batched-bench", "llama.cpp", d["name"], d["cmd"] + " (3 repetitions)", d["load_before"], d["load_after"])
    keys = sorted({(r["pp"], r["tg"], r["pl"]) for r in d["rows"]})
    for k in keys:
        xs = [r for r in d["rows"] if (r["pp"], r["tg"], r["pl"]) == k]
        data["bb"].append({"run": rid, "set": d["name"], "pp": k[0], "tg": k[1], "pl": k[2],
                           "s_tg": [round(x["speed_tg"], 1) for x in xs], "s_pp": [round(x["speed_pp"], 1) for x in xs],
                           "t_tg": [round(x["t_tg"], 4) for x in xs]})
    json.dump(deep_clean(d), open(os.path.join(OUT, os.path.basename(f)), "w"))

# ---------- mlx_lm benchmark ----------
data["mlx"] = []
for f in sorted(glob.glob(os.path.join(RAW, "mlx_*.json"))):
    d = json.load(open(f))
    m = re.match(r"mlx_([\d.]+b)_(\w+?)_(?:b(\d+)_)?p(\d+)g(\d+)", d["name"])
    rid = add_run("mlx_lm benchmark", "MLX", d["name"], d["cmd"], d["load_before"], d["load_after"])
    data["mlx"].append({"run": rid, "model": "Qwen3-" + m.group(1).upper(), "quant": m.group(2), "b": int(m.group(3) or 1),
                        "p": int(m.group(4)), "g": int(m.group(5)),
                        "prompt_tps": [round(t["prompt_tps"], 1) for t in d["trials"]],
                        "gen_tps": [round(t["generation_tps"], 1) for t in d["trials"]],
                        "peak_gb": [round(t["peak_memory"], 3) for t in d["trials"]]})
    json.dump(deep_clean(d), open(os.path.join(OUT, os.path.basename(f)), "w"))

# ---------- KV cache memory ----------
kv = json.load(open(os.path.join(RAW, "kv_mem.json")))
rid = add_run("llama-server load", "llama.cpp", "KV cache size vs context and KV type", kv["cmd"])
data["kv"] = [dict(r, run=rid) for r in kv["rows"]]
json.dump(deep_clean(kv), open(os.path.join(OUT, "kv_mem.json"), "w"))

# ---------- perplexity and KL divergence ----------
data["ppl"] = []
for f in sorted(glob.glob(os.path.join(RAW, "ppl_*.log"))):
    s = open(f).read()
    m = re.search(r"Final estimate: PPL = ([\d.]+) \+/- ([\d.]+)", s)
    name = os.path.basename(f)[4:-4]
    chunks = re.search(r"calculating perplexity over (\d+) chunks, n_ctx=(\d+)", s)
    rid = add_run("llama-perplexity", "llama.cpp", "perplexity " + name,
                  f"llama-perplexity -m <models>/gguf/{name}.gguf -f wiki.test.raw -c 512 --chunks 60 -ngl 99 -fa on")
    data["ppl"].append({"run": rid, "model": name, "ppl": float(m.group(1)), "pm": float(m.group(2)),
                        "chunks": int(chunks.group(1)) if chunks else None, "ctx": int(chunks.group(2)) if chunks else None})
data["kld"] = []
for q in ("Q8_0", "Q4_K_M"):
    s = open(os.path.join(RAW, f"kld_0.6b_{q}.log")).read()
    g = lambda pat: float(re.search(pat, s).group(1))
    rid = add_run("llama-perplexity", "llama.cpp", "KL divergence vs F16, Qwen3-0.6B " + q,
                  f"llama-perplexity -m <models>/gguf/Qwen3-0.6B-{q}.gguf -c 512 --chunks 20 -ngl 99 -fa on --kl-divergence-base f16_logits.bin --kl-divergence  (base logits saved from Qwen3-0.6B-F16 on wiki.test.raw with the same settings)")
    data["kld"].append({"run": rid, "quant": q, "ppl_q": g(r"Mean PPL\(Q\)\s+:\s+([\d.]+)"), "ppl_base": g(r"Mean PPL\(base\)\s+:\s+([\d.]+)"),
                        "ratio": g(r"Mean PPL\(Q\)/PPL\(base\)\s+:\s+([\d.]+)"), "kld_mean": g(r"Mean\s+KLD:\s+([\d.]+)"),
                        "kld_median": g(r"Median\s+KLD:\s+([\d.]+)"), "kld_p99": g(r"99\.0%\s+KLD:\s+([\d.]+)"),
                        "same_top": g(r"Same top p:\s+([\d.]+)")})

# ---------- speculative decoding ----------
data["spec"] = []
for f in sorted(glob.glob(os.path.join(RAW, "spec_*.json"))):
    d = json.load(open(f))
    rid = add_run("llama-server /completion", "llama.cpp", "speculative decoding " + d["label"], d["server_args"],
                  d.get("load_before"), d.get("load_after"))
    for p in sorted({r["prompt"] for r in d["runs"]}):
        xs = [r for r in d["runs"] if r["prompt"] == p]
        data["spec"].append({"run": rid, "cfg": d["label"], "prompt": p, "tok_s": [round(x["tok_s"], 2) for x in xs],
                             "n_out": xs[0]["n_out"], "draft_n": [x["draft_n"] for x in xs], "acc": [x["draft_accepted"] for x in xs]})
    json.dump(deep_clean(d), open(os.path.join(OUT, os.path.basename(f)), "w"))

# ---------- MLX speculative decoding ----------
data["mlxspec"] = []
try:
    d = json.load(open(os.path.join(RAW, "mlxspec_raw.json")))
    ld = [json.loads(l) for l in open(os.path.join(RAW, "mlxspec_load.txt"))]
    rid = add_run("mlx_lm stream_generate", "MLX", "speculative decoding, Qwen3-1.7B-4bit target, Qwen3-0.6B-4bit draft, k = 0, 2, 3, 4, 6",
                  "python mlx_spec.py: stream_generate(target, tokenizer, chat prompt (enable_thinking=False), max_tokens=256, draft_model=draft, num_draft_tokens=k), greedy, 3 repetitions",
                  ld[0], ld[1])
    base = {r["prompt"]: r["text"] for r in d["runs"] if r["k"] == 0 and r["rep"] == 0}
    for k in sorted({r["k"] for r in d["runs"]}):
        for p in ("code_edit", "summarize", "story", "list"):
            xs = [r for r in d["runs"] if r["k"] == k and r["prompt"] == p]
            data["mlxspec"].append({"run": rid, "k": k, "prompt": p, "tok_s": [round(x["gen_tps"], 2) for x in xs], "n_out": [x["n_out"] for x in xs],
                                    "from_draft": [x["from_draft"] for x in xs], "same_text": [x["text"] == base[p] for x in xs]})
    for r in d["runs"]:
        r["text_head"] = r.pop("text")[:80]
    json.dump(deep_clean(d), open(os.path.join(OUT, "mlxspec.json"), "w"))
except OSError:
    pass

# ---------- servers under load ----------
ENG = {"lsv": "llama.cpp", "msv": "MLX", "vsv": "vLLM (CPU)"}
data["srv"] = []
data["stream"] = {}
for f in sorted(glob.glob(os.path.join(RAW, "?sv_*_*.json")), key=lambda p: (re.sub(r"_\d+\.json$", "", p), int(re.search(r"_(\d+)\.json$", p).group(1)))):
    d = json.load(open(f))
    base = os.path.basename(f)
    tag = re.sub(r"_\d+\.json$", "", base)
    c = d["config"]
    s = d["summary"]
    scmd = d.get("server_cmd") or ""
    if not scmd:
        try:
            scmd = open(os.path.join(RAW, tag + ".server.cmd")).read().strip()
        except OSError:
            pass
    if "(as above)" in scmd:  # the vLLM prefix runs reused the closed-loop container command
        full = open(os.path.join(RAW, "vsv_0.6b_fp32_closed.server.cmd")).read().strip()
        scmd = full + (" --no-enable-prefix-caching" if "no-enable" in scmd else "  (automatic prefix caching on, the default)")
    lg = ("python3 loadgen.py --mode %s %s --n %d --prompt-words %d%s --max-tokens %d --seed %d%s" %
          (c["mode"], ("--conc %d" % c["conc"]) if c["mode"] == "closed" else ("--rate %g" % c["rate"]), c["n"], c["prompt_words"],
           (" --prefix-words %d" % c["prefix_words"]) if c.get("prefix_words") else "", c["max_tokens"], c["seed"],
           (" --extra '%s'" % c["extra"]) if c.get("extra", "{}") != "{}" else ""))
    rid = add_run("server load test", ENG[tag[:3]], tag + " " + c["label"], "server: " + scmd + "  |  client: " + lg,
                  d.get("load_before"), d.get("load_after"))
    row = {"run": rid, "engine": ENG[tag[:3]], "tag": tag, "label": c["label"], "mode": c["mode"], "conc": c["conc"], "rate": c["rate"],
           "n": c["n"], "seed": c["seed"], "prompt_words": c["prompt_words"], "prefix_words": c.get("prefix_words", 0), "max_tokens": c["max_tokens"]}
    for k in ("n_ok", "n_err", "n_retried", "wall_s", "out_tok_per_s", "req_per_s", "in_tok_total", "out_tok_total",
              "ttft_p50", "ttft_p90", "ttft_p99", "ttft_mean", "tpot_p50", "tpot_p90", "tpot_p99", "tpot_mean",
              "e2e_p50", "e2e_p99", "itl_p50", "itl_p99"):
        v = s.get(k)
        row[k] = r3(v, 4) if isinstance(v, float) else v
    row["load1"] = (d.get("load_before") or {}).get("loadavg", [None])[0]
    # per request [TTFT ms, TPOT ms] for goodput under an SLO (failed requests are left out and counted in n_err)
    row["rq"] = [[round(r["ttft"] * 1000), round(r["tpot"] * 1000, 1)] for r in d["requests"] if "ttft" in r and "tpot" in r and "error" not in r]
    data["srv"].append(row)
    # streaming examples: llama.cpp closed loop, seed 1, alone (c1) and under load (c16)
    if tag == "lsv_0.6b_q4_closed" and c["seed"] == 1 and c["conc"] in (1, 16):
        reqs = [r for r in d["requests"] if r.get("gaps")]
        # the median-TTFT request of the run, so the example is typical
        reqs.sort(key=lambda r: r["ttft"])
        r = reqs[len(reqs) // 2]
        data["stream"]["alone" if c["conc"] == 1 else "loaded"] = {"run": rid, "conc": c["conc"], "req": r["i"], "ttft": round(r["ttft"], 4),
                                                                    "gaps": [round(g, 4) for g in r["gaps"]], "prompt_tokens": r.get("prompt_tokens")}
    for r in d["requests"]:
        r.pop("gaps", None)
    json.dump(deep_clean(d), open(os.path.join(OUT, base), "w"))

data["meta"] = {
    "date": "2026-10-08",
    "machine": "Apple M1 Pro laptop: 10-core CPU (8 performance, 2 efficiency), 16-core GPU, 16 GB unified memory; shared with other jobs, so every run records the 1-minute load average",
    "versions": {"llama.cpp": "0.5.0 (Homebrew, build 11146, commit 7fe450e19, ggml 0.25.3, Metal backend)",
                 "mlx": "mlx 0.32.3, mlx-lm 0.32.0", "vllm": "vLLM 0.31.0, CPU image vllm/vllm-openai-cpu:v0.31.0-arm64 in Docker Desktop (Linux arm64 VM, 5 CPUs, 9.7 GiB)"},
    "models": [
        {"file": "Qwen3-0.6B-{F16,Q8_0,Q4_K_M}.gguf", "from": "unsloth/Qwen3-0.6B-GGUF BF16 @ 50968a44, quantized here with llama-quantize (no imatrix)"},
        {"file": "Qwen3-1.7B-{Q8_0,Q4_K_M}.gguf", "from": "unsloth/Qwen3-1.7B-GGUF @ d7f544ee (quantized by unsloth)"},
        {"file": "Qwen3-4B-Q4_K_M.gguf", "from": "Qwen/Qwen3-4B-GGUF @ bc640142 (quantized by Qwen)"},
        {"file": "MLX Qwen3-0.6B-{4bit,8bit,bf16}", "from": "Qwen/Qwen3-0.6B @ c1899de2, converted here with mlx_lm convert (group size 64)"},
        {"file": "MLX Qwen3-1.7B-4bit", "from": "mlx-community/Qwen3-1.7B-4bit @ 3b1b1768"},
        {"file": "vLLM Qwen3-0.6B (float32)", "from": "Qwen/Qwen3-0.6B @ c1899de2 safetensors"}],
}
# ---------- vLLM start-up facts ----------
try:
    vlog = open(os.path.join(RAW, "vllm_startup.log")).read()
    m = re.search(r"CPU KV cache size: ([\d,]+) tokens", vlog)
    data["vllm_kv_tokens"] = int(m.group(1).replace(",", ""))
except OSError:
    data["vllm_kv_tokens"] = None

try:
    met = open(os.path.join(RAW, "vsv_closed_metrics.txt")).read()
    data["vllm_preemptions"] = int(float(re.search(r'^vllm:num_preemptions_total\{[^}]*\} ([\d.]+)', met, re.M).group(1)))
    es = open(os.path.join(RAW, "vsv_closed_enginestats.log")).read()
    data["vllm_kv_peak"] = max(float(x) for x in re.findall(r"CPU KV cache usage: ([\d.]+)%", es))
    data["vllm_waiting_peak"] = max(int(x) for x in re.findall(r"Waiting: (\d+) reqs", es))
except OSError:
    pass

data["facts"] = facts(data)
data = deep_clean(data)
txt = json.dumps(data, separators=(",", ":"))
assert "/Users/" not in txt and "Users-" not in txt and "scratchpad" not in txt, "private path leaked"
open(os.path.join(HERE, "data.json"), "w").write(json.dumps(data, indent=1))
open(os.path.join(HERE, "..", "parts", "32_js_bch_0data.js"), "w").write(
    "// Engine bench tab: every measured number, generated by src/bench/build_data.py from the raw results. Do not edit by hand.\nwindow.BCH_DATA=" + txt + ";\n")
print("runs", len(data["runs"]), "lb", len(data["lb"]), "bb", len(data["bb"]), "mlx", len(data["mlx"]), "srv", len(data["srv"]),
      "spec", len(data["spec"]), "bytes", len(txt))
