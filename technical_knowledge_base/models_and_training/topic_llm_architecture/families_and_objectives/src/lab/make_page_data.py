"""make_page_data.py: writes ../parts/22_js_fo_0data.js (window.FOD) from this page's recorded outputs in out/, the
topic's running sequence and tokenizer pieces (src/data, read-only) and the root Config calculator (src/calc/calc.py,
imported read-only, on src/data/configs/deepseek-v3.json). Standard library only; run by build.sh.
Every number the page prints comes from here; derived numbers ("d") carry their formula in this file."""
import json, random, sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
ROOT = HERE.parents[2] / "src"
sys.path.insert(0, str(ROOT / "calc"))
import calc  # noqa: E402

J = lambda n: json.load(open(OUT / n))
r4 = lambda x: float(Decimal(str(x)).quantize(Decimal("0.0001"), ROUND_HALF_UP))


def t5_lengths(L, density=0.15, mean_span=3.0):
    """T5's random_spans_helper arithmetic for one raw length (t5/data/preprocessors.py)."""
    noise = int(round(L * density)); spans = max(1, int(round(noise / mean_span)))
    return {"input": L - noise + spans + 1, "targets": noise + spans + 1, "noise": noise, "spans": spans}


def drill(rs):
    """The same 40 tokens of the running sequence under each objective (seeded, illustrative choices of positions)."""
    ids, pieces = rs["ids"][1:41], rs["pieces"][1:41]
    n = len(ids); rng = random.Random(7)
    # BERT: 15% of positions, 80/10/10
    k = round(0.15 * n); pos = sorted(rng.sample(range(n), k)); mlm = []
    for p in pos:
        u = rng.random()
        mlm.append({"pos": p, "kind": "mask" if u < 0.8 else ("random" if u < 0.9 else "keep")})
    rand_piece = [pieces[(p * 7 + 3) % n] for p in pos]  # a stand-in random token, drawn from the same text
    # T5 span corruption on 40 tokens: noise 6, spans 2, random segmentation (as T5's _random_segmentation)
    h = t5_lengths(n); noise, spans = h["noise"], h["spans"]

    def seg(total, k):
        cuts = sorted(rng.sample(range(1, total), k - 1)) if k > 1 else []
        b = [0] + cuts + [total]
        return [b[i + 1] - b[i] for i in range(k)]
    nl, kl = seg(noise, spans), seg(n - noise, spans)
    spans_at, p = [], 0
    for i in range(spans):
        p += kl[i]; spans_at.append([p, p + nl[i]]); p += nl[i]
    # masked diffusion at t = 0.5
    dmask = sorted(p for p in range(n) if rng.random() < 0.5)
    return {"pieces": pieces, "n": n, "mlm": mlm, "mlm_rand": rand_piece, "spans": spans_at, "prefix": 16,
            "diff_t": 0.5, "diff_mask": dmask}


