"""The tiny GPT past its trained length (256 tokens), for every position scheme trained on an equal budget.
Part 1 (the long_context sibling's measurement, same windows): per-position held-out loss on 24 windows of 2,048 tokens of
TinyStories validation (seed 1234), bins of 64, for learned, sinusoidal, ALiBi, NoPE and RoPE, and RoPE with scaling applied at
inference (linear = position interpolation, NTK-aware, YaRN, YaRN without its temperature, the temperature alone).
Part 2 (the same prompt past the trained length): the running sequence (256 tokens, Roxy the rhinoceros) read at positions
0-255 and again after 768 tokens of other validation stories (positions 768-1023): per-token loss both ways, and the greedy
continuation of its first 200 tokens both ways.
CPU, 4 threads, inference only, deterministic. Writes out/past.json.
Run: LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=4 nice -n 15 <venv>/bin/python -I past_eval.py"""
import json, math, os, sys
import numpy as np, torch, torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "../../../src/data"))
sys.path.insert(0, DATA)
from tiny_gpt import GPT, GPTConfig  # noqa: E402
from tokenizers import Tokenizer  # noqa: E402
sys.path.insert(0, os.path.join(HERE, "../train"))
import train_scaled  # noqa: E402
train_scaled.patch()  # sqrt(d_model) embedding scale, used only by models whose name ends in _x16

SCR = os.environ["LA_SCRATCH"]
torch.set_num_threads(4)
L, N, BIN, PROMPT, NEW = 2048, 24, 64, 200, 40
OFFSETS = [0, 128, 256, 384, 512, 768, 1024, 1536]   # where the running sequence starts; tokens before it are other stories
SHIFT = max(OFFSETS)
tok = Tokenizer.from_file(os.path.join(DATA, "tokenizer.json"))
val = np.memmap(os.path.join(SCR, "data/val.bin"), dtype=np.uint16, mode="r")


def windows():  # identical to long_context/src/past/past_len.py
    rng = np.random.default_rng(1234)
    offs = rng.integers(0, len(val) - L - 1, N)
    return torch.tensor(np.stack([val[o:o + L + 1].astype(np.int64) for o in offs]))


def load(name, scaling=None, mscale=None, over=None):
    ck = torch.load(os.path.join(SCR, "runs", name, "ckpt.pt"), map_location="cpu")
    cfg = dict(ck["config"]); cfg.update(over or {})
    if scaling is not None:
        cfg["rope_scaling"] = scaling
    m = GPT(GPTConfig(**cfg)); m.load_state_dict(ck["model"]); m.eval(); m.scale_emb = name.endswith("_x16")
    if mscale is not None:  # override YaRN's attention temperature (1.0 = no temperature)
        for mod in m.modules():
            if type(mod).__name__ == "Rope":
                mod.mscale = mscale
    return m, cfg


@torch.inference_mode()
def per_pos(m, W, length=L):
    tot = torch.zeros(length)
    for i in range(0, W.shape[0], 4):
        x, y = W[i:i + 4, :length], W[i:i + 4, 1:length + 1]
        lg, *_ = m(x)
        tot += F.cross_entropy(lg.float().transpose(1, 2), y, reduction="none").sum(0)
    return tot / W.shape[0]


def summarise(pp):
    b = lambda a, e: round(float(pp[a:e].mean()), 4)
    return {"0-255": b(0, 256), "256-511": b(256, 512), "512-1023": b(512, 1024), "1024-2047": b(1024, 2048),
            "curve": [round(float(pp[i:i + BIN].mean()), 3) for i in range(0, L, BIN)]}


def running_and_filler():
    run = json.load(open(os.path.join(DATA, "running_sequence.json")))
    ids = run["ids"]
    v = np.asarray(val[:200000], dtype=np.int64)
    hits = [i for i in range(len(v) - 256) if v[i] == ids[0] and (v[i:i + 256] == ids).all()]
    assert hits, "running sequence not found in val.bin"
    start = hits[0]
    nxt = start + 1 + int(np.argmax(v[start + 1:] == 0))  # the end-of-text that closes story 1 opens story 2
    filler = v[nxt:nxt + SHIFT].tolist()
    return ids, filler, start, nxt


