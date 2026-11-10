"""Real next-token numbers from SmolLM2-135M for the page's 3D stages (2026-11-10).
A: one prediction in the Dickens sentence of real_logits.py (the token after "it was the spring of hope, it was the", target " winter",
   where the model is unsure between the seasons):
   the logits of the most likely tokens and the target, log Z over the whole vocabulary, cross entropy and its gradient p - y,
   z-loss (PaLM coefficient 1e-4) and its gradient; Fig. 3 and Fig. 4 on the page draw these.
B: four public-domain opening sentences of different lengths, each token's cross entropy, then the padded batch through
   torch's cross_entropy with ignore_index=-100 (the per-token mean) against the mean of per-sentence means; Fig. 1 draws these.
CPU only, a few seconds: OMP_NUM_THREADS=2 uv run --no-project --with torch==2.14.1 --with transformers python real_tokens.py
Writes inputs/real_tokens.json."""
import json, torch
from transformers import AutoTokenizer, AutoModelForCausalLM
torch.set_num_threads(2)
NAME = "HuggingFaceTB/SmolLM2-135M"
DICKENS = ("It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of "
           "foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, "
           "it was the season of Darkness, it was the spring of hope, it was the winter of despair.")
SENTS = [("Call me Ishmael.", "Herman Melville, Moby-Dick (1851)"),
         ("It was the best of times, it was the worst of times.", "Charles Dickens, A Tale of Two Cities (1859), first clauses"),
         ("Happy families are all alike; every unhappy family is unhappy in its own way.", "Leo Tolstoy, Anna Karenina, tr. Constance Garnett (1901)"),
         ("It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", "Jane Austen, Pride and Prejudice (1813)")]
tok = AutoTokenizer.from_pretrained(NAME)
m = AutoModelForCausalLM.from_pretrained(NAME, dtype=torch.float32).eval()
out = {"model": NAME, "torch": torch.__version__}

# A: one prediction, every number the stages draw
ids = tok(DICKENS, return_tensors="pt").input_ids
with torch.no_grad():
    lg = m(ids).logits[0, :-1].double()
tgt = ids[0, 1:]
worst = [i for i in range(len(tgt)) if tok.decode(tgt[i]) == " winter"][0]
z = lg[worst]; t = int(tgt[worst]); V = z.numel()
logZ = torch.logsumexp(z, 0); p = torch.softmax(z, 0)
ce = float(logZ - z[t]); assert abs(ce - float(torch.nn.functional.cross_entropy(z[None], tgt[worst:worst + 1]))) < 1e-9
zz = z.clone().requires_grad_(True)
L = torch.nn.functional.cross_entropy(zz[None], tgt[worst:worst + 1]) + 1e-4 * torch.logsumexp(zz, 0) ** 2
L.backward()
y = torch.zeros(V, dtype=torch.float64); y[t] = 1
g_ce = p - y; g_z = 2e-4 * logZ * p
assert torch.allclose(zz.grad, g_ce + g_z, atol=1e-12)
top = torch.argsort(p, descending=True)[:9].tolist()
if t not in top: top = top[:8] + [t]
out["pred"] = {"context": tok.decode(ids[0, :worst + 1]), "target": tok.decode([t]), "target_id": t, "vocab": V,
               "logZ": round(float(logZ), 4), "ce": round(ce, 5), "max_logit": round(float(z.max()), 4), "mean_logit": round(float(z.mean()), 4),
               "zloss": round(float(1e-4 * logZ ** 2), 6), "zgrad_sum": round(float(g_z.sum()), 6),
               "tokens": [{"id": i, "s": tok.decode([i]), "logit": round(float(z[i]), 4), "p": round(float(p[i]), 6)} for i in top],
               "rest_p": round(float(1 - p[top].sum()), 6), "rest_n": V - len(top),
               "grad_sum": float(g_ce.sum()), "check": "torch autograd of cross_entropy + 1e-4 log^2 Z equals p - y + 2e-4 log Z p"}

# B: per-token losses of four sentences, then the padded batch
rows = []
for s, src in SENTS:
    ii = tok(s, return_tensors="pt").input_ids
    with torch.no_grad():
        l = m(ii).logits[0, :-1].double()
    c = torch.nn.functional.cross_entropy(l, ii[0, 1:], reduction="none")
    rows.append({"text": s, "source": src, "tokens": [tok.decode([v]) for v in ii[0].tolist()], "ce": [round(float(v), 4) for v in c], "_ii": ii[0]})
T = max(len(r["_ii"]) for r in rows); pad = tok.pad_token_id if tok.pad_token_id is not None else tok.eos_token_id
batch = torch.full((len(rows), T), pad); lab = torch.full((len(rows), T), -100)
for i, r in enumerate(rows):
    n = len(r["_ii"]); batch[i, :n] = r["_ii"]; lab[i, :n] = r["_ii"]
att = (lab != -100).long()
with torch.no_grad():
    lb = m(batch, attention_mask=att).logits.double()
mean_tok = float(torch.nn.functional.cross_entropy(lb[:, :-1].reshape(-1, lb.shape[-1]), lab[:, 1:].reshape(-1), ignore_index=-100))
flat = [v for r in rows for v in r["ce"]]
assert abs(mean_tok - sum(flat) / len(flat)) < 1e-3, (mean_tok, sum(flat) / len(flat))
for r in rows: del r["_ii"]
out["batch"] = {"rows": rows, "padded_length": T, "torch_mean_ignore_index": round(mean_tok, 5),
                "mean_per_token": round(sum(flat) / len(flat), 5), "n_tokens": len(flat),
                "mean_of_sentence_means": round(sum(sum(r["ce"]) / len(r["ce"]) for r in rows) / len(rows), 5)}
json.dump(out, open("inputs/real_tokens.json", "w"), indent=1, ensure_ascii=False)
print(out["pred"]["target"], out["pred"]["ce"], out["pred"]["logZ"], [x["s"] for x in out["pred"]["tokens"]])
print(out["batch"]["mean_per_token"], out["batch"]["mean_of_sentence_means"], mean_tok, [len(r["ce"]) for r in rows])