def main():
    rs = json.load(open(ROOT / "data" / "running_sequence.json"))
    masks = J("masks.json")
    code = J("code_refs.json")
    runs = J("runs_eval.json")
    probe = J("shift_probe.json")
    fod = {"code": {k: {"line": v["line"], "file": v["file"]} for k, v in code.items() if isinstance(v, dict)},
           "masks": masks, "probe": probe, "rs": {"pieces": rs["pieces"][:24]}}
    # objective drill
    fod["obj"] = drill(rs)
    fod["obj"]["t5_512"] = t5_lengths(512); fod["obj"]["t5_256"] = t5_lengths(256)
    # MTP joint runs (held-out curve of the main model)
    def run(n):
        return {"eval": [[e["step"], e["val"]] + ([e["mtp"]] if "mtp" in e else []) for e in runs[n]["eval"]],
                "final": runs[n]["final"], "steps": runs[n]["steps"], "seed": runs[n]["seed"]} if n in runs else None
    fod["mtpj"] = {"ref": run("ref_baseline_s1500"), "joint": run("fo_mtp_joint"), "joint_s1": run("fo_mtp_joint_s1"),
                   "base_s1": run("fo_base_s1"), "base_1980": run("fo_base_1980")}
    # MTP frozen
    mf = J("mtp_frozen.json")
    fod["mtpf"] = {"params": mf["params"], "main_params": mf["main_params"], "held_out": mf["held_out"],
                   "held_out_joint": mf.get("held_out_joint"), "curves": mf["curves"],
                   "spec": [{k: v for k, v in r.items() if k != "plain_text"} for r in mf["spec"]],
                   "plain7": mf["spec"][6]["plain_text"]}
    # diffusion
    # main diffusion model: the continued run (4,500 steps in all) if recorded; the 1,500-step model kept for comparison
    short, dt1 = J("diffusion_eval.json"), J("fo_diffusion_train.json")
    long_ = (OUT / "diffusion_eval_fo_diffusion_long.json").exists()
    de = J("diffusion_eval_fo_diffusion_long.json") if long_ else short
    dt2 = J("fo_diffusion_long_train.json") if long_ else None
    keep = {"ar_greedy", "ar_t0.8", "diff_48_low", "diff_12_low", "diff_6_low", "diff_3_low", "diff_12_random"}
    fod["diff"] = {"fill_in": {"r%d" % round(float(k) * 100): v for k, v in de["fill_in"].items()}, "summary": de["summary"], "trace": de["trace"], "trace_prompt": de["trace_prompt"],
                   "prompt_tokens": de["prompt_tokens"],
                   "gens7": {k: v[6]["text"] for k, v in de["generations"].items() if k in keep},
                   "short": {"fill_in": {"r%d" % round(float(k) * 100): v for k, v in short["fill_in"].items()},
                             "summary": short["summary"], "gens7": {k: v[6]["text"] for k, v in short["generations"].items() if k in keep}},
                   "train": {"steps": dt1["args"]["steps"] + (dt2["args"]["steps"] if dt2 else 0),
                             "steps1": dt1["args"]["steps"],
                             "minutes": (dt1["seconds"] + (dt2["seconds"] if dt2 else 0)) / 60, "val0": dt1["eval"][0]["val"],
                             "val1": dt1["eval"][-1]["val"], "val_end": (dt2 or dt1)["eval"][-1]["val"],
                             "eval": [[e["step"], e["val"]] for e in dt1["eval"]] +
                                     ([[dt1["args"]["steps"] + e["step"], e["val"]] for e in dt2["eval"][1:]] if dt2 else [])}}
    # Config calculator: DeepSeek-V3's MTP layer, split by the formula in calc.params
    cfg = json.load(open(ROOT / "data" / "configs" / "deepseek-v3.json"))
    spec = calc.normalise(cfg); pr = calc.params(spec)
    d_, V = spec["d"], spec["V"]
    copies = 2 * V * d_ if spec.get("mtp_copy") else 0
    eh, norms = 2 * d_ * d_, 3 * d_
    block = pr["mtp"] - copies - eh - norms
    fod["calc"] = {"dsv3": {"mtp": pr["mtp"], "main": pr["total"], "d": d_, "V": V,
                            "bill": [["transformer block (MLA + MoE, like layer 60)", block], ["embedding and output head copies", copies],
                                     ["eh_proj (2d to d)", eh], ["three RMSNorms", norms]]}}
    # DeepSeek-V3 Table 4 (MTP ablation), as printed, from the DeepSeek-V3 paper page (read-only)
    t4 = json.load(open(HERE.parents[4] / "reference" / "papers" / "deepseek_v3_technical_report" / "src" / "tables.json"))["T4"]
    fod["dsab"] = {"models": t4["models"], "meta": t4["meta"], "rows": [[r["bench"], r["metric"], r["v"], r["lower"]] for r in t4["rows"]]}
    # derived
    sw = masks["swap"]; lk = masks["leak"]
    gen = lk["generations"]["leak model, bidirectional mask"].split()
    spec_rows = fod["mtpf"]["spec"]
    def tpf(kind):
        fw = sum(r[kind]["forwards"] for r in spec_rows); return 120 * len(spec_rows) / fw
    # training FLOPs per token added by the MTP module, from the Block lab's counts for the tiny GPT forward at T=256:
    # weights 2 x 5,767,168 per token, attention 67,108,864 per layer per 256 tokens; the module adds one block
    # (786,432 matmul weights + 131,072 eh_proj) and a second LM-head matmul (256 x 4,096 = 1,048,576)
    main_f = 2 * 5767168 * 256 + 6 * 67108864
    mtp_f = 2 * (786432 + 131072 + 1048576) * 256 + 67108864
    P = de["prompt_tokens"]
    fod["d"] = {"swap_bidir_gap": r4(sw["bidir"]["held_out"] - sw["causal"]["held_out"]),
                "leak_last": lk["curve"][-1][1], "leak_snip": " ".join(gen[:8]) + " ...",
                "mtp_extra_flops": mtp_f / main_f, "mtp_flops": {"main": main_f, "mtp": mtp_f},
                "spec": {"sequential": {"tpf": tpf("sequential")}, "parallel": {"tpf": tpf("parallel")},
                         **({"joint": {"tpf": tpf("joint")}} if "joint" in spec_rows[0] else {}),
                         "identical": "%d of %d runs" % (sum(r[k]["identical"] for r in spec_rows for k in r if isinstance(r[k], dict)),
                                                        sum(1 for r in spec_rows for k in r if isinstance(r[k], dict)))},
                "diff_positions12": 12 * (P + 48), "ar_positions": P + 48,
                "mtp_gain0": r4(runs["ref_baseline_s1500"]["final"] - runs["fo_mtp_joint"]["final"]),
                "mtp_loss_flops": r4(runs["fo_mtp_joint"]["final"] - runs["fo_base_1980"]["final"]) if "fo_base_1980" in runs else None,
                "ar7": " ".join(de["generations"]["ar_greedy"][6]["text"].split()[:14]) + " ...",
                "diff7_12": " ".join(de["generations"]["diff_12_low"][6]["text"].split()[:14]) + " ..."}
    js = "// written by src/lab/make_page_data.py from src/lab/out/*.json; do not edit by hand\nwindow.FOD=" + \
         json.dumps(fod, separators=(",", ":"), ensure_ascii=True) + ";\n"
    (HERE.parent / "parts" / "22_js_fo_0data.js").write_text(js)
    print("FOD", len(js), "bytes")


if __name__ == "__main__":
    main()
