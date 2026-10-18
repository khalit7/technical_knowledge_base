"""SmolLM2-135M long-context runs (CPU, 4 threads, fp32; deterministic forward passes).
  map   : full cache, pass-key exact match over context length x needle depth x 4 seeds  -> out/map.json
  evict : at 4,096 tokens, every cache policy and budget on pass-key, copy and new-story items -> out/evict.json
  check : my forward against transformers' own forward -> out/check.json
Run: LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=4 nice -n 15 python run_kv.py <mode>"""
import json, math, os, sys, time, torch
import torch.nn.functional as F
import smol, items, policies as P

torch.set_num_threads(4)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT, exist_ok=True)
tok, m = smol.load()
NL = m.config.num_hidden_layers
BYTES_PER_TOKEN = 2 * NL * m.config.num_key_value_heads * (m.config.hidden_size // m.config.num_attention_heads) * 2  # bf16


def answer_scores(lg, ans):
    lp = F.log_softmax(lg.float(), -1)
    pred = lg.argmax(-1)
    return {"exact": bool((pred == ans).all()), "digits": float((pred[1:] == ans[1:]).float().mean()),
            "logp": float(lp[torch.arange(len(ans)), ans].mean()), "pred": tok.decode(pred)}


def run_answer(cache, keep, ctx, ans, override=None):
    # cache holds ctx[:-1]; feed ctx[-1] then ans[:-1]: logits predict ans
    feed = torch.cat([ctx[-1:], ans[:-1]])
    lg = smol.continue_with_cache(m, cache, keep, feed, len(ctx) - 1, override)
    return answer_scores(lg, ans)


def run_cont(cache, keep, ctx, cont, override=None):
    feed = torch.cat([ctx[-1:], cont[:-1]])
    lg = smol.continue_with_cache(m, cache, keep, feed, len(ctx) - 1, override)
    return float(F.cross_entropy(lg.float(), cont))


def mode_check():
    ids = items.copy_item(tok, 1024, 0.3, 0)["ctx"]
    d, ref = smol.check_against_hf(m, ids, 900)
    json.dump({"tokens": len(ids), "split": 900, "max_abs_logit_diff": d, "max_abs_logit": ref}, open(f"{OUT}/check.json", "w"), indent=1)
    print(d, ref)


def mode_map():
    lengths = [1024, 2048, 4096, 6144, 8192, 12288, 16384]
    depths = [0.05, 0.25, 0.5, 0.75, 0.95]
    res = []
    for L in lengths:
        t0 = time.time()
        for d in depths:
            for s in range(4):
                it = items.passkey(tok, L, d, s)
                ctx = it["ctx"]
                cache = smol.prefill(m, ctx[:-1], want_scores=False)
                keep = [torch.ones(c["k"].shape[:2], dtype=torch.bool) for c in cache]
                r = run_answer(cache, keep, ctx, it["ans"])
                r.update(length=len(ctx), depth=d, seed=s, key=it["key"], depth_tokens=it["depth_tokens"])
                res.append(r)
                del cache
        print(L, "done", round(time.time() - t0), "s", sum(r["exact"] for r in res if r["length"] == len(ctx)) , flush=True)
        json.dump({"model": smol.REPO, "rev": smol.REV, "max_position_embeddings": m.config.max_position_embeddings,
                   "rope": str(getattr(m.config, "rope_parameters", None)), "rows": res}, open(f"{OUT}/map.json", "w"))


EVICT = ["recent", "sink_recent", "random", "h2o", "snapkv", "snapkv_doc", "local_global"]
FRACS = [0.5, 0.25, 0.125, 0.0625]
QUANT = [("tok", 8), ("tok", 4), ("tok", 2), ("kivi", 4), ("kivi", 2)]


def bins(mask, n=64):
    """(nkv, T) bool -> (nkv, n) kept share per bin, 0-9."""
    T = mask.shape[1]
    e = torch.linspace(0, T, n + 1).long()
    return [[int(round(9 * float(mask[h, e[i]:e[i + 1]].float().mean()))) for i in range(n)] for h in range(mask.shape[0])]


def quant_override(cache, kind, bits):
    ov = []
    for c in cache:
        if kind == "tok":
            ov.append((P.quant(c["k"], bits, "token"), P.quant(c["v"], bits, "token")))
        else:
            ov.append((P.quant(c["k"], bits, "channel"), P.quant(c["v"], bits, "token")))
    return ov


def all_policies(cache, ctx, q_len, seed, fn):
    """fn(keep, override) -> result; returns {policy: {frac or bits: result}}."""
    T = cache[0]["k"].shape[1]
    out = {"full": fn([torch.ones(c["k"].shape[:2], dtype=torch.bool) for c in cache], None)}
    for name in EVICT:
        if name == "snapkv_doc" and "snap_doc" not in cache[0]:
            continue
        out[name] = {}
        for f in FRACS:
            keep = P.evict(cache, name, f, q_len, seed=seed, n_layers=NL)
            if keep is not None:
                out[name][str(f)] = fn(keep, None)
    full = [torch.ones(c["k"].shape[:2], dtype=torch.bool) for c in cache]
    for kind, bits in QUANT:
        out[f"q_{kind}{bits}"] = {str(P.quant_bytes_frac(bits)): fn(full, quant_override(cache, kind, bits))}
    return out


def mode_evict():
    L = 4096
    res = {"length": L, "bytes_per_token_bf16": BYTES_PER_TOKEN, "fracs": FRACS, "passkey": [], "copy": [], "new": [], "maps": {}}
    t0 = time.time()
    for d in [0.1, 0.3, 0.5, 0.7, 0.9]:
        for s in range(6):
            it = items.passkey(tok, L, d, s)
            ctx = it["ctx"]; ql = it["q_len"]
            cache = smol.prefill(m, ctx[:-1], doc_end=len(ctx) - ql)
            r = all_policies(cache, ctx, ql - 1, s, lambda keep, ov: run_answer(cache, keep, ctx, it["ans"], ov))
            ns, ne = it["needle_span"]
            # how many of the 90 (layer, KV head) caches kept the whole number (its 5 digit tokens)
            dig = slice(*it["key_span"])
            surv = {}
            for name in ["recent", "sink_recent", "random", "h2o", "snapkv", "snapkv_doc", "local_global"]:
                surv[name] = {}
                for f in FRACS:
                    keep = P.evict(cache, name, f, ql - 1, seed=s, n_layers=NL)
                    if keep is not None:
                        surv[name][str(f)] = int(sum(int(k[h, dig].all()) for k in keep for h in range(k.shape[0])))
                        if d == 0.5 and s == 0:
                            res["maps"].setdefault(name, {})[str(f)] = [bins(k) for k in keep]
            res["passkey"].append({"depth": d, "seed": s, "needle": [ns, ne], "key": it["key"], "res": r, "survive": surv})
            print("pk", d, s, round(time.time() - t0), r["full"]["exact"], r["snapkv"]["0.125"]["exact"], flush=True)
            del cache
    for d in [0.1, 0.3, 0.5, 0.7, 0.9, 0.5]:
        s = len(res["copy"])
        it = items.copy_item(tok, L, d, s); ctx = it["ctx"]
        cache = smol.prefill(m, ctx[:-1])
        res["copy"].append({"depth": d, "seed": s, "span": it["span"],
                            "res": all_policies(cache, ctx, 1, s, lambda keep, ov: run_cont(cache, keep, ctx, it["cont"], ov))})
        del cache
        it = items.new_item(tok, L, s); ctx = it["ctx"]
        cache = smol.prefill(m, ctx[:-1])
        res["new"].append({"seed": s, "res": all_policies(cache, ctx, 1, s, lambda keep, ov: run_cont(cache, keep, ctx, it["cont"], ov))})
        del cache
        print("copy/new", s, round(time.time() - t0), flush=True)
        json.dump(res, open(f"{OUT}/evict.json", "w"))
    json.dump(res, open(f"{OUT}/evict.json", "w"))


{"check": mode_check, "map": mode_map, "evict": mode_evict}[sys.argv[1]]()
