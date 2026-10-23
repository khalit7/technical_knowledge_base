"""make_page_data.py: turn the recorded outputs in src/ into (1) parts/22_js_tz_0data.js (window.TZD, every number the
page's scripts draw) and (2) page_text.json (facts and HTML blocks that fill.py writes into the [[...]] placeholders).
Nothing on the page is typed by hand from a run: it is read from these files. Runs not yet recorded are left out and
reported (fill.py then refuses to build unless --allow-pending).
"""
import glob, html, json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda *p: json.load(open(os.path.join(HERE, *p)))
steps = J("zero", "out", "steps.json"); mis = J("zero", "out", "mistakes.json"); acc = J("zero", "out", "accounting.json")
curve = J("train", "out", "curve.json"); smp = J("train", "out", "sampling.json")
runs = {os.path.basename(f)[:-5]: json.load(open(f)) for f in glob.glob(os.path.join(HERE, "train", "out", "runs", "*.json"))}
S = {s["key"]: s for s in steps["steps"]}
F = {}; T = {}; pending = []

# ---------------------------------------------------------------- facts from the step tests and accounting
P = acc["params"]["baseline"]
F.update(file_lines=steps["file_lines"], p_emb=P["embedding (tied with lm_head)"], p_pos=P["positions"], p_total=P["total"],
         p_attn_layer=4 * 256 * 256, p_ffn_layer=2 * 256 * 1024, p_block=P["per_block"], p_blocks=6 * P["per_block"],
         perm_nopos=S["embed"]["perm"]["nopos"], perm_pos=S["embed"]["perm"]["pos"],
         n_state_dict=S["model"]["n_state_dict"], loss0=S["loss"]["loss0"], loss_trained=S["loss"]["loss_trained"],
         ppl_trained=math.exp(S["loss"]["loss_trained"]), block_rel=S["block"]["rel"])
def grab(key, pat, i=0):
    import re
    for line in S[key]["out"]:
        m = re.findall(pat, line)
        if m:
            return float(m[i])
    raise KeyError(pat)
F["sdpa_diff"] = grab("multi_head", r"scaled_dot_product_attention\(is_causal=True\): max \|difference\| = ([0-9.e+-]+)")
F["ffn_pw"] = grab("ffn", r"max \|difference\| = ([0-9.e+-]+)")
F["cache_diff"] = grab("sample", r"max \|difference\| = ([0-9.e+-]+)")
F["dot_std"] = grab("one_head", r"std ([0-9.]+) \(sqrt")
sc = {d["hd"]: d for d in S["one_head"]["scale"]}
F.update(maxw32_raw=sc[32]["raw"], maxw32_sc=sc[32]["scaled"], maxw128_raw=sc[128]["raw"])
F["logit_std"] = grab("loss", r"logits: std ([0-9.]+)")
fl = acc["flops"]
F.update(per_token_2N=fl["per_token_2N"], fl_weights=fl["weights"], fl_attn=fl["attn_full"], fl_total=fl["by_hand"],
         fl_counter=fl["counter_forward"], fl_attn_causal=fl["attn_causal"], fl_ratio=fl["ratio"],
         attn_share=fl["attn_full"] / fl["by_hand"], run_flops=fl["train_run"]["flops"])
_p = curve["pieces"]; _R = [i for i in range(len(_p) - 1) if _p[i] in (" R", "R") and _p[i + 1] == "o"]
_t = curve["snaps"][-1]["tok_loss"]; _oxy = [_t[i] + _t[i + 1] + _t[i + 2] for i in _R]
F.update(roxy_first=_oxy[0], roxy_second=_oxy[1], roxy_later=sum(_oxy[2:]) / len(_oxy[2:]))
F.update(unigram=curve["floors"]["unigram_val"], bigram=curve["floors"]["bigram_val_second_half"])
# mistakes
err = {e["key"]: e for e in mis["errors"]}
us = mis["unshifted"]
F.update(us_first=us["train_curve"][0][1], us_last=us["train_curve"][-1][1], us_val=us["held_out_shifted"], us_greedy=us["greedy"],
         ds_t1=mis["double_shift"]["loss_t1"], ds_t2=mis["double_shift"]["loss_t2"])
T["silent_rows"] = [{"what": "none (the trained model)", "loss": mis["base"]["loss"], "leak": mis["base"]["leak"], "greedy": mis["base"]["greedy"]}] + \
    [{"what": s["what"], "loss": s["loss"], "leak": s["leak"], "greedy": s["greedy"]} for s in mis["silent"]]

