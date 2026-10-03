"""Recompute every derived number on the Alignment page, and write the page's data part.

  python3 recompute.py          (stdlib only; reads inputs/, writes parts/20_js_data.js and inputs/derived.json)

1. SFT: loss share, padding against packing, cross-document attention, per-token weights under mean and sum loss,
   on 1,000 sampled rows of the Tulu 3 SFT mixture (inputs/tulu3_lengths.json, made by mk_lengths.py).
2. The preference-loss family on one illustrative pair: scores, losses, per-token pushes, and 400 gradient steps.
   The same code is ported to parts/31_js_pair.js; check_pair.mjs compares the two.
"""
import json, math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
MAXLEN = 4096  # Tulu 3 SFT max sequence length (Table 11)


# ---------------------------------------------------------------- 1. SFT
def sft():
    rows = json.load(open(os.path.join(HERE, "inputs", "tulu3_lengths.json")))["rows"]
    out = {}
    T = [min(r["total"], MAXLEN) for r in rows]
    # loss tokens after truncation: assume the loss tokens are cut proportionally when a row is truncated
    L = [r["loss"] if r["total"] <= MAXLEN else round(r["loss"] * MAXLEN / r["total"]) for r in rows]
    out["n"] = len(rows)
    out["over"] = sum(r["total"] > MAXLEN for r in rows)
    out["mean_total"] = sum(r["total"] for r in rows) / len(rows)
    out["median_total"] = sorted(r["total"] for r in rows)[len(rows) // 2]
    out["loss_share_untrunc"] = sum(r["loss"] for r in rows) / sum(r["total"] for r in rows)
    out["multi_turn"] = sum(r["turns"] > 1 for r in rows)

    # padding to the longest in random micro-batches of B
    def pad_eff(B, seeds=50):
        e = []
        for s in range(seeds):
            idx = list(range(len(T)))
            random.Random(s).shuffle(idx)
            real = comp = 0
            for i in range(0, len(idx) - B + 1, B):
                b = [T[j] for j in idx[i:i + B]]
                real += sum(b)
                comp += B * max(b)
            e.append(real / comp)
        return sum(e) / len(e)
    out["pad_eff"] = {B: pad_eff(B) for B in (1, 2, 4, 8, 16)}

    # best-fit-decreasing packing into rows of MAXLEN (TRL's "bfd")
    def bfd(lengths):
        bins = []
        for l in sorted(lengths, reverse=True):
            best = None
            for b in bins:
                if b["free"] >= l and (best is None or b["free"] < best["free"]):
                    best = b
            if best is None:
                best = {"free": MAXLEN, "items": []}
                bins.append(best)
            best["items"].append(l)
            best["free"] -= l
        return bins
    bins = bfd(T)
    out["pack_rows"] = len(bins)
    out["pack_eff"] = sum(T) / (len(bins) * MAXLEN)
    # causal attention pairs that cross a document boundary under plain causal masking of a packed row
    cross = allp = 0
    for b in bins:
        before = 0
        for l in b["items"]:
            cross += l * before
            allp += l * (l + 1) // 2 + l * before
            before += l
    out["cross_share"] = cross / allp

    # per-token gradient weight: mean per example (gradient accumulation, Tulu 3 Eq. 2) against sum
    Ls = sorted(l for l in L if l > 0)
    p10, p90 = Ls[len(Ls) // 10], Ls[9 * len(Ls) // 10]
    out["loss_p10"], out["loss_p90"] = p10, p90
    out["weight_ratio_p10_p90"] = p90 / p10

    # the 8 conversations the packing animation uses: seeded draw, kept in sampled order
    pick = random.Random(7).sample(range(len(rows)), 8)
    batch = [{"t": T[i], "l": L[i], "src": rows[i]["source"].split("/")[-1], "turns": rows[i]["turns"]} for i in pick]
    out["batch"] = batch
    bb = bfd([b["t"] for b in batch])
    out["batch_pad_eff"] = sum(b["t"] for b in batch) / (8 * max(b["t"] for b in batch))
    out["batch_pack_rows"] = len(bb)
    return out


# ---------------------------------------------------------------- 2. the preference pair
# Tokens of the two answers (Tulu 3 tokenizer, inputs/example_tokens.json; the rejected answer tokenized the same way).
# Reference log-probabilities per token are ILLUSTRATIVE, chosen so that the shorter wrong answer has the higher
# summed log-probability (the length effect SimPO and length-normalised DPO target).
CH = ["12", " pens", " is", " ", "4", " groups", " of", " ", "3", ",", " so", " ", "4", " ×", " $", "2", " =", " $", "8", ".", "<eos>"]
CH_P = [0.55, 0.92, 0.70, 0.80, 0.45, 0.60, 0.95, 0.90, 0.85, 0.75, 0.80, 0.85, 0.80, 0.55, 0.85, 0.95, 0.90, 0.95, 0.70, 0.85, 0.90]
RJ = ["12", " pens", " cost", " ", "12", " ×", " $", "2", " =", " $", "24", ".", "<eos>"]
RJ_P = [0.55, 0.92, 0.60, 0.80, 0.50, 0.70, 0.85, 0.90, 0.92, 0.95, 0.80, 0.85, 0.90]
SHARED = 2  # "12", " pens": same tokens in the same context, so the same parameters

METHODS = {
    "rm":    {"beta": None},
    "dpo":   {"beta": 0.1},
    "cdpo":  {"beta": 0.1, "eps": 0.1},
    "ipo":   {"tau": 0.1},
    "lndpo": {"beta": 5.0},
    "simpo": {"beta": 2.0, "gamma": 1.0},
    "orpo":  {"lam": 0.1},
    "kto":   {"beta": 0.1, "lD": 1.0, "lU": 1.0},
}

sig = lambda x: 1 / (1 + math.exp(-x))
logit = lambda p: math.log(p / (1 - p))


def logsig(x):
    return -math.log1p(math.exp(-x)) if x > -30 else x


def evaluate(m, th_c, th_r, ref_c, ref_r, rm):
    """Loss and the push -dL/d(log p of each token) for chosen and rejected tokens (shared tokens get both)."""
    P = METHODS[m]
    lc = [logsig(t) for t in th_c]
    lr = [logsig(t) for t in th_r]
    Sc, Sr = sum(lc), sum(lr)
    nc, nr = len(lc), len(lr)
    Dc, Dr = Sc - sum(ref_c), Sr - sum(ref_r)
    o = {"Sc": Sc, "Sr": Sr, "Dc": Dc, "Dr": Dr}
    gc = gr = 0.0  # push on each chosen / rejected token log-prob (same for every token of an answer)
    if m == "rm":
        h = rm[0] - rm[1]
        o.update(score_c=rm[0], score_r=rm[1], margin=h, loss=-logsig(h))
        o["grm"] = sig(-h)
    elif m == "dpo":
        b = P["beta"]; h = b * (Dc - Dr)
        o.update(score_c=b * Dc, score_r=b * Dr, margin=h, loss=-logsig(h))
        gc, gr = b * sig(-h), -b * sig(-h)
    elif m == "cdpo":
        b, e = P["beta"], P["eps"]; h = b * (Dc - Dr)
        o.update(score_c=b * Dc, score_r=b * Dr, margin=h, loss=-(1 - e) * logsig(h) - e * logsig(-h))
        g = (1 - e) * sig(-h) - e * sig(h)
        gc, gr = b * g, -b * g
    elif m == "ipo":
        t = P["tau"]; h = Dc - Dr
        o.update(score_c=Dc, score_r=Dr, margin=h, loss=(h - 1 / (2 * t)) ** 2)
        g = -2 * (h - 1 / (2 * t))
        gc, gr = g, -g
    elif m == "lndpo":
        b = P["beta"]; h = b * (Dc / nc - Dr / nr)
        o.update(score_c=b * Dc / nc, score_r=b * Dr / nr, margin=h, loss=-logsig(h))
        gc, gr = b / nc * sig(-h), -b / nr * sig(-h)
    elif m == "simpo":
        b, g0 = P["beta"], P["gamma"]; h = b * Sc / nc - b * Sr / nr - g0
        o.update(score_c=b * Sc / nc, score_r=b * Sr / nr, margin=h, loss=-logsig(h))
        gc, gr = b / nc * sig(-h), -b / nr * sig(-h)
    elif m == "orpo":
        lam = P["lam"]; ac, ar = Sc / nc, Sr / nr
        Pc, Pr = math.exp(ac), math.exp(ar)
        oc, orr = ac - math.log(1 - Pc), ar - math.log(1 - Pr)
        z = oc - orr
        nll = -ac
        o.update(score_c=oc, score_r=orr, margin=z, loss=nll + lam * -logsig(z), nll=nll, Pc=Pc, Pr=Pr)
        gc = 1 / nc + lam * sig(-z) / (1 - Pc) / nc
        gr = -lam * sig(-z) / (1 - Pr) / nr
    elif m == "kto":
        b, lD, lU = P["beta"], P["lD"], P["lU"]
        z0 = max(0.0, (Dc + Dr) / 2)
        sD, sU = sig(b * (Dc - z0)), sig(b * (z0 - Dr))
        o.update(score_c=Dc, score_r=Dr, z0=z0, margin=Dc - Dr, loss=(lD - lD * sD) + (lU - lU * sU), vD=lD * sD, vU=lU * sU)
        gc, gr = lD * b * sD * (1 - sD), -lU * b * sU * (1 - sU)
    o["gc"], o["gr"] = gc, gr
    return o


def train(m, steps=400, lr=0.1):
    ref_c = [math.log(p) for p in CH_P]
    ref_r = [math.log(p) for p in RJ_P]
    # parameters: one logit per distinct token position; the shared prefix uses the chosen answer's
    th = [logit(p) for p in CH_P] + [logit(p) for p in RJ_P[SHARED:]]
    rm = [0.0, 0.0]
    if m == "rm":
        th = []
    nc = len(CH_P)
    traj = []
    for s in range(steps + 1):
        th_c = th[:nc] if th else [logit(p) for p in CH_P]
        th_r = (th[:SHARED] + th[nc:]) if th else [logit(p) for p in RJ_P]
        o = evaluate(m, th_c, th_r, ref_c, ref_r, rm)
        traj.append({"s": s, "Sc": o["Sc"], "Sr": o["Sr"], "margin": o["margin"], "loss": o["loss"],
                     "rmc": rm[0], "rmr": rm[1]})
        if s == steps:
            break
        # gradient of the loss w.r.t. parameters: dL/dtheta = -push * dlogp/dtheta = -push * (1 - p)
        if m == "rm":
            g = [-o["grm"], o["grm"]]
            params = rm
            off = len(th)
        else:
            g = []
            for i in range(len(th)):
                p = sig(th[i])
                if i < nc:
                    push = o["gc"] + (o["gr"] if i < SHARED else 0.0)
                else:
                    push = o["gr"]
                g.append(-push * (1 - p))
            params = th
            off = 0
        # plain gradient descent; the step size is set once, from the first step, so that the largest
        # parameter moves by `lr` on step 0 for every method: the losses' different scales (IPO's 10 against
        # DPO's 0.05) are factored out, and how each push grows or dies away afterwards is the loss's own shape.
        if s == 0:
            gmax = max(abs(x) for x in g) or 1.0
            rate = lr / gmax
        for i in range(len(params)):
            params[i] -= rate * g[i]
    return traj


def pair():
    ref_c = [math.log(p) for p in CH_P]
    ref_r = [math.log(p) for p in RJ_P]
    out = {"ch": CH, "chp": CH_P, "rj": RJ, "rjp": RJ_P, "shared": SHARED, "methods": METHODS, "first": {}, "train": {}}
    for m in METHODS:
        out["first"][m] = evaluate(m, [logit(p) for p in CH_P], [logit(p) for p in RJ_P], ref_c, ref_r, [0.0, 0.0])
        tr = train(m)
        out["train"][m] = {k: tr[k] for k in (0, 10, 25, 50, 100, 200, 400)}
    out["sumlog_c"], out["sumlog_r"] = sum(ref_c), sum(ref_r)
    return out


def main():
    S = sft()
    P = pair()
    print("SFT sample: %d rows, %d over %d tokens, mean %.0f, median %d tokens, %d multi-turn" %
          (S["n"], S["over"], MAXLEN, S["mean_total"], S["median_total"], S["multi_turn"]))
    print("loss share (assistant tokens incl. eos / all tokens, untruncated): %.1f%%" % (100 * S["loss_share_untrunc"]))
    print("padding efficiency by micro-batch:", {k: round(v, 3) for k, v in S["pad_eff"].items()})
    print("BFD packing into %d-token rows: %d rows, efficiency %.3f; cross-document causal pairs %.1f%%" %
          (MAXLEN, S["pack_rows"], S["pack_eff"], 100 * S["cross_share"]))
    print("loss tokens p10 %d, p90 %d: per-token weight ratio under per-example mean %.1fx" %
          (S["loss_p10"], S["loss_p90"], S["weight_ratio_p10_p90"]))
    print("animation batch:", [(b["t"], b["l"]) for b in S["batch"]], "pad eff %.3f, packed rows %d" % (S["batch_pad_eff"], S["batch_pack_rows"]))
    print("pair: sum log p_ref chosen %.3f (%d tokens), rejected %.3f (%d tokens)" % (P["sumlog_c"], len(CH), P["sumlog_r"], len(RJ)))
    for m, o in P["first"].items():
        t = P["train"][m]
        print("%-6s step0 loss %.4f margin %.4f push c %.4f r %.4f | step400 Sc %.2f Sr %.2f margin %.3f" %
              (m, o["loss"], o["margin"], o["gc"], o["gr"], t[400]["Sc"], t[400]["Sr"], t[400]["margin"]))
    derived = {"sft": S, "pair": P}
    json.dump(derived, open(os.path.join(HERE, "inputs", "derived.json"), "w"), indent=1)
    ex = json.load(open(os.path.join(HERE, "inputs", "example_tokens.json")))
    data = {"ex": [[t["t"], t["role"], t["loss"]] for t in ex["tokens"]],
            "sft": {k: S[k] for k in ("n", "over", "mean_total", "median_total", "loss_share_untrunc", "pad_eff",
                                      "pack_rows", "pack_eff", "cross_share", "batch", "loss_p10", "loss_p90")},
            "maxlen": MAXLEN}
    with open(os.path.join(HERE, "parts", "20_js_data.js"), "w") as f:
        f.write("// Generated by src/recompute.py from inputs/ (do not edit by hand)\nwindow.AL_DATA=")
        f.write(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
        f.write(";\n")


if __name__ == "__main__":
    main()
