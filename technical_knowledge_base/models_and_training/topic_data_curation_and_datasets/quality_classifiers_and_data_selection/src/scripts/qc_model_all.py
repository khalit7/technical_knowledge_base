"""One fastText classifier end to end, then delete it (each model is about 1 GB; the topic's scratch budget is tight):
train (qc_train_ref.train) -> score run0, rw_hold, annot, fw50k (qc_score_ft) -> top words (qc_ftexplain.vocab)
-> token-level explanations of the documents in ../labels/explain_docs.json -> remove the .bin.
Also runs the explanation and vocabulary steps for DCLM's published model ("dclm"), which is not deleted.
usage: qc_model_all.py <kind> <n positives> | dclm
Outputs: $DC_SCRATCH/qc/scores/<name>__<set>.npy, ../data/out/vocab_<name>.json, $DC_SCRATCH/qc/explain/<name>.json"""
import json
import os
import sys
import time

import numpy as np

import qc_common as C
import qc_ftexplain as X
import qc_score_ft as S
import qc_train_ref as TR

EXP = C.sdir("explain", "x")[:-1]
os.makedirs(EXP, exist_ok=True)
NTOK = 140  # tokens drawn on the page


def explain(path, name):
    ft = X.FT(path)
    want = json.load(open(os.path.join(C.HERE, "..", "labels", "explain_docs.json")))
    texts = {d["id"]: d["text"] for d in C.L.run0("final")}
    out = {}
    for w in want:
        e = ft.explain(texts[w["id"]])
        toks = e["tokens"]
        uni = [None] * len(toks)
        big = [0.0] * len(toks)
        # names: ("w", token) for in-vocab tokens in order, then ("b", "a b") for consecutive pairs in order
        k = 0
        pushes = list(e["push"])
        wi = [i for i, t in enumerate(toks) if ft.m.get_word_id(t) >= 0]
        for i in wi:
            uni[i] = pushes[k]; k += 1
        for j in range(len(toks) - 1):
            p = pushes[k]; k += 1
            big[j] += p / 2; big[j + 1] += p / 2
        assert k == len(pushes)
        nU = len(wi); nB = len(toks) - 1
        out[w["id"]] = {"toks": toks[:NTOK], "uni": [None if u is None else round(u, 2) for u in uni[:NTOK]],
                        "big": [round(b, 2) for b in big[:NTOK]], "more": max(0, len(toks) - NTOK), "ntok": len(toks),
                        "nU": nU, "nB": nB, "sumU": round(float(sum(u for u in uni if u is not None)), 1),
                        "sumB": round(float(sum(pushes[nU:])), 1), "logit": round(e["logit"], 3), "p": e["p"], "p_fasttext": e["p_fasttext"]}
    json.dump(out, open(os.path.join(EXP, name + ".json"), "w"))
    print("explained", name, len(out), flush=True)


if __name__ == "__main__":
    if sys.argv[1] == "dclm":
        p = C.L.model_path("dclm_fasttext")
        explain(p, "dclm")
        if not os.path.exists(os.path.join(C.OUT, "vocab_dclm.json")):
            X.vocab(p, os.path.join(C.OUT, "vocab_dclm.json"))
        for st in ["run0", "rw_hold", "annot", "fw50k"]:
            f = os.path.join(S.SD, f"dclm__{st}.npy")
            if not os.path.exists(f):
                np.save(f, S.score(p, S.texts(st))); print("scored dclm", st, flush=True)
        sys.exit()
    kind, n = sys.argv[1], int(sys.argv[2])
    name = f"{kind}_{n // 1000}k"
    path = os.path.join(TR.MD, name + ".bin")
    outp = os.path.join(C.OUT, "train_ref.json")
    res = json.load(open(outp)) if os.path.exists(outp) else {}
    if not os.path.exists(path):
        t0 = time.time()
        nm, r = TR.train(kind, n)
        res[nm] = r
        json.dump(res, open(outp, "w"), indent=1)
        print("trained", nm, r, flush=True)
    sets = ["run0", "rw_hold", "annot"] + (["fw50k"] if name in ("oh_eli5_50k", "oh_eli5_200k", "wiki_50k") else [])  # fw50k only where used
    for st in sets:
        f = os.path.join(S.SD, f"{name}__{st}.npy")
        if not os.path.exists(f):
            np.save(f, S.score(path, S.texts(st)))
            print("scored", name, st, flush=True)
    C.Q._ft.pop(path, None)
    X.vocab(path, os.path.join(C.OUT, f"vocab_{name}.json"))
    explain(path, name)
    if os.environ.get("QC_KEEP_MODEL") != "1":
        os.remove(path)
        print("removed", path, flush=True)
