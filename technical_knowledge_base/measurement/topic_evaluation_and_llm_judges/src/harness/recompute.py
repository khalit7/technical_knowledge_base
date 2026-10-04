# Recompute every number the "Same model, many harnesses" tab shows, from the saved extracts in inputs/
# and the offline reproduction in data/repro_raw.json, then write ../parts/32_js_harness_0data.js.
# Run: uv run --with pandas --with pyarrow python recompute.py [path to mmlu_test.parquet, for the micro average check]
import json, re, math, os, sys
H = os.path.dirname(os.path.abspath(__file__)); I = os.path.join(H, "inputs"); D = os.path.join(H, "data")
def rd(p): return open(os.path.join(I, p)).read()
ext = json.load(open(os.path.join(I, "open_llm_leaderboard_extracts.json")))
chk = []
def check(name, got, want, tol=0.05):
    ok = abs(got - want) <= tol; chk.append((name, round(got, 3), want, ok))
    if not ok: print("MISMATCH", name, got, want)
    return got

# ---- 1. HF blog table (23 Jun 2023): three implementations, eight models
blog = rd("hfblog_mmlu.md")
rows = re.findall(r"^\|\s*([\w./-]+)\s*\|\s*\**([\d.]+)\**\s*\|\s*\**([\d.]+)\**\s*\|\s*\**([\d.]+)\**\s*\|", blog, re.M)
blogtab = [{"m": m, "helm": round(float(a) * 100, 1), "harness": round(float(b) * 100, 1), "orig": round(float(c) * 100, 1)} for m, a, b, c in rows]
assert len(blogtab) == 8, blogtab
def ranks(key):
    o = sorted(blogtab, key=lambda r: -r[key]); return {r["m"]: i + 1 for i, r in enumerate(o)}
rk = {k: ranks(k) for k in ("orig", "helm", "harness")}
for r in blogtab: r["rk"] = [rk["orig"][r["m"]], rk["helm"][r["m"]], rk["harness"][r["m"]]]

# ---- 2. LLaMA paper Table 9 (5-shot)
t9 = rd("llama1_table9.txt")
m65 = re.search(r"65B\s+61\.8\s+51\.7\s+72\.9\s+67\.4\s+([\d.]+)", t9); paper65 = float(m65.group(1)); check("LLaMA-65B paper MMLU", paper65, 63.4)
m7 = re.search(r"\n\s+7B\s+34\.0\s+30\.5\s+38\.3\s+38\.1\s+([\d.]+)", t9); check("LLaMA-7B paper MMLU", float(m7.group(1)), 35.1)

# ---- 3. Open LLM Leaderboard v1 per-subject results: macro and micro averages
def macro(k): m = ext[k]["mmlu"]; return 100 * sum(m.values()) / len(m)
v1_65 = check("OLL v1 llama-65b macro", macro("huggyllama/llama-65b v1 2023-07-21"), 63.93, 0.01)
v1_l3 = check("OLL v1 Llama-3-8B macro", macro("meta-llama/Meta-Llama-3-8B v1 2024-05-28"), 66.70, 0.01)
v1_l270 = check("OLL v1 Llama-2-70b macro", macro("meta-llama/Llama-2-70b-hf v1 results.json"), 69.83, 0.01)
micro = {}
if len(sys.argv) > 1:
    import pandas as pd
    n = pd.read_parquet(sys.argv[1]).subject.value_counts().to_dict()
    for k in ("huggyllama/llama-65b v1 2023-07-21", "meta-llama/Meta-Llama-3-8B v1 2024-05-28"):
        m = ext[k]["mmlu"]; micro[k] = 100 * sum(m[s] * n[s] for s in m) / sum(n[s] for s in m)
    check("OLL v1 llama-65b micro", micro["huggyllama/llama-65b v1 2023-07-21"], 63.74, 0.01)
    check("OLL v1 Llama-3-8B micro", micro["meta-llama/Meta-Llama-3-8B v1 2024-05-28"], 65.46, 0.01)

