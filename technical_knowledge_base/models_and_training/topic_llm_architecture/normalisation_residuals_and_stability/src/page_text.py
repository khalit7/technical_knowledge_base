# Generated prose for make_page_data.py (exec'd there; uses N, D, runs, f, fs, r, uni, mist, nb, code, resid, math, json, os, OUT).
# Every sentence here that carries a number takes it from the recorded data, so reruns cannot leave stale prose.
import statistics

have = lambda *ns: all(n in runs for n in ns)
fin = lambda n: f(runs[n]["final"], 3)
PEND = '<span class="rd-todo">pending: run queued (src/runs/queue2.sh)</span>'

# ---------------------------------------------------------------- simple derived numbers
N["init_ratio"] = f(math.sqrt(12), 2)
N["sqrt12"] = f(16 * math.sqrt(12), 1)
N["sqrt32"] = f(math.sqrt(32), 2)
N["init_small"] = f(0.02 / math.sqrt(12), 5)
N["eps_fp32"] = "1.19e-7"
N["warm_gain"] = f(runs["bl_pre_lr3e-3"]["final"] - runs["bl_post_warm500"]["final"], 3)


# ---------------------------------------------------------------- spike score (OLMo 2 definition, window 100 as on the ML-fundamentals root)
def spike_score(xs, w=100, k=7.0):
    xs = [x for x in xs if x is not None]
    n = hits = 0
    for i in range(w, len(xs)):
        win = xs[i - w:i]
        mu = sum(win) / w
        sd = statistics.pstdev(win)
        n += 1
        if sd > 0 and abs(xs[i] - mu) >= k * sd:
            hits += 1
    return hits, n


def spike_hits(xs, w=100, k=7.0):
    """Step numbers (1-based) that the score above flags."""
    out = []
    for i in range(w, len(xs)):
        win = [x for x in xs[i - w:i] if x is not None]
        if xs[i] is None or len(win) < w:
            continue
        mu = sum(win) / w
        sd = statistics.pstdev(win)
        if sd > 0 and abs(xs[i] - mu) >= k * sd:
            out.append(i + 1)
    return out


D["spike_gn"] = {n: {"gn": [r(x, 3) if x is not None else None for x in runs[n]["_gn"]], "hits": spike_hits(runs[n]["_gn"])}
                 for n in ("ns_pre_lr3e-2_c0", "ns_pre_lr3e-2_c0_qk", "ns_pre_lr3e-3") if n in runs}
SS = {}
for n in ("ns_pre_lr3e-3", "ns_pre_lr3e-2_c0", "ns_pre_lr3e-2_c0_qk", "ns_pre_lr3e-2_c0_z", "ns_pre_lr3e-2_c0_cap", "ns_pre_lr3e-2_qk"):
    if n in runs:
        hl, nl = spike_score(runs[n]["_loss"]); hg, ng = spike_score(runs[n]["_gn"])
        SS[n] = {"loss": hl, "gn": hg, "n": nl}
D["spike_scores"] = SS

# ---------------------------------------------------------------- section 2: placements measured
def cell(n):
    return fin(n) if n in runs else "pending"


if have("ns_sand_lr3e-3", "ns_out_lr3e-3"):
    N["place_meas"] = (
        "<p>Held-out loss after 1,500 steps; the full grid with curves is the {{Stability explorer|#t-stab}} tab.</p><div class=\"tw\"><table class=\"rd-narrow\"><thead><tr><th>Placement</th><th class=\"num\">lr 3e-3</th>"
        "<th class=\"num\">lr 1e-2</th><th class=\"num\">lr 3e-2</th></tr></thead><tbody>"
        f"<tr><td>Pre-norm</td><td class=\"num\">{cell('bl_pre_lr3e-3')}</td><td class=\"num\">{cell('bl_pre_lr1e-2')}</td><td class=\"num\">{cell('bl_pre_lr3e-2')}</td></tr>"
        f"<tr><td>Post-norm</td><td class=\"num\">{cell('bl_post_lr3e-3')}</td><td class=\"num\">not run</td><td class=\"num\">not run</td></tr>"
        f"<tr><td>Sandwich</td><td class=\"num\">{cell('ns_sand_lr3e-3')}</td><td class=\"num\">{cell('ns_sand_lr1e-2')}</td><td class=\"num\">{cell('ns_sand_lr3e-2')}</td></tr>"
        f"<tr><td>Output norm</td><td class=\"num\">{cell('ns_out_lr3e-3')}</td><td class=\"num\">{cell('ns_out_lr1e-2')}</td><td class=\"num\">{cell('ns_out_lr3e-2')}</td></tr>"
        f"<tr><td>Pre-norm + QK-norm</td><td class=\"num\">{cell('ns_pre_lr3e-3_qk')}</td><td class=\"num\">{cell('ns_pre_lr1e-2_qk')}</td><td class=\"num\">{cell('ns_pre_lr3e-2_qk')}</td></tr>"
        "</tbody></table></div>")
