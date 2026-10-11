# Executed by build_data.py (shares its names: D, F, J, f2, st). Builds D["drafters"] from results/server_dr.json.
sd_ = J("server_dr.json")
CF = [("base", "No drafter", "none", "", ""),
      ("d06_k3", "Qwen3-0.6B draft, k = 3", "separate model", "Qwen3-0.6B Q4_K_M, 0.40 GB", "-md Qwen3-0.6B-Q4_K_M.gguf --spec-type draft-simple"),
      ("d06_k6", "Qwen3-0.6B draft, k = 6", "separate model", "same", "... --spec-draft-n-max 6"),
      ("eagle3_k3", "EAGLE-3 head, k = 3", "feature-level head (1 layer)", "AngelSlim Qwen3-4B_eagle3, F16", "-md Qwen3-4B-EAGLE3-F16.gguf --spec-type draft-eagle3"),
      ("eagle3_k6", "EAGLE-3 head, k = 6", "feature-level head (1 layer)", "same", "... --spec-draft-n-max 6"),
      ("dflash_k15", "DFlash, block 16 (k = 15)", "block diffusion (5 layers)", "z-lab Qwen3-4B-DFlash-b16, F16", "-md Qwen3-4B-DFlash-b16-F16.gguf --spec-type draft-dflash --spec-draft-n-max 15"),
      ("dflash_k7", "DFlash, k = 7", "block diffusion (5 layers)", "same", "... --spec-draft-n-max 7"),
      ("dspark_k7", "DSpark, block 7 (k = 7)", "block diffusion + Markov head (5 layers)", "deepseek-ai dspark_qwen3_4b_block7, F16", "-md Qwen3-4B-DSpark-block7-F16.gguf --spec-type draft-dspark --spec-draft-n-max 7"),
      ("ng_simple", "n-gram simple, defaults (n 12, m 48)", "n-gram (no model)", "none", "--spec-type ngram-simple --spec-draft-n-max 16"),
      ("ng_simple_n4", "n-gram simple, n 4, m 16", "n-gram (no model)", "none", "--spec-type ngram-simple --spec-ngram-simple-size-n 4 --spec-ngram-simple-size-m 16 --spec-draft-n-max 16"),
      ("ng_mapk_n4", "n-gram map-k, n 4, m 16", "n-gram (no model)", "none", "--spec-type ngram-map-k --spec-ngram-map-k-size-n 4 --spec-ngram-map-k-size-m 16 --spec-draft-n-max 16"),
      ("ng_mod", "n-gram mod, defaults (match 24, 48 to 64)", "n-gram hash (no model)", "none", "--spec-type ngram-mod"),
      ("ng_mod_n8", "n-gram mod, match 8, 4 to 16", "n-gram hash (no model)", "none", "--spec-type ngram-mod --spec-ngram-mod-n-match 8 --spec-ngram-mod-n-min 4 --spec-ngram-mod-n-max 16"),
      ("ng_cache", "n-gram cache", "n-gram statistics (no model)", "none", "--spec-type ngram-cache"),
      ("d06_ng4", "0.6B draft + n-gram simple n 4", "model + n-gram", "Qwen3-0.6B Q4_K_M", "--spec-type draft-simple,ngram-simple --spec-ngram-simple-size-n 4 --spec-ngram-simple-size-m 16")]
PL = {"code_hints": "Code: add type hints", "code_rename": "Code: rename", "rag_quote": "Quote from a passage", "summarize_article": "Summarise an article", "story": "Story", "list": "List"}
t1_ = J("server_dr_try1.json") if ex("server_dr_try1.json") else {}
STALL = 5.0  # tokens/s below this means the request stalled while the shared machine was swapping
res = {}
for key, *_ in CF:
    d = sd_.get("dr_%s_B1" % key); timed = d is not None
    d = d or t1_.get("dr_%s_B1" % key)
    if not d: continue
    res[key] = {}
    for p in PL:
        rq = [r for r in d["requests"] if r["prompt"] == p]
        if not rq: continue
        n = sum(r["n_out"] for r in rq); a = sum(r["draft_acc"] or 0 for r in rq); dr = sum(r["draft_n"] or 0 for r in rq)
        v = [r["tok_s"] for r in rq]
        ok = timed and min(v) >= STALL
        res[key][p] = {"tok_s": st.mean(v) if ok else None, "stalled": bool(timed and not ok), "n_out": n / len(rq),
                       "drafted": dr if key != "base" else None, "accepted": a, "L": (n / (n - a)) if key != "base" and n > a else None}