# ---- 4. HELM MMLU leaderboard (release v1.13.0, 2025-01-10): all-subjects EM, mean over 57 subjects
helm = {r["model"]: r["em"] for r in json.load(open(os.path.join(I, "helm_mmlu_allsubjects_v1.13.json")))}
h_l3 = check("HELM Llama 3 (8B)", 100 * helm["Llama 3 (8B)"], 66.76, 0.01)
h_l31 = check("HELM Llama 3.1 Instruct Turbo (8B)", 100 * helm["Llama 3.1 Instruct Turbo (8B)"], 56.06, 0.01)
h_l270 = check("HELM Llama 2 (70B)", 100 * helm["Llama 2 (70B)"], 69.55, 0.01)
spec = json.load(open(os.path.join(I, "helm_runspec_l31_8b.json")))["adapter_spec"]
assert spec["max_tokens"] == 1 and spec["max_train_instances"] == 5 and spec["temperature"] == 0.0

# ---- 5. Llama 3.1 model card
card = re.sub(r"<[^>]+>", "|", rd("llama31_card.md")); card = re.sub(r"(\s*\|\s*)+", "|", card)
inst = re.search(r"Llama 3\.1 405B Instruct\|General\|MMLU\|5\|macro_avg/acc\|([\d.]+)\|([\d.]+)\|[\d.]+\|[\d.]+\|[\d.]+\|MMLU \(CoT\)\|0\|macro_avg/acc\|([\d.]+)\|([\d.]+)\|[\d.]+\|[\d.]+\|[\d.]+\|MMLU-Pro \(CoT\)\|5\|macro_avg/acc\|([\d.]+)\|([\d.]+)", card)
meta_l31_mmlu5, meta_l31_cot, meta_l31_pro = float(inst.group(2)), float(inst.group(4)), float(inst.group(6))
check("Meta L3.1 8B Instruct MMLU 5-shot", meta_l31_mmlu5, 69.4); check("Meta L3.1 8B Instruct MMLU CoT", meta_l31_cot, 73.0); check("Meta L3.1 8B Instruct MMLU-Pro CoT", meta_l31_pro, 48.3)
base = re.search(r"\|General\|MMLU\|5\|macro_avg/acc_char\|([\d.]+)\|([\d.]+)", card); meta_l3_8b = check("Meta Llama 3 8B MMLU", float(base.group(1)), 66.7)

# ---- 6. Open LLM Leaderboard v2 (lm-eval leaderboard tasks); normalised = (raw - 1/k) / (1 - 1/k) * 100
def v2(f): return ext[f]
l31 = v2("oll2_meta-llama_Llama-3.1-8B-Instruct_results_2025-02-13T18-27-04.338360.json")
pro_raw = check("OLL v2 L3.1-8B-Instruct MMLU-Pro raw", 100 * l31["mmlu_pro_acc"], 37.98, 0.01)
pro_norm = (l31["mmlu_pro_acc"] - 0.1) / 0.9 * 100
q72a = v2("oll2_Qwen_Qwen2.5-72B-Instruct_results_2024-10-24T00-00-00.000000.json"); q72b = v2("oll2_Qwen_Qwen2.5-72B-Instruct_results_2025-02-13T18-27-04.338360.json")
q7a = v2("oll2_Qwen_Qwen2.5-7B-Instruct_results_2024-10-24T00-00-00.000000.json"); q7b = v2("oll2_Qwen_Qwen2.5-7B-Instruct_results_2025-02-13T18-27-04.338360.json")
assert q72a["date_field"] == q72b["date_field"] and q7a["date_field"] == q7b["date_field"], "re-score, not a re-run"
assert q72a["mmlu_pro_acc"] == q72b["mmlu_pro_acc"]
mh = {"q72": [100 * q72a["math_hard_exact_match"], 100 * q72b["math_hard_exact_match"]], "q7": [100 * q7a["math_hard_exact_match"], 100 * q7b["math_hard_exact_match"]]}
check("Qwen72 MATH old", mh["q72"][0], 1.21, 0.01); check("Qwen72 MATH new", mh["q72"][1], 59.82, 0.01); check("Qwen7 MATH new", mh["q7"][1], 50.0, 0.01)
llama65_v2 = ext["ollv2_llama65b.json"]["mmlu_pro_acc"] * 100