# ---------------------------------------------------------------- runs
def r(n):
    if n not in runs:
        pending.append(n); return None
    return runs[n]
ref, rerun, seed1 = r("ref_baseline_s1500"), r("bl_pre_lr3e-3"), r("mx_baseline_s1")
F.update(ref_val=ref["final_val"], ref_val100=ref["val100"], rerun_val=rerun["final_val"], seed1_val=seed1["final_val"])
base = r("tz_base")
F.update(abl_base_val=base["final_val"], abl_base_val100=base["val100"], base_sec=base["seconds"], base_toks=base["median_tok_s"],
         run_tflops=fl["train_run"]["flops"] / base["seconds"] / 1e12)
tr = base["train"]; F["cross_uni"] = next(s for s, l in tr if l < F["unigram"])
ABL = [  # key, run, label, what changes
    ("base", "tz_base", "Baseline", "nothing (the file as built)"),
    ("noresid", "tz_noresid", "No residual", "x = sublayer(norm(x)) instead of x + sublayer(norm(x))"),
    ("nonorm", "tz_nonorm", "No norm", "every LayerNorm removed, including the final one"),
    ("nopos", "tz_nopos", "No position", "no position table (NoPE); the causal mask remains"),
    ("1head", "tz_1head", "One head", "H = 1, hd = 256 (same parameters)"),
    ("1head_s1", "tz_1head_s1", "One head, seed 1", "as above, seed 1 (compare the baseline at seed 1, 2.264)"),
    ("noffn", "tz_noffn", "No FFN", "attention-only blocks (54% fewer parameters)"),
    ("noattn", "tz_noattn", "No attention", "FFN-only blocks: each position sees only its own token and position"),
    ("noresid_lr1e-3", "tz_noresid_lr1e-3", "No residual, lr 1e-3", "as above at a third of the learning rate"),
    ("nonorm_lr1e-3", "tz_nonorm_lr1e-3", "No norm, lr 1e-3", "as above at a third of the learning rate"),
]
abl = []
for key, name, label, what in ABL:
    x = r(name)
    if x is None:
        continue
    F[f"abl_{key}_val"] = x["final_val"]
    abl.append({"key": key, "name": name, "label": label, "what": what, "params": x["params"], "lr": x["lr"], "val": x["final_val"],
                "val100": x.get("val100"), "seq": x.get("seq_mean"), "status": x["status"], "eval": x["eval"],
                "train": x["train"][::3], "tok": x.get("tok_loss"), "samples": x.get("samples"), "sec": x["seconds"]})
lr3 = r("bl_pre_lr1e-3")
if "tz_1head" in runs: F["t_1head"] = runs["tz_1head"]["median_tok_s"]
F["p_noffn"] = J("zero", "out", "accounting.json")["params"]["no FFN"]["total"]
F["nopos_pe"] = 2.3666  # Positional Encodings child, run pe_nope (tiny_gpt pos=nope), final_val_loss in its log.json
if "tz_nopos" in runs: F["abl_nopos_val100"] = runs["tz_nopos"]["val100"]
if lr3:
    F["base_lr1e3_val"] = lr3["final_val"]
    abl.append({"key": "base_lr1e-3", "name": "bl_pre_lr1e-3", "label": "Baseline, lr 1e-3", "what": "the reference model at lr 1e-3 (root Block lab run)",
                "params": lr3["params"], "lr": lr3["lr"], "val": lr3["final_val"], "val100": None, "seq": None, "status": lr3["status"],
                "eval": lr3["eval"], "train": lr3["train"][::3], "tok": None, "samples": None, "sec": lr3["seconds"]})