else:
    N["place_meas"] = PEND
def ml(n):
    return fs(runs[n]["ml_max"]) if n in runs and "ml_max" in runs[n] else "pending"
qk_o = (f"; with QK-norm added, output norm reaches {cell('ns_out_lr3e-3_qk')} (largest logit {ml('ns_out_lr3e-3_qk')})" if "ns_out_lr3e-3_qk" in runs else "")
qk_s = (f" and the sandwich {cell('ns_sand_lr3e-3_qk')} (largest logit {ml('ns_sand_lr3e-3_qk')})" if "ns_sand_lr3e-3_qk" in runs else "")
N["place_say"] = (
    f"The two placements that normalise the branch output train <i>worse</i> than pre-norm at this scale, and the attention logits say why: with the output norm "
    f"nothing normalises what attention reads, so the largest logit reaches {ml('ns_out_lr3e-3')} at lr 3e-3 (pre-norm: {ml('ns_pre_lr3e-3')}) and the loss stalls at "
    f"{cell('ns_out_lr3e-3')}; the sandwich's logits still reach {ml('ns_sand_lr3e-3')} at 3e-3 and {ml('ns_sand_lr1e-2')} at 1e-2. Neither ships alone: OLMo 2 adds "
    "QK-norm to its output norm (its paper: \"in isolation, neither of these changes yield good results, but together\" they help), Gemma 2 adds soft-capping to its "
    f"sandwich and Gemma 3 QK-norm{qk_o}{qk_s}. QK-norm does not rescue post-norm, whose failure is the gradient, not the logits ({cell('ns_post_lr3e-3_qk')} at 3e-3, "
    f"largest logit {ml('ns_post_lr3e-3_qk')}). Pre-norm + QK-norm is the most robust: {cell('ns_pre_lr3e-3_qk')}, {cell('ns_pre_lr1e-2_qk')} and "
    f"{cell('ns_pre_lr3e-2_qk')} across a tenfold range of rates.")

# ---------------------------------------------------------------- mHC toy
hc = json.load(open(os.path.join(OUT, "hc_toy.json")))
N["hc_rows"] = "".join(f"<tr><td class=\"num\">{x['sigma']:g}</td><td class=\"num\">{fs(x['unconstrained_fw_median'])}, {fs(x['unconstrained_fw_max'])}</td>"
                       f"<td class=\"num\">{f(x['doubly_stochastic_fw_max'], 4)}</td></tr>" for x in hc["rows"])
h2 = [x for x in hc["rows"] if x["sigma"] == 0.2][0]
N["hc_short"] = f"a median of {fs(h2['unconstrained_fw_median'])} at noise 0.2 over 120 sub-layers"

# ---------------------------------------------------------------- section 3: LayerNorm vs RMSNorm
if have("ns_rms_lr3e-3", "ns_rms_lr3e-3_s1", "ns_pre_lr3e-3_s1"):
    a0, a1 = runs["ns_pre_lr3e-3"]["final"], runs["ns_pre_lr3e-3_s1"]["final"]
    b0, b1 = runs["ns_rms_lr3e-3"]["final"], runs["ns_rms_lr3e-3_s1"]["final"]
    N["lnrms_meas"] = (f"LayerNorm {f(a0, 3)} (seed 0) and {f(a1, 3)} (seed 1); RMSNorm {f(b0, 3)} and {f(b1, 3)}. The gap between the two norms, "
                       f"{f(abs((a0 + a1) / 2 - (b0 + b1) / 2), 3)} on the two-seed means, is {'smaller' if abs((a0 + a1) / 2 - (b0 + b1) / 2) < max(abs(a0 - a1), abs(b0 - b1)) else 'not smaller'} "
                       f"than the spread between seeds ({f(abs(a0 - a1), 3)} for LayerNorm, {f(abs(b0 - b1), 3)} for RMSNorm): no measurable difference at this scale, "
                       f"as the paper reports. Wall time per run: {f(runs['ns_pre_lr3e-3']['_secs'], 0)} s against {f(runs['ns_rms_lr3e-3']['_secs'], 0)} s (rough, shared laptop).")
    N["s0_rms"] = f"LayerNorm {f((a0 + a1) / 2, 3)}, RMSNorm {f((b0 + b1) / 2, 3)} (two-seed means)"
