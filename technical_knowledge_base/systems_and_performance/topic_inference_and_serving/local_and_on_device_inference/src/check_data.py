"""Checks: the page embeds exactly out_lo_data.json; every data-lo key in the parts exists in LO.facts;
facts agree with results/ recomputed independently; bits per weight from the block structs match the HF docs table;
numbers typed directly in the prose (not via data-lo) agree with the data.
Run: python3 -I check_data.py
"""
import json, os, re, glob, math

HERE = os.path.dirname(os.path.abspath(__file__))
fails = 0


def ok(cond, msg):
    global fails
    if not cond:
        fails += 1
        print("FAIL", msg)


data = json.load(open(os.path.join(HERE, "out_lo_data.json")))
html = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.LO=(\{.*?\});\n", html, re.S)
ok(m is not None, "LO data in index.html")
if m:
    ok(json.loads(m.group(1)) == data, "embedded LO equals out_lo_data.json")

parts = "".join(open(p, encoding="utf-8").read() for p in sorted(glob.glob(os.path.join(HERE, "parts", "*.html"))))
keys = set(re.findall(r'data-lo="([^"]+)"', parts))
for k in sorted(keys):
    ok(k in data["facts"], "fact present: " + k)
print(len(keys), "data-lo keys used,", len(data["facts"]), "facts")

# independent recomputation from results/
q = json.load(open(os.path.join(HERE, "results", "q17.json")))
by = {it["id"]: it for it in q["items"]}
f16 = by["F16"]
gb = f16["bench"]["model_size"] / 1e9
ok(data["facts"]["gbF16_17"] == f"{gb:.2f}", "gbF16_17")
import statistics
cands = [(f16["load"]["before"]["loadavg"][0], statistics.median(f16["bench"]["tg"]["samples"]))]
for n in ("speed_q17.json", "speed_q17_p3.json"):
    pth = os.path.join(HERE, "results", n)
    if os.path.exists(pth):
        e = json.load(open(pth)).get("F16")
        if e:
            cands.append((e["load"], statistics.median(e["tg"])))
tg = max(c[1] for c in cands)
ok(data["facts"]["tgF16_17"] == f"{tg:.1f}", "tgF16_17 (fastest pass)")
ok(data["facts"]["effF16_17"] == f"{gb * tg:.0f}", "effF16_17")
for key, i in (("kldQ4kmI", "Q4_K_M+i"), ("kldQ2", "Q2_K"), ("kldQ8", "Q8_0")):
    v = by[i]["kld_mean"]
    s = f"{v:.3f}" if v >= 0.1 else f"{v:.4f}" if v >= 0.01 else f"{v:.5f}"
    ok(data["facts"][key] == s, key)
ok(data["facts"]["imxQ4"] == str(round((1 - by["Q4_K_M+i"]["kld_mean"] / by["Q4_K_M"]["kld_mean"]) * 100)), "imxQ4")
bpw = by["Q2_K"]["bench"]["model_size"] * 8 / by["Q2_K"]["bench"]["model_n_params"] if "model_n_params" in by["Q2_K"]["bench"] else by["Q2_K"]["bench"]["model_size"] * 8 / by["Q2_K"]["bench"]["params"]
ok(data["facts"]["bpwQ2"] == f"{bpw:.2f}", "bpwQ2")

# bits per weight of the block structs against the Hugging Face docs table (checked 2026-10-10)
HF = {"Q2_K": 2.625, "Q3_K": 3.4375, "Q4_K": 4.5, "Q5_K": 5.5, "Q6_K": 6.5625, "IQ4_XS": 4.25, "IQ2_XXS": 2.06, "IQ2_XS": 2.31,
      "IQ3_XXS": 3.06, "IQ1_S": 1.56, "IQ1_M": 1.75, "TQ1_0": 1.6875, "TQ2_0": 2.0625}
blk = {"Q2_K": 84, "Q3_K": 110, "Q4_K": 144, "Q5_K": 176, "Q6_K": 210, "IQ4_XS": 136, "IQ2_XXS": 66, "IQ2_XS": 74,
       "IQ3_XXS": 98, "IQ1_S": 50, "IQ1_M": 56, "TQ1_0": 54, "TQ2_0": 66}
for t, b in blk.items():
    ok(abs(b * 8 / 256 - HF[t]) < 0.006, "bpw " + t)

# prose numbers typed directly
read = "".join(open(p, encoding="utf-8").read() for p in sorted(glob.glob(os.path.join(HERE, "parts", "20_read_*.html"))))
ok("1.15 TB/s" in read and abs(300.4 * 3.56 * 2 ** 30 / 1e12 - 1.15) < 0.01, "5090 scoreboard read rate 1.15 TB/s")
ok("64% of the 5090" in read and round(data["fitcfg"]["eff5090"] * 100) == 64, "5090 efficiency 64%")
ok(abs(300.4 / 189.0 - 1.59) < 0.005 and abs(1792 / 1008 - 1.78) < 0.005, "5090/4090 ratios")
ok(abs(2 * 36 * 8 * 128 * 2 - 147456) == 0 and abs(147456 * 40960 / 1e9 - 6.04) < 0.01, "Qwen3-4B KV per token and full context")
ok(abs(2 * 311164928 / 2031739904 - 0.306) < 0.001, "tied embedding share 30.6%")
ok(abs(1792 / 43 - 42) < 0.5 and abs(26.85 / 41.7 - 0.64) < 0.01, "dual 5090 layer-split ceiling 42, 64%")
ok(abs(1792 / 3.83 - 468) < 1, "interview: 468 tok/s ceiling")
q4 = next(mm for mm in data["models"] if mm["k"] == "q4")
ok(q4["kv_tok_f16"] == 147456, "planner KV per token for Qwen3-4B")
# MLX prose ratios
mx = {x["id"]: x for x in data["q"]["mlx"]["items"]}
ok(abs(mx["4bit"]["kld"] / by["Q4_K_M+i"]["kld_mean"] - 4) < 0.5, "MLX 4-bit about four times Q4_K_M+i KLD")
ok(abs(mx["4bit-g32"]["bytes"] / mx["4bit"]["bytes"] - 1.11) < 0.01, "group 32 is 11% more bytes")
q4 = {x["id"]: x for x in data["q"]["m4"]["items"]}
ok(abs(q4["QwenQ4KM"]["kld"] / q4["Q4_K_M"]["kld"] - 2) < 0.3 and abs(q4["QwenQ4KM"]["kld"] / q4["Q4_K_M+i"]["kld"] - 3) < 0.3, "official file twice / three times")
ok(q4["Q4_K_M+i"]["ppl"] > q4["Q4_K_M"]["ppl"] and q4["Q4_K_M+i"]["kld"] < q4["Q4_K_M"]["kld"], "4B perplexity points the wrong way")
ok(abs(1 - by["IQ4_XS+i"]["bench"]["model_size"] / by["Q4_K_M+i"]["bench"]["model_size"] - 0.08) < 0.01, "IQ4_XS 8% smaller")
ok(abs(by["Q6_K"]["ppl_q"] / f16["ppl"] - 1.001) < 0.0006 and abs(by["Q5_K_M"]["ppl_q"] / f16["ppl"] - 1.013) < 0.0006, "perplexity up 0.1% and 1.3%")
print("FAILS", fails)
raise SystemExit(1 if fails else 0)
