"""Table 2 at small scale: perplexity of small open models after round-to-nearest 4-bit quantisation of every
nn.Linear weight (blocksize 64, absmax per block), with each data type of the paper, plus NF4 with double
quantisation as the released code does it (absmax minus its mean, 8-bit dynamic map, blocksize 256) and AF4.

  OMP_NUM_THREADS=2 uv run --with torch --with transformers --with pandas --with pyarrow python quant_ppl.py [model ...]

Embeddings and the output head stay in 16-bit, as bitsandbytes' load_in_4bit leaves them. Quantisation is
simulated in float32 (quantise, then dequantise), which is numerically what bitsandbytes computes before its
BF16 matmul, up to BF16 rounding. Evaluation: WikiText-2 raw test, non-overlapping windows of 1,024 tokens
(the paper used Pile Common Crawl, which is no longer distributed). Appends one JSON line per (model, type) to
model/quant_ppl.jsonl and skips pairs already there.
"""
import json, math, os, sys, time, urllib.request
import torch
from dtypes import TYPES, dynamic_map

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'model', 'quant_ppl.jsonl')
CACHE = os.environ.get('QLORA_CACHE', '/tmp/qlora_cache')
os.makedirs(CACHE, exist_ok=True)
MODELS = sys.argv[1:] or ['facebook/opt-125m', 'EleutherAI/pythia-160m', 'facebook/opt-350m', 'bigscience/bloom-560m']
MAXTOK = int(os.environ.get('MAXTOK', '40960'))
WIN = 1024


def text():
    p = os.path.join(CACHE, 'wt2_test.parquet')
    if not os.path.exists(p):
        urllib.request.urlretrieve('https://huggingface.co/datasets/Salesforce/wikitext/resolve/main/wikitext-2-raw-v1/test-00000-of-00001.parquet', p)
    import pandas as pd
    return '\n\n'.join(pd.read_parquet(p)['text'].tolist())


def nearest(xn, code):
    code = torch.tensor(sorted(code), dtype=torch.float32)
    mids = (code[1:] + code[:-1]) / 2
    return code[torch.bucketize(xn, mids)]


def quant_blocks(w, code, B=64, dq=False):
    flat = w.detach().float().reshape(-1)
    n = flat.numel(); pad = (-n) % B
    x = torch.cat([flat, flat.new_zeros(pad)]).reshape(-1, B)
    absmax = x.abs().max(1).values.clamp_min(1e-12)
    q = nearest(x / absmax[:, None], code)
    if dq:
        off = absmax.mean()
        a = absmax - off
        m = (-a.numel()) % 256
        a2 = torch.cat([a, a.new_zeros(m)]).reshape(-1, 256)
        c2 = a2.abs().max(1).values.clamp_min(1e-12)
        a2q = nearest(a2 / c2[:, None], dynamic_map()) * c2[:, None]
        absmax = a2q.reshape(-1)[:absmax.numel()] + off
    y = (q * absmax[:, None]).reshape(-1)[:n]
    return y.reshape(w.shape).to(w.dtype)


def linears(model):
    head = model.get_output_embeddings()
    for name, mod in model.named_modules():
        if isinstance(mod, torch.nn.Linear) and mod is not head:
            yield name, mod
        # GPT-2 style Conv1D is not used by these models


def ppl(model, ids):
    nll, cnt = 0.0, 0
    with torch.no_grad():
        for s in range(0, ids.numel() - 1, WIN):
            x = ids[s:s + WIN + 1]
            if x.numel() < 2: break
            out = model(x[None, :-1])
            lp = torch.log_softmax(out.logits[0].float(), -1)
            nll -= lp.gather(1, x[1:, None]).sum().item(); cnt += x.numel() - 1
    return math.exp(nll / cnt), cnt


def main():
    from transformers import AutoModelForCausalLM, AutoTokenizer
    done = set()
    if os.path.exists(OUT):
        for l in open(OUT):
            r = json.loads(l); done.add((r['model'], r['type']))
    raw = text()
    variants = [('fp32', None, False), ('int4', 'int4', False), ('fp4_e2m1', 'fp4_e2m1', False), ('fp4_e3m0', 'fp4_e3m0', False),
                ('nf4', 'nf4', False), ('nf4_dq', 'nf4', True), ('af4', 'af4', False)]
    for mname in MODELS:
        tok = AutoTokenizer.from_pretrained(mname, cache_dir=CACHE)
        ids = tok(raw, return_tensors='pt').input_ids[0][:MAXTOK + 1]
        for vname, code, dq in variants:
            if (mname, vname) in done: continue
            t0 = time.time()
            model = AutoModelForCausalLM.from_pretrained(mname, cache_dir=CACHE, torch_dtype=torch.float32).eval()
            nq = 0; mse = 0.0; ss = 0.0
            if code:
                for name, mod in linears(model):
                    w = mod.weight.data
                    wq = quant_blocks(w, TYPES[code], dq=dq)
                    mse += ((wq - w) ** 2).sum().item(); ss += (w ** 2).sum().item(); nq += w.numel()
                    mod.weight.data = wq
            p, cnt = ppl(model, ids)
            r = {'model': mname, 'type': vname, 'ppl': p, 'tokens': cnt, 'quantised_params': nq,
                 'rel_mse': (mse / ss) if ss else 0.0, 'seconds': round(time.time() - t0, 1)}
            print(json.dumps(r), flush=True)
            open(OUT, 'a').write(json.dumps(r) + '\n')
            del model


if __name__ == '__main__':
    main()
