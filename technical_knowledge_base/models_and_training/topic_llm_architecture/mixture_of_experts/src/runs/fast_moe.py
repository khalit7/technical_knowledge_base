"""A faster, mathematically identical MoE forward for the tiny GPT on MPS, and a train.py wrapper that uses it.

Why: tiny_gpt.MoE.forward loops over experts in Python and calls nonzero() per expert, which forces a GPU sync each
time; on Apple MPS the moe8top2 preset ran at about 1 step per second (measured 2026-10-18), 7 to 8 times slower than
the dense baseline. This version computes all experts that received at least one token in one batched einsum and
weights them with a sparse (n, E) gate matrix: the same arithmetic (unchosen and dropped experts get gate 0), the same
router, auxiliary loss, bias update, capacity rule (first come, first served in token order) and recorded
statistics, and experts that receive no token stay out of the graph (no gradient, so AdamW skips them, exactly as
in the loop). check_fast.py compares outputs and gradients with the original on CPU.

Run (GPU work: hold the bench lock, cap MPS memory):
  PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 LA_SCRATCH=<scratch>/la nice -n 15 \
    <venv>/bin/python src/runs/fast_moe.py --preset moe8top2 --name mx_moe8top2 [train.py arguments]
"""
import math, os, sys
import torch
import torch.nn.functional as F

DATA = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "data"))
sys.path.insert(0, DATA)
import tiny_gpt  # noqa: E402

ORIG = tiny_gpt.MoE.forward


def fast_forward(self, x):
    cfg, (B, T, D) = self.cfg, x.shape
    xf = x.reshape(-1, D)
    n, E, k = xf.shape[0], cfg.n_experts, cfg.top_k
    logits = self.router(xf).float()
    scores = logits.sigmoid() if cfg.router == "sigmoid" else logits.softmax(-1)
    sel = scores + self.e_bias if cfg.balance == "bias" else scores
    top_i = sel.topk(k, -1).indices
    top_w = scores.gather(-1, top_i)
    if cfg.router == "sigmoid" or k > 1:
        top_w = top_w / top_w.sum(-1, keepdim=True)
    load = torch.bincount(top_i.flatten(), minlength=E)
    keep = torch.ones_like(top_w, dtype=torch.bool)
    dropped = 0
    if cfg.capacity_factor:
        cap = math.ceil(cfg.capacity_factor * n * k / E)
        oh = F.one_hot(top_i, E)                                   # (n, k, E): token-major then slot, as nonzero() orders
        pos = oh.reshape(n * k, E).cumsum(0).reshape(n, k, E)      # 1-based arrival order at each expert
        keep = (pos * oh).sum(-1) <= cap
        dropped = int((~keep).sum())
    gates = torch.zeros(n, E, device=x.device, dtype=x.dtype).scatter_add(1, top_i, (top_w * keep).to(x.dtype))
    hit = (load > 0).nonzero().flatten().tolist()                  # one sync per layer instead of one per expert
    ex = [self.experts[e] for e in hit]
    up = torch.stack([m.up.weight for m in ex])                    # (h, H, D)
    dn = torch.stack([m.down.weight for m in ex])                  # (h, D, H)
    a = torch.einsum("nd,ehd->neh", xf, up)
    if cfg.ffn == "swiglu":
        g = torch.einsum("nd,ehd->neh", xf, torch.stack([m.gate.weight for m in ex]))
        a = F.silu(g) * a
    else:
        a = F.gelu(a, approximate="tanh")
    y = torch.einsum("neh,edh->ned", a, dn)                        # every hit expert on every token
    out = torch.einsum("ne,ned->nd", gates[:, hit], y)
    for s in self.shared:
        out = out + s(xf)
    aux = xf.new_zeros(())
    if cfg.balance == "aux" and self.training:
        f = load.float() / (n * k)
        aux = E * (f * scores.mean(0)).sum()
    if cfg.balance == "bias" and self.training:
        with torch.no_grad():
            self.e_bias += cfg.bias_rate * torch.sign(load.float().mean() - load.float())
    self.last = {"top_i": top_i.view(B, T, k), "top_w": top_w.view(B, T, k), "load": load,
                 "dropped_frac": dropped / max(1, n * k)}
    return out.view(B, T, D), aux


def use_fast():
    assert not cfg_has_bias(), "fast path written for bias-free linears (the tiny GPT default)"
    tiny_gpt.MoE.forward = fast_forward


def cfg_has_bias():
    return tiny_gpt.GPTConfig().bias


if __name__ == "__main__":
    use_fast()
    sys.argv[0] = os.path.join(DATA, "train.py")
    import train  # noqa: E402  (the root's training script, unchanged)
    train.main()
