"""Real logits from three small open models on one public-domain passage: where the logit level sits
(log Z, the softmax normaliser, which cross entropy ignores) and what storing the logits in bf16 does
to the softmax when the whole logit vector is shifted by a constant c (cross entropy is unchanged by c;
z-loss is not). Run: OMP_NUM_THREADS=2 uv run --with torch --with transformers python real_logits.py
Writes inputs/real_logits.json (small summary only)."""
import json, math, torch
from transformers import AutoTokenizer, AutoModelForCausalLM
torch.set_num_threads(2)
TEXT = ("It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of "
        "foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, "
        "it was the season of Darkness, it was the spring of hope, it was the winter of despair.")
MODELS = ["openai-community/gpt2", "HuggingFaceTB/SmolLM2-135M", "Qwen/Qwen2.5-0.5B"]
OFFS = list(range(-96, 97, 8))
out = {"text": TEXT, "source": "Charles Dickens, A Tale of Two Cities (1859), opening sentence, public domain",
       "offsets": OFFS, "models": []}
for name in MODELS:
    tok = AutoTokenizer.from_pretrained(name)
    m = AutoModelForCausalLM.from_pretrained(name, torch_dtype=torch.float32).eval()
    ids = tok(TEXT, return_tensors="pt").input_ids
    with torch.no_grad():
        lg = m(ids).logits[0, :-1].double()          # predictions for tokens 1..n-1
    tgt = ids[0, 1:]
    V = lg.shape[1]
    logZ = torch.logsumexp(lg, -1)
    ce = (logZ - lg.gather(1, tgt[:, None])[:, 0])
    # sanity: equals torch's cross_entropy
    ce_t = torch.nn.functional.cross_entropy(lg, tgt, reduction="none")
    assert torch.allclose(ce, ce_t, atol=1e-9)
    p32 = torch.softmax(lg, -1)
    curve_tv, curve_dce = [], []
    for c in OFFS:
        lb = (lg + c).float().to(torch.bfloat16).double()   # logits stored in bf16
        pb = torch.softmax(lb, -1)
        tv = 0.5 * (pb - p32).abs().sum(-1).mean().item()
        ceb = torch.nn.functional.cross_entropy(lb, tgt, reduction="none")
        curve_tv.append(round(tv, 6)); curve_dce.append(round((ceb - ce).abs().mean().item(), 6))
    # z-loss of the model as it stands (PaLM coefficient 1e-4)
    out["models"].append({
        "name": name, "vocab": V, "tokens": int(tgt.numel()),
        "mean_ce": round(ce.mean().item(), 4),
        "mean_logZ": round(logZ.mean().item(), 3), "min_logZ": round(logZ.min().item(), 3), "max_logZ": round(logZ.max().item(), 3),
        "mean_max_logit": round(lg.max(-1).values.mean().item(), 3),
        "mean_logit": round(lg.mean().item(), 3),
        "zloss_1e-4": round(1e-4 * (logZ ** 2).mean().item(), 5),
        "logZ_per_token": [round(v, 2) for v in logZ.tolist()],
        "bf16_tv_by_offset": curve_tv, "bf16_abs_dce_by_offset": curve_dce,
        "torch": torch.__version__})
    print(name, out["models"][-1]["mean_ce"], out["models"][-1]["mean_logZ"], curve_tv[len(OFFS)//2])
json.dump(out, open("inputs/real_logits.json", "w"), indent=1)
