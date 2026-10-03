"""Residual-stream size and attention-logit size, layer by layer, in six released models with different norm placements.

Run from src/: OMP_NUM_THREADS=2 uv run --with torch --with transformers --with accelerate python real/real_streams.py
Writes real/real_streams.json (small). Weights come from the Hugging Face cache; nothing large is stored here.

For every model the same English passage (public domain) is fed once, in float32, eager attention.
Per layer we record, over all tokens except the first (which in most decoders carries a "massive activation", Sun et al. 2024):
  rms_med  median over tokens of the RMS of the residual stream after the block (before any final norm)
  absmax   largest |value| in the stream after the block (all tokens but the first)
  tok0     RMS of the first token's stream after the block
  sum_med  (post-LN only) the same median RMS for the sum x + F(x) before the block's last LayerNorm
  logit_max  largest pre-softmax attention logit, q.k times the model's own scaling, over heads and allowed (query, key) pairs
"""
import inspect, json, math, os, sys
import torch
import transformers
from transformers import AutoModel, AutoModelForCausalLM, AutoTokenizer

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))

TEXT = ("It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of "
        "foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, "
        "it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything "
        "before us, we had nothing before us, we were all going direct to Heaven, we were all going direct the "
        "other way. In short, the period was so far like the present period, that some of its noisiest authorities "
        "insisted on its being received, for good or for evil, in the superlative degree of comparison only.")

MODELS = [
    # id, placement label, loader
    ('google-bert/bert-base-uncased', 'post', 'enc'),
    ('openai-community/gpt2', 'pre', 'dec'),
    ('HuggingFaceTB/SmolLM2-135M', 'pre', 'dec'),
    ('Qwen/Qwen3-0.6B', 'pre', 'dec'),
    ('unsloth/gemma-3-270m', 'peri', 'dec'),
    ('allenai/OLMo-2-0425-1B', 'out', 'dec'),
]

LOGITS = []  # filled by the patched attention function, one entry per attention call


def patch_attention(model):
    """Wrap eager_attention_forward in the model's own modeling module(s) to record the largest attention logit."""
    names = {type(m).__module__ for m in model.modules() if type(m).__module__.startswith('transformers.models.')}
    for name in names:
        mod = sys.modules[name]
        if 'eager_attention_forward' not in vars(mod):
            continue
        f = getattr(mod, 'eager_attention_forward')
        if getattr(f, '_wrapped', False):
            continue

        def make(f):
            sig = inspect.signature(f)

            def g(*a, **kw):
                ba = sig.bind(*a, **kw)
                ba.apply_defaults()
                A = ba.arguments
                query, key, attention_mask = A['query'], A['key'], A['attention_mask']
                sc = A.get('scaling')
                with torch.no_grad():
                    q, k = query.float(), key.float()
                    if k.shape[1] != q.shape[1]:
                        k = k.repeat_interleave(q.shape[1] // k.shape[1], dim=1)
                    if sc is None:
                        sc = 1 / math.sqrt(q.shape[-1])
                    lg = (q @ k.transpose(-1, -2)) * sc
                    if A.get('softcap'):
                        lg = torch.tanh(lg / A['softcap']) * A['softcap']
                    if attention_mask is not None:
                        m = attention_mask[..., :lg.shape[-2], :lg.shape[-1]]
                        ok = m if m.dtype == torch.bool else (m > -1)
                        lg = lg.masked_fill(~ok.expand_as(lg), float('-inf'))
                    LOGITS.append(lg[..., 1:, :].max().item())
                return f(*a, **kw)
            g._wrapped = True
            return g
        setattr(mod, 'eager_attention_forward', make(f))


def blocks_of(model):
    for path in ('encoder.layer', 'h', 'transformer.h', 'model.layers', 'layers'):
        o = model
        try:
            for p in path.split('.'):
                o = getattr(o, p)
            return list(o)
        except AttributeError:
            continue
    raise RuntimeError('no blocks found')


def run(mid, place, kind):
    tok = AutoTokenizer.from_pretrained(mid)
    cls = AutoModel if kind == 'enc' else AutoModelForCausalLM
    model = cls.from_pretrained(mid, torch_dtype=torch.float32, attn_implementation='eager')
    model.eval()
    patch_attention(model)
    blocks = blocks_of(model)
    outs, sums = [], []
    hooks = []
    for b in blocks:
        hooks.append(b.register_forward_hook(lambda m, i, o: outs.append((o[0] if isinstance(o, tuple) else o).detach())))
        if place == 'post':
            hooks.append(b.output.LayerNorm.register_forward_pre_hook(lambda m, i: sums.append(i[0].detach())))
    enc = tok(TEXT, return_tensors='pt')
    LOGITS.clear()
    with torch.no_grad():
        o = model(**enc, output_hidden_states=True)
    emb = o.hidden_states[0][0]
    for h in hooks:
        h.remove()

    def stats(x):
        x = x[0] if x.dim() == 3 else x
        r = x.pow(2).mean(-1).sqrt()
        return dict(rms_med=r[1:].median().item(), absmax=x[1:].abs().max().item(), tok0=r[0].item())

    layers = [stats(x) for x in outs]
    if sums:
        for L, s in zip(layers, sums):
            L['sum_med'] = stats(s)['rms_med']
    nl = len(blocks)
    lg = LOGITS[:nl] if len(LOGITS) >= nl else LOGITS
    for L, v in zip(layers, lg):
        L['logit_max'] = v
    cfg = model.config
    info = dict(id=mid, place=place, n_layers=nl, d_model=getattr(cfg, 'hidden_size', None) or cfg.n_embd,
                tokens=int(enc['input_ids'].shape[1]), emb=stats(emb), layers=layers,
                qk_norm=any('q_norm' in n for n, _ in model.named_modules()),
                norm_modules=sorted({type(m).__name__ for m in model.modules() if 'Norm' in type(m).__name__}))
    del model
    return info


def main():
    want = sys.argv[1:]
    out_path = os.path.join(HERE, 'real_streams.json')
    res = json.load(open(out_path)) if os.path.exists(out_path) else {}
    for mid, place, kind in MODELS:
        if want and not any(w in mid for w in want):
            continue
        print('running', mid, flush=True)
        try:
            res[mid] = run(mid, place, kind)
        except Exception as e:  # keep going; the page lists only models that ran
            print('FAILED', mid, repr(e), flush=True)
            continue
        r = res[mid]
        print(' layers', r['n_layers'], 'tokens', r['tokens'], 'emb rms', round(r['emb']['rms_med'], 3),
              'last rms', round(r['layers'][-1]['rms_med'], 3), 'max logit', round(max(L.get('logit_max', 0) for L in r['layers']), 2), flush=True)
        res['_meta'] = dict(transformers=transformers.__version__, torch=torch.__version__, text=TEXT)
        json.dump(res, open(out_path, 'w'), indent=1)


if __name__ == '__main__':
    main()
