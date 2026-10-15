"""Checks that the built page embeds exactly the recorded data, that numbers in the prose match the data,
that every file:line the page quotes was located by runs/tq_source.py, and that nothing private leaks.
Plain python3: python3 src/check_data.py"""
import html, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
OUT = lambda n: json.load(open(os.path.join(HERE, "out", n)))
fails = []


def ok(cond, msg):
    if not cond:
        fails.append(msg)


# 1. embedded data == what build_data.py writes from out/*.json now
before = open(os.path.join(HERE, "parts", "22_js_tq_data.js")).read()
subprocess.run([sys.executable, "-I", "-B", os.path.join(HERE, "build_data.py")], check=True, capture_output=True)
after = open(os.path.join(HERE, "parts", "22_js_tq_data.js")).read()
ok(before == after, "parts/22_js_tq_data.js is stale: rerun build_data.py and build.sh")
ok(after.strip() in PAGE, "index.html does not embed the current data: rerun build.sh")

# 2. prose numbers against data
text = re.sub(r"<[^>]+>", " ", PAGE)
text = re.sub(r"\s+", " ", html.unescape(text))
prec, remat, mfu, gens = OUT("precision.json"), OUT("remat.json"), OUT("mfu.json"), {g["gen"]: g for g in OUT("gens.json")["gens"]}
rc, sl = OUT("recompute.json"), OUT("slices.json")
P = {r["policy"]: r for r in remat["rows"]}
none, full, dots = P["none (save everything)"], P["nothing_saveable (full remat)"], P["dots_saveable"]
d1 = next(r for r in prec["rows"] if r["passes"] == 1)
R = {(r["model"], r["gen"]): r for r in mfu["rows"]}
causal_gap = [(r["mfu"] - r["mfu_recomputed"]) * 100 for r in mfu["rows"]]
repro = [r for r in mfu["rows"] if abs(r["mfu"] - r["mfu_noncausal"]) * 100 <= 0.25]
CHECKS = [
    ("up to 0.096", round(d1["max_abs_logit_err"], 3) == 0.096),
    ("from 357.6 MB to 21.1 MB", round(none["residual_bytes"] / 1e6, 1) == 357.6 and round(full["residual_bytes"] / 1e6, 1) == 21.1),
    ("for 28% more FLOPs", round((full["flops"] / none["flops"] - 1) * 100) == 28),
    ("17-fold", round(none["residual_bytes"] / full["residual_bytes"]) == 17),
    ("costs 5% more FLOPs and keeps 36% of the bytes", round((dots["flops"] / none["flops"] - 1) * 100) == 5 and round(dots["residual_bytes"] / none["residual_bytes"] * 100) == 36),
    ("2.7-fold cut", round(none["residual_bytes"] / dots["residual_bytes"], 1) in (2.7, 2.8)),
    ("4.21168", round(none["loss"], 5) == 4.21168 and len({round(r["loss"], 6) for r in remat["rows"]}) == 1),
    ("relative 2e-3", round(d1["rel_err"], 3) == 0.002),
    ("0.3% of next-character", round((1 - d1["argmax_agree"]) * 100, 1) == 0.3),
    ("moved by 3e-5", round(abs(d1["loss"] - prec["loss_f64"]) * 1e5) == 3),
    ("33 forward matmuls", d1["dot_calls"] == 33),
    ("Six of MaxText's eight published MFUs reproduce (within a quarter of a point)", len(repro) == 6),
    ("0.8 to 5.1 points", round(min(causal_gap), 1) == 0.8 and round(max(causal_gap), 1) == 5.1),
    ("67.0% non-causal against 65.4%", round(R[("Llama 2 70B", "v5p")]["mfu_noncausal"] * 100, 1) == 67.0),
    ("35.2% against 38.55%", round(R[("Llama 3.1 405B", "v6e")]["mfu_noncausal"] * 100, 1) == 35.2),
    ("13% of its FLOPs counted causally and 22%", (lambda r: round(r["flops_tok_attn"] / r["flops_tok"] * 100) == 13 and round(2 * r["flops_tok_attn"] / (r["flops_tok_weights"] + 2 * r["flops_tok_attn"]) * 100) == 22)(R[("Llama 3.1 8B", "v6e")])),
    ("40.4% or 45.5%", round(R[("Llama 3.1 8B", "v6e")]["mfu_recomputed"] * 100, 1) == 40.4 and round(R[("Llama 3.1 8B", "v6e")]["mfu_noncausal"] * 100, 1) == 45.5),
    ("$6.10 per million tokens on v6e against $6.51 on H100", round(R[("Llama 3.1 405B", "v6e")]["usd_per_mtok"], 2) == 6.10 and round(mfu["gpu"]["usd_per_mtok"], 2) == 6.51),
    ("about 240 tokens on v5e, 166 on v5p, 560 on v6e, 313 on TPU7x", all(abs(gens[k]["bf16"] / gens[k]["bw"] - v) < 1 for k, v in zip(("v5e", "v5p", "v6e", "7x"), (240, 166, 560, 313)))),
    ("17.4 ms per step at batch 1 (57 tokens per second), 100 ms at batch 64 and 331 ms at batch 240 (725 tokens per second)",
     round(rc["decode"]["v5e"]["1"]["step"] * 1e3, 1) == 17.4 and round(rc["decode"]["v5e"]["64"]["step"] * 1e3) == 100 and round(rc["decode"]["v5e"]["240"]["step"] * 1e3) == 331 and int(rc["decode"]["v5e"]["240"]["tok_s"]) == 725 and int(rc["decode"]["v5e"]["1"]["tok_s"]) == 57),
    ("D > 8,755 on v5e", int(rc["sb_ici_D"]) == 8755),
    ("12,222 on v4, 10,200 on v5p, 20,400 on v6e and 51,267 on TPU7x", [round(2 * gens[k]["bf16"] / gens[k]["sb"]["link_oneway"]) for k in ("v4", "v5p", "v6e", "7x")] == [12222, 10200, 20400, 51267]),
    ("340 TFLOP/s per dollar-hour, against 192 for TPU7x ($12.00), 164 for v5e ($1.20), 109 for v5p ($4.20) and 85 for v4 ($3.22)",
     [round(gens[k]["bf16"] / 1e12 / gens[k]["price_v"]) for k in ("v6e", "7x", "v5e", "v5p", "v4")] == [340, 192, 164, 109, 85]),
    ("49 slice shapes", len(sl["rows"]) == 49),
    ("pads only to [72, 128]", rc["tiles"][1][3] > 1.1),
]
for s, cond in CHECKS:
    ok(s in text, "prose missing: " + s)
    ok(cond, "prose number does not match data: " + s)

# 3. file:line references
src = OUT("source.json")
known = {(v["file"], v["line"]) for v in src.values()}
known |= {("benchmarks/maxtext_trillium_model_configs.py", r["recipe_line"]) for r in mfu["rows"] if r.get("recipe_line")}
for f, l in re.findall(r"((?:jax/_src|src/maxtext|benchmarks|configs|layers)/[\w/.]+\.(?:py|yml)):(\d+)", text):
    full = f if f.startswith(("jax/", "src/", "benchmarks/")) else "src/maxtext/" + f
    ok((full, int(l)) in known, f"unchecked source reference {f}:{l}")

# 4. privacy
for pat in ("/" + "Users/", "Users" + "-", "kha" + "lid", "gl" + "pat", "sk-" + "ant", "@ave" + "ni", "@gm" + "ail"):
    ok(pat not in PAGE, "privacy: " + pat)
print("\n".join("FAIL " + f for f in fails) or "all checks passed", f"({len(CHECKS)} prose checks)")
sys.exit(1 if fails else 0)
