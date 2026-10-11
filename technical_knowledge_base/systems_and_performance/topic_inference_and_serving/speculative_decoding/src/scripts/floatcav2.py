"""At the first token where mlx-lm's speculative output (k=6) differs from its plain greedy output, what were the
target's top two logits, computed three ways on the same prefix (the plain run's own tokens)?
(a) one forward pass over prompt + prefix, (b) prompt prefilled then the prefix one token at a time,
(c) prompt prefilled then the prefix in blocks of 7 (as a k = 6 verifier sees it). usage: floatcav2.py <models> <out>"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, mlx.core as mx
from common import *
from mlx_lm.models.cache import make_prompt_cache
from mlx_lm import stream_generate
MD, OUT = sys.argv[1], sys.argv[2]
tm, dm, tok = load_pair(MD)
def last_logits(ids, pre, chunk):
    c = make_prompt_cache(tm)
    if chunk is None:
        lg = tm(mx.array(ids + pre)[None])[0, -1]
    else:
        lg = tm(mx.array(ids)[None], cache=c)[0, -1]
        for s in range(0, len(pre), chunk):
            lg = tm(mx.array(pre[s:s + chunk])[None], cache=c)[0, -1]
    return np.array(lg.astype(mx.float32))
res = []
for name in ["code_edit", "summarize", "story", "list"]:
    ids = chat_ids(tok, PROMPTS[name])
    base = [r.token for r in stream_generate(tm, tok, ids, max_tokens=256)]
    spec = [r.token for r in stream_generate(tm, tok, ids, max_tokens=256, draft_model=dm, num_draft_tokens=6)]
    d = next((i for i, (a, b) in enumerate(zip(base, spec)) if a != b), None)
    rec = {"prompt": name, "n": len(base), "first_diff": d}
    if d is not None:
        pre = base[:d]; ways = {}
        for nm, ch in (("one_pass", None), ("one_at_a_time", 1), ("blocks_of_7", 7)):
            lg = last_logits(ids, pre, ch); o = np.argsort(-lg)[:2]
            ways[nm] = {"top": [tok.decode([int(o[0])]), tok.decode([int(o[1])])], "logits": [float(lg[o[0]]), float(lg[o[1]])],
                        "gap": float(lg[o[0]] - lg[o[1]]), "base_tok_logit": float(lg[base[d]]), "spec_tok_logit": float(lg[spec[d]])}
        rec.update({"base_tok": tok.decode([base[d]]), "spec_tok": tok.decode([spec[d]]), "context": tok.decode(base[max(0, d - 10):d]), "ways": ways})
    res.append(rec); print(json.dumps(rec), flush=True)
json.dump(res, open(OUT, "w"))
