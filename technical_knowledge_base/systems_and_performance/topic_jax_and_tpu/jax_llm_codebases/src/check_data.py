"""The page embeds exactly the recorded data, and the numbers written in the prose agree with it.
Run: python3 -B check_data.py   (after sh build.sh)"""
import os, json, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
part = open(os.path.join(HERE, "parts", "22_js_lc_data.js"), encoding="utf-8").read()
subprocess.run([sys.executable, "-B", os.path.join(HERE, "build_data.py")], check=True, capture_output=True)
fresh = open(os.path.join(HERE, "parts", "22_js_lc_data.js"), encoding="utf-8").read()
fails = 0
def ok(c, m):
    global fails
    print(("ok   " if c else "FAIL ") + m); fails += (not c)
ok(part == fresh, "parts/22_js_lc_data.js is what build_data.py makes from out/*.json")
ok(fresh[fresh.index("window.LC="):].strip() in page, "index.html embeds that data verbatim")
D = json.loads(fresh[fresh.index("=") + 1:].strip().rstrip(";"))
text = re.sub(r"<script.*?</script>", " ", page, flags=re.S); text = re.sub(r"<[^>]+>", " ", text).replace("&amp;", "&")
def has(s, why):
    ok(s in text, f"prose has {s!r} ({why})")
c0 = D["cfg"]
has(f"{c0['base_lines']:,} lines, {c0['base_keys']} top-level keys", "base.yml size")
has(f"{c0['n_models']} model files", "model files"); has(f"with {c0['n_fields']} fields", "pydantic fields")
sh0 = D["shard"]["cases"][0]
has(f"{sh0['params']:,} parameters in {sh0['n']} arrays", "Llama 2 7B"); has(f"{sh0['bytes']/1e9:.2f} GB in float32 and {sh0['bytes_dev']/1e9:.2f} GB per device", "bytes")
has(f"{D['shard']['cases'][1]['bytes_dev']-sh0['bytes_dev']:,} bytes per device", "norm rule delta")
has(f"{D['shard']['cases'][2]['n']} arrays", "unscanned arrays")
has(f"{D['fwd']['n_params_maxtext']:,} parameters", "running example in MaxText")
has(f"{D['map']['totals_py']['maxtext']['lines']:,} lines of Python", "MaxText size")
has(f"{D['map']['totals_py']['levanter']['files']} Python files, {D['map']['totals_py']['levanter']['lines']:,} lines", "Levanter size")
T = D["train"]; s0 = sum(T["s0"]["calls"].values()); s1 = sum(T["s1"]["calls"].values())
has(f"{s0:,} Python calls, {T['s0']['calls']['maxtext']:,} of them in MaxText's own code across {len(T['s0']['fns'])} functions, {T['s0']['wall']:.2f} s", "step 0")
has(f"Step 1: {s1} calls", "step 1"); has(f"none in MaxText, {T['s1']['wall']:.3f} s", "step 1 time")
has(f"{T['var_diff']['warmup_from_step1']:.3f}", "warmup effect"); has(f"{T['var_diff']['decay_everything']:.4f}", "decay effect"); has(f"{T['var_diff']['exact_gelu']:.5f}", "gelu effect")
has(f"({T['mt'][1]:.4f})", "MaxText loss step 1"); has(f"{T['re'][1]:.4f}", "running example loss step 1")
re_ = json.load(open(os.path.join(HERE, "..", "..", "src", "data", "equiv.json")))["train"]["loss"]["jax"][:T["steps"]]
ok(max(abs(a - b) for a, b in zip(re_, T["var"]["running_example_settings"])) < 4.9e-7 + 1e-9, "running-example variant reproduces the root's curve within 4.9e-7")
R = {(r["remat_policy"], r["scan_layers"]): r for r in D["remat"]["rows"]}
has(f"{R[('minimal', True)]['temp_bytes']/1e6:.1f} MB of XLA temporaries against {R[('full', True)]['temp_bytes']/1e6:.1f} MB", "remat memory")
has(f"{R[('full', False)]['flops']/1e9:.2f} GFLOP against {R[('minimal', False)]['flops']/1e9:.2f} GFLOP", "remat flops")
has(f"{(R[('full', False)]['flops']-R[('minimal', False)]['flops'])/1e9:.2f} GFLOP of recomputed", "recompute")
has(f"{R[('full', True)]['hlo_lines']:,} lines of optimised HLO against {R[('full', False)]['hlo_lines']:,}", "HLO lines")
has(f"{R[('full', True)]['flops']/1e9:.2f} GFLOP for the scanned step", "scanned flops")
has(f"({R[('save_out_proj', True)]['temp_bytes']/1e6:.1f} MB against", "save_out_proj")
M = D["mfu"]; rx = M["runex"]
has(f"{rx['maxtext_gflop_per_step']:.2f} GFLOP ({rx['learnable_gflop']:.2f} in weight matmuls, {rx['attention_gflop']:.2f} in attention)", "MaxText count of the running example")
r8 = next(r for r in M["rows"] if r["model"] == "llama3.1-8b")
has(f"{r8['implied_mfu_noncausal_pct']:.2f}% implied against {r8['published_mfu_pct']}% published", "8B old count"); has(f"{r8['implied_mfu_pct']:.2f}%", "8B current")
ok(sum(abs(r["implied_mfu_noncausal_pct"] - r["published_mfu_pct"]) <= 0.0201 for r in M["rows"]) == 5, "five rows within 0.02 of the old count")
B = D["tunix"]["B"]
ok(round(B["full_ft"]["val_before"], 4) == 2.0692, "LoRA base validation 2.0692")
H = D["hal"]; ok(H["max_abs_diff_named_vs_plain_attention"] == 0.0, "Haliax attention exact")
has("Step 0 enters 90 MaxText functions", "stepper title")
print("FAILED", fails if fails else "") if fails else print("ALL OK")
sys.exit(1 if fails else 0)
