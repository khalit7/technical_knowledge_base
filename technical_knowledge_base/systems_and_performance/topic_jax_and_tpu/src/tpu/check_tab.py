"""Check the TPU and Pallas lab against its recorded data. Plain Python.

    python3 check_tab.py
1. The page (../../index.html) embeds exactly the data tp_data.py builds from out/*.json and tp_kernels.py.
2. Every number written as static prose in parts/35_tab_tpu_*.html matches the data it comes from.
3. No absolute path, user name, host name or e-mail in the lab's files.
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
PARTS = os.path.join(os.path.dirname(HERE), "parts")
fails = []


def ok(cond, what):
    print(("ok   " if cond else "FAIL ") + what)
    if not cond:
        fails.append(what)


def load(n):
    with open(os.path.join(HERE, "out", n)) as f:
        return json.load(f)


# 1. embedded data
part = open(os.path.join(PARTS, "35_js_tp_0data.js")).read()
page = open(os.path.join(ROOT, "index.html")).read()
emb = re.search(r"window\.TPD=(\{.*?\});\n", page)
ok(emb is not None, "page embeds window.TPD")
if emb:
    ok("window.TPD=" + emb.group(1) + ";" in part, "embedded TPD identical to parts/35_js_tp_0data.js")
before = part
subprocess.run([sys.executable, "-I", "-B", os.path.join(HERE, "tp_data.py")], check=True, capture_output=True)
ok(open(os.path.join(PARTS, "35_js_tp_0data.js")).read() == before, "parts/35_js_tp_0data.js is what tp_data.py builds")

# 2. prose numbers
sp, rf, pa, to, sr = load("specs.json"), load("roofline.json"), load("pallas.json"), load("torus.json"), load("source.json")
html = "".join(open(os.path.join(PARTS, f)).read() for f in sorted(os.listdir(PARTS)) if f.startswith("35_tab_tpu"))
G = {g["gen"]: g for g in sp["gens"]}
O = {o["name"].split(",")[0].split(" (")[0]: o for o in rf["ops"]}


def has(s, what=None):
    ok(s in html, what or repr(s))


has("826,368-parameter")
ok(int(G["v5e"]["ridge"] + 0.5) == 241 and "ridge point would be 229 instead of 241" in json.dumps(sp["notes"]), "v5e ridge 241 vs 229")
ok(G["v5e"]["src"]["vmem_mib"] == 128 and G["v6e"]["src"]["vmem_mib"] == 128 and G["v5p"]["src"]["vmem_mib"] == 64 and G["7x"]["src"]["vmem_mib"] == 64 and G["v4"]["src"]["vmem_mib"] == 16
   and "v5e and v6e have 128 MiB per core; v5p and TPU7x have 64 MiB, v4 16 MiB" in html, "VMEM per core")
ok(rf["n_dots_step"] == 99 and rf["n_dots_fwd"] == 33 and "the 99 <code>dot_general</code> equations" in html and "33 of them in the forward pass" in html, "99 / 33 dot_generals")
head = O["output head"]
ok(round(100 * head["mxu_util"]["128"]) == 51 and round(100 * head["mxu_util"]["256"]) == 13 and "fills 51% of a 128-wide MXU and 13% of a 256-wide one" in html, "head utilisation 51 / 13")
att = O["attention scores q k^T"]
ok(att["mxu_util"]["128"] == 0.25 and round(100 * att["mxu_util"]["256"]) == 6 and "fills 25% and 6%" in html, "attention utilisation 25 / 6")
ok(O["q"]["mxu_util"]["256"] == 0.25 and "every 128 &times; 128 projection of this model is 25% of a 256 &times; 256 array" in html, "projection 25% at 256")
ok(32000 == 250 * 128 and "32000</code> = 250 &times; 128" in html, "vocab 32000")
mx = max(o["ai_bf16"] for o in rf["ops"])
ok(mx == 99.9 and "99.9 FLOPs per byte" in html and round(G["v5p"]["ridge"]) == 166 and all(v["mem_bound_ops"] == 12 for v in rf["per_gen"].values()) and len(rf["ops"]) == 12, "all 12 memory-bound, max 99.9 < 166")
ok(round(rf["dot_flops_step"] / 1e9, 2) == 22.75 and round(rf["cost_analysis"]["flops"] / 1e9, 2) == 23.69 and "22.75 GFLOP" in html and "23.69 GFLOP" in html, "step GFLOP")
pg = rf["per_gen"]
ok(round(pg["v6e"]["t_peak_us"]) == 25 and round(pg["v6e"]["t_dots_us"]) == 236 and round(pg["v5e"]["t_dots_us"]) == 473 and round(pg["v5p"]["t_dots_us"]) == 140 and round(pg["7x"]["t_dots_us"]) == 52
   and "v6e would do them in 25 &micro;s" in html and "the bound is 236 &micro;s; v5e 473 &micro;s, v5p 140 &micro;s, TPU7x 52 &micro;s" in html, "step bounds per gen")
S7 = {r["tokens"]: r for r in rf["seven"]}
ok(round(rf["l7"]["params"] * 2 / 1e9, 1) == 13.5 and round(rf["l7"]["params"] / 1e9, 2) == 6.74 and "13.5 GB" in html and "6.74 billion parameters" in html, "7B params / bytes")
ok(round(S7[1]["v5e"]["ms"]) == 16 and S7[1]["v5e"]["tok_s"] == 62 and round(S7[1]["v6e"]["ms"], 1) == 8.1 and S7[1]["v6e"]["tok_s"] == 124 and round(S7[1]["7x"]["ms"], 1) == 1.8 and S7[1]["7x"]["tok_s"] == 558
   and "about 16 ms on v5e (62 tokens per second at best), 8.1 ms on v6e (124), 1.8 ms on TPU7x (558)" in html, "7B decode bounds")
ok(round(100 * S7[256]["v5e"]["frac_peak"]) == 97 and round(100 * S7[256]["v6e"]["frac_peak"]) == 42 and "v5e reaches 97% of its bf16 peak and v6e only 42%" in html, "7B at 256 tokens")
fr = [S7[1][g]["frac_peak"] for g in ("v4", "v5e", "v5p", "v6e", "7x")]
ok(round(100 * min(fr), 1) == 0.2 and round(100 * max(fr), 1) == 0.6 and "0.2 to 0.6% of bf16 peak" in html, "decode share of peak 0.2-0.6%")
# torus
T = {s["name"].split(" ")[0]: s for s in to["slices"]}
v5p = {tuple(m["mesh"]): m for m in T["v5p-4x4x4"]["meshes"]}
ok("axes" in v5p[(16, 4)] and "axes" in v5p[(4, 16)] and "error" in v5p[(8, 8)] and "NotImplementedError" in v5p[(8, 8)]["error"]
   and "(16, 4) and (4, 16) work; (8, 8) raises <code>NotImplementedError</code>" in html, "v5p cube placements")
ok(v5p[(16, 4)]["axes"][1]["phys"] == ["x"] and v5p[(16, 4)]["axes"][1]["max_hop"] == 1 and v5p[(16, 4)]["axes"][0]["phys"] == ["y", "z"], "v5p (16,4): model on x, fsdp on y and z")
v5e = {tuple(m["mesh"]): m for m in T["v5e-16x16"]["meshes"]}
ok(max(a["max_hop"] for a in v5e[(32, 8)]["split_axes"]) == 9 and "neighbours up to 9 hops apart" in html, "v5e split: 9 hops")
x7 = {tuple(m["mesh"]): m for m in T["TPU7x-4x4x4"]["meshes"]}
ok(x7[(64, 2)]["axes"][1] == {"phys": ["c"], "max_hop": 0} and "0 hops apart" in html, "7x model axis of 2 on the cores")
ok(to["src"]["reversed_loop"] == 321 and "mesh_utils.py:321" in html and to["src"]["make_mesh_split"] == 962 and "sharding_impls.py:962" in html and to["src"]["priority"] == 316 and "mesh_utils.py:316" in html, "torus source lines")
# pallas
m = pa["matmul"]
ok(f'{m["err_f32"]:.1e}' == "2.5e-07" and round(m["max_abs_ref"], 2) == 0.26 and "2.5e-7 on outputs up to 0.26" in html, "matmul error")
ok(f'{m["err_bf16_inputs"]:.1e}' == "7.1e-04" and "7.1e-4" in html and f'{m["bf16_vs_xla_bf16"]:.1e}' == "1.2e-07" and "1.2e-7" in html, "bf16 errors")
f = pa["flash"]
ok(f'{f["err"]:.1e}' == "8.9e-08" and "8.9e-8" in html and f["blocks_run"] == 384 and f["blocks_total"] == 512 and "only 384 of its 512 blocks" in html, "flash error and blocks")
ok(round(f["scores_bytes"] / 1e6, 1) == 8.4 and "8.4 MB score matrix" in html, "flash scores 8.4 MB")
t = pa["timing"]
ok(round(t["mm_interp_ms"] / t["mm_xla_ms"]) == 10 and round(t["att_interp_ms"] / t["att_xla_ms"]) == 70 and "10 times slower than XLA on the matmul and 70 times on attention" in html, "interpret slowdowns")
ok(round(t["load"]) == 29 and "load about 29" in html, "load average")
h = pa["interp_hlo"]
ok(h["lines"] == 147 and h["whiles"] == 1 and h["dynamic_slices"] == 3 and h["dynamic_update_slices"] == 3 and h["xla_lines"] == 6
   and "147 lines of StableHLO with one <code>while</code> loop over the 32 grid points, 3 <code>dynamic_slice</code> and 3 <code>dynamic_update_slice</code>, where <code>a @ b</code> lowers to 6" in html, "interpret HLO counts")
B = {b["k"]: b for b in pa["bugs"]}
ok(B["nozero"]["plain"]["nan"] and B["nozero"]["tpu"]["nan"], "bug 1 NaN in both")
ok(B["kparallel"]["plain"]["err"] < 1e-5 and round(B["kparallel"]["tpu"]["err"], 2) == 0.17 and B["kparallel"]["tpu"]["first_k_tile0"] == 1
   and "error of 0.17" in html and "ran k = 1 before k = 0" in html, "bug 2")
ok(not B["oob"]["plain"]["raised"] and B["oob"]["tpu"]["raised"], "bug 3 silent vs raised")
ok(pa["mosaic_flash"]["ok"] and pa["mosaic_flash"]["n_matmul"] == 2 and "to two <code>tpu.matmul</code> ops" in html, "flash lowers, 2 tpu.matmul")
ok(pa["mosaic"]["stablehlo_custom_calls"] == 1, "one tpu_custom_call")
ok(pa["bad_block"]["raised"] and f'{pa["bad_block"]["interpret_err"]:.1e}' == "2.1e-07" and "error 2.1e-7" in html, "bad block")
ok(all(x["lowers"] for x in pa["traffic"]), "all six block choices lower for TPU")
s7 = {(x["bm"], x["bn"], x["bk"]): x for x in pa["traffic7b"]}
a, b2 = s7[(128, 128, 128)], s7[(512, 5504, 256)]
ok(round(a["hbm_bytes"] / a["min_bytes"], 1) == 19.6 and round(b2["hbm_bytes"] / b2["min_bytes"], 1) == 3.2 and int(b2["vmem_bytes"] / 2**20) == 27
   and "move 19.6 times the minimum" in html and "3.2 times the minimum in 27 MiB" in html, "7B traffic")
w2 = pa["walk_2core"]["points"]
ok(sorted({p[0] for p in w2 if p[3] == 0}) != sorted({p[0] for p in w2 if p[3] == 1}) and len({p[0] for p in w2 if p[3] == 0}) == 4 and "each core took 4 of the 8 row blocks" in html, "2-core walk split")
ok(sr["default_arbitrary"]["line"] == 778 and "lowering.py:778" in html and sr["hlo_ignores"]["line"] == 329 and "hlo_interpreter.py:329" in html and sr["vmem_limit"]["line"] == 97 and "mosaic/core.py:97" in html, "pallas source lines")
ok("base.yml:684" in html and "maxtext_utils.py:2086" in html and "attention_op.py:29" in html, "maxtext lines quoted")
# MaxText lines really are what the prose says (pinned clone, if present)
mt = os.path.join(os.environ.get("JX_SCRATCH", "/nonexistent"), "src", "maxtext", "src", "maxtext")
if os.path.isdir(mt):
    L = lambda f, n: open(os.path.join(mt, f)).read().splitlines()[n - 1]
    ok(L("configs/base.yml", 684).startswith("mesh_axes: ['diloco', 'data'"), "base.yml:684 is mesh_axes")
    ok("mesh_utils.create_device_mesh(" in L("utils/maxtext_utils.py", 2086), "maxtext_utils.py:2086")
    ok("splash_attention_kernel" in L("layers/attention_op.py", 29), "attention_op.py:29")
    ok("head_dim: 128" in open(os.path.join(mt, "configs/models/llama2-7b.yml")).read(), "llama2-7b head_dim 128")
else:
    print("skip MaxText line checks (set JX_SCRATCH)")

# 3. privacy
login = os.environ.get("USER") or os.path.basename(os.path.expanduser("~"))
pats = ["/" + "Users/", "Users" + "-", "/" + "private/", login, "gl" + "pat", "sk" + "-ant", "." + "local/"]
email = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}")
bad = []
files = [os.path.join(HERE, f) for f in os.listdir(HERE)] + [os.path.join(HERE, "out", f) for f in os.listdir(os.path.join(HERE, "out"))] \
    + [os.path.join(PARTS, f) for f in os.listdir(PARTS) if f.startswith("35_")]
for p in files:
    if os.path.isfile(p):
        s = open(p, errors="ignore").read()
        bad += [os.path.basename(p) + ":" + x for x in pats if x in s] + [os.path.basename(p) + ":email" for _ in email.findall(s)[:1]]
ok(not bad, "privacy " + ", ".join(bad))
print("FAIL" if fails else "PASS", len(fails))
sys.exit(1 if fails else 0)