@torch.inference_mode()
def shifted(m, ids, filler, cfg):
    """The running sequence read at each offset: per-token loss (also in 32 bins of 8 tokens) and a greedy continuation."""
    out = {}
    for off in OFFSETS:
        pre = filler[:off]
        x = torch.tensor([pre + ids])
        if cfg["pos"] == "learned" and x.shape[1] > cfg["max_pos"]:
            try:
                m(x)
            except Exception as e:
                out[str(off)] = {"error": f"{type(e).__name__}: {e}"}
            continue
        lg, *_ = m(x)
        lp = -torch.log_softmax(lg[0, len(pre):-1].float(), -1).gather(-1, x[0, len(pre) + 1:, None])[:, 0]
        p = torch.tensor([pre + ids[:PROMPT]])
        g = m.generate(p, NEW)[0, p.shape[1]:].tolist()
        v = lp.tolist() + [lp[-1].item()]          # 255 targets; pad to 256 for 32 even bins
        out[str(off)] = {"mean": round(lp.mean().item(), 4), "bins8": [round(sum(v[i:i + 8]) / 8, 2) for i in range(0, 256, 8)],
                         "greedy": tok.decode(g[: g.index(0)] if 0 in g else g)}
        if off in (0, 768):
            out[str(off)]["token_loss"] = [round(t, 2) for t in lp.tolist()]
    return out


def main():
    W = windows()
    ids, filler, start, nxt = running_and_filler()
    res = {"length": L, "windows": N, "bin": BIN, "trained_ctx": 256, "offsets": OFFSETS, "prompt_tokens": PROMPT, "new_tokens": NEW,
           "running_at_val_token": int(start), "filler_from_val_token": int(nxt),
           "prompt_text": tok.decode(ids[1:PROMPT]), "runs": []}
    yarn8 = {"type": "yarn", "factor": 8, "orig_ctx": 256}
    jobs = [("learned", "ref_baseline_s1500", "plain", None, None), ("learned", "pe_learned_s1", "plain", None, None),
            ("sinusoidal", "pe_sinusoidal", "plain", None, None), ("sinusoidal", "pe_sinusoidal_x16", "plain", None, None), ("alibi", "pe_alibi", "plain", None, None),
            ("nope", "pe_nope", "plain", None, None), ("rope", "at_mha", "plain", None, None),
            ("rope", "at_mha", "linear x4", {"type": "linear", "factor": 4}, None),
            ("rope", "at_mha", "linear x8", {"type": "linear", "factor": 8}, None),
            ("rope", "at_mha", "ntk x4", {"type": "ntk", "factor": 4}, None),
            ("rope", "at_mha", "ntk x8", {"type": "ntk", "factor": 8}, None),
            ("rope", "at_mha", "yarn x4", {"type": "yarn", "factor": 4, "orig_ctx": 256}, None),
            ("rope", "at_mha", "yarn x8", yarn8, None),
            ("rope", "at_mha", "yarn x8, no temperature", yarn8, 1.0),
            ("rope", "at_mha", "temperature only (x8)", None, 0.1 * math.log(8) + 1.0),
            ("rope", "pe_rope_s1", "plain", None, None), ("rope", "pe_rope_s1", "yarn x8", yarn8, None),
            ("rope", "lc_pi_ft", "linear x4 + 300 steps at 1,024", {"type": "linear", "factor": 4}, None),
            ("rope", "lc_plain_ft", "plain + 300 steps at 1,024", None, None),
            # mistakes a reader can make with a working checkpoint
            ("rope", "at_mha", "mistake: yarn x8 with orig_ctx 2,048", {"type": "yarn", "factor": 8, "orig_ctx": 2048}, None),
            ("rope", "at_mha", "mistake: rope_theta 500,000 at inference", None, None, {"rope_theta": 500000.0})]
    for job in jobs:
        scheme, name, label, sc, ms = job[:5]; over = job[5] if len(job) > 5 else None
        if not os.path.exists(os.path.join(SCR, "runs", name, "ckpt.pt")):
            print("missing", name); continue
        m, cfg = load(name, sc, ms, over)
        r = {"scheme": scheme, "model": name, "scaling": label}
        if cfg["pos"] == "learned":
            pp = per_pos(m, W, 256)
            r.update({"0-255": round(float(pp.mean()), 4), "curve": [round(float(pp[i:i + BIN].mean()), 3) for i in range(0, 256, BIN)]})
            try:
                per_pos(m, W[:1], 300)
            except Exception as e:
                r["error"] = f"{type(e).__name__}: {e}"
        else:
            r.update(summarise(per_pos(m, W)))
        r["shifted"] = shifted(m, ids, filler, cfg)
        res["runs"].append(r)
        print(name, label, {k: r.get(k) for k in ("0-255", "256-511", "512-1023", "1024-2047", "error")},
              {k: v.get("mean", v.get("error")) for k, v in r["shifted"].items() if k in ("0", "768", "1536")}, flush=True)
    json.dump(res, open(os.path.join(HERE, "out/past.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
