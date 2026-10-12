"""Checks for the Compile lab tab: the page embeds exactly the data build_data.py writes, and the numbers written
into the prose (static HTML or filled by the tab's JavaScript) agree with the recorded inputs.
Usage: python3 check_page.py <rendered tab text file>   (the text comes from a headless browser; see README)"""
import json, os, re, sys, statistics
H = os.path.dirname(os.path.abspath(__file__)); I = os.path.join(H, "inputs")
html = open(os.path.join(H, "..", "..", "index.html")).read()
part = open(os.path.join(H, "..", "parts", "32_cmp_data.js")).read()
m = re.search(r"window\.CMP=(.*?);\n", part)
assert m and ("window.CMP=" + m.group(1)) in html, "index.html does not embed parts/32_cmp_data.js"
C = json.loads(m.group(1))
txt = open(sys.argv[1]).read()
fails = []
def need(s, why):
    if s not in txt:
        fails.append(f"missing '{s}' ({why})")
def J(n):
    t = open(os.path.join(I, n)).read().strip()
    return json.loads(t if n.startswith(("model_", "fusion", "breaks", "export")) else t.split("\n")[-1])
mc = J("model_cpu.json"); F = J("fusion.json"); B = J("breaks.json"); E = J("export.json")
fmt = lambda n: f"{n:,}"
# static prose numbers against data
need(fmt(mc["params"]), "parameter count"); need("34.76 MB", "eager saved, FACTS stp"); need("524,288", "GELU elements = 8*64*1024")
assert F["new_gelu"]["numel"] == 524288 and F["new_gelu"]["input_shapes"][0] == [8, 64, 1024]
assert [o["op"] for o in F["new_gelu"]["eager_ops"]] == ["mul", "pow", "mul", "add", "mul", "tanh", "add", "mul"], "op order behind the animation labels"
# per-op read bytes implied by the animation's labels (2 MiB per tensor read) equal the recorded reads
reads = [1, 1, 1, 2, 1, 1, 1, 2]
assert [o["read"] for o in F["new_gelu"]["eager_ops"]] == [r * 2097152 for r in reads]
assert [o["read"] for o in F["add_ln"]["eager_ops"]] == [2 * 524288, 524288 + 2048]
ratio = sum(o["read"] + o["write"] for o in F["new_gelu"]["eager_ops"]) / (F["new_gelu"]["compiled_read"] + F["new_gelu"]["compiled_write"])
need(f"{ratio:.0f}x fewer bytes", "interview answer"); need(f"moves {ratio:.0f} times fewer", "predict")
need("recompile_limit (8)", "interview"); assert B["dynamic_note"]["recompile_limit"] == 8
assert len(json.load(open(os.path.join(I, "model_cpu.json")))["aot"]["saved"]) - 27 == 63
need("52 tensors", "export: 52 parameter tensors"); assert E["n_params_inputs"] == 53
need(f"{mc['eager']['fwd_calls']} dispatcher calls to {len(mc['inductor'][0]['launches'])} launches", "section 7 prose")
need(f"{mc['guards']['total']} guards", "pipeline box")
# derived numbers filled by JS, recomputed here
st = J("time_step_cpu.json")["results"]; sm = J("time_step_mps.json")["results"]
need(f"{sm['eager']['median_ms'] / sm['compiled']['median_ms']:.2f}x", "MPS speed-up head")
cold = sorted(json.loads(l)["first_call_ms"] for l in open(os.path.join(I, "time_first.jsonl")) if '"cold"' in l)
need(f"{cold[0] / 1000:.1f} to {cold[-1] / 1000:.1f} s", "cold compile range")
base = J("time_breaks.json")["results"]["none"]["median_ms"]
d = [J("time_breaks.json")["results"][k]["median_ms"] - base for k in ("print", "item", "if", "numpy")]
need(f"({100 * min(d) / base:.0f} to {100 * max(d) / base:.0f}%)", "break cost")
pf = B["breaks"]["print"]["pieces_per_forward"]; need(f"ran {pf} of them per forward", "predict 2")
for k in ("new_gelu",):
    tc = J("time_fusion_cpu.json")["results"][k]
    need(f"{tc['eager']['median_ms'] / tc['compiled']['median_ms']:.1f}x", "fusion speed-up CPU")
print("checks:", "FAIL" if fails else "ok", *fails, sep="\n  ")
sys.exit(1 if fails else 0)
