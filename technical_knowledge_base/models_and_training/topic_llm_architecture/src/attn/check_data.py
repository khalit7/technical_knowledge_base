"""Attention lab: check that the built page embeds exactly the recorded data and that numbers written in the prose
agree with the recorded files and the calculator's own arithmetic.

Run from anywhere: python3 check_data.py  (needs node for real_numbers.mjs to have been run; reads ../../index.html)
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
PAGE = os.path.join(os.path.dirname(SRC), "index.html")
bad = []


def ok(cond, msg):
    if not cond:
        bad.append(msg)


html = open(PAGE, encoding="utf-8").read()
m = re.search(r"window\.ATD=(\{.*?\});\n", html, re.S)
ok(m is not None, "ATD not found in index.html")
atd = json.loads(m.group(1))
ld = lambda f: json.load(open(os.path.join(HERE, "out", f)))

# 1. embedded data equals the recorded files
for key, f in [("bench", "decode_bench.json"), ("cpu", "cpu_evals.json"), ("sdpa", "sdpa_errors.json")]:
    if os.path.exists(os.path.join(HERE, "out", f)):
        ok(atd[key] == ld(f), f"{key} differs from out/{f}")
    else:
        bad.append(f"out/{f} missing")
rs = ld("runs_summary.json")
for a, b in zip(atd["runs"]["runs"], rs["runs"]):
    b = dict(b); b["train_curve"] = b["train_curve"][::2]
    ok(a == b, f"run {a['run']} differs from out/runs_summary.json")
ok(len(atd["runs"]["runs"]) == len(rs["runs"]), "run count differs")
ok(atd["pub"] == json.load(open(os.path.join(HERE, "inputs", "published.json"))), "published tables differ")
ok(atd["code"] == json.load(open(os.path.join(HERE, "inputs", "code_snippets.json"))), "code snippets differ")
seq = json.load(open(os.path.join(SRC, "data", "running_sequence.json")))
ok(atd["seq"]["pieces"] == seq["pieces"][:24], "sequence pieces differ")

# 2. code quotes still match the files they quote (repo files only; transformers checked at extraction)
for s in atd["code"]["snippets"]:
    if s["file"].startswith("src/"):
        lines = open(os.path.join(SRC, s["file"][4:])).read().split("\n")
        ok("\n".join(lines[s["first"] - 1:s["last"]]) == s["code"], f"quote {s['file']}:{s['first']} is stale")

# 3. the tiny GPT's cache sizes quoted in prose and in the animation
sys.path.insert(0, os.path.join(SRC, "data"))
from configs import get
from tiny_gpt import kv_cache_bytes_per_token
kv = {p: kv_cache_bytes_per_token(get(p, **({} if p in ("mla",) else {"pos": "rope"})), 2, context=256) for p in ["rope", "gqa4", "gqa2", "mqa", "mla", "swa64"]}
ok(kv == {"rope": 6144, "gqa4": 3072, "gqa2": 1536, "mqa": 768, "mla": 960, "swa64": 1536}, f"tiny KV bytes changed: {kv}")
for r in rs["runs"]:
    exp = {"at_mha": 6144, "at_gqa4": 3072, "at_gqa2": 1536, "at_mqa": 768, "at_mla": 960, "at_swa64": 1536, "at_swa64_g3": 3072}.get(r["run"].replace("_s1", ""))
    ok(r["kv_bytes_per_token_bf16_ctx256"] == exp, f"{r['run']} KV bytes {r['kv_bytes_per_token_bf16_ctx256']} != {exp}")
text = re.sub(r"<[^>]+>", " ", html[html.index('id="t-attn"'):html.index('id="t-calc"')])
for s in ["6,144 bytes per token", "512 numbers", "64 + 16 = 80 numbers", "12.3M tokens", "3,200 fixed validation windows"]:
    ok(s in text, f"prose lost '{s}'")

# 4. real-model numbers in prose against the calculator's code (out/real_numbers.json from real_numbers.mjs)
rn = ld("real_numbers.json")
G, K = 2 ** 30, 1024
def gib(k, f="kv_131072_credited"):
    return f"{rn[k][f] / G:.2f} GiB"
checks = {
    "131,072 bytes (128 KiB)": rn["llama-3.1-8b"]["kv_per_token_bf16"] == 131072,
    "16 GiB at 131,072 tokens": rn["llama-3.1-8b"]["kv_131072_credited"] == 16 * G,
    "496 KiB per token": rn["gemma-3-27b"]["kv_per_token_bf16"] == 496 * K,
    "10.41 GiB": gib("gemma-3-27b") == "10.41 GiB",
    "62.00 GiB": gib("gemma-3-27b", "kv_131072_full") == "62.00 GiB",
    "gpt-oss-120b holds 4.50 GiB against 9.00 GiB": gib("gpt-oss-120b") == "4.50 GiB" and gib("gpt-oss-120b", "kv_131072_full") == "9.00 GiB",
    "holds 0.50 GiB against 16.00 GiB": gib("mistral-7b-v0.1") == "0.50 GiB" and gib("mistral-7b-v0.1", "kv_131072_full") == "16.00 GiB",
}
for s, c in checks.items():
    ok(s in text, f"prose lost '{s}'")
    ok(c, f"prose number '{s}' disagrees with real_numbers.json")

print("attention lab data check:", "OK" if not bad else f"{len(bad)} problems")
for b in bad:
    print("  -", b)
sys.exit(1 if bad else 0)
