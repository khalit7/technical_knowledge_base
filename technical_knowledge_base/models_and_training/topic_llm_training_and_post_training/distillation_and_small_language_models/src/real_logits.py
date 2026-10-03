"""Real next-token logits from a small open model, saved small, for the "dark knowledge" view.

  uv run --no-project --with torch --with transformers python real_logits.py    # writes inputs/real_logits.json

Model: Qwen/Qwen2.5-0.5B-Instruct (local Hugging Face cache), run on CPU in float32, plain text prompts (no chat
template), the logits for the next token after each prompt.
Saved per prompt: the top 40 tokens with their exact logits, and every other logit of the 151,936-entry vocabulary as a
histogram (bin width 0.05 logits; count per bin), so softmax(z / T) can be recomputed in the page for any T. The
error this binning puts on the softmax normaliser is measured here for T from 0.25 to 10 and saved (max_rel_err).

Also saved: how the same answer strings split into tokens under Qwen2.5's tokenizer and under GPT-2's, to show
why logit distillation needs a shared vocabulary.
"""
import json, math, os
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
MID = 'Qwen/Qwen2.5-0.5B-Instruct'
PROMPTS = [
    ('capital', 'Q: What is the capital of Australia?\nA: The capital of Australia is'),
    ('times', 'Q: What is 7 times 8?\nA: 7 times 8 equals '),
    ('animal', 'My favourite animal is the'),
    ('code', 'for i in range('),
]
TOPK, BW = 40, 0.05

tok = AutoTokenizer.from_pretrained(MID)
model = AutoModelForCausalLM.from_pretrained(MID, torch_dtype=torch.float32); model.eval()
out = dict(model=MID, model_url='https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct', vocab=None, topk=TOPK, bin_width=BW,
           temps_checked=[0.25, 0.5, 1, 2, 4, 10], prompts=[])
for key, text in PROMPTS:
    ids = tok(text, return_tensors='pt').input_ids
    with torch.no_grad():
        z = model(ids).logits[0, -1].double()
    out['vocab'] = z.numel()
    top = torch.topk(z, TOPK)
    mask = torch.ones_like(z, dtype=torch.bool); mask[top.indices] = False
    rest = z[mask]
    lo = math.floor(float(rest.min()) / BW) * BW
    b = torch.floor((rest - lo) / BW).long()
    cnt = torch.bincount(b)
    hist = [[int(i), int(c)] for i, c in enumerate(cnt.tolist()) if c]
    # error of the binned normaliser against the exact one
    errs = []
    for T in out['temps_checked']:
        exact = torch.logsumexp(z / T, 0)
        centers = torch.tensor([lo + (i + 0.5) * BW for i, _ in hist], dtype=torch.float64)
        counts = torch.tensor([c for _, c in hist], dtype=torch.float64)
        approx = torch.logsumexp(torch.cat([top.values / T, centers / T + counts.log()]), 0)
        errs.append(abs(math.exp(float(approx - exact)) - 1))
    p1 = torch.softmax(z, 0)
    out['prompts'].append(dict(
        key=key, text=text, prompt_tokens=[tok.decode([i]) for i in ids[0].tolist()],
        top=[[tok.decode([int(i)]), round(float(v), 4)] for i, v in zip(top.indices, top.values)],
        tail_lo=round(lo, 4), tail=hist, max_rel_err=max(errs),
        p_top1_T1=float(p1[top.indices[0]]), mass_top40_T1=float(p1[top.indices].sum()),
        entropy_bits_T1=float(-(p1 * torch.log2(p1.clamp_min(1e-300))).sum())))
    print(key, out['prompts'][-1]['top'][:6], 'err', max(errs))

# tokenizer mismatch: the same strings under two vocabularies
g2 = AutoTokenizer.from_pretrained('openai-community/gpt2')
words = [' Canberra', ' Sydney', ' 56', ' elephant', ' distillation', ' Kullback-Leibler']
out['tokenizers'] = dict(a='Qwen2.5 (151,646 base tokens + specials)', b='GPT-2 (50,257 tokens)',
                         rows=[[w, [tok.decode([i]) for i in tok(w).input_ids], [g2.decode([i]) for i in g2(w).input_ids], tok(w).input_ids, g2(w).input_ids] for w in words])
out['tokenizers']['a_size'] = len(tok); out['tokenizers']['b_size'] = len(g2)
print(out['tokenizers'])
json.dump(out, open(os.path.join(HERE, 'inputs', 'real_logits.json'), 'w'), separators=(',', ':'))
print('bytes', os.path.getsize(os.path.join(HERE, 'inputs', 'real_logits.json')))
