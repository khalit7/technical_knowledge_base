"""Attention variants page: one switch the shared tiny GPT does not have, added without editing it.

enable_gate() patches tiny_gpt.Attention with the output gate of Qiu et al. 2025 ("Gated Attention for Large
Language Models", arXiv 2505.06708), position G1: y_head = SDPA(q, k, v)_head * sigmoid(x W_g)_head, elementwise
and head-specific, computed from the same normalised input x that makes q, k and v, applied before the output
projection. Qwen3-Next uses this gate. Everything else in the model is unchanged.

Used by av_train.py and av_eval.py when the run directory holds av.json with {"gate": true}.
"""
import os, sys, json
import torch
import torch.nn as nn

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "data")
sys.path.insert(0, os.path.abspath(DATA))
import tiny_gpt  # noqa: E402

_patched = False
_orig = (tiny_gpt.Attention.__init__, tiny_gpt.Attention.forward)


class GatedOut(nn.Module):
    """Wraps the output projection: o(y * sigmoid(g(x))). x is stashed by the patched forward."""

    def __init__(self, o, d_model, width):
        super().__init__()
        self.o = o
        self.g = nn.Linear(d_model, width, bias=False)
        self.x = None
        self.last_gate_mean = None

    def forward(self, y):
        gate = torch.sigmoid(self.g(self.x))
        self.last_gate_mean = gate.detach().mean().item() if not self.training else None
        self.last_gate = gate.detach() if not self.training else None
        return self.o(y * gate)


def enable_gate():
    global _patched
    if _patched:
        return
    A = tiny_gpt.Attention
    init0, fwd0 = A.__init__, A.forward

    def init(self, cfg, layer_idx):
        init0(self, cfg, layer_idx)
        self.o = GatedOut(self.o, cfg.d_model, self.H * self.hd)

    def forward(self, x, pos, cache=None, record=False):
        self.o.x = x
        return fwd0(self, x, pos, cache, record)

    A.__init__, A.forward = init, forward
    _patched = True


def disable_gate():
    global _patched
    tiny_gpt.Attention.__init__, tiny_gpt.Attention.forward = _orig
    _patched = False


def maybe_enable(run_dir):
    p = os.path.join(run_dir, "av.json")
    if os.path.exists(p) and json.load(open(p)).get("gate"):
        enable_gate()
        return True
    disable_gate()
    return False
