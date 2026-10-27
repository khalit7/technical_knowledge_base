"""Table 3 at toy scale: does LoRA finetuning on top of a 4-bit base recover what quantisation lost?

  OMP_NUM_THREADS=2 uv run --with torch --with transformers --with pandas --with pyarrow python train_qlora.py

Pythia-160M (quantisation hurts it a lot: WikiText-2 perplexity 32 in float32, 44 with NF4, 57 with Int4), finetuned
on WikiText-2 train and evaluated on WikiText-2 test (the first 20,480 test tokens, windows of 1,024). Every run:
the same 200 steps of 4 sequences of 256 tokens drawn with one fixed seed, Adam (beta2 0.999), max grad norm 0.3,
constant learning rate, as Appendix B.2. LoRA as the paper's recipe scaled down: r = 16, alpha = 4 (the paper's
alpha/r of 16/64), dropout 0.1, on every linear layer of the blocks unless stated. The base is quantised once
(round to nearest, blocksize 64, as quant_ppl.py) and frozen; compute is float32 on CPU, not BF16.
Appends one JSON line per run to model/train_qlora.jsonl (skips runs already there).
"""
import json, math, os, sys, time
import torch, torch.nn as nn
from quant_ppl import text, quant_blocks, CACHE
from dtypes import TYPES

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'model', 'train_qlora.jsonl')
MODEL = 'EleutherAI/pythia-160m'
STEPS, BS, SEQ, EVAL_TOK = int(os.environ.get('STEPS', 200)), 4, 256, 20480
RUNS = [  # name, base type, adapters ('all', 'attn', 'full'), learning rate, seed
    ('fp32 + LoRA all', None, 'all', 1e-3, 0),
    ('NF4 + DQ + LoRA all', 'nf4dq', 'all', 1e-3, 0),
    ('FP4 + LoRA all', 'fp4_e2m1', 'all', 1e-3, 0),
    ('Int4 + LoRA all', 'int4', 'all', 1e-3, 0),
    ('NF4 + DQ + LoRA attention only', 'nf4dq', 'attn', 1e-3, 0),
    # ('fp32 full finetuning', None, 'full', 5e-5, 0),  # dropped: 8 to 16 s a step on the shared CPU (about 40 minutes for 200 steps); stopped at step 100
    ('fp32 + LoRA all (seed 1)', None, 'all', 1e-3, 1),
    ('NF4 + DQ + LoRA all (seed 1)', 'nf4dq', 'all', 1e-3, 1),
]


class LoRA(nn.Module):
    def __init__(self, base, r=16, alpha=4, p=0.1):
        super().__init__()
        self.base = base
        for q in base.parameters(): q.requires_grad_(False)
        self.A = nn.Parameter(torch.empty(r, base.in_features)); nn.init.kaiming_uniform_(self.A, a=math.sqrt(5))
        self.B = nn.Parameter(torch.zeros(base.out_features, r))
        self.s = alpha / r; self.drop = nn.Dropout(p)

    def forward(self, x):
        return self.base(x) + self.s * (self.drop(x) @ self.A.t() @ self.B.t())


def wiki(split):
    import pandas as pd, urllib.request
    p = os.path.join(CACHE, 'wt2_%s.parquet' % split)
    if not os.path.exists(p):
        urllib.request.urlretrieve('https://huggingface.co/datasets/Salesforce/wikitext/resolve/main/wikitext-2-raw-v1/%s-00000-of-00001.parquet' % split, p)
    return '\n\n'.join(pd.read_parquet(p)['text'].tolist())


def evaluate(model, ids):
    model.eval(); nll = 0.0; n = 0
    with torch.no_grad():
        for s in range(0, ids.numel() - 1, 1024):
            x = ids[s:s + 1025]
            lp = torch.log_softmax(model(x[None, :-1]).logits[0].float(), -1)
            nll -= lp.gather(1, x[1:, None]).sum().item(); n += x.numel() - 1
    model.train(); return math.exp(nll / n)


def main():
    from transformers import AutoModelForCausalLM, AutoTokenizer
    done = set()
    if os.path.exists(OUT):
        done = {json.loads(l)['name'] for l in open(OUT)}
    tok = AutoTokenizer.from_pretrained(MODEL, cache_dir=CACHE)
    tr = tok(wiki('train'), return_tensors='pt').input_ids[0]
    te = tok(text(), return_tensors='pt').input_ids[0][:EVAL_TOK + 1]
    for name, qt, mode, lr, seed in RUNS:
        if name in done: continue
        t0 = time.time()
        torch.manual_seed(1234)
        model = AutoModelForCausalLM.from_pretrained(MODEL, cache_dir=CACHE, torch_dtype=torch.float32)
        head = model.get_output_embeddings()
        lin = [(n, m) for n, m in model.named_modules() if isinstance(m, nn.Linear) and m is not head]
        if qt:
            for n, m in lin:
                m.weight.data = quant_blocks(m.weight.data, TYPES['nf4' if qt == 'nf4dq' else qt], dq=(qt == 'nf4dq'))
        before = evaluate(model, te)
        torch.manual_seed(seed)
        if mode == 'full':
            params = [p for p in model.parameters()]
        else:
            for p in model.parameters(): p.requires_grad_(False)
            for n, m in lin:
                if mode == 'attn' and not any(k in n for k in ('query_key_value', 'attention.dense')): continue
                parent = model.get_submodule(n.rsplit('.', 1)[0]); setattr(parent, n.rsplit('.', 1)[1], LoRA(m))
            params = [p for p in model.parameters() if p.requires_grad]
        ntrain = sum(p.numel() for p in params)
        opt = torch.optim.Adam(params, lr=lr, betas=(0.9, 0.999))
        g = torch.Generator().manual_seed(99)   # the same batches for every run
        curve = []
        model.train()
        for step in range(STEPS):
            starts = torch.randint(0, tr.numel() - SEQ - 1, (BS,), generator=g)
            x = torch.stack([tr[s:s + SEQ + 1] for s in starts])
            out = model(x[:, :-1])
            loss = nn.functional.cross_entropy(out.logits.reshape(-1, out.logits.size(-1)), x[:, 1:].reshape(-1))
            opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(params, 0.3); opt.step()
            if step % 10 == 0 or step == STEPS - 1: curve.append([step, round(loss.item(), 4)])
            if step % 50 == 0: print(name, step, round(loss.item(), 3), round(time.time() - t0), flush=True)
        after = evaluate(model, te)
        r = {'name': name, 'base': qt or 'fp32', 'mode': mode, 'lr': lr, 'seed': seed, 'trainable': ntrain, 'ppl_before': before,
             'ppl_after': after, 'steps': STEPS, 'tokens_per_step': BS * SEQ, 'curve': curve, 'seconds': round(time.time() - t0)}
        print(json.dumps({k: v for k, v in r.items() if k != 'curve'}), flush=True)
        open(OUT, 'a').write(json.dumps(r) + '\n')


if __name__ == '__main__':
    main()
