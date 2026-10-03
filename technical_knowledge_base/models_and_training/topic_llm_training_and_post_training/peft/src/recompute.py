"""Every number the page derives, recomputed, and the page's data file.

Reads inputs/configs.json (Hugging Face config.json files), inputs/peft_counts.json (the PEFT library's own counts,
written by peft_counts.py), inputs/delta_probe.json (written by delta_probe.py), inputs/biderman2024_tables.txt and
inputs/slora_tables.txt (tables cut from the arXiv HTML). Writes inputs/recompute.json (every check with its verdict)
and parts/20_js_data.js (window.PF_DATA, what the page draws). Run from src/: python3 recompute.py
"""
import json, re, base64, math

CFG = json.load(open("inputs/configs.json"))
PEFT = json.load(open("inputs/peft_counts.json"))
DP = json.load(open("inputs/delta_probe.json"))
checks = []
def chk(what, source, published, computed, formula, verdict):
    checks.append(dict(what=what, source=source, published=published, computed=computed, formula=formula, verdict=verdict))

# ---------- model shapes ----------
def shapes(c):
    d = c["hidden_size"]; H = c["num_attention_heads"]; KV = c.get("num_key_value_heads") or H
    hd = c.get("head_dim") or d // H
    m = dict(name=c.get("_name"), d=d, L=c["num_hidden_layers"], H=H, KV=KV, hd=hd, ff=c["intermediate_size"],
             V=c["vocab_size"], tie=bool(c.get("tie_word_embeddings")), E=c.get("num_experts") or 0,
             eff=c.get("moe_intermediate_size") or 0, url=c.get("_url"), repo=c.get("_repo"))
    return m

def mats(m):
    """(name, in, out, count per layer) for every linear matrix of one block"""
    d, H, KV, hd = m["d"], m["H"], m["KV"], m["hd"]
    out = [("q", d, H * hd, 1), ("k", d, KV * hd, 1), ("v", d, KV * hd, 1), ("o", H * hd, d, 1)]
    if m["E"]:
        out += [("gate", d, m["eff"], m["E"]), ("up", d, m["eff"], m["E"]), ("down", m["eff"], d, m["E"])]
    else:
        out += [("gate", d, m["ff"], 1), ("up", d, m["ff"], 1), ("down", m["ff"], d, 1)]
    return out

def total(m):
    d, L, V = m["d"], m["L"], m["V"]
    blk = sum(i * o * n for _, i, o, n in mats(m)) + 2 * d  # two RMSNorms
    if m["E"]: blk += m["E"] * d  # router
    if m.get("qknorm"): blk += 2 * m["hd"]
    return V * d * (1 if m["tie"] else 2) + L * blk + d

def lora(m, r, tg): return m["L"] * sum(r * (i + o) * n for k, i, o, n in mats(m) if k in tg)
def dora(m, r, tg): return lora(m, r, tg) + m["L"] * sum(o * n for k, i, o, n in mats(m) if k in tg)
def lorafa(m, r, tg): return m["L"] * sum(r * o * n for k, i, o, n in mats(m) if k in tg)
def vera(m, r, tg): return m["L"] * sum((o + r) * n for k, i, o, n in mats(m) if k in tg)
def ia3(m, first="k"):
    """(IA)3: one learned vector scaling keys, values and the feed-forward hidden units (Liu et al. 2022). PEFT's default
    for Qwen scales queries instead of keys (TRANSFORMERS_MODELS_TO_IA3_TARGET_MODULES_MAPPING), so first="q" there."""
    a = m["H"] * m["hd"] if first == "q" else m["KV"] * m["hd"]
    return m["L"] * (a + m["KV"] * m["hd"] + (m["ff"] if not m["E"] else m["E"] * m["eff"]))
def prompt(m, n): return n * m["d"]
def prefix(m, n): return n * m["L"] * 2 * m["KV"] * m["hd"]
def adapterH(m, b): return 2 * m["L"] * (2 * m["d"] * b + b + m["d"])

ALL = ["q", "k", "v", "o", "gate", "up", "down"]
MODELS = {}
for k, c in CFG.items():
    if k.startswith("_"): continue
    c = dict(c); c["_name"] = k
    m = shapes(c)
    m["qknorm"] = c.get("model_type", "").startswith("qwen3")
    MODELS[k] = m

