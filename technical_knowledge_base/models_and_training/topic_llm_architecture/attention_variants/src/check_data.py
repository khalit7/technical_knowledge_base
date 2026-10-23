"""Check that the built page embeds exactly the recorded data, and that numbers written in the HTML prose match it.

Run: python3 check_data.py   (exit 1 on any mismatch). Reads ../index.html, out/*.json, inputs/code_quotes.json.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
O = lambda n: json.load(open(os.path.join(HERE, "out", n)))
bad = []


def glob(name):
    m = re.search(r"window\." + name + r"=(\{.*?\});\n", page, re.S)
    return json.loads(m.group(1))


# 1. embedded data equals the recorded outputs
AVR, AVK, AVL = glob("AVR"), glob("AVK"), glob("AVL")
if AVL["rungs"] != O("ladder.json")["rungs"]:
    bad.append("AVL differs from out/ladder.json")
tk = O("topk_mass.json")
if AVK["stats"]["smollm2"]["layers"] != tk["smollm2"]["layers"] or AVK["stats"]["tiny_at_mha"]["layers"] != tk["tiny_at_mha"]["layers"]:
    bad.append("AVK stats differ")
if AVK["rows"] != [{k: r[k] for k in ("layer", "q", "mean_max", "mean", "head", "head_max", "head_row")} for r in tk["explorer"]["rows"]]:
    bad.append("AVK rows differ")
for k, f in (("kv_rank", "kv_rank.json"), ("uptrain", "uptrain.json"), ("mla", "mla_absorb.json")):
    if AVR[k] != O(f):
        bad.append(f"AVR.{k} differs from {f}")
RE = O("runs_eval.json")
if AVR["window_sweep"] != RE["window_sweep"] or AVR["sinks"] != RE["sinks"]:
    bad.append("AVR window_sweep/sinks differ")
for r in RE["runs"]:
    e = AVR["runs"].get(r["run"])
    if not e or e["val_loss_100win"] != r["val_loss_100win"] or e["val_loss_20win"] != r["val_loss_20win"]:
        bad.append("run " + r["run"])
if AVR["code"] != json.load(open(os.path.join(HERE, "inputs", "code_quotes.json"))):
    bad.append("code quotes differ")
if O("ladder_check.json")["mismatches"]:
    bad.append("ladder_check mismatches")

# 2. prose numbers (literal strings in the HTML) against the data
run = {r["run"]: r for r in RE["runs"]}
kr = O("kv_rank.json"); up = O("uptrain.json"); ml = O("mla_absorb.json")
conv = {(c.get("kv_heads"), c.get("rank")): c["held_out_20win"] for c in kr["conversions"]}
upr = {r["kv_heads"]: r for r in up["rows"]}
f3 = lambda v: f"{v:.3f}"
checks = [
    ("averaging the tiny MHA's 8 KV heads into 2 took held-out loss from 2.137 to 4.276", f3(kr["held_out_20win"]) == "2.137" and f3(conv[(2, None)]) == "4.276"),
    ("5% uptraining brought it back to 2.481 and 10% to 2.317", f3([u for u in upr[2]["uptrain"] if u["steps"] == 75][0]["held_out_20win"]) == "2.481" and f3([u for u in upr[2]["uptrain"] if u["steps"] == 150][0]["held_out_20win"]) == "2.317"),
    ("a GQA-2 trained from the start reached 2.160 (20 windows)", f3(run["at_gqa2"]["val_loss_20win"]) == "2.160"),
    ("onto 64 directions cost 0.093 and onto 128 directions 0.009", f3(conv[(None, 64)] - kr["held_out_20win"]) == "0.093" and f3(conv[(None, 128)] - kr["held_out_20win"]) == "0.009"),
    ("projection: +0.009 at 128 numbers", f3(conv[(None, 128)] - kr["held_out_20win"]) == "0.009"),
    ("moves attention weights by up to 0.40", f"{max(l['rope_trap_weight_err'] for l in ml['layers']):.2f}" == "0.40"),
    ("reads 57x fewer bytes than an expanded cache", round(ml["deepseek_v3"]["costs_T32768"]["cache expanded K and V"]["bytes"] / ml["deepseek_v3"]["costs_T32768"]["absorbed"]["bytes"]) == 57),
    ("about 3.7x the arithmetic", f"{ml['deepseek_v3']['costs_T32768']['absorbed']['flops'] / ml['deepseek_v3']['costs_T32768']['cache expanded K and V']['flops']:.1f}" == "3.7"),
    ("MLA (d<sub>c</sub> 64, d<sub>r</sub> 16) at 2.255 held-out (seed 1: 2.248)", f3(run["at_mla"]["val_loss_100win"]) in ("2.255",) and f3(run["at_mla_s1"]["val_loss_100win"]) == "2.248"),
    ("hold 75% to 94% of its attention in layers 13 to 30", True),
]
checks.append(("(MHA 2.160 and 2.175 on 100 windows)", f3(run["at_mha"]["val_loss_100win"]) == "2.160" and f3(run["at_mha_s1"]["val_loss_100win"]) == "2.175"))
checks.append(("land at 2.185, 2.182 and 2.177 (seed 1: 2.185) against MHA's 2.160 (seed 1: 2.175)", [f3(run[n]["val_loss_100win"]) for n in ("at_gqa4", "at_gqa2", "at_mqa", "at_mqa_s1")] == ["2.185", "2.182", "2.177", "2.185"]))
deep = [r for r in tk["smollm2"]["layers"] if r["layer"] >= 13]
checks[-1] = ("hold 75% to 94% of its attention in layers 13 to 30", f"{100*min(r['topk']['16'] for r in deep):.0f}" == "75" and f"{100*max(r['topk']['16'] for r in deep):.0f}" == "94")
checks.append(("last 64 keys plus position 0 hold only 46% to 76%", f"{100*min(r['window64_plus_tok0'] for r in deep):.0f}" == "46" and f"{100*max(r['window64_plus_tok0'] for r in deep):.0f}" == "76"))
sp = kr["spectrum"]; fx = lambda key, r: [x[key][r] for x in sp]
checks.append(("the top 64 directions hold 94.2% to 99.6% of their variance and the top 128 hold 99.3% to 99.98%", f"{100*min(fx('kv','64')):.1f} {100*max(fx('kv','64')):.1f} {100*min(fx('kv','128')):.1f} {100*max(fx('kv','128')):.2f}" == "94.2 99.6 99.3 99.98"))
checks.append(("32 directions (what MQA keeps) hold 84% to 94%", f"{100*min(fx('k','32')):.0f} {100*max(fx('k','32')):.0f}" == "84 94"))
for extra in json.load(open(os.path.join(HERE, "out", "prose_checks.json"))) if os.path.exists(os.path.join(HERE, "out", "prose_checks.json")) else []:
    checks.append((extra["text"], extra["ok"]))
for text, ok in checks:
    if text not in page:
        bad.append("prose not found: " + text)
    elif not ok:
        bad.append("prose number wrong: " + text)
print(len(checks), "prose checks;", "OK" if not bad else "\n".join(bad))
sys.exit(1 if bad else 0)
