"""CPU evaluations of this page's runs (and the Attention lab's) after training. No training here.

1. Window sweep: per-position held-out loss (the lab's 192 fixed validation windows, seed 1234) for models trained
   with windows 16 / 32 / 64 / 128 / full and the 2 local : 1 global interleaves; and the full model served with
   the same windows (trained without them). The lab's numbers for at_mha served at 64 / 32 / 16 must reproduce.
2. Sinks and gates: on the running sequence, per layer: attention on position 0 (queries >= 8), mass sent to the
   learned sink column (av_sink), mean output gate (av_gate), largest |residual| entry; then each model served with
   a sliding window of 16 or 32, with and without position 0 kept.
3. Summary of every run: held-out loss (20 windows from train.py's log, 100 from eval.py), parameters, tokens/s.
Writes ../out/runs_eval.json.  Run: LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=4 nice -n 15 python runs_eval.py
"""
import json, os, sys, time
import torch, torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import av_model  # noqa: E402
import tiny_gpt  # noqa: E402
from tiny_gpt import GPT, GPTConfig  # noqa: E402
from train import Batches, SCR  # noqa: E402

torch.set_num_threads(4)
SERVE = {"W": None, "sinks": 0}
_orig_bias = tiny_gpt.attn_bias


def serving_bias(cfg, layer_idx, q_pos, k_pos, device, slopes=None):   # same rule as the lab's cpu_evals.py
    if SERVE["W"] is None:
        return _orig_bias(cfg, layer_idx, q_pos, k_pos, device, slopes)
    diff = q_pos[:, None] - k_pos[None, :]
    keep = (diff >= 0) & ((diff < SERVE["W"]) | (k_pos[None, :] < SERVE["sinks"]))
    return torch.zeros(keep.shape, device=device).masked_fill(~keep, float("-inf"))[None]


tiny_gpt.attn_bias = serving_bias


def load(name):
    p = os.path.join(SCR, "runs", name, "av.json")
    gated = os.path.exists(p) and json.load(open(p)).get("gate", False)
    if gated:
        fwd = tiny_gpt.Attention.forward
        tiny_gpt.Attention.forward = av_model._orig[1]   # so enable_gate wraps the original forward once
        av_model.enable_gate()
    ck = torch.load(os.path.join(SCR, "runs", name, "ckpt.pt"), map_location="cpu")
    m = GPT(GPTConfig(**ck["config"])); m.load_state_dict(ck["model"])
    if gated:   # keep the patched forward (it only stashes x; harmless for ungated models), restore the constructor
        tiny_gpt.Attention.__init__ = av_model._orig[0]
        av_model._patched = False
    return m.eval(), gated


def val_windows(n_batches=6, batch=32, ctx=256):
    b = Batches("val", batch, ctx, 1234)
    return [b.next("cpu") for _ in range(n_batches)]


@torch.no_grad()
def loss_by_pos(m, wins):
    tot = torch.zeros(256); n = 0
    for x, y in wins:
        logits, _, _, _ = m(x, record=True)
        ce = F.cross_entropy(logits.float().transpose(1, 2), y, reduction="none")
        tot += ce.sum(0); n += ce.shape[0]
    return tot / n


def summary(name):
    d = os.path.join(SCR, "runs", name)
    log = json.load(open(os.path.join(d, "log.json"))); ev = json.load(open(os.path.join(d, "eval.json")))
    return {"run": name, "val_loss_20win": log["final_val_loss"], "val_loss_100win": ev["val_loss"],
            "running_seq_loss": ev["running_sequence_mean_loss"], "params": log["params"]["total"] if isinstance(log["params"], dict) and "total" in log["params"] else log["params"],
            "seconds": log["seconds"], "median_tok_s": log["median_tok_s"], "steps": log["steps_done"], "status": log["status"],
            "config": {k: log["config"][k] for k in ("attn", "mla_kv_latent", "mla_rope_dim", "window", "global_every", "attn_sink", "pos")},
            "gate": os.path.exists(os.path.join(d, "av.json")) and json.load(open(os.path.join(d, "av.json"))).get("gate", False),
            "eval_curve": log["eval"], "samples": ev["samples"][:2]}


