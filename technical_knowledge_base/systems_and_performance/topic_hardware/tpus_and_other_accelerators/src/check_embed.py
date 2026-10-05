"""Confirm that numbers in the page's prose and tables match out/recompute.json and that the
Reading animation embeds exactly case 0 of out/systolic_ref.json. Run from src/: python3 check_embed.py"""
import json, re, os
here = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(here, "..", "index.html"), encoding="utf-8").read()
R = json.load(open(os.path.join(here, "out", "recompute.json")))
ref = json.load(open(os.path.join(here, "out", "systolic_ref.json")))
fmt = lambda x, d=0: f"{x:,.{d}f}"
pk = {r["gen"]: r for r in R["tpu_peaks"]}
a = R["anim"]
need = [
    (f"{R['ex_flops'] / 1e11:.2f} &times; 10<sup>11</sup>", "running example FLOPs"),
    (f"{R['ex_tiles_128'] // 112} &times; 112 = {fmt(R['ex_tiles_128'])} tiles", "tiles on 128"),
    (f"= {R['ex_reads_per_mac']}", "reads per multiply-add"),
    (f"{a['systolic_total_cycles']} cycles against {a['lane_cycles']}", "animation cycles"),
    (f"read storage {a['sys_reads']} times against {a['lane_operand_reads']}", "animation reads"),
    (f"{round(100 * R['pad_130_util'])}% utilisation", "padding 130"),
    (f"{fmt(pk['v1']['peak_tf'], 1)} TOPS", "v1"), (f"{fmt(pk['v2']['peak_tf'], 1)} TF", "v2"),
    (f"{fmt(pk['v3']['peak_tf'], 1)} TF", "v3"), (f"{fmt(pk['v4']['peak_tf'], 1)} TF", "v4"),
    (f"{fmt(pk['v5e']['peak_tf'], 1)} TF", "v5e"),
    (f"needs {pk['v5p']['clock_needed_ghz']} GHz", "v5p clock"), (f"needs {pk['v6e']['clock_needed_ghz']} GHz", "v6e clock"),
    (f"{R['ar_v5p_axis_s']:.3f} s", "all-reduce one axis"), (f"{R['ar_v5p_3axes_s']:.3f} s", "three axes"),
    (f"{R['ar_v5p_nowrap_s']:.3f} s", "no wraparound"), (f"predicts {R['sb_ag_us']} &mu;s", "book example"),
    (f"{R['sb_ag_nowrap_us']} &mu;s without", "book example no wrap"),
    (f"6 &times; 16 / 2 = {R['v4_ocs']} switches", "OCS count"), (f"{R['v7x_cubes']} cubes of 64", "Ironwood cubes"),
    (f"{R['ironwood_pod_hbm_pb']} PB", "pod HBM"), (f"{R['ironwood_pod_bf16_ef']} EF", "pod bf16"),
    (f"{R['w70_gb']} GB / 44 GB", "Cerebras 70B"), (f"= {R['wse3_per_core_kb']} KB", "WSE-3 per core"),
    (f"{R['groq_mib_in_mb']} MB", "Groq MiB"), (f"= {R['trn2_core_tf']} TFLOPS per core", "Trn2 core"),
    (f"= {R['trn2_chip_tf']} TFLOPS", "Trn2 chip"), (f"= {fmt(R['mi300x_bf16'], 1)} TFLOPS", "MI300X"),
    (f"= {fmt(R['mi355x_bf16'], 1)} TFLOPS", "MI355X"), (f"= {R['mi300x_if']} GB/s", "MI300X IF"),
    (f"= {fmt(R['mi355x_if'], 1)} GB/s", "MI355X IF"), (f"{R['grad_gb']} GB", "8B gradients"),
]
bad = 0
for s, what in need:
    if s not in html:
        bad += 1; print("MISSING", what, repr(s))
assert 240 <= R["ex_reads_ratio"] <= 260 and "about 250 times fewer" in html, "reads ratio"
# the animation's embedded matrices are case 0 of the reference
c0 = ref["cases"][0]
m = re.search(r"const X=(\[\[.*?\]\]);\s*const W=(\[\[.*?\]\]);", html)
assert m and json.loads(m.group(1)) == c0["X"] and json.loads(m.group(2)) == c0["W"], "animation matrices differ from systolic_ref case 0"
print(f"check_embed: {len(need) - bad} of {len(need)} prose numbers found; animation matrices = reference case 0" if not bad else f"check_embed: {bad} missing")
raise SystemExit(1 if bad else 0)