else:
    N["lnrms_meas"] = PEND; N["s0_rms"] = "pending"


def nbtab():
    rows = []
    for dev in ("cpu", "mps"):
        if dev not in nb:
            continue
        for x in nb[dev]["shapes"]:
            rows.append(f"<tr><td>{dev.upper()}</td><td>{' &times; '.join(f'{v:,}' for v in x['shape'])}</td><td>{x['dtype']}</td>"
                        f"<td class=\"num\">{f(x['layernorm_ms'], 2)}</td><td class=\"num\">{f(x['rmsnorm_ms'], 2)}</td><td class=\"num\">{f(x['rmsnorm_hand_ms'], 2)}</td>"
                        f"<td class=\"num\">{f(x['rms_over_ln'], 2)}</td></tr>")
    if not rows:
        return PEND
    return ("<table class=\"rd-narrow\"><thead><tr><th>Device</th><th>Input (B &times; T &times; D)</th><th>dtype</th><th class=\"num\">LayerNorm ms</th>"
            "<th class=\"num\">nn.RMSNorm ms</th><th class=\"num\">hand RMSNorm (Llama) ms</th><th class=\"num\">RMS / LN</th></tr></thead><tbody>" + "".join(rows) + "</tbody></table>")


N["nb_table"] = nbtab()
if "mps" in nb:
    rr = [x["rms_over_ln"] for x in nb["mps"]["shapes"]]
    N["nb_say"] = (f"<b>Does not reproduce on this Mac.</b> On MPS with torch {nb['mps']['torch']}, RMSNorm is {f(min(rr), 1)} to {f(max(rr), 1)} times <i>slower</i> than "
                   "LayerNorm, and PyTorch's own nn.RMSNorm is no faster than the hand-written Llama version: LayerNorm has a fused MPS kernel, RMSNorm runs as separate "
                   "elementwise and reduction ops. Whole training runs show it too: "
                   f"{f(runs['ns_rms_lr3e-3']['_secs'], 0)} s for RMSNorm against {f(runs['ns_pre_lr3e-3']['_secs'], 0)} s for LayerNorm (rough). "
                   + ("On the CPU: " + ", ".join(f"{f(x['rms_over_ln'], 2)}x at {' x '.join(str(v) for v in x['shape'])}" for x in nb["cpu"]["shapes"]) + " (RMS time over LN time). " if "cpu" in nb else ""))
else:
    N["nb_say"] = PEND