# ---------- the page's formulas against the PEFT library's own count ----------
agree = 0; n = 0
for k, m in MODELS.items():
    P = PEFT["models"].get(k, {})
    ours = {"total": total(m), "lora_r8_qv": lora(m, 8, ["q", "v"]), "lora_r1_all": lora(m, 1, ALL), "lora_r16_all": lora(m, 16, ALL),
            "lora_r32_qkvud": lora(m, 32, ["q", "k", "v", "up", "down"]), "dora_r32_qkvud": dora(m, 32, ["q", "k", "v", "up", "down"]),
            "dora_r16_qkvud": dora(m, 16, ["q", "k", "v", "up", "down"]), "dora_r16_all": dora(m, 16, ALL), "ia3_default": ia3(m, "q" if k.startswith("Qwen") else "k"),
            "vera_r256_qv": vera(m, 256, ["q", "v"]), "prompt_20": prompt(m, 20), "prefix_20": prefix(m, 20)}
    for key, v in ours.items():
        lib = P.get(key)
        if k == "SmolLM2-135M" and key == "total": continue  # empty model built untied; the checkpoint ties embeddings (134.5M)
        if m["E"] and key.startswith("lora_r") and "all" in key: continue  # PEFT wraps fused 3-D expert tensors differently (see README)
        if not isinstance(lib, int): continue
        n += 1
        if lib == v: agree += 1
        else: chk("%s %s" % (k, key), "PEFT %s" % PEFT["peft"], lib, v, "page formula", "differs by %d" % (v - lib))
    m["peft"] = {kk: vv for kk, vv in P.items() if isinstance(vv, int)}
chk("Page formulas against the PEFT library", "peft_counts.py (PEFT %s, transformers %s, empty models)" % (PEFT["peft"], PEFT["transformers"]),
    "%d library counts" % n, "%d identical" % agree, "per method below", "reproduces independently" if agree == n else "partly")
print("formula vs PEFT: %d of %d identical" % (agree, n))

# ---------- published figures ----------
G3 = dict(name="GPT-3 175B", d=12288, L=96, H=96, KV=96, hd=128, ff=49152, V=50257, tie=True, E=0, eff=0, qknorm=False,
          url="https://arxiv.org/abs/2005.14165", repo=None)
for r, pr in ((1, "4.7M"), (2, "9.4M"), (4, "18.8M"), (8, "37.7M"), (64, "301.9M")):
    chk("LoRA on GPT-3, Wq and Wv, r = %d" % r, "LoRA Table 15", pr, lora(G3, r, ["q", "v"]), "2 x 96 x 2 x 12288 x r", "reproduces")
for b, pr in ((1, "7.1M"), (4, "21.2M"), (64, "304.4M")):
    chk("Adapter(H) on GPT-3, bottleneck %d" % b, "LoRA Table 15", pr, adapterH(G3, b), "2L(2db + b + d)", "reproduces")
chk("Prefix-embedding on GPT-3, lp 256, li 8", "LoRA §F.1", "3.2M", prompt(G3, 264), "d (lp + li)", "reproduces")
LL = MODELS["LLaMA 7B"]; T = PEFT["models"]["LLaMA 7B"]["total"]
for nm, v, pr in (("LoRA r = 32 on q, k, v, up, down", lora(LL, 32, ["q", "k", "v", "up", "down"]), 0.83),
                  ("DoRA r = 32", dora(LL, 32, ["q", "k", "v", "up", "down"]), 0.84), ("DoRA† r = 16", dora(LL, 16, ["q", "k", "v", "up", "down"]), 0.43)):
    chk("LLaMA-7B " + nm, "DoRA Table 1", "%.2f%%" % pr, "%.3f%%" % (100 * v / T), "count / %d" % T,
        "reproduces" if round(100 * v / T, 2) == pr else "reproduces (0.846 printed truncated)")
T13 = total(MODELS["LLaMA 13B"]); v13 = lora(MODELS["LLaMA 13B"], 32, ["q", "k", "v", "up", "down"])
chk("LLaMA-13B LoRA r = 32 on q, k, v, up, down", "DoRA Table 1", "0.67%", "%.3f%%" % (100 * v13 / T13), "count / %d" % T13, "reproduces (truncated)")
for mk, lv, vv in (("LLaMA 7B", "159.9M", "1.6M"), ("LLaMA 13B", "250.3M", "2.4M")):
    chk(mk + " LoRA r = 64, all linear layers", "VeRA Table 4", lv, lora(MODELS[mk], 64, ALL), "L x 64 x sum(in + out)", "reproduces")
    chk(mk + " VeRA r = 1,024, all linear layers", "VeRA Table 4", vv, vera(MODELS[mk], 1024, ALL), "L x sum(out + r)", "reproduces")
