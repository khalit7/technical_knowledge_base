"""mistakes.py: real errors and real silent bugs met while writing gpt_zero.py, each run on the running example (CPU).
Different from the root Block lab's mistakes.py (scale, head split and merge transposes, causal mask): those are linked,
not repeated. Writes out/mistakes.json.
Run: LA_SCRATCH=<scratch>/la python mistakes.py
"""
import json, math, os, sys
import torch
import torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..", "..", "src", "data")
sys.path.insert(0, HERE); sys.path.insert(0, DATA)
import gpt_zero as gz
from train import Batches, held_out_loss
from tokenizers import Tokenizer

torch.set_num_threads(4)
SCR = os.environ["LA_SCRATCH"]
tok = Tokenizer.from_file(os.path.join(DATA, "tokenizer.json"))
run = json.load(open(os.path.join(DATA, "running_sequence.json")))
ids = torch.tensor([run["ids"]])
ck = torch.load(os.path.join(SCR, "runs", "ref_baseline_s1500", "ckpt.pt"), map_location="cpu")
model = gz.GPT(gz.Config()).eval(); model.load_state_dict(gz.load_tiny(ck["model"]))
OUT = {"errors": [], "silent": []}


def err(key, what, fn):
    try:
        fn(); msg = "no error"
    except Exception as e:  # noqa: BLE001
        msg = type(e).__name__ + ": " + str(e).split("\n")[0]
    OUT["errors"].append({"key": key, "what": what, "message": msg}); print(key, "|", msg)


def seq_loss(m):
    with torch.no_grad():
        _, l, _, _ = m(ids[:, :-1], targets=ids[:, 1:])
    return round(l.item(), 4)


def greedy(m, prompt="Once upon a time, in a big forest, there lived a rhinoceros named Roxy.", n=25):
    x = torch.tensor([[0] + tok.encode(prompt).ids])
    return tok.decode(m.generate(x, n)[0, x.shape[1]:].tolist())


# ---------------------------------------------------------------- loud errors
with torch.no_grad():
    logits, *_ = model(ids)
err("ce_shape", "F.cross_entropy(logits, targets) with logits (B, T, V) and targets (B, T): the class dimension must be dim 1",
    lambda: F.cross_entropy(logits[:, :-1], ids[:, 1:]))
err("view_after_transpose", "merging heads with .view after .transpose (use .reshape, or .contiguous().view)",
    lambda: torch.randn(1, 8, 256, 32).transpose(1, 2).view(1, 256, 256))
err("past_ctx", "a sequence longer than the learned position table (ctx 256)",
    lambda: model(torch.zeros(1, 300, dtype=torch.long)))
err("temp_zero", "sampling with temperature 0 by dividing the logits by it",
    lambda: torch.multinomial((logits[0, -1] / 0.0).softmax(-1), 1))
err("linear_in_out", "W = nn.Linear(256, 1024).weight used as x @ W: nn.Linear stores (out, in)",
    lambda: torch.randn(4, 256) @ torch.nn.Linear(256, 1024).weight)

# ---------------------------------------------------------------- silent bugs on the trained model
base = {"loss": seq_loss(model), "greedy": greedy(model)}
OUT["base"] = base; print("base", base)
orig = gz.CausalSelfAttention.forward


def patched(kind):
    def fwd(self, x, cache=None, manual=False):
        B, T, D = x.shape; H, hd = self.H, self.hd
        q = self.q(x).view(B, T, H, hd).transpose(1, 2)
        k = self.k(x).view(B, T, H, hd).transpose(1, 2)
        v = self.v(x).view(B, T, H, hd).transpose(1, 2)
        s = (q @ k.transpose(-2, -1)) / math.sqrt(hd)
        future = torch.triu(torch.ones(T, T, dtype=torch.bool), 1)
        if kind == "mask_after_softmax":       # zero the future AFTER softmax: rows no longer sum to 1, and the
            w = s.softmax(-1).masked_fill(future, 0.0)   # denominator still contains every future score
        elif kind == "softmax_dim":            # normalise over queries instead of keys
            w = s.masked_fill(future, float("-inf")).softmax(-2)
        elif kind == "mask_zero":              # "mask" by setting future scores to 0 instead of -inf
            w = s.masked_fill(future, 0.0).softmax(-1)
        y = (w @ v).transpose(1, 2).reshape(B, T, D)
        return self.o(y)
    return fwd


def leak(m):
    """How far the output at position 150 moves when only token 200 changes (0 = causal)."""
    ids2 = ids.clone(); ids2[0, 200] = (ids2[0, 200] + 1) % 4096
    with torch.no_grad():
        a, *_ = m(ids); b, *_ = m(ids2)
    return float("%.3g" % (a[0, 150] - b[0, 150]).abs().max().item())


OUT["base"]["leak"] = leak(model)
with torch.no_grad():   # shifting labels yourself before a loss that shifts again: position t is scored on t + 2
    lg2, *_ = model(ids)
    OUT["double_shift"] = {"what": "labels shifted by hand, then shifted again by the loss (Hugging Face ForCausalLMLoss)",
                           "loss_t1": round(F.cross_entropy(lg2[0, :-1], ids[0, 1:]).item(), 4),
                           "loss_t2": round(F.cross_entropy(lg2[0, :-2], ids[0, 2:]).item(), 4)}
print(OUT["double_shift"])
for kind, what in [("mask_after_softmax", "masked_fill(future, 0) applied to the weights after softmax"),
                   ("mask_zero", "future scores set to 0 instead of -inf before softmax"),
                   ("softmax_dim", "softmax(dim=-2): normalised over queries, not keys")]:
    gz.CausalSelfAttention.forward = patched(kind)
    rec = {"key": kind, "what": what, "loss": seq_loss(model), "leak": leak(model), "greedy": greedy(model)}
    OUT["silent"].append(rec); print(rec)
gz.CausalSelfAttention.forward = orig

# ---------------------------------------------------------------- the unshifted target: train it and watch
torch.manual_seed(0)
m = gz.GPT(gz.Config())
opt = torch.optim.AdamW(m.parameters(), lr=1e-3, betas=(0.9, 0.95), weight_decay=0.1)
bt = Batches("train", 8, 256, 0)
curve = []
for step in range(150):
    x, y = bt.next("cpu")
    _, loss, _, _ = m(x, targets=x)            # BUG: targets should be y (x shifted by one)
    loss.backward(); opt.step(); opt.zero_grad()
    if step % 10 == 0 or step == 149:
        curve.append([step, round(loss.item(), 4)])
m.eval()
OUT["unshifted"] = {"what": "model(x, targets=x): every position is asked for its own token", "steps": 150, "batch": "8 x 256",
                    "lr": 1e-3, "train_curve": curve, "held_out_shifted": round(held_out_loss(m, "cpu", 256, n_batches=5, batch=8), 4),
                    "greedy": greedy(m)}
print(OUT["unshifted"])
json.dump(OUT, open(os.path.join(HERE, "out", "mistakes.json"), "w"), indent=1)
print("wrote out/mistakes.json")