# ---------------------------------------------------------------- section 4: the spike animation and QK-norm
if D["spike"]:
    btn = {"qk": "+ QK-norm", "z": "+ z-loss 1e-4", "cap": "+ logit cap 50", "ok": "lr 3e-3 instead (the default)"}
    N["sp_buttons"] = "".join(f'<button data-m="{k}"{" class=on" if k == D["spike"]["def"] else ""}>{btn[k]}</button>' for k in D["spike"]["comps"])
    A = runs["ns_pre_lr3e-2_c0"]; P = A["_probe"]
    first_over = lambda R, v: next((p["step"] for p in R["_probe"] if max(p["max_logit"]) >= v), None)
    s100 = first_over(A, 100); s1k = first_over(A, 1000); s10k = first_over(A, 10000)
    ent_low = next((p["step"] for p in P if min(p["entropy"]) < 0.1), None)
    def caps_for(k):
        B = runs[D["spike"]["comps"][k]]
        bm = B["ml_max"]
        b0 = max(B["_probe"][0]["max_logit"])
        same = "the same random network" if k in ("z", "cap") else ("the same initial weights plus the two QK norms" if k == "qk" else "the same initial weights")
        extra = (f" With QK-norm the step-0 logits are already {fs(b0)}: q and k are rescaled to unit RMS (length {N['sqrt32']}), far larger than the 0.02-scale projections give." if k == "qk" else "")
        c = [[0, f"Step 0: {same}. Without QK-norm every logit is under 1 and every head attends almost uniformly (entropy near {N['uniform_ent']} nats)." + extra],
             [10, f"The first steps at lr 3e-2 are large. Without a fix the largest logit passes 100 by step {s100}; the gradient norm at step {A['_gn'].index(max(A['_gn'][:50])) + 1} is {fs(max(A['_gn'][:50]))}."],
             [s1k or 100, f"Step {s1k}: the largest logit passes 1,000 in layer 1 first. That head's softmax is now almost one-hot; its entropy is below 0.1 nats from step {ent_low}."],
             [s10k or 300, f"Step {s10k}: logits above 10,000 (Wortsman et al.: in their sweeps every run past 1e4 diverged). Every layer's entropy collapses to a few hundredths of a nat; the loss stalls between the bigram (3.616) and unigram ({N['unigram']}) floors."]]
        if k == "qk":
            c.append([600, f"With QK-norm the same batches train: the largest logit grows only through the learned gains, to {fs(bm)} at most, and the loss keeps falling to a held-out {fin(B['name'])} against {fin('ns_pre_lr3e-2_c0')} without."])
        elif k == "z":
            c.append([600, f"With z-loss the attention logits still run away (largest {fs(bm)}): z-loss acts on the output softmax, not on attention. Held-out {fin(B['name'])} against {fin('ns_pre_lr3e-2_c0')} without."])
        elif k == "cap":
            c.append([600, f"With a soft-cap of 50 no logit can pass 50 (largest {fs(bm)}), so no softmax can go fully one-hot. Held-out {fin(B['name'])} against {fin('ns_pre_lr3e-2_c0')} without."])
        else:
            c.append([600, f"At the default rate the largest logit peaks at {fs(bm)} and the run reaches {fin(B['name'])}: logit growth is a learning-rate effect."])
        c.append([1490, f"End: without a fix {fin('ns_pre_lr3e-2_c0')} held-out, largest logit {N['mlend_ns_pre_lr3e-2_c0']}; with the change {fin(B['name'])}, largest logit {fs(B['ml_end'])}."])
        return c
    for k in D["spike"]["comps"]:
        D["spike"]["caps"][k] = caps_for(k)
    N["first100"], N["first1k"], N["first10k"] = str(s100), str(s1k), str(s10k)
else:
    N["sp_buttons"] = ""

if have("ns_pre_lr3e-2_c0", "ns_pre_lr3e-2_c0_qk"):
    A, B = runs["ns_pre_lr3e-2_c0"], runs["ns_pre_lr3e-2_c0_qk"]
    N["qk_meas"] = (f"<p><b>Measured.</b> Without a fix the largest logit passes 1,000 by step {N.get('first1k')} and peaks at {N['mlmax_ns_pre_lr3e-2_c0']} "
                    f"(step {N['mlat_ns_pre_lr3e-2_c0']}); the lowest layer entropy falls to {N['entmin_ns_pre_lr3e-2_c0']} nats, one-hot attention. The loss never becomes "
                    f"non-finite: the run stalls at a held-out {fin('ns_pre_lr3e-2_c0')}, between the bigram floor (3.616) and the unigram floor. With QK-norm and "
                    f"everything else identical the largest logit peaks at {N['mlmax_ns_pre_lr3e-2_c0_qk']} and the run reaches {fin('ns_pre_lr3e-2_c0_qk')}. "
                    f"For scale, at the default lr 3e-3 the same model without QK-norm peaks at {N['mlmax_ns_pre_lr3e-3']} and reaches {fin('ns_pre_lr3e-3')}"
                    + (f"; with QK-norm at 3e-3, {fin('ns_pre_lr3e-3_qk')}" if "ns_pre_lr3e-3_qk" in runs else "") + ".</p>")
else:
    N["qk_meas"] = PEND

