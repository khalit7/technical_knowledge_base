"""Which tensors autograd keeps for one block of the running example, and the per-layer formula they add up to.
Deterministic. Runs a 1-block model with odd sizes (B=3, T=40, d=96, H=3) so every saved shape can be read as a
product of B, T, d, H; then checks the formula against the 4-block and 8-block configurations' measured bytes.
    python saved_formula.py -> inputs/saved_formula.json
"""
import sys, torch
import common

torch.set_num_threads(4)


def saved(cfg):
    m = common.make_model(cfg); x, y = common.get_batch(cfg, 0)
    params = {p.untyped_storage().data_ptr() for p in m.parameters()}
    seen, items = set(), []
    def pack(t):
        s = t.untyped_storage(); p = s.data_ptr()
        if p not in seen and p not in params and p not in (x.untyped_storage().data_ptr(), y.untyped_storage().data_ptr()):
            seen.add(p); items.append({"shape": list(t.shape), "dtype": str(t.dtype)[6:], "bytes": s.nbytes(), "storage_shape_numel": s.nbytes() // t.element_size()})
        return t
    with torch.autograd.graph.saved_tensors_hooks(pack, lambda t: t):
        m(x, y)
    return items


def formula(B, T, d, H, L, V):
    """Bytes of saved activations, float32, SDPA on the CPU (flash kernel: output and logsumexp, no T x T matrix).
    Per block 16 BTd + 4 BT + BHT elements; head 2 BTd + 2 BT + BTV; plus the position ids (int64, T x 8 bytes)
    and one 4-byte scalar."""
    per_block = 4 * (16 * B * T * d + 4 * B * T + B * H * T)
    head = 4 * (2 * B * T * d + 2 * B * T + B * T * V)
    return per_block * L + head + 8 * T + 4


if __name__ == "__main__":
    small1 = common.cfg("small", n_layer=1, d_model=96, n_head=3, block_size=40, batch_size=3)
    items = saved(small1)
    for it in items:
        print(it, file=sys.stderr)
    checks = []
    for name, c in (("tiny1", small1), ("small", common.cfg("small")), ("big", common.cfg("big")),
                    ("big_v50k", common.cfg("big", vocab_size=50257)), ("small_T256_B16", common.cfg("small", block_size=256, batch_size=16))):
        meas = sum(i["bytes"] for i in saved(c))
        pred = formula(c.batch_size, c.block_size, c.d_model, c.n_head, c.n_layer, c.vocab_size)
        checks.append({"config": name, "B": c.batch_size, "T": c.block_size, "d": c.d_model, "H": c.n_head, "L": c.n_layer,
                       "V": c.vocab_size, "measured": meas, "formula": pred, "diff": meas - pred})
        print(checks[-1], file=sys.stderr)
    # attention written out (GPTConfig attn="manual"): extra bytes per block, expressed in B*H*T*T and B*T*d
    man = []
    for c in (common.cfg("small", attn="manual"), common.cfg("small", attn="manual", block_size=32, batch_size=4),
              common.cfg("big", attn="manual")):
        sd = sum(i["bytes"] for i in saved(common.GPTConfig(**{**c.__dict__, "attn": "sdpa"})))
        mm = sum(i["bytes"] for i in saved(c))
        man.append({"B": c.batch_size, "T": c.block_size, "d": c.d_model, "H": c.n_head, "L": c.n_layer, "manual": mm, "sdpa": sd,
                    "extra_per_block_elems": (mm - sd) / 4 / c.n_layer})
        print(man[-1], file=sys.stderr)
    # model: the softmax output, B*H*T*T floats per block, replaces nothing else of size (checked per config below)
    for m in man:
        m["formula_extra_bytes"] = 4 * m["B"] * m["H"] * m["T"] ** 2 * m["L"]
        m["rel_diff"] = round((m["manual"] - m["sdpa"] - m["formula_extra_bytes"]) / m["manual"], 5)
        print(m, file=sys.stderr)
    common.dump("saved_formula.json", {"env": common.env(), "tiny1_items": items, "checks": checks, "manual_runs": man,
                                       "manual_coef_BHTT": 1, "manual_coef_BTd": 0})
