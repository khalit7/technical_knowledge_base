"""Temperature 0: does verifying a block of tokens in one pass give the same argmax as one token at a time?
Target Qwen3-1.7B-4bit (MLX). For each prompt: greedy-decode 256 tokens one at a time (KV cache), then recompute
the logits of the same sequence in blocks of B tokens (as a verifier sees them) and compare.
Also runs mlx-lm's own speculative decoding (draft 0.6B-4bit, k=6) and records whether it matches plain greedy.
usage: floatcav.py <models> <out json>"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, mlx.core as mx
from common import *
from mlx_lm.models.cache import make_prompt_cache
from mlx_lm import stream_generate

MD, OUT = sys.argv[1], sys.argv[2]
tm, dm, tok = load_pair(MD)

def greedy_incremental(ids, n):
    c = make_prompt_cache(tm); lg = tm(mx.array(ids)[None], cache=c)[0, -1]
    toks, rows = [], []
    for _ in range(n):
        lg32 = np.array(lg.astype(mx.float32)); rows.append(lg32)
        t = int(np.argmax(lg32)); toks.append(t)
        if t in tok.eos_token_ids: break
        lg = tm(mx.array([[t]]), cache=c)[0, -1]
    return toks, rows

def block_logits(ids, toks, B):
    c = make_prompt_cache(tm); tm(mx.array(ids[:-1])[None], cache=c)
    seq = [ids[-1]] + toks[:-1]; rows = []
    for s in range(0, len(seq), B):
        lg = tm(mx.array(seq[s:s + B])[None], cache=c)[0]
        mx.eval(lg); rows.extend(list(np.array(lg.astype(mx.float32))))
    return rows

res = {"target": "mlx Qwen3-1.7B-4bit", "runs": []}
for name in ["code_edit", "summarize", "story", "list"]:
    ids = chat_ids(tok, PROMPTS[name])
    toks, inc = greedy_incremental(ids, 256)
    for B in (2, 4, 7):
        blk = block_logits(ids, toks, B)
        diffs = [float(np.max(np.abs(a - b))) for a, b in zip(inc, blk)]
        flips = [i for i, (a, b) in enumerate(zip(inc, blk)) if int(np.argmax(a)) != int(np.argmax(b))]
        margins = [float(np.sort(a)[-1] - np.sort(a)[-2]) for a in inc]
        res["runs"].append({"prompt": name, "B": B, "n": len(toks), "max_abs_diff": max(diffs),
                            "median_abs_diff": float(np.median(diffs)), "flips": flips,
                            "flip_margins": [margins[i] for i in flips],
                            "n_margin_below_maxdiff": int(sum(m < max(diffs) for m in margins)),
                            "min_margin": min(margins)})
        print(name, B, "maxdiff %.4f median %.4f flips %s min margin %.4f" % (max(diffs), np.median(diffs), flips, min(margins)), flush=True)
    base = [r.token for r in stream_generate(tm, tok, ids, max_tokens=256)]
    spec = [r.token for r in stream_generate(tm, tok, ids, max_tokens=256, draft_model=dm, num_draft_tokens=6)]
    first = next((i for i, (a, b) in enumerate(zip(base, spec)) if a != b), None)
    res.setdefault("mlxspec", []).append({"prompt": name, "base_eq_incremental": base == toks[:len(base)], "same": base == spec, "first_diff": first})
json.dump(res, open(OUT, "w"))