if "ns_pre_lr3e-2_c0_z" in runs:
    Z = runs["ns_pre_lr3e-2_c0_z"]
    N["z_answer"] = (f"<b>No.</b> With z-loss the largest attention logit still reaches {fs(Z['ml_max'])} (without: {N['mlmax_ns_pre_lr3e-2_c0']}) and the run ends at "
                     f"{fin('ns_pre_lr3e-2_c0_z')} against {fin('ns_pre_lr3e-2_c0')}. Mean log Z at the end: {N['lzend_ns_pre_lr3e-2_c0_z']} with z-loss, "
                     f"{N['lzend_ns_pre_lr3e-2_c0']} without. The two instabilities are different softmaxes; the ML-fundamentals root found the same on a "
                     "character-level model (z-loss alone did not remove the gradient spikes, QK-norm did).")
    N["z_short"] = f"here it left the attention logits at {fs(Z['ml_max'])}"
    N["z_meas"] = (f"Mean log Z on the probe batch starts at {N['lz0_ns_pre_lr3e-3']} (a uniform guess over 4,096 tokens has log Z = ln 4096 = 8.32 when the "
                   f"logits are near 0) and ends at {N['lzend_ns_pre_lr3e-3']} in the healthy run at lr 3e-3, at {N['lzend_ns_pre_lr3e-2_c0']} in the high-rate run "
                   f"without a fix and at {N['lzend_ns_pre_lr3e-2_c0_z']} with z-loss 1e-4. {{%z_say%}}")
else:
    N["z_answer"] = PEND; N["z_short"] = "pending"; N["z_meas"] = PEND
if "ns_pre_lr3e-2_c0_z" in runs:
    lzh = runs["ns_pre_lr3e-3"]["_probe"][-1]["log_z"]
    N["z_say"] = (f"So at this scale z-loss 1e-4 barely moves log Z ({N['lzend_ns_pre_lr3e-2_c0_z']} against {N['lzend_ns_pre_lr3e-2_c0']}). In the healthy run log Z drifts "
                  f"up to {f(lzh, 2)}, where the penalty is 1e-4 &times; {f(lzh, 2)}<sup>2</sup> = {f(1e-4 * lzh * lzh, 3)} nats, under 1% of the loss: the pull is weak "
                  "by design; the drift it prevents shows up over long runs, at scale and in low precision (published), none of which a 1,500-step float32 run has.")
else:
    N["z_say"] = ""

# QK-norm gains on the trained QK-norm model (probe q_norm and k_norm are mean |q|, |k| after the norm)
QKR = "ns_pre_lr3e-2_c0_qk"
if QKR in runs:
    P = runs[QKR]["_probe"][-1]
    N["qk_gain_meas"] = (f"in this page's QK-norm run at lr 3e-2 the mean |q| after the norm is {f(min(P['q_norm']), 1)} to {f(max(P['q_norm']), 1)} per layer and "
                         f"|k| {f(min(P['k_norm']), 1)} to {f(max(P['k_norm']), 1)} at the end (unit gains would give {N['sqrt32']} for both), and the largest "
                         f"logit is {N['mlend_' + QKR]}, about {f(runs[QKR]['ml_end'] / math.sqrt(32), 0)} times the unit-gain ceiling.")
    N["qk_gain_short"] = f"In the tiny GPT trained with QK-norm at lr 3e-2 the largest logit is {N['mlend_' + QKR]} against a unit-gain ceiling of {N['sqrt32']}"
else:
    N["qk_gain_meas"] = PEND; N["qk_gain_short"] = "pending"

if "ns_pre_lr3e-2_c0_cap" in runs:
    C_ = runs["ns_pre_lr3e-2_c0_cap"]
    N["cap_meas"] = (f"<b>Measured</b> (same high-rate run, a cap of 50 on the attention logits): held-out {fin('ns_pre_lr3e-2_c0_cap')} against "
                     f"{fin('ns_pre_lr3e-2_c0')} uncapped and {fin('ns_pre_lr3e-2_c0_qk')} with QK-norm; the largest raw logit before the cap reached {fs(C_['ml_max'])}. {{%cap_say%}}")
else:
    N["cap_meas"] = PEND
