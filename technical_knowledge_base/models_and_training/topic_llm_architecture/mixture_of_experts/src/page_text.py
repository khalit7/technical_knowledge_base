"""Facts and text blocks for the page's [[...]] placeholders, computed from the recorded data (called by make_page_data.py).
A block whose data is missing is left out, so fill.py reports it instead of printing a stale number."""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))


def lj(*p):
    path = os.path.join(HERE, *p)
    return json.load(open(path)) if os.path.exists(path) else None


def build(D, T, cc, dq):
    F, X = {}, {}
    T["facts"], T["text"] = F, X
    R = D["runs"]
    fx = lambda v, n=3: f"{v:,.{n}f}"
    pc = lambda v, n=1: f"{100 * v:,.{n}f}%"
    # --- code checks -------------------------------------------------------------------------------------------
    g = lj("code", "out", "grad_mx_moe8top2.json")
    if g:
        F["grad_layer"] = g["layer"] + 1
        F["grad_lm_ratio"] = g["lm_only"]["max_unselected_over_max_selected"]
        F["grad_aux_ratio"] = g["lm_plus_aux"]["max_unselected_over_max_selected"]
    h = lj("code", "out", "hf_aux_check.json")
    if h:
        c = {x["case"]: x for x in h["cases"]}
        F["hf_bal"] = c["one layer, balanced"]["hf"]
        F["hf_one"] = c["one layer, collapsed onto 2 experts"]["hf"]
        F["hf_two_diff"] = c["two layers, each collapsed, onto different experts"]["hf"]
        F["sw_one"] = c["one layer, collapsed onto 2 experts"]["switch_per_layer"][0]
    hc = lj("code", "out", "hf_checks.json")
    if hc:
        F["hfc_aux_none"] = str(hc["qwen3moe_aux"]["aux_loss_default"])
        F["hfc_aux_on"] = hc["qwen3moe_aux"]["aux_loss_with_output_router_logits"]
        F["hfc_norm"] = str(hc["qwen3moe_defaults"]["norm_topk_prob"])
        F["hfc_topk_err"] = hc["tiny_topk_error"]
    # --- Config calculator numbers --------------------------------------------------------------------------------
    ds, mx = cc["deepseek-v3"], cc["mixtral-8x7b"]
    F["ds_total"], F["ds_active"], F["ds_active_noemb"] = ds["total"], ds["active"], ds["ane"]
    b = ds["b"]
    F["ds_rest"] = ds["total"] - b["moe_routed"] - b["moe_shared"] - b["router"]
    exp_act = (ds["active"] - (ds["total"] - b["moe_routed"])) + b["moe_shared"]
    F["ds_exp_share_tot"] = (b["moe_routed"] + b["moe_shared"]) / ds["total"]
    F["ds_exp_share_act"] = exp_act / ds["active"]
    F["mx_total"], F["mx_active"] = mx["total"], mx["active"]
    # --- expert parallel run -------------------------------------------------------------------------------------
    ep = D.get("ep")
    if ep:
        F["ep_layer"] = ep["layer"] + 1
        W = ep["world"]
        rows = ["          to rank " + "  ".join(f"{r:>4d}" for r in range(W))]
        for r, s in enumerate(ep["send_matrix"]):
            rows.append(f"rank {r} sends  " + "  ".join(f"{v:>4d}" for v in s) + f"   (total {sum(s)})")
        recv = [sum(ep["send_matrix"][s][r] for s in range(W)) for r in range(W)]
        rows.append("received     " + "  ".join(f"{v:>4d}" for v in recv))
        rows.append(f"max |difference| against the same layer in one process: {ep['max_abs_diff_vs_one_process']}")
        X["ep_out"] = "\n".join(rows)
        local = sum(ep["local_copies"]) / sum(map(sum, ep["send_matrix"]))
        X["ep_meas"] = (f"Each rank sends {ep['tokens_per_rank']} tokens &times; {ep['top_k']} = {sum(ep['send_matrix'][0])} rows of "
                        f"{ep['d_model']} numbers ({ep['bytes_out_per_rank_bf16'][0]:,} bytes in BF16), but receives between {min(recv)} and "
                        f"{max(recv)}: the busiest rank does {max(recv) / (sum(recv) / W):.2f} times the mean expert work. {pc(local, 0)} of the "
                        f"copies stay on their own rank. The distributed output equals the one-process layer "
                        + ("bit for bit (maximum difference 0.0)." if ep['max_abs_diff_vs_one_process'] == 0 else f"to {ep['max_abs_diff_vs_one_process']:.0e} (float summation order)."))
        X["s7_answer"] = (f"Sends are balanced by construction (every rank sends T &middot; k = {sum(ep['send_matrix'][0])} rows), receives are not: "
                          f"{min(recv)} to {max(recv)} rows, because receiving is set by how popular each rank's experts are. In a real "
                          "deployment that rank finishes last and every other rank waits for it in the combine.")
        X["pr3_right"] = "b"
    # --- training runs ---------------------------------------------------------------------------------------------
    def val(k):
        r = R.get(k)
        return r and r.get("heldout", {}).get("loss")
    def mvm(k):
        r = R.get(k)
        return r and r.get("heldout", {}).get("maxvio") and sum(r["heldout"]["maxvio"]) / len(r["heldout"]["maxvio"])
    have = lambda *ks: all(val(k) is not None for k in ks)
    if have("dense", "moe8", "moe16s", "bias"):
        X["s0_meas"] = (f"Held-out loss (20 fixed validation batches): dense {fx(val('dense'))}; 8 experts top 2 {fx(val('moe8'))}; "
                        f"16 + 1 shared top 3 {fx(val('moe16s'))}, at the same active FFN size and 2.6 to 2.8 times the parameters. "
                        f"Balancing by bias {fx(val('bias'))} against aux loss {fx(val('moe8'))}"
                        + (f"; no balancing {fx(val('none'))} with MaxVio {fx(mvm('none'), 2)} against {fx(mvm('moe8'), 2)}" if val("none") else "") + ".")
    cmp = lambda a, b: "lower" if a < b else "higher"
    # s2: top-k at inference
    r8 = R.get("moe8")
    if r8 and r8.get("iv"):
        tk = {int(k): v for k, v in r8["iv"]["topk"].items()}
        worst = max((k for k in tk if k != 2), key=lambda k: tk[k])
        F["tk1"], F["tk2"], F["tk3"], F["tk4"] = tk[1], tk[2], tk[3], tk[4]
        X["pr1_right"] = {1: "k1", 3: "k3", 4: "k4"}.get(worst, "k1")
        X["s2_topk_answer"] = (f"Measured on 10 held-out batches (CPU): k = 1 gives {fx(tk[1])}, the trained k = 2 {fx(tk[2])}, k = 3 {fx(tk[3])}, "
                               f"k = 4 {fx(tk[4])}. " + ("Dropping to one expert hurts most: the model learned to spread each token over two experts "
                               "and to rely on the second's contribution. " if worst == 1 else "Adding experts hurts most here. ")
                               + ("More experts do not help either: " if tk[3] > tk[2] else "A third expert helps a little, ")
                               + "most likely because the experts and the layers after them were trained against the k = 2 mixture and never saw a third or fourth output at that weight.")
        X["mis_topk"] = (f"Changing k after training changes the function: the trained moe8top2 model gives {fx(tk[2])} at its k = 2, {fx(tk[1])} at k = 1 "
                         f"(half the expert compute) and {fx(tk[4])} at k = 4 (measured, 10 held-out batches). Published MoE results that vary k "
                         "at inference (DeepSeekMoE's Figure 5) do so on models with many small experts; check on your own held-out set before shipping it.")
    # s3: no balancing, aux vs bias
    if have("none", "moe8"):
        n, a = R["none"], R["moe8"]
        mv_n, mv_a = n["heldout"]["maxvio"], a["heldout"]["maxvio"]
        top = max(max(l) for l in n["heldout"]["share"])
        lay = max(range(len(mv_n)), key=lambda i: mv_n[i])
        idle = sum(1 for l in n["heldout"]["share"] for v in l if v < 0.01)
        X["s3_none"] = (f"The run with balancing switched off (<code>balance=none</code>, everything else equal) ends with MaxVio {fx(sum(mv_n) / len(mv_n), 2)} "
                        f"averaged over its 6 layers, against {fx(sum(mv_a) / len(mv_a), 2)} with the auxiliary loss; in its worst layer ({lay + 1}) one expert "
                        f"takes {pc(top, 0)} of all assignments, and {idle} of its 48 experts get under 1% of the traffic. Its held-out loss is "
                        f"{fx(n['heldout']['loss'])} against {fx(a['heldout']['loss'])}: {cmp(n['heldout']['loss'], a['heldout']['loss'])}.")
    if have("moe8", "bias", "sbias"):
        a, b, sb = R["moe8"], R["bias"], R["sbias"]
        m = lambda r: sum(r["heldout"]["maxvio"]) / len(r["heldout"]["maxvio"])
        X["s3_auxbias"] = (f"Held-out loss and MaxVio after 1,500 steps: softmax router with the auxiliary loss {fx(a['heldout']['loss'])} and {fx(m(a), 2)}; "
                           f"softmax router with the bias instead {fx(sb['heldout']['loss'])} and {fx(m(sb), 2)}; sigmoid router with the bias (DeepSeek-V3's recipe) "
                           f"{fx(b['heldout']['loss'])} and {fx(m(b), 2)}. The softmax pair differs only in the balancing switch; the seed-1 rerun of the aux-loss model "
                           + (f"({fx(R['moe8_s1']['heldout']['loss'])}) " if have("moe8_s1") else "") + "sets the noise to read these gaps against.")
        bmax = max(abs(v) for L in b["seq"]["bias"] for v in L)
        X["s3_bias_answer"] = (f"The largest bias in the sigmoid-plus-bias model after 1,500 steps is {fx(bmax, 3)} in magnitude (measured). Each step moves every bias by "
                               "exactly 0.001 up or down, so 1,500 steps bound it at 1.5; an expert that is persistently over- or under-loaded drifts steadily, "
                               "while a balanced one oscillates around a fixed value. Against sigmoid scores in (0, 1), a bias of this size is enough to override "
                               "the router for near-ties.")
        X["pr2_right"] = "a" if bmax < 0.005 else "b" if bmax < 0.1 else "c" if bmax < 1 else "d"
    # s4: capacity
    if r8 and r8.get("iv"):
        cf = r8["iv"]["cf"]
        F["cf_none"], F["cf125"], F["cf1"] = cf["None"]["loss"], cf["1.25"]["loss"], cf["1.0"]["loss"]
        c1 = R.get("cap1")
        txt = (f"The moe8top2 model (trained dropless) evaluated on 10 held-out batches: dropless {fx(cf['None']['loss'])}; capacity factor 2.0 "
               f"{fx(cf['2.0']['loss'])} ({pc(cf['2.0']['drop'])} of assignments dropped); 1.25 {fx(cf['1.25']['loss'])} ({pc(cf['1.25']['drop'])}); "
               f"1.0 {fx(cf['1.0']['loss'])} ({pc(cf['1.0']['drop'])}); 0.5 {fx(cf['0.5']['loss'])} ({pc(cf['0.5']['drop'])}, and "
               f"{pc(cf['0.5']['alldrop'])} of tokens lost both experts).")
        if c1 and c1.get("iv"):
            cc1 = c1["iv"]["cf"]
            txt += (f" The model trained with capacity factor 1.0 (and so with drops in every training step) is {fx(c1['heldout']['loss'])} on its own "
                    f"training rule against {fx(r8['heldout']['loss'])} for the dropless model, and evaluated dropless it reaches {fx(cc1['None']['loss'])}.")
        X["s4_meas"] = txt
        cb = r8["iv"]["cf_batch"]
        X["s4_batch"] = (f"The same model and the same 2 &times; 32 held-out sequences at capacity factor 1.25, cut into batches of 32, 4 and 1 sequences: "
                         f"{pc(cb['32']['drop'])}, {pc(cb['4']['drop'])} and {pc(cb['1']['drop'])} of assignments dropped, held-out loss "
                         f"{fx(cb['32']['loss'])}, {fx(cb['4']['loss'])} and {fx(cb['1']['loss'])} (measured). With 256 tokens per batch the average expert gets "
                         "64 assignments and a capacity of 80; random fluctuation over that small a sample overflows far more often than over 8,192 tokens.")
        X["mis_batch"] = X["s4_batch"]
    # s5: fine-grained and shared
    if have("moe16s", "moe8"):
        s16 = R["moe16s"]; iv = s16.get("iv") or {}
        tk = {int(k): v for k, v in iv.get("topk", {}).items()}
        X["s5_meas"] = (f"16 experts of width 256 plus one shared, top 3 (the same active FFN and 5% more total parameters than moe8top2): held-out "
                        f"{fx(s16['heldout']['loss'])} against {fx(R['moe8']['heldout']['loss'])} for 8 experts top 2 and {fx(R['dense']['heldout']['loss'])} dense. "
                        + (f"DeepSeekMoE's shared-expert ablation, repeated on the trained model at inference: switching the shared expert off raises the loss "
                           f"to {fx(iv['no_shared'])}, and routing one more expert in its place to {fx(iv['no_shared_plus1'])} (from {fx(s16['heldout']['loss'])}; "
                           "the model was not retrained, unlike DeepSeekMoE's 1.808 to 2.414, so this measures how much the trained model leans on it). " if iv.get("no_shared") else "")
                        + (f"Masking each token's best routed expert (DeepSeekMoE's redundancy test) raises the loss by {fx(iv['mask']['1'] - iv['mask']['0'], 3)} for the fine-grained model and "
                           f"{fx(R['moe8']['iv']['mask']['1'] - R['moe8']['iv']['mask']['0'], 3)} for moe8top2: the opposite direction to DeepSeekMoE's Figure 4 (does not reproduce), "
                           "though here the masked expert is one of 3 routed choices against one of 2, so the two numbers are not a matched comparison." if iv.get("mask") and R['moe8'].get("iv") else ""))
    pl, pf = lj("runs", "logs", "mx_probe_loop.json"), lj("runs", "logs", "mx_probe_fast.json")
    if pl and pf:
        F["probe_loop"], F["probe_fast"] = pl["median_tok_s"], pf["median_tok_s"]
        X["probe"] = (f"{pl['median_tok_s']:,.0f} tokens/s against {pf['median_tok_s']:,.0f} for the batched forward, median over a 40-step probe each; "
                      "the loop calls nonzero() once per expert per layer, and every call waits for the GPU")
    # s6: dense vs MoE
    if have("dense", "moe8", "moe16s"):
        d, a, f16 = R["dense"], R["moe8"], R["moe16s"]
        sp = []
        if have("moe8_s1"):
            sp.append(f"moe8top2 seed 0 and 1: {fx(a['heldout']['loss'])} and {fx(R['moe8_s1']['heldout']['loss'])}")
        if have("dense_s1"):
            sp.append(f"dense seed 0 and 1: {fx(d['heldout']['loss'])} and {fx(R['dense_s1']['heldout']['loss'])}")
        sd = abs(d['heldout']['loss'] - R['dense_s1']['heldout']['loss']) if have("dense_s1") else None
        X["s6_meas"] = (f"Held-out loss: dense {fx(d['heldout']['loss'])}, 8 experts top 2 {fx(a['heldout']['loss'])}, 16 + 1 shared top 3 {fx(f16['heldout']['loss'])}. "
                        f"Seed spread: " + "; ".join(sp) + ". "
                        f"So the 8-expert model's gain over dense ({fx(d['heldout']['loss'] - a['heldout']['loss'])}) is about the size of the dense seed-to-seed spread "
                        + (f"({fx(sd)}) " if sd is not None else "") + "and should not be read as more than a lean; the fine-grained model's gain "
                        f"({fx(d['heldout']['loss'] - f16['heldout']['loss'])}) is several times that spread. Both store "
                        f"{a['log']['params']['total'] / d['log']['params']['total']:.1f} to {f16['log']['params']['total'] / d['log']['params']['total']:.1f} times the dense parameters for the same active FFN. "
                        + (f"Rough speed on this laptop: dense {d['log']['tok_s']:,.0f} tokens/s, moe8top2 {a['log']['tok_s']:,.0f} with the batched forward; "
                           "the tiny GPT's original per-expert loop is slower still (" + X.get("probe", "see the probe runs") + ")."))
    # s9 trends
    rows = D["cfgs"]
    if rows:
        early = [r for r in rows if r["date"] < "2024-06"]; late = [r for r in rows if r["date"] >= "2025-07"]
        X["s9_trends"] = (f"Experts per layer went from 8 to 16 (Mixtral, Jamba, early 2024) to 128 to 896 ({len([r for r in late if r['E'] and r['E'] >= 128])} of "
                          f"the {len(late)} models from July 2025 on have 128 or more); expert width fell from 3.5 times d (Mixtral) to 0.25 to 0.5 times d; "
                          "routers moved to sigmoid scores with a selection bias in the DeepSeek line and the many models built on its code (Kimi, GLM, MiniMax, "
                          "Nemotron), while Qwen kept softmax with a global-batch loss; most keep one shared expert and the first 1 to 3 layers dense; "
                          "and the 2026 models add tricks around the experts rather than inside them: hash-routed first layers (DeepSeek-V4-Pro), latent "
                          "projections (Nemotron 3 Super, Kimi K3), FP4 experts (DeepSeek-V4-Pro's <code>expert_dtype</code>).")
    # mistakes: specialisation
    if r8 and r8.get("special"):
        dets = [sp["det"] for sp in r8["special"]]
        X["mis_special"] = (f"Measured on the tiny GPT (moe8top2, 40,960 held-out tokens): given only the token id, its most common first-choice expert is right "
                            f"{pc(min(dets), 0)} to {pc(max(dets), 0)} of the time depending on the layer, against 12.5% for an id-blind router: routing is "
                            "largely a function of the token itself (the expert-to-token table is below).")
    _ = (math, dq, X, F)