@torch.no_grad()
def main():
    t0 = time.time()
    out = {"date": time.strftime("%Y-%m-%d"), "device": "Apple M1 Pro, CPU, 4 threads", "torch": torch.__version__}
    names = ["at_mha", "at_mha_s1", "at_mla", "at_mla_s1", "av_mla_c128", "av_mla_r32", "av_mla_c128_r32", "av_sink", "av_gate", "av_gate_s1",
             "av_swa16", "av_swa32", "at_swa64", "av_swa128", "av_swa16_g3", "at_swa64_g3", "at_gqa2", "at_gqa4", "at_mqa", "at_mqa_s1"]
    out["runs"] = [summary(n) for n in names if os.path.exists(os.path.join(SCR, "runs", n, "eval.json"))]
    wins = val_windows()
    out["val_windows"] = 6 * 32
    # 1. window sweep
    sweep = []
    for name, W in [("at_mha", None), ("av_swa16", 16), ("av_swa32", 32), ("at_swa64", 64), ("av_swa128", 128),
                    ("av_swa16_g3", 16), ("at_swa64_g3", 64)]:
        if not os.path.exists(os.path.join(SCR, "runs", name, "ckpt.pt")):
            continue
        m, _ = load(name)
        lp = loss_by_pos(m, wins)
        sweep.append({"run": name, "trained_window": W, "global_every": m.cfg.global_every, "served": "as trained",
                      "loss_all": round(lp.mean().item(), 4), "loss_by_pos_16": [round(v, 3) for v in lp.view(16, 16).mean(1).tolist()]})
        print(sweep[-1]["run"], sweep[-1]["loss_all"], flush=True)
    m, _ = load("at_mha")
    for W in (16, 32, 64, 128):
        SERVE.update(W=W, sinks=0)
        lp = loss_by_pos(m, wins)
        sweep.append({"run": "at_mha", "trained_window": None, "served": f"window {W}", "serve_window": W,
                      "loss_all": round(lp.mean().item(), 4), "loss_pos_ge_W": round(lp[W:].mean().item(), 4),
                      "loss_by_pos_16": [round(v, 3) for v in lp.view(16, 16).mean(1).tolist()]})
        print("serve at_mha", W, sweep[-1]["loss_pos_ge_W"], flush=True)
    SERVE.update(W=None, sinks=0)
    out["window_sweep"] = sweep
    # 2. sinks and gates
    run_seq = json.load(open(os.path.join(tiny_gpt.__file__.rsplit("/", 1)[0], "running_sequence.json")))
    ids = torch.tensor([run_seq["ids"]])
    sk = []
    for name in ["at_mha", "av_sink", "av_gate"]:
        if not os.path.exists(os.path.join(SCR, "runs", name, "ckpt.pt")):
            continue
        m, gated = load(name)
        _, _, _, rec = m(ids, record="hidden")
        T = ids.shape[1]
        row = {"run": name, "first_token_mass": [round(w[0, :, 8:, 0].mean().item(), 4) for w in rec["attn"]],
               "max_abs_resid": [round(h.abs().max().item(), 2) for h in rec["hidden"][1:]]}
        if m.cfg.attn_sink:
            row["sink_column_mass"] = [round(w[0, :, :, T].mean().item(), 4) for w in rec["attn"]]
            row["sink_column_mass_by_head"] = [[round(v, 3) for v in w[0, :, :, T].mean(-1).tolist()] for w in rec["attn"]]
            row["sink_logits"] = [[round(v, 3) for v in b.mix.sink.tolist()] for b in m.blocks]
        if gated:
            gm = []
            for b in m.blocks:
                gm.append(round(b.mix.o.last_gate.mean().item(), 4))
            row["mean_gate"] = gm
            row["gate_below_0.1"] = [round((b.mix.o.last_gate < 0.1).float().mean().item(), 4) for b in m.blocks]
        serve = []
        for W, s in [(32, 0), (32, 1), (16, 0), (16, 1)]:
            SERVE.update(W=W, sinks=s)
            lp = loss_by_pos(m, wins)
            serve.append({"serve_window": W, "sinks_kept": s, "loss_pos_ge_W": round(lp[W:].mean().item(), 4)})
        SERVE.update(W=None, sinks=0)
        row["full_loss"] = round(loss_by_pos(m, wins).mean().item(), 4)
        if m.cfg.attn_sink:            # ablation at inference: remove the learned sink (logit -inf), weights renormalise
            keep = [b.mix.sink.data.clone() for b in m.blocks]
            for b in m.blocks:
                b.mix.sink.data.fill_(float("-inf"))
            row["loss_sink_removed"] = round(loss_by_pos(m, wins).mean().item(), 4)
            for b, v in zip(m.blocks, keep):
                b.mix.sink.data.copy_(v)
            li = max(range(len(row["sink_column_mass"])), key=lambda i: row["sink_column_mass"][i])
            hi = max(range(m.cfg.n_head), key=lambda h: row["sink_column_mass_by_head"][li][h])
            w = rec["attn"][li][0, hi]                                   # (T, T+1) for the running sequence
            qs = [8, 24, 48, 80, 120, 160, 200, 255]
            row["anim"] = {"layer": li + 1, "head": hi, "queries": qs, "tokens": run_seq["pieces"] if "pieces" in run_seq else None,
                           "rows": [[round(v, 4) for v in w[q, : q + 1].tolist()] + [round(w[q, T].item(), 4)] for q in qs]}
        if gated:                      # ablation at inference: gate forced open (1), the model as if it had no gate
            for b in m.blocks:
                b.mix.o.g.weight.data.zero_()
            g0 = [b.mix.o.g for b in m.blocks]
            class One(torch.nn.Module):
                def forward(self, x):
                    return torch.full(x.shape[:-1] + (m.cfg.d_model,), 1e4)
            for b in m.blocks:
                b.mix.o.g = One()
            row["loss_gate_open"] = round(loss_by_pos(m, wins).mean().item(), 4)
        row["serving"] = serve
        sk.append(row)
        print(name, row["first_token_mass"], row.get("sink_column_mass"), row.get("mean_gate"), serve, flush=True)
    out["sinks"] = sk
    out["seconds"] = round(time.time() - t0, 1)
    json.dump(out, open(os.path.join(HERE, "..", "out", "runs_eval.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