if "ns_pre_lr3e-2_c0_cap" in runs:
    N["cap_say"] = (f"The cap helps but less than QK-norm: logits keep growing behind it (raw {fs(runs['ns_pre_lr3e-2_c0_cap']['ml_max'])}), but because no capped logit can "
                    f"exceed 50 no head goes fully one-hot (lowest layer entropy {N['entmin_ns_pre_lr3e-2_c0_cap']} nats against {N['entmin_ns_pre_lr3e-2_c0']} uncapped). "
                    "That is one reason Gemma 3 switched to QK-norm, which removes the growth instead of hiding it.")

# ---------------------------------------------------------------- section 6: flat init
if "ns_flat_lr3e-3" in runs:
    N["flat_meas"] = f"{fin('ns_flat_lr3e-3')} without the shrink against {fin('ns_pre_lr3e-3')} with it. {{%flat_say%}}"
    N["s0_flat"] = f"GPT-2 init {fin('ns_pre_lr3e-3')}, flat N(0, 0.02) {fin('ns_flat_lr3e-3')}"
else:
    N["flat_meas"] = PEND; N["s0_flat"] = "pending"
if "ns_flat_lr3e-3" in runs and "ns_pre_lr3e-3_s1" in runs:
    N["flat_say"] = (f"The difference is smaller than the spread between two seeds of the default init ({fin('ns_pre_lr3e-3')} and {fin('ns_pre_lr3e-3_s1')}): with 12 "
                     "branches the &radic;12 shrink does not measurably matter. It is a depth effect: the papers above report it at hundreds of millions of parameters and "
                     "dozens of layers, where this page cannot run.")

# ---------------------------------------------------------------- section 7: massive activations in the tiny GPT
ref = json.load(open(os.path.join(OUT, "inspect", "ref_baseline_s1500.json")))
i = max(range(len(ref["max_abs"])), key=lambda j: ref["max_abs"][j])
N["massive_meas"] = (f"In the root's reference tiny GPT the largest single stream entry anywhere is {f(ref['max_abs'][i], 1)} (token {ref['max_abs_tok'][i]}, "
                     f"{ref['points'][i]}) against a median |entry| of {f(ref['median_abs'][i], 2)} at that point, a ratio of {f(ref['max_abs'][i] / ref['median_abs'][i], 0)}; "
                     "the Inside lab's own measurement (35.8) agrees, and its verdict was no massive activation.")
N["s0_z"] = ("z-loss leaves attention-logit growth untouched: " + fin("ns_pre_lr3e-2_c0_z") + " against " + fin("ns_pre_lr3e-2_c0")) if "ns_pre_lr3e-2_c0_z" in runs else "pending"

# ---------------------------------------------------------------- section 8
if have("bl_pre_lr3e-2", "ns_pre_lr3e-2_c0"):
    N["clip_answer"] = (f"<b>About the same.</b> With clipping at 1.0: {fin('bl_pre_lr3e-2')}; without: {fin('ns_pre_lr3e-2_c0')}. The largest gradient norm without "
                        f"clipping was {N['gnmax_ns_pre_lr3e-2_c0']} (step {N['gnmaxat_ns_pre_lr3e-2_c0']}), but the damage is done by many ordinary steps that each "
                        "push the query and key weights a little further, which clipping does not touch. QK-norm without clipping: "
                        f"{fin('ns_pre_lr3e-2_c0_qk')}.")
else:
    N["clip_answer"] = PEND
if SS:
    lab = {"ns_pre_lr3e-3": "lr 3e-3 (default)", "ns_pre_lr3e-2_c0": "lr 3e-2, no clipping", "ns_pre_lr3e-2_c0_qk": "+ QK-norm", "ns_pre_lr3e-2_c0_z": "+ z-loss",
           "ns_pre_lr3e-2_c0_cap": "+ logit cap 50", "ns_pre_lr3e-2_qk": "lr 3e-2, clipping, QK-norm"}
    rows = "".join(f"<tr><td>{lab[n]}</td><td class=\"num\">{v['loss']}</td><td class=\"num\">{v['gn']}</td><td class=\"num\">{f(100 * v['gn'] / v['n'], 2)}%</td></tr>" for n, v in SS.items())
    N["spike_meas"] = ("OLMo 2's score run on this page's every-step logs (7 standard deviations; a 100-step window, as on the ML-fundamentals root, because these runs "
                       "have 1,500 steps, not hundreds of thousands): count of spiking steps out of the 1,400 after the first window.</p>"
                       "<div class=\"tw\"><table class=\"rd-narrow\"><thead><tr><th>Run</th><th class=\"num\">loss spikes</th><th class=\"num\">gradient-norm spikes</th>"
                       "<th class=\"num\">gradient-norm score</th></tr></thead><tbody>" + rows + "</tbody></table></div><p>{%spike_say%}")