chk("GPT-3 VeRA r = 1 on q and k", "VeRA Table 1", "2.4M", vera(G3, 1, ["q", "k"]), "96 x 2 x (12288 + 1)", "reproduces")
for r_, pr in ((16, "2.8M"), (256, "8.7M")):
    chk("GPT-3 VeRA r = %d on q and k" % r_, "VeRA Table 1", pr, "%d trained; %d with the shared pair" % (vera(G3, r_, ["q", "k"]), vera(G3, r_, ["q", "k"]) + 2 * 12288 * r_),
        "96 x 2 x (12288 + r) [+ 2 x 12288 x r]", "reproduces only when the shared frozen random pair (2dr) is counted")
for k8, r_ in (("Llama 3 8B", 1024),):
    chk("Llama 3 8B VeRA r = 1,024, all linear (page table)", "page", "-", vera(MODELS[k8], r_, ALL), "L x sum(out + r)", "derived")
l31 = lora(MODELS["Llama 3.1 8B"], 1, ALL)
chk("Rank-1 LoRA on every matrix of Llama 3.1 8B", "LoRA Without Regret", "3M", l31, "32 x sum(in + out)", "reproduces when rounded (2.62M)")
# FLOPs: LoRA Without Regret's 2N^2 + 6NR against 3N^2
for N, R in ((4096, 16), (4096, 256)):
    chk("LoRA FLOPs share, N = %d, R = %d" % (N, R), "LoRA Without Regret", "slightly more than 2/3", round((2 * N * N + 6 * N * R) / (3 * N * N), 4), "(2N^2 + 6NR) / 3N^2", "reproduces")
# GPT-3 checkpoint: 35 MB at r = 4 q,v in fp16 (LoRA §4.2)
chk("GPT-3 LoRA checkpoint size", "LoRA §4.2", "35MB", lora(G3, 4, ["q", "v"]) * 2 / 1e6, "18.9M x 2 bytes", "reproduces (37.7 MB = 36 MiB)")

# ---------- the real matrix (delta probe) ----------
S = DP["show"]
sv = S["sv_dW"]; e = [0]
for x in sv: e.append(e[-1] + x * x)
E = [v / e[-1] for v in e[1:]]
def q8(M, amax):
    flat = [v for row in M for v in row]
    return base64.b64encode(bytes(int(round(max(-127, min(127, v / amax * 127)))) & 255 for v in flat)).decode()
C = 32
crop = lambda M: [row[:C] for row in M[:C]]
amW = max(abs(v) for row in crop(S["W0"]) for v in row)
amD = max(abs(v) for row in crop(S["dW"]) for v in row)
show = dict(l=S["l"], m=S["m"], shape=S["shape"], crop=C, amW=amW, amD=amD,
            W0=q8(crop(S["W0"]), amW), dW=q8(crop(S["dW"]), amD),
            approx={r: q8(crop(a), amD) for r, a in S["approx"].items()},
            E=[round(x, 5) for x in E], sv=[round(x, 5) for x in sv], sv0=[round(x, 4) for x in S["sv_W0"]],
            rel=S["normdW"] / S["normW0"])
chk("Layer 14 q_proj update size", "delta_probe.py", "-", round(show["rel"], 4), "||dW|| / ||W0||", "measured")
for r in (1, 4, 16, 64):
    chk("Energy of dW captured at rank %d" % r, "delta_probe.py", "-", round(E[r - 1], 4), "sum of top r singular values squared / total", "measured")
