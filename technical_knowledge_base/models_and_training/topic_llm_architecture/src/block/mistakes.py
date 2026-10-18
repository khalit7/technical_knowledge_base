"""Block lab: real mistakes in a hand-written block, run on the trained tiny GPT (ref_baseline_s1500) and the running
sequence, with the real error messages and the real damage to the loss. Each bug is a one-line change to the
attention forward pass that a from-scratch implementation commonly makes.

Run on CPU: LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=4 nice -n 15 <venv>/bin/python src/block/mistakes.py
Writes src/block/out/mistakes.json.
"""
import json, math, os, sys, time, traceback
import numpy as np
import torch
import torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
sys.path.insert(0, DATA)
import tiny_gpt  # noqa: E402
from tiny_gpt import GPT, GPTConfig  # noqa: E402

SCR = os.environ["LA_SCRATCH"]


def load():
    ck = torch.load(os.path.join(SCR, "runs", "ref_baseline_s1500", "ckpt.pt"), map_location="cpu")
    m = GPT(GPTConfig(**ck["config"]))
    m.load_state_dict(ck["model"])
    return m.eval()


def make_forward(bug):
    """A plain MHA forward (the baseline's path) with one optional bug."""
    def fwd(self, x, pos, cache=None, record=False):
        B, T, D = x.shape
        H, hd = self.H, self.hd
        if bug == "split_without_transpose":     # view as (B, H, T, hd) directly: mixes tokens and heads
            q = self.q(x).view(B, H, T, hd); k = self.k(x).view(B, H, T, hd); v = self.v(x).view(B, H, T, hd)
        else:
            q = self.q(x).view(B, T, H, hd).transpose(1, 2)
            k = self.k(x).view(B, T, H, hd).transpose(1, 2)
            v = self.v(x).view(B, T, H, hd).transpose(1, 2)
        s = q @ k.transpose(-2, -1)
        if bug != "no_scale":
            s = s * self.scale
        if bug != "no_mask":
            s = s.masked_fill(torch.triu(torch.ones(T, T, dtype=torch.bool), 1), float("-inf"))
        w = s.softmax(-1)
        y = w @ v
        if bug == "merge_without_transpose":    # (B, H, T, hd) reshaped straight to (B, T, D)
            y = y.reshape(B, T, H * hd)
        elif bug == "split_without_transpose":
            y = y.reshape(B, T, H * hd)
        else:
            y = y.transpose(1, 2).reshape(B, T, H * hd)
        return self.o(y), w if record else None
    return fwd


@torch.no_grad()
def seq_loss(m, ids):
    logits, *_ = m(ids)
    lp = torch.log_softmax(logits[0, :-1], -1).gather(-1, ids[0, 1:, None])[:, 0]
    return round(float(-lp.mean()), 4), logits