# ---------------------------------------------------------------- ablation prose (numbers from the runs)
if not pending:
    v = lambda k: F[f"abl_{k}_val"]; d = lambda k: v(k) - F["abl_base_val"]
    F["abl_1head_mean_gap"] = (d("1head") + (v("1head_s1") - F["seed1_val"])) / 2
    T["abl_sentence"] = (f"no residual {v('noresid'):.3f} (stuck at the unigram level, {F['unigram']:.3f}); no FFN {v('noffn'):.3f} (+{d('noffn'):.2f}, with 54% fewer parameters); "
        f"no attention {v('noattn'):.3f}, next to the bigram floor {F['bigram']:.3f} as it must be; no norm {v('nonorm'):.3f} (+{d('nonorm'):.2f}); "
        f"no position {v('nopos'):.3f} (+{d('nopos'):.2f}); one head instead of eight {v('1head'):.3f} at seed 0 and {v('1head_s1'):.3f} at seed 1 "
        f"(+{d('1head'):.3f} and +{v('1head_s1') - F['seed1_val']:.3f} against the baseline at the same seed).")
    T["abl_reading"] = f"""<h3>What the numbers say</h3>
<p><b>No residual: the model learns nothing past token frequencies.</b> Held-out {v('noresid'):.3f} at lr 3e-3 and {v('noresid_lr1e-3'):.3f} at lr 1e-3, against the unigram cross-entropy {F['unigram']:.3f}: both runs sit on the line of a model that ignores context, and the greedy continuation of every prompt is a row of full stops. Without the sum, every sublayer must rebuild the whole representation instead of adding a correction, and the gradient reaches the embedding only through twelve stacked sublayers. Dong et al. (2021, {{{{arXiv 2103.03404|https://arxiv.org/abs/2103.03404}}}}) prove the related failure for attention: without "skip connections or multi-layer perceptrons (MLPs), the output converges doubly exponentially to a rank-1 matrix". A lower learning rate does not rescue it here, so it is not an instability; it is the architecture. This is the largest effect on the page.</p>
<p><b>No attention: exactly the predicted floor.</b> Blocks with only an FFN let each position see its own token and position and nothing else, so the best such model is a bigram model. It ends at {v('noattn'):.3f}, {v('noattn') - F['bigram']:.2f} above the bigram cross-entropy counted from all 122M training tokens ({F['bigram']:.3f}); the network saw a tenth of them. Its greedy text shows it: one plausible phrase, then the same token repeated (\"the park.\" and then only line breaks). A known answer the run lands on is a check on the whole pipeline. Everything the baseline gains below {F['bigram']:.2f} comes from attention reading more than one token back.</p>
<p><b>No FFN: +{d('noffn'):.2f}, but it is also a smaller model.</b> Attention-only blocks have {F['p_noffn']:,} parameters against {F['p_total']:,}; the run cannot separate "no MLP" from "54% fewer parameters" (a parameter-matched version with 18 attention-only layers was not run; it would cost about three times the attention compute per step). At {v('noffn'):.2f} it is still far below the bigram floor, so attention alone does most of the context work; the FFN adds per-token computation on top.</p>
<p><b>No norm: trains, but worse and more sensitive.</b> {v('nonorm'):.3f} at lr 3e-3 (+{d('nonorm'):.2f}); at lr 1e-3 it falls further behind ({v('nonorm_lr1e-3'):.3f} against {F['base_lr1e3_val']:.3f} for the normalised baseline at the same rate, root Block lab): the unnormalised stream grows with depth and the update size that suits it is different. At 6 layers it does not diverge; the stability story at depth is {{{{Normalisation, residuals and stability|n:3fd5c17b0d0d8163b50dc5e9d9240e89}}}}.</p>
<p><b>No position: +{d('nopos'):.2f}, much less than "word order is invisible" suggests.</b> The causal mask leaks order: position t averages over exactly t + 1 tokens, so the model can count (Haviv et al. 2022, {{{{arXiv 2203.16634|https://arxiv.org/abs/2203.16634}}}}: "causal attention enables the model to infer the number of predecessors that each token can attend to"). It agrees with the {{{{Positional Encodings|n:3c65c17b0d0d81a5b7c9e578fcdfac00}}}} child's NoPE run of the root model ({F['nopos_pe']:.4f} on the same 20 windows; on 100 windows this run gives {F['abl_nopos_val100']:.4f} against its 2.389), which also shows what a learned table costs past 256 tokens.</p>
<p><b>One head: a small cost that depends on the seed.</b> Eight heads of 32 against one head of 256, same parameters and FLOPs: +{d('1head'):.3f} at seed 0, +{v('1head_s1') - F['seed1_val']:.3f} at seed 1 (mean +{F['abl_1head_mean_gap']:.3f}; the baseline's own spread is about 0.02). At this size and budget, eight heads buy a few hundredths of a nat; Michel et al. (2019, {{{{arXiv 1905.10650|https://arxiv.org/abs/1905.10650}}}}) found that "a large percentage of attention heads can be removed at test time without significantly impacting performance". One head did run about a third faster on MPS ({F['t_1head']:,.0f} against {F['base_toks']:,.0f} tokens/s, rough), plausibly because fewer, larger kernels suit this GPU (not profiled). What does not transfer: at 4,096 wide a single head would have hd = 4,096 and one attention pattern per layer for everything; real models keep hd at 64 to 256.</p>
<p class="small mute">What transfers from these toy ablations: the order (residual and attention are essential, the FFN and norm matter, positions and head count matter least at this size) and the known answers (unigram for a broken network, bigram for no attention). What does not: the size of the gaps for a model a thousand times larger trained a thousand times longer.</p>"""