# ---- 7. Inspect evals MMLU README table (200 samples)
ins = rd("inspect_mmlu_readme.md")
def itab(name):
    blk = ins.split("### " + name)[1].split("###")[0]
    return {m: float(a) * 100 for m, a in re.findall(r"^\|\s*([\w.-]+)\s*\|\s*\w+\s*\|\s*([\d.]+)\s*\|", blk, re.M)}
i0, i5 = itab("mmlu_0_shot"), itab("mmlu_5_shot")
check("Inspect Sonnet 4.5 0-shot", i0["claude-sonnet-4-5-20250929"], 36.0); check("Inspect Sonnet 4.5 5-shot", i5["claude-sonnet-4-5-20250929"], 54.5)

json.dump({"blogtab": blogtab, "paper65": paper65, "v1_65": v1_65, "micro": micro, "checks": chk}, open(os.path.join(D, "published_check.json"), "w"), indent=1)
print(sum(c[3] for c in chk), "of", len(chk), "checks pass")

# ---- 8. the offline reproduction
R = None
rp = os.path.join(D, "repro_raw.json")
if os.path.exists(rp):
    raw = json.load(open(rp)); L = "ABCD"
    rows = raw["rows"][: len(raw["rows"]) // raw["per_subject"] * raw["per_subject"]]  # whole subjects only (a stopped run may end mid-subject)
    def strict(t):
        t = t.strip(); return t[0] if t and t[0] in L and (len(t) == 1 or not t[1].isalnum()) else None
    def lenient(t):
        m = re.search(r"answer is[:\s]*\(?([ABCD])\b", t, re.I) or re.search(r"\b([ABCD])\b", t); return m.group(1) if m else None
    def am(v): return max(range(len(v)), key=lambda i: v[i])
    preds = {k: [] for k in ["c1", "c2", "c10", "c5", "c3", "c4", "c6", "c7", "c8", "c9"]}
    for r in rows:
        g = r["g"]
        preds["c1"].append(am(r["c1"]) == g); preds["c2"].append(am(r["c2"]) == g); preds["c10"].append(am(r["c10"]) == g)
        preds["c3"].append(am([x[0] for x in r["c3"]]) == g); preds["c4"].append(am([x[0] / x[2] for x in r["c3"]]) == g)
        for c, k, f in (("c5", "c5g", strict), ("c6", "c6g", strict), ("c7", "c7g", strict), ("c8", "c7g", lenient), ("c9", "c9g", strict)):
            p = f(r[k]); preds[c].append(p == L[g])
    n = len(rows)
    def ci(k): p = sum(k) / n; return [100 * p, 100 * 1.96 * math.sqrt(p * (1 - p) / n)]
    acc = {k: ci(v) for k, v in preds.items()}
    def pair(a, b):
        x = sum(1 for i in range(n) if preds[a][i] and not preds[b][i]); y = sum(1 for i in range(n) if preds[b][i] and not preds[a][i])
        d = (y - x) / n * 100; se = math.sqrt(x + y - (y - x) ** 2 / n) / n * 100
        return {"a": a, "b": b, "d": d, "se": se, "a_only": x, "b_only": y}
    invalid = {c: sum(1 for r in rows if (strict if c != "c8" else lenient)(r[k]) is None) for c, k in (("c5", "c5g"), ("c6", "c6g"), ("c7", "c7g"), ("c8", "c7g"), ("c9", "c9g"))}
    letterpos = {c: [sum(1 for r in rows if L[am(r[c])] == l) for l in L] for c in ("c1", "c2", "c10")}
    gold = [sum(1 for r in rows if r["g"] == i) for i in range(4)]
    R = {"n": n, "model": raw["model"], "acc": acc, "invalid": invalid, "letterpos": letterpos, "gold": gold,
         "pairs": [pair("c1", "c2"), pair("c1", "c10"), pair("c10", "c5"), pair("c3", "c4"), pair("c1", "c3"), pair("c6", "c7"), pair("c7", "c8"), pair("c7", "c9")]}
    # in-vocabulary mass: how much next-token probability sits on " A".." D" at the answer position
    R["mass5"] = 100 * sum(sum(math.exp(x) for x in r["c1"]) for r in rows) / n
    R["mass0"] = 100 * sum(sum(math.exp(x) for x in r["c2"]) for r in rows) / n
    # showcase items for the animation, chosen by rule (first match in item order), not by hand
    def first(f, used):
        for i, r in enumerate(rows):
            if i not in used and f(i, r): return i
    rules = [
        ("right by loglikelihood; chat answer has no leading letter, lenient parser recovers the right one", lambda i, r: preds["c1"][i] and strict(r["c7g"]) is None and preds["c8"][i]),
        ("lenient parser grabs a wrong standalone letter", lambda i, r: strict(r["c7g"]) is None and lenient(r["c7g"]) not in (None, L[r["g"]]) and preds["c1"][i]),
        ("acc and acc_norm disagree", lambda i, r: preds["c3"][i] != preds["c4"][i]),
        ("examples change the loglikelihood pick", lambda i, r: preds["c1"][i] != preds["c2"][i]),
        ("every method right", lambda i, r: all(preds[k][i] for k in ("c1", "c3", "c7"))),
    ]
    sel, why = [], []
    for w, f in rules:
        i = first(f, sel)
        if i is not None: sel.append(i); why.append(w)
    R["agree_top1"] = sum(1 for i, r in enumerate(rows) if strict(r["c1top"][0][0]) == L[am(r["c1"])])
    R["why"] = why
    subs = sorted(set(r["s"] for r in rows)); R["nsubj"] = len(subs); R["subj0"] = subs[0]; R["subj1"] = subs[-1]
    full = [r for r in rows if sum(1 for q in rows if q["s"] == r["s"]) == raw["per_subject"]]
    assert len(full) == n, "trim to whole subjects before aggregating"
    R["items"] = [dict(rows[i], i=i, ok={k: preds[k][i] for k in preds}) for i in sel if i < n]
    for k, v in acc.items(): print(k, round(v[0], 1), "+-", round(v[1], 1))
    print(R["pairs"]); print("invalid", invalid, "mass", R["mass5"], R["mass0"])

OUT = {
 "read": "2026-10-04",
 "blogtab": blogtab,
 "nums": {"paper65": paper65, "v1_65": round(v1_65, 2), "micro65": round(micro.get("huggyllama/llama-65b v1 2023-07-21", float("nan")), 2),
          "v1_l3": round(v1_l3, 2), "micro_l3": round(micro.get("meta-llama/Meta-Llama-3-8B v1 2024-05-28", float("nan")), 2),
          "h_l3": round(h_l3, 2), "meta_l3": meta_l3_8b, "h_l31": round(h_l31, 2), "meta_l31_5": meta_l31_mmlu5, "meta_l31_cot": meta_l31_cot,
          "meta_l31_pro": meta_l31_pro, "pro_raw": round(pro_raw, 2), "pro_norm": round(pro_norm, 2),
          "v1_l270": round(v1_l270, 2), "h_l270": round(h_l270, 2), "l65_v2pro": round(llama65_v2, 2),
          "q72": [round(x, 2) for x in mh["q72"]], "q7": [round(x, 2) for x in mh["q7"]],
          "ins0": {k: round(v, 1) for k, v in i0.items()}, "ins5": {k: round(v, 1) for k, v in i5.items()}},
 "repro": R}
open(os.path.join(H, "..", "parts", "32_js_harness_0data.js"), "w").write("/* generated by src/harness/recompute.py; do not edit */\nwindow.HN_DATA=" + json.dumps(OUT, separators=(",", ":")) + ";\n")
print("wrote data part")
