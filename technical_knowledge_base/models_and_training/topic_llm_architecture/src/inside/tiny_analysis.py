"""Inside a real model (tab t-inside): the same measurements on the tiny GPT before and after training (CPU, seconds).

Before = the baseline at initialisation (torch.manual_seed(0) then GPT(cfg), exactly how train.py starts);
after = ref_baseline_s1500 (setup's reference run, 1,500 steps, 12.3M tokens). If train_snapshots.py has run,
its probe trajectory (every 25 steps) and snapshots are added.
Measured on the running sequence (256 tokens) and on repeats:
  - per-head previous-token score and attention mass on token 0; per-layer median residual norm, max |x|;
  - logit lens (final LayerNorm + tied unembedding on the stream after each block): mean loss and top-1 agreement;
  - copying: loss on the 'x' of each "Roxy" (R o x y, 9 occurrences): only context can tell the model it is 'x';
  - repeated random ids (id 0 + R + R, R = 127 ids in [100, 4096)) and a repeated validation passage (127 tokens).
Writes $LA_SCRATCH/in/tiny/tiny.json.
Run: LA_SCRATCH=... OMP_NUM_THREADS=4 nice -n 15 $LA_SCRATCH/venv/bin/python src/inside/tiny_analysis.py
"""
import json, os, sys
import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
from configs import get          # noqa: E402
from tiny_gpt import GPT, GPTConfig  # noqa: E402

SCR = os.environ["LA_SCRATCH"]
L_RAND = 127


def r(v, n=3):
    return [round(float(x), n) for x in v]


def load(path):
    ck = torch.load(path, map_location="cpu")
    m = GPT(GPTConfig(**ck["config"])); m.load_state_dict(ck["model"]); return m.eval()


@torch.no_grad()
def measure(m, run, P, rand, rep):
    lg, _, _, rec = m(run, record="hidden")
    T = run.shape[1]
    lp = torch.log_softmax(lg[0, :-1], -1)
    tl = -lp.gather(-1, run[0, 1:, None])[:, 0]
    att = [a[0] for a in rec["attn"]]
    xs = [h[0] for h in rec["hidden"]]
    final_top = lg[0].argmax(-1)
    lens_ce, lens_agree = [], []
    for h in xs:
        l2 = m.lm_head(m.ln_f(h))
        lp2 = torch.log_softmax(l2[:-1], -1)
        lens_ce.append(-lp2.gather(-1, run[0, 1:, None])[:, 0].mean().item())
        lens_agree.append((l2.argmax(-1) == final_top).float().mean().item())
    xi = [i for i in range(2, T) if P[i] == "x" and P[i - 1] == "o" and P[i - 2] in (" R", "R")]
    out = {"loss": round(tl.mean().item(), 4),
           "prev": [r(a[:, torch.arange(1, T), torch.arange(0, T - 1)].mean(-1)) for a in att],
           "sink": [r(a[:, 8:, 0].mean(-1)) for a in att],
           "norm_median": r([h.norm(dim=-1)[1:].median() for h in xs], 2),
           "norm_tok0": r([h.norm(dim=-1)[0] for h in xs], 2),
           "max_abs": r([h.abs().max() for h in xs], 2), "median_abs": r([h.abs().median() for h in xs], 4),
           "lens_ce": r(lens_ce, 3), "lens_agree": r(lens_agree, 3),
           "roxy_x_pos": xi, "roxy_x_loss": r([tl[i - 1] for i in xi], 2)}
    for name, x in (("rand", rand), ("rep", rep)):
        lg, _, _, rec = m(x, record=True)
        lp = torch.log_softmax(lg[:, :-1], -1)
        loss = -lp.gather(-1, x[:, 1:, None])[..., 0]
        qs = torch.arange(L_RAND + 1, 2 * L_RAND + 1)
        out[name] = {"c1": round(loss[:, 1:L_RAND].mean().item(), 3), "c2": round(loss[:, L_RAND + 1:].mean().item(), 3),
                     "ind": [r(a[:, :, qs, qs - L_RAND + 1].mean(dim=(0, 2))) for a in rec["attn"]]}
    return out


def main():
    torch.set_num_threads(4)
    d = json.load(open(os.path.join(HERE, "..", "data", "running_sequence.json")))
    run = torch.tensor([d["ids"]]); P = d["pieces"]
    g = torch.Generator().manual_seed(0)
    R = torch.randint(100, 4096, (8, L_RAND), generator=g)
    rand = torch.cat([torch.zeros(8, 1, dtype=torch.long), R, R], 1)
    val = np.memmap(os.path.join(SCR, "data", "val.bin"), dtype=np.uint16, mode="r")
    rng = np.random.default_rng(1)
    segs = [torch.tensor(val[i:i + L_RAND].astype(np.int64)) for i in rng.integers(0, len(val) - 200, 8)]
    rep = torch.stack([torch.cat([torch.zeros(1, dtype=torch.long), s, s]) for s in segs])
    torch.manual_seed(0)
    init = GPT(get("baseline")).eval()                      # same init as train.py (seed 0, then the model)
    out = {"before": measure(init, run, P, rand, rep),
           "after": measure(load(os.path.join(SCR, "runs", "ref_baseline_s1500", "ckpt.pt")), run, P, rand, rep),
           "after_run": "ref_baseline_s1500"}
    snap = os.path.join(SCR, "runs", "in_snap")
    if os.path.exists(os.path.join(snap, "log.json")):
        lg = json.load(open(os.path.join(snap, "log.json")))
        out["traj"] = {"eval": lg["eval"], "seconds": lg["seconds"],
                       "probes": [{k: p[k] for k in ("step", "loss_copy1", "loss_copy2", "sink", "norm_median")} |
                                  {"prev_max": round(max(max(v) for v in p["prev"]), 3),
                                   "ind_max": round(max(max(v) for v in p["ind"]), 3)} for p in lg["probes"]],
                       "train": [t for t in lg["train"] if t["step"] % 50 == 0]}
        out["snaps"] = {}
        for f in sorted(os.listdir(snap)):
            if f.startswith("snap_"):
                s = int(f[5:-3])
                mm = measure(load(os.path.join(snap, f)), run, P, rand, rep)
                out["snaps"][s] = {"loss": mm["loss"], "roxy_x_loss": mm["roxy_x_loss"], "rep": {k: mm["rep"][k] for k in ("c1", "c2")},
                                   "lens_ce": mm["lens_ce"], "prev_max": max(max(v) for v in mm["prev"])}
    os.makedirs(os.path.join(SCR, "in", "tiny"), exist_ok=True)
    json.dump(out, open(os.path.join(SCR, "in", "tiny", "tiny.json"), "w"))
    for k in ("before", "after"):
        o = out[k]
        print(k, o["loss"], o["roxy_x_loss"], o["rand"]["c1"], o["rand"]["c2"], o["rep"]["c1"], o["rep"]["c2"], o["lens_ce"], o["norm_median"], o["max_abs"])


if __name__ == "__main__":
    main()