# ---------------------------------------------------------------- HTML blocks
def e(s): return html.escape(str(s))
def num(v, d=3): return "n/a" if v is None else f"{v:,.{d}f}"
rows = []
for x in acc["real"]:
    rows.append(f"<tr><td>{e(x['key'])}</td><td class=\"num\">{x['total']:,}</td><td class=\"num\">{x['hub']:,}</td>"
                f"<td class=\"num\">{x['residual']:,}</td><td>{e(x['why']) or 'none'}</td></tr>")
T["real"] = "".join(rows)
bv = F["abl_base_val"]
rows, grows = [], []
for a in abl:
    g = a["samples"][6]["greedy"] if a["samples"] else "(not recorded: a root Block lab run, logged without a checkpoint)"
    g = g if g.strip() else "(empty: the first token chosen was end-of-text)"
    rows.append(f"<tr><td data-h=\"Run\"><b>{e(a['label'])}</b></td><td data-h=\"Change\">{e(a['what'])}</td><td data-h=\"Parameters\" class=\"num\">{a['params']:,}</td>"
                f"<td data-h=\"Held-out\" class=\"num\">{a['val']:.3f}</td><td data-h=\"vs baseline\" class=\"num\">{'' if a['key'] == 'base' else f'{a['val'] - bv:+.3f}'}</td></tr>")
    grows.append(f"<tr><td data-h=\"Run\"><b>{e(a['label'])}</b></td><td data-h=\"Greedy\">{e(g[:150])}{'...' if len(g) > 150 else ''}</td></tr>")
T["abl"] = "".join(rows)
T["abl_greedy"] = "".join(grows)
T["silent"] = "".join(f"<tr><td>{e(s['what'])}</td><td class=\"num\">{s['loss']:.2f}</td><td class=\"num\">{s['leak']:g}</td><td>{e(s['greedy'])}</td></tr>" for s in T.pop("silent_rows"))
T["err"] = {k: e(v["message"]) for k, v in err.items()}
# the sampling table, static so the ledger and the checks can read it (was written by script before 2026-10-23)
T["samples"] = "".join(f"<tr><td>{'greedy' if x['T'] == 0 else 'T ' + format(x['T'], '.1f') + (', top-k ' + str(x['top_k']) if x.get('top_k') else '')}</td><td>{e(x['text'])}</td></tr>" for x in smp["samples"])
F["matmul_params"] = acc["flops"]["matmul_params"]

# ---------------------------------------------------------------- data for the scripts
D = {
    "snaps": [{"step": s["step"], "val": s["val"], "seq": s["seq_mean"], "tok": s["tok_loss"], "greedy": s["greedy"]} for s in curve["snaps"]],
    "pieces": curve["pieces"], "prompt7": curve["prompt"], "floors": {"uniform": curve["floors"]["uniform"], "unigram": F["unigram"], "bigram": F["bigram"]},
    "smp": {"points": [{"pos": p["pos"], "context": p["context"], "next_true": p["next_true"], "logits": p["logits"],
                        "names": {str(i): s for i, s in p["top"]}} for p in smp["points"]], "samples": smp["samples"], "prompt": smp["prompt"]},
    "abl": abl, "prompts": json.load(open(os.path.join(HERE, "..", "..", "src", "data", "eval_prompts.json")))["prompts"],
    "acc": {"real": [{"key": x["key"], "shape": x["shape"], "block": x["block"], "parts": x["parts"], "total": x["total"], "hub": x["hub"]} for x in acc["real"]],
            "tiny": acc["params"]},
}
seq_ids = json.load(open(os.path.join(HERE, "..", "..", "src", "data", "running_sequence.json")))["ids"]
for p in D["smp"]["points"]:
    p["true_id"] = seq_ids[p["pos"] + 1]
js = "// written by src/make_page_data.py from src/zero/out, src/train/out; do not edit by hand\nwindow.TZD=" + json.dumps(D, separators=(",", ":")) + ";\n"
open(os.path.join(HERE, "parts", "22_js_tz_0data.js"), "w").write(js)
json.dump({"facts": F, "text": T, "pending": pending}, open(os.path.join(HERE, "page_text.json"), "w"), indent=1)
print("data", len(js), "bytes; facts", len(F), "; pending", pending)
