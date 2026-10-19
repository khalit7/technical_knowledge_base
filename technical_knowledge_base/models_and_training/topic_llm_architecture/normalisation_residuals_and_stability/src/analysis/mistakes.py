"""Real bad outputs from norm mistakes, on trained tiny GPTs (CPU, seconds). No retraining: each mistake is applied
to a trained checkpoint at inference, and the running-sequence loss and a greedy continuation are recorded.

  mistakes.py  ->  ../out/mistakes.json
Mistakes on ref_baseline_s1500 (LayerNorm, pre-norm):
  final_norm_dropped     the last LayerNorm before the unembedding left out (a hand-written pre-norm stack)
  gain_off_by_one        each norm multiplies by (w - 1): loading weights saved in Gemma's zero-centred (1 + w)
                         convention into a plain norm (here simulated in reverse on the trained gains)
  layernorm_as_rmsnorm   the trained LayerNorms replaced by RMSNorm with the same gains (mean not removed)
  eps_1                  eps 1.0 instead of 1e-5
On ns_pre_lr3e-3_qk (QK-norm, if trained): qk_norm_dropped (the trained q_norm/k_norm skipped at inference).
Also: torch.nn.RMSNorm's default eps on a small-magnitude row.
"""
import copy, json, os, sys
import torch
import torch.nn as nn

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "runs"))
from ns_model import NS  # noqa: E402
from tiny_gpt import GPT, GPTConfig  # noqa: E402
from tokenizers import Tokenizer  # noqa: E402

SCR = os.environ["LA_SCRATCH"]
DATA = os.path.join(HERE, "..", "..", "..", "src", "data")
tok = Tokenizer.from_file(os.path.join(DATA, "tokenizer.json"))
run = json.load(open(os.path.join(DATA, "running_sequence.json")))
ids = torch.tensor([run["ids"]])
PROMPT = "Once upon a time, there was a little girl named Lily. She loved to"


def load(name):
    ck = torch.load(os.path.join(SCR, "runs", name, "ckpt.pt"), map_location="cpu")
    m = GPT(GPTConfig(**ck["config"])); m.load_state_dict(ck["model"]); return m.eval()


@torch.no_grad()
def score(m):
    logits = m(ids)[0]
    loss = nn.functional.cross_entropy(logits[0, :-1], ids[0, 1:]).item()
    x = torch.tensor([[0] + tok.encode(PROMPT).ids])
    g = m.generate(x, 40, use_cache=False)[0, x.shape[1]:].tolist()
    g = g[: g.index(0)] if 0 in g else g
    return {"loss": round(loss, 4), "loss6": round(loss, 6), "greedy": tok.decode(g)}


class RMSFromLN(nn.Module):
    def __init__(self, ln):
        super().__init__(); self.w = ln.weight; self.eps = ln.eps

    def forward(self, x):
        return nn.functional.rms_norm(x, x.shape[-1:], self.w, self.eps)


torch.set_num_threads(2)
NS.update(norm_pos=None, attn_softcap=None, init="gpt2")
res = {"model": "ref_baseline_s1500", "prompt": PROMPT, "cases": {}}
base = load("ref_baseline_s1500")
res["cases"]["correct"] = score(base)
m = copy.deepcopy(base); m.ln_f = nn.Identity(); res["cases"]["final_norm_dropped"] = score(m)
m = copy.deepcopy(base)
with torch.no_grad():
    for mod in m.modules():
        if isinstance(mod, nn.LayerNorm):
            mod.weight -= 1.0
res["cases"]["gain_off_by_one"] = score(m)
m = copy.deepcopy(base)
for b in m.blocks:
    b.n1, b.n2 = RMSFromLN(b.n1), RMSFromLN(b.n2)
m.ln_f = RMSFromLN(m.ln_f); res["cases"]["layernorm_as_rmsnorm"] = score(m)
m = copy.deepcopy(base)
for mod in m.modules():
    if isinstance(mod, nn.LayerNorm):
        mod.eps = 1.0
res["cases"]["eps_1"] = score(m)
qk = os.path.join(SCR, "runs", "ns_pre_lr3e-3_qk", "ckpt.pt")
if os.path.exists(qk):
    q = load("ns_pre_lr3e-3_qk"); res["qk_model"] = "ns_pre_lr3e-3_qk"
    res["cases"]["qk_correct"] = score(q)
    for b in q.blocks:
        b.mix.q_norm, b.mix.k_norm = nn.Identity(), nn.Identity()
    res["cases"]["qk_norm_dropped"] = score(q)
# why LayerNorm -> RMSNorm barely matters here: |mean| / RMS of each token's stream row, at every point
sys.path.insert(0, HERE)
from inspect_runs import stream  # noqa: E402
pts, _ = stream(base, ids)
r = [(p.mean(-1).abs() / p.pow(2).mean(-1).sqrt()) for p in pts]
res["mean_over_rms"] = {"median": [round(v.median().item(), 4) for v in r], "max": [round(v.max().item(), 4) for v in r]}
# nn.RMSNorm default eps
x = torch.full((1, 256), 1e-3)
res["rmsnorm_default_eps"] = {"row": "256 entries all 1e-3 (RMS 1e-3)",
                              "default": round(nn.RMSNorm(256)(x)[0, 0].item(), 4),
                              "eps_1e-5": round(nn.RMSNorm(256, eps=1e-5)(x)[0, 0].item(), 4),
                              "eps_1e-6": round(nn.RMSNorm(256, eps=1e-6)(x)[0, 0].item(), 4),
                              "finfo_fp32_eps": torch.finfo(torch.float32).eps}
for k, v in res["cases"].items():
    print(k, v["loss"], "|", v["greedy"][:90].replace("\n", " "))
print(res["rmsnorm_default_eps"])
json.dump(res, open(os.path.join(HERE, "..", "out", "mistakes.json"), "w"), indent=1)