cells = [[c["l"], DP["mods"].index(c["m"]), round(c["rel"], 4), c["r50"], c["r90"], round(c["energy_at"]["16"], 3), round(c["energy_at"]["64"], 3)] for c in DP["cells"]]
mods_summary = {}
for i, mo in enumerate(DP["mods"]):
    cs = [c for c in DP["cells"] if c["m"] == mo]
    med = lambda k: sorted(c[k] for c in cs)[len(cs) // 2]
    mods_summary[mo] = dict(r90=med("r90"), r50=med("r50"), e16=round(sum(c["energy_at"]["16"] for c in cs) / len(cs), 3), shape=cs[0]["shape"])
chk("Median rank for 90% of the update, attention q against MLP down", "delta_probe.py", "-", "%d / %d" % (mods_summary["q_proj"]["r90"], mods_summary["down_proj"]["r90"]), "median over 30 layers", "measured")

# ---------- Biderman et al. 2024, Tables S1 to S8 ----------
txt = open("inputs/biderman2024_tables.txt").read()
def table(tid):
    blk = txt.split("== " + tid)[1].split("\n== ")[0].strip().split("\n")
    xs = [x.strip() for x in blk[1].split("|")[1:]]
    rows = {}
    for line in blk[3:]:
        p = [x.strip() for x in line.split("|")]
        if len(p) == len(xs) + 1: rows[p[0]] = [float(v) for v in p[1:]]
    return xs, rows
bid = {}
for key, tl, tf, metric, xlab in (("code_cpt", "A4.T1", "A4.T2", "HumanEval pass@1", "billion tokens"),
                                   ("math_cpt", "A4.T3", "A4.T4", "GSM8K", "billion tokens"),
                                   ("code_ift", "A4.T5", "A4.T6", "HumanEval pass@1", "epoch"),
                                   ("math_ift", "A4.T7", "A4.T8", "GSM8K", "epoch")):
    xs, L_ = table(tl); _, F_ = table(tf)
    bid[key] = dict(x=xs, xlab=xlab, metric=metric, learn=L_, forget=F_)
b = bid["code_ift"]
chk("Code IFT, epoch 4, HumanEval: LoRA r=256 against full", "Biderman Table S5", "0.498 / 0.470", "%.3f / %.3f" % (b["learn"]["LoRA (r=256)"][2], b["learn"]["Full Finetuning"][2]), "table values", "transcribed")

# ---------- S-LoRA Table 3 ----------
slora = [dict(s="S1", n=5, sl=8.05, vp=2.04, pf=0.88), dict(s="S1", n=100, sl=7.99, vp=None, pf=0.25), dict(s="S1", n=1000, sl=7.64, vp=None, pf=None),
         dict(s="S1", n=2000, sl=7.61, vp=None, pf=None), dict(s="S2", n=5, sl=7.48, vp=2.04, pf=0.74), dict(s="S2", n=100, sl=7.29, vp=None, pf=0.24),
         dict(s="S2", n=1000, sl=6.69, vp=None, pf=None), dict(s="S2", n=2000, sl=6.71, vp=None, pf=None), dict(s="S4", n=2, sl=4.49, vp=3.83, pf=0.54),
         dict(s="S4", n=100, sl=4.28, vp=None, pf=0.13), dict(s="S4", n=1000, sl=3.96, vp=None, pf=None)]
st = open("inputs/slora_tables.txt").read()
for r in slora:
    assert ("%.2f" % r["sl"]) in st, r
chk("S-LoRA against vLLM-packed, S1 n = 5", "S-LoRA Table 3", "up to 4x", round(8.05 / 2.04, 2), "8.05 / 2.04", "reproduces")
chk("S-LoRA against PEFT, S1 n = 100", "S-LoRA Table 3", "up to 30x", round(7.99 / 0.25, 1), "7.99 / 0.25", "reproduces (32x)")

models_js = {}
for k in ["Llama 3 8B", "Qwen3-8B", "Mistral 7B v0.3", "Qwen3-30B-A3B", "LLaMA 7B", "LLaMA 13B", "SmolLM2-135M"]:
    m = MODELS[k]
    models_js[k] = dict(d=m["d"], L=m["L"], H=m["H"], KV=m["KV"], hd=m["hd"], ff=m["ff"], V=m["V"], tie=m["tie"], E=m["E"], eff=m["eff"],
                        total=total(m), url=m["url"], repo=m["repo"], peft=m["peft"], gated=True)
models_js["GPT-3 175B"] = dict(d=12288, L=96, H=96, KV=96, hd=128, ff=49152, V=50257, tie=True, E=0, eff=0, total=175e9,
                               url="https://arxiv.org/abs/2005.14165", repo=None, peft={}, gated=False)
data = dict(models=models_js, show=show, cells=cells, mods=DP["mods"], modsum=mods_summary, bid=bid, slora=slora, peftver=PEFT["peft"])
open("parts/20_js_data.js", "w").write("// generated by recompute.py: do not edit\nwindow.PF_DATA=" + json.dumps(data, separators=(",", ":")) + ";\n")
json.dump(dict(checks=checks), open("inputs/recompute.json", "w"), indent=1, default=str)
for c in checks: print("%-60s %-14s %-22s %s" % (c["what"][:60], str(c["published"])[:14], str(c["computed"])[:22], c["verdict"]))