# reference: mean of the three no-drafter runs (first, middle, last) per prompt, stalled requests excluded
spread = None
refs = [sd_[t] for t in ("dr_base_B1", "dr_base_mid_B1", "dr_base2_B1") if t in sd_]
if refs and "base" in res:
    devs = []
    for p in PL:
        v = [r["tok_s"] for d in refs for r in d["requests"] if r["prompt"] == p and r["tok_s"] >= STALL]
        if v:
            res["base"][p]["tok_s"] = st.mean(v); res["base"][p]["stalled"] = False
            devs += [abs(x / st.mean(v) - 1) for x in v]
    spread = max(devs) if devs else None
cfgs = [{"key": k, "label": l, "kind": kd, "file": fl, "flags": fg} for k, l, kd, fl, fg in CF if k in res]
loads = [float(x["load_before"].strip("{} ").split()[0]) for x in sd_.values() if x.get("load_before")]
D["drafters"] = {"base": "base", "prompts": list(PL), "plabel": PL, "cfgs": cfgs, "res": res,
    "setup": "Target Qwen3-4B Q4_K_M (Qwen official GGUF, 2.50 GB) in llama-server (llama.cpp b11146, Metal, flash attention on), one slot, greedy, up to 512 tokens per answer, each prompt once (llama-server timings are per request; greedy output is deterministic). Prompts: a 70-line Python module to edit (add type hints; rename a function and change a constant), a WikiText-2 article to quote from and to summarise, a short story and a numbered list. Every drafter is the one published for Qwen3-4B (or the same-family 0.6B model), converted to GGUF here. <span class=\"meas\">measured here</span>",
    "note": ("One-minute load average before the runs: %s to %s. " % (f2(min(loads), 1), f2(max(loads), 1)) if loads else "") + ("The reference is the mean of three no-drafter runs (first, middle and last), which differed from their mean by up to %s%% per prompt: speed-ups within that of 1x are noise." % f2(100 * spread, 0) if spread is not None else ""),
    "findings": ""}
# findings, written from the numbers
lab = {c[0]: c[1] for c in CF}
def sp_(k, p):
    r = res.get(k, {}).get(p); b = res["base"].get(p)
    return r["tok_s"] / b["tok_s"] if r and r["tok_s"] and b and b["tok_s"] else None
lines = []
for p in PL:
    timed = [(sp_(k, p), k) for k in res if k != "base" and sp_(k, p)]
    best = max(timed) if timed else None; Ls = [(res[k][p]["L"], k) for k in res if k != "base" and res[k].get(p) and res[k][p]["L"]]
    bl = max(Ls) if Ls else None
    lines.append("<li><b>%s:</b> %slongest acceptance %s tokens per pass (%s).</li>" % (
        PL[p], ("fastest %s at %sx the plain server; " % (lab[best[1]], f2(best[0], 2))) if best else "", f2(bl[0], 1) if bl else "n/a", lab[bl[1]] if bl else ""))
D["drafters"]["findings"] = "<ul class=\"tight\">" + "".join(lines) + "</ul>"
diff_ = sorted({PL[p][0].lower() + PL[p][1:] for k in res if k != "base" for p in PL if res[k].get(p) and res["base"].get(p) and res[k][p]["n_out"] != res["base"][p]["n_out"]})
D["drafters"]["findings"] += ("<p class=\"small\">All runs are greedy, so drafted and accepted counts repeat exactly from run to run (checked on two drafters run twice), and in exact arithmetic the text would equal the plain server's. It did not always: answer lengths differed from the plain server's for %s with some drafter, the same floating-point effect as in Reading section 3 (a k + 1 token verification pass rounds differently from a 1-token step).</p>" % ", ".join(diff_)) if diff_ else ""
D["drafters"]["findings"] += ("<p>What it means. Model-free n-gram drafting was the clear winner wherever the answer copies the prompt (code edits, quoting), because its guesses cost nothing to make and are long; on fresh prose it finds nothing to copy and costs almost nothing either. "
    "The trained drafters guessed far better on prose than any n-gram, and DFlash's block of 16 was accepted 10 to 12 tokens at a time on code and lists, which is the only place its one-pass draft paid. "
    "EAGLE-3 and DSpark kept their acceptance but lost speed: on this GPU every drafted token makes the 4-bit target's verification pass costlier (Reading section 1), and the drafters run in 16-bit. "
    "This ranking is for one laptop GPU at batch 1, and it is not the datacenter ranking: on an H100, where checking 8 to 16 tokens is nearly free, the published results in Reading section 6 put EAGLE-3 and DFlash far ahead of n-gram on general text.</p>")