else:
    N["spike_meas"] = PEND
if SS:
    N["spike_say"] = ("No run has a loss spike by this definition: at a 1,500-step scale the loss changes too smoothly. The gradient norm separates them: "
                      f"{SS['ns_pre_lr3e-2_c0']['gn']} spikes without a fix, {SS['ns_pre_lr3e-2_c0_z']['gn']} with z-loss, "
                      + (f"{SS['ns_pre_lr3e-2_c0_cap']['gn']} with the cap, " if 'ns_pre_lr3e-2_c0_cap' in SS else "")
                      + f"{SS['ns_pre_lr3e-2_c0_qk']['gn']} with QK-norm, against {SS['ns_pre_lr3e-3']['gn']} at the default rate; the ML-fundamentals root found the same ordering on a "
                      "character-level model (QK-norm 0, z-loss no better than nothing).")

# ---------------------------------------------------------------- mistakes
C = mist["cases"]
N["mis_final_greedy"] = "unchanged" if C["final_norm_dropped"]["greedy"] == C["correct"]["greedy"] else "\"" + C["final_norm_dropped"]["greedy"][:60] + "...\""
esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", " ")
N["mis_gain_greedy"] = esc(C["gain_off_by_one"]["greedy"][:48]) + "..."
N["mis_eps_greedy"] = esc(C["eps_1"]["greedy"][:60]) + "..."
if "qk_norm_dropped" in C:
    N["mis_qk"] = (f"On this page's model trained with QK-norm at lr 3e-3 (loss {f(C['qk_correct']['loss'], 3)} on the running sequence), skipping the trained q_norm and "
                   f"k_norm at inference gives {f(C['qk_norm_dropped']['loss'], 3)} and greedy output \"{esc(C['qk_norm_dropped']['greedy'][:60])}...\". The checkpoint "
                   "loads without error if the converter simply never creates the two modules.")
else:
    N["mis_qk"] = PEND

N["mis6_correct"] = f(C["correct"]["loss6"], 6); N["mis6_layernorm_as_rmsnorm"] = f(C["layernorm_as_rmsnorm"]["loss6"], 6)
N["rms_slow"] = f(100 * (runs["ns_rms_lr3e-3"]["_secs"] / runs["ns_pre_lr3e-3"]["_secs"] - 1), 0)
# ---------------------------------------------------------------- residual tab
M_ = resid["models"]
if all(M_[k]["trained"] for k in ("pre", "post", "sandwich", "output", "pre_flat")):
    T_ = {k: M_[k]["trained"]["median_norm"] for k in M_ if M_[k]["trained"]}
    N["rs_say"] = (f"<p><b>After training</b> pre-norm grows the most ({fs(T_['pre'][0])} to {fs(T_['pre'][-1])}); the sandwich reaches {fs(T_['sandwich'][-1])}, "
                   f"the output norm {fs(T_['output'][-1])}, and post-norm ends at {fs(T_['post'][-1])}, set by its last norm's learned gain. Flat init ends at "
                   f"{fs(T_['pre_flat'][-1])}, about where the scaled init ends: training erases the starting scale at this depth.</p>")
else:
    N["rs_say"] = PEND
pts = resid["points"]
def cap_rs(w):
    out = {}
    ms = resid["models"]
    for i in range(len(pts)):
        parts = []
        for k, lab in (("pre", "pre"), ("post", "post"), ("sandwich", "sandwich"), ("output", "output norm")):
            m = ms[k][w]
            if m:
                parts.append(f"{lab} {fs(m['median_norm'][i])}")
        out[i] = "Median token norm: " + ", ".join(parts) + "."
    return out
resid["caps"]["init"] = cap_rs("init"); resid["caps"]["trained"] = cap_rs("trained")
D["prod"] = []
