# Per-token log-probabilities of the same four texts under three small base models with different tokenizers,
# for the perplexity section. Each text is scored after the model's own end-of-text token, so every
# token (the first included) has a context.
# Run from src/:  uv run --with torch --with transformers python data_ppl.py
import json, math, torch
from transformers import AutoTokenizer, AutoModelForCausalLM
torch.set_num_threads(2)

TEXTS = {
 'en': ('English (UDHR Article 1)', 'All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood.'),
 'fr': ('French (UDHR Article 1)', 'Tous les êtres humains naissent libres et égaux en dignité et en droits. Ils sont doués de raison et de conscience et doivent agir les uns envers les autres dans un esprit de fraternité.'),
 'code': ('Python', 'def mean(values):\n    """Return the arithmetic mean of a list of numbers."""\n    return sum(values) / len(values)\n'),
 'num': ('Digits of pi', 'The first digits of pi are 3.14159265358979323846264338327950288.'),
}
def bytes_to_unicode():  # GPT-2's byte-to-character alphabet (openai/gpt-2 encoder.py)
    bs = list(range(ord('!'), ord('~') + 1)) + list(range(ord('\xa1'), ord('\xac') + 1)) + list(range(ord('\xae'), ord('\xff') + 1))
    cs = bs[:]; n = 0
    for b in range(256):
        if b not in bs: bs.append(b); cs.append(256 + n); n += 1
    return dict(zip(bs, [chr(c) for c in cs]))
MODELS = [('gpt2', 'openai-community/gpt2'), ('smol', 'HuggingFaceTB/SmolLM2-135M'), ('qwen', 'Qwen/Qwen2.5-0.5B')]

out = {'texts': {k: {'label': v[0], 'text': v[1], 'bytes': len(v[1].encode('utf-8')), 'words': len(v[1].split())} for k, v in TEXTS.items()}, 'models': {}}
for key, repo in MODELS:
    tok = AutoTokenizer.from_pretrained(repo)
    model = AutoModelForCausalLM.from_pretrained(repo, torch_dtype=torch.float32).eval()
    start = tok.bos_token_id if tok.bos_token_id is not None else tok.eos_token_id
    info = {'repo': repo, 'vocab': len(tok), 'start_token': tok.convert_ids_to_tokens(start), 'params': sum(p.numel() for p in model.parameters()), 'scores': {}}
    for tk, (_, text) in TEXTS.items():
        ids = tok(text, add_special_tokens=False)['input_ids']
        x = torch.tensor([[start] + ids])
        with torch.no_grad():
            lp = torch.log_softmax(model(x).logits[0, :-1].double(), -1)
        lps = [float(lp[i, t]) for i, t in enumerate(ids)]
        # each token's raw bytes, through the byte-level BPE alphabet (all three tokenizers are byte-level BPE);
        # a token that covers part of a multi-byte character is shown with its bytes escaped
        bdec = {v: k for k, v in bytes_to_unicode().items()}
        raws = [bytes(bdec[ch] for ch in t) for t in tok.convert_ids_to_tokens(ids)]
        assert b''.join(raws) == text.encode('utf-8')
        pieces = [r.decode('utf-8', errors='backslashreplace') for r in raws]
        nbytes = [len(r) for r in raws]
        nll = -sum(lps)
        info['scores'][tk] = {'tokens': pieces, 'nb': nbytes, 'lp': [round(v, 4) for v in lps], 'n': len(ids), 'nll': round(nll, 4),
                              'ppl_token': math.exp(nll / len(ids)), 'bpb': nll / math.log(2) / out['texts'][tk]['bytes']}
        print(key, tk, len(ids), round(math.exp(nll / len(ids)), 3), round(nll / math.log(2) / out['texts'][tk]['bytes'], 4), flush=True)
    out['models'][key] = info
    del model
json.dump(out, open('inputs/ppl_tokens.json', 'w'), ensure_ascii=False)