def main():
    torch.set_num_threads(4)
    seq = json.load(open(os.path.join(DATA, "running_sequence.json")))
    ids = torch.tensor([seq["ids"]])
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(os.path.join(DATA, "tokenizer.json"))
    res = {"model": "ref_baseline_s1500", "sequence": "running sequence, 256 tokens", "cases": []}
    orig = tiny_gpt.Attention.forward
    m = load()
    base, _ = seq_loss(m, ids)
    res["baseline_loss"] = base
    # the same greedy continuation of prompt 0 under each bug
    prompt = [0] + tok.encode("Once upon a time, there was a little girl named").ids
    def greedy(model, n=24):
        x = torch.tensor([prompt])
        with torch.no_grad():
            for _ in range(n):
                lg, *_ = model(x)
                x = torch.cat([x, lg[:, -1:].argmax(-1)], 1)
        return tok.decode(x[0, len(prompt):].tolist())
    tiny_gpt.Attention.forward = make_forward(None)
    ok_loss, _ = seq_loss(m, ids)
    res["rewritten_forward_loss"] = ok_loss
    res["baseline_greedy"] = greedy(m)
    for bug, what in [("no_scale", "scores not divided by sqrt(head_dim)"),
                      ("split_without_transpose", "heads split with .view(B, H, T, hd) instead of .view(B, T, H, hd).transpose(1, 2)"),
                      ("merge_without_transpose", "heads merged with y.reshape(B, T, D) without transposing back"),
                      ("no_mask", "causal mask left out (each token sees the future)")]:
        tiny_gpt.Attention.forward = make_forward(bug)
        loss, _ = seq_loss(m, ids)
        g = greedy(m) if bug != "no_mask" else greedy(m)
        res["cases"].append({"bug": bug, "what": what, "error": None, "loss": loss, "greedy": g})
        print(bug, loss, repr(g))
    tiny_gpt.Attention.forward = orig
    # real error messages
    errs = []
    for label, fn in [
        ("learned positions past the trained length", lambda: m(torch.zeros(1, 257, dtype=torch.long))),
        ("d_model not divisible by n_head", lambda: GPTConfig(d_model=256, n_head=6)),
        ("q @ k without transposing k", lambda: torch.randn(1, 8, 256, 32) @ torch.randn(1, 8, 256, 32)),
        ("GQA: K and V with 2 heads used against 8 query heads without repeat_kv",
         lambda: torch.randn(1, 8, 256, 32) @ torch.randn(1, 2, 256, 32).transpose(-2, -1) if False else
         F.scaled_dot_product_attention(torch.randn(1, 8, 256, 32), torch.randn(1, 3, 256, 32), torch.randn(1, 3, 256, 32))),
    ]:
        try:
            fn()
            errs.append({"label": label, "error": None})
        except Exception as e:  # noqa: BLE001
            msg = f"{type(e).__name__}: {e}".split("\n")[0]
            errs.append({"label": label, "error": msg})
            print(label, "->", msg)
    res["errors"] = errs
    # no causal mask DURING TRAINING: the loss falls far below an honest model's, because each position can read
    # its own target; then generation (where no future exists) produces garbage. Same seed, same batches, both ways.
    data = np.memmap(os.path.join(SCR, "data", "train.bin"), dtype=np.uint16, mode="r")
    STEPS, WARM, LR = 400, 40, 3e-3
    runs = {}
    for label, bug in (("masked", None), ("no_mask", "no_mask")):
        tiny_gpt.Attention.forward = make_forward(bug)
        torch.manual_seed(0)
        mm = GPT(GPTConfig())
        opt = torch.optim.AdamW(mm.parameters(), lr=LR, betas=(0.9, 0.95), weight_decay=0.1)
        rng = np.random.default_rng(0)
        curve = []
        t0 = time.time()
        for step in range(STEPS):
            for g_ in opt.param_groups:
                g_["lr"] = LR * min(1.0, (step + 1) / WARM)
            ix = rng.integers(0, len(data) - 257, 8)
            xb = torch.from_numpy(np.stack([data[i:i + 257].astype(np.int64) for i in ix]))
            _, loss, _, _ = mm(xb[:, :-1], targets=xb[:, 1:])
            loss.backward(); opt.step(); opt.zero_grad(set_to_none=True)
            if step % 10 == 0 or step == STEPS - 1:
                curve.append([step, round(loss.item(), 4)])
        mm.eval()
        own, _ = seq_loss(mm, ids)                       # evaluated the way it was trained
        tiny_gpt.Attention.forward = make_forward(None)  # evaluated honestly: the future hidden
        honest, _ = seq_loss(mm, ids)
        runs[label] = {"curve": curve, "loss_running_seq_as_trained": own, "loss_running_seq_masked": honest,
                       "greedy_masked": greedy(mm), "seconds_cpu": round(time.time() - t0, 1)}
        print(label, curve[-1], "as trained", own, "masked", honest, repr(runs[label]["greedy_masked"]))
    tiny_gpt.Attention.forward = orig
    res["no_mask_training"] = {"steps": STEPS, "warmup": WARM, "batch": "8 x 256", "lr": LR, "runs": runs,
                               "device": "CPU (Apple M1 Pro), 4 threads"}
    json.dump(res, open(os.path.join(HERE, "out", "mistakes.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
