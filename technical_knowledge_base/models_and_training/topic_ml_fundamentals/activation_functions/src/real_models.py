"""Activation statistics inside three released models, measured offline on WikiText-2 (raw, test split).

OPT-125m (ReLU FFN), GPT-2 small (GELU, tanh approximation) and SmolLM2-135M (SwiGLU). For every FFN layer,
on every token of the text (the special BOS token excluded), it records the FFN hidden vector h, the input of the
down projection: ReLU(x W1 + b1) for OPT, GELU(x W1 + b1) for GPT-2, SiLU(x Wg) * (x Wu) for SmolLM2.

Per layer it stores
  zero:   fraction of entries exactly 0.0 (float32);
  neg:    fraction of entries below 0;
  hist:   counts of |h_i| / rms(h) in 60 log10 bins from 1e-5 to 1e1 (rms over that token's own hidden vector),
          with exact zeros counted apart (so the page can move a "near zero" threshold);
  on:     for every neuron, the fraction of tokens on which it is "on" (OPT: h > 0; GPT-2: pre-activation > 0;
          SmolLM2: gate pre-activation > 0), stored as a histogram: exactly 0 (never on: "dead"), then
          log10 bins from 1e-6 to 1;
  dead:   number of neurons never on.
It also records one token through one FFN layer of GPT-2 and of SmolLM2 for the page's animation.

Run: OMP_NUM_THREADS=2 HF_HUB_OFFLINE=1 uv run --with torch --with transformers --with pandas --with pyarrow python real_models.py
Writes inputs/real_models.json.
"""
import glob, json, math, os
import torch, pandas as pd
from transformers import AutoTokenizer, AutoModelForCausalLM

torch.set_num_threads(2)
torch.manual_seed(0)
HERE = os.path.dirname(os.path.abspath(__file__))
pq = glob.glob(os.path.expanduser("~/.cache/huggingface/hub/datasets--Salesforce--wikitext/snapshots/*/wikitext-2-raw-v1/test-00000-of-00001.parquet"))[0]
TEXT = "".join(pd.read_parquet(pq).text)
CHUNK = 512
LO, HI, NB = -5.0, 1.0, 60          # |h|/rms bins
FLO, FNB = -6.0, 60                 # per-neuron on-frequency bins, log10 from 1e-6 to 1

MODELS = [
    ("opt", "facebook/opt-125m", "ReLU"),
    ("gpt2", "openai-community/gpt2", "GELU (tanh approx.)"),
    ("smol", "HuggingFaceTB/SmolLM2-135M", "SwiGLU"),
]

def layers_of(key, m):
    if key == "opt": return m.model.decoder.layers
    if key == "gpt2": return m.transformer.h
    return m.model.layers

def run(key, name, act):
    tok = AutoTokenizer.from_pretrained(name)
    model = AutoModelForCausalLM.from_pretrained(name, dtype=torch.float32).eval()
    ids = tok(TEXT, add_special_tokens=False)["input_ids"]
    bos = tok.bos_token_id
    L = layers_of(key, model)
    nl = len(L)
    cap = {}
    hooks = []
    for i, layer in enumerate(L):
        if key == "opt":
            hooks.append(layer.fc2.register_forward_pre_hook(lambda mod, a, i=i: cap.__setitem__(("h", i), a[0].detach())))
            hooks.append(layer.fc1.register_forward_hook(lambda mod, a, o, i=i: cap.__setitem__(("p", i), o.detach())))
        elif key == "gpt2":
            hooks.append(layer.mlp.c_proj.register_forward_pre_hook(lambda mod, a, i=i: cap.__setitem__(("h", i), a[0].detach())))
            hooks.append(layer.mlp.c_fc.register_forward_hook(lambda mod, a, o, i=i: cap.__setitem__(("p", i), o.detach())))
        else:
            hooks.append(layer.mlp.down_proj.register_forward_pre_hook(lambda mod, a, i=i: cap.__setitem__(("h", i), a[0].detach())))
            hooks.append(layer.mlp.gate_proj.register_forward_hook(lambda mod, a, o, i=i: cap.__setitem__(("p", i), o.detach())))
    width = None
    st = None
    ntok = 0
    for s in range(0, len(ids), CHUNK - 1):
        seq = ids[s:s + CHUNK - 1]
        if len(seq) < 8: break
        x = torch.tensor([[bos] + seq]) if bos is not None else torch.tensor([seq])
        with torch.no_grad(): model(x)
        sl = slice(1, None) if bos is not None else slice(0, None)
        for i in range(nl):
            h = cap[("h", i)]; h = h.reshape(-1, h.shape[-1])[sl].double()      # tokens x width (OPT passes fc2 a flattened 2-D tensor)
            p = cap[("p", i)]; p = p.reshape(-1, p.shape[-1])[sl]
            if width is None:
                width = h.shape[1]
                st = [dict(zero=0, neg=0, n=0, hist=torch.zeros(NB + 2, dtype=torch.float64), on=torch.zeros(width, dtype=torch.float64)) for _ in range(nl)]
            d = st[i]
            d["zero"] += int((h == 0).sum()); d["neg"] += int((h < 0).sum()); d["n"] += h.numel()
            rms = h.pow(2).mean(1, keepdim=True).sqrt().clamp_min(1e-30)
            r = (h.abs() / rms)
            nz = r[h != 0]
            b = ((torch.log10(nz) - LO) / (HI - LO) * NB).floor().clamp(-1, NB).long() + 1   # 0: below 1e-5, NB+1: above 10
            d["hist"] += torch.bincount(b, minlength=NB + 2).double()
            d["on"] += (p > 0).double().sum(0)
        ntok += len(seq)
    for hk in hooks: hk.remove()
    out = []
    for i in range(nl):
        d = st[i]
        f = d["on"] / ntok
        dead = int((d["on"] == 0).sum())
        lf = torch.log10(f[f > 0])
        fb = ((lf - FLO) / (0 - FLO) * FNB).floor().clamp(0, FNB - 1).long()
        fh = [dead] + torch.bincount(fb, minlength=FNB).tolist()
        out.append(dict(zero=d["zero"] / d["n"], neg=d["neg"] / d["n"], hist=[int(v) for v in d["hist"].tolist()],
                        nz=d["n"] - d["zero"], dead=dead, onhist=[int(v) for v in fh],
                        onmean=float(f.mean()), onmed=float(f.median())))
    print(key, "tokens", ntok, "layers", nl, "width", width, "dead", [o["dead"] for o in out], "zero", [round(o["zero"], 3) for o in out])
    return dict(key=key, name=name, act=act, tokens=ntok, width=width, d=model.config.hidden_size, layers=out), model, tok

SENT = "The cat sat on the mat because it was tired."
WORD = " cat"

def one_token(key, model, tok, layer_idx):
    ids = tok(SENT, add_special_tokens=False)["input_ids"]
    pieces = [tok.decode([t]) for t in ids]
    pos = pieces.index(WORD)
    bos = tok.bos_token_id
    x = torch.tensor([[bos] + ids]) if (bos is not None and key != "gpt2") else torch.tensor([ids])
    off = 1 if (bos is not None and key != "gpt2") else 0
    L = layers_of(key, model)[layer_idx]
    cap = {}
    if key == "gpt2":
        hs = [L.ln_2.register_forward_hook(lambda m, a, o: cap.__setitem__("x", o.detach())),
              L.mlp.c_fc.register_forward_hook(lambda m, a, o: cap.__setitem__("pre", o.detach())),
              L.mlp.register_forward_hook(lambda m, a, o: cap.__setitem__("y", o.detach()))]
    else:
        hs = [L.post_attention_layernorm.register_forward_hook(lambda m, a, o: cap.__setitem__("x", o.detach())),
              L.mlp.gate_proj.register_forward_hook(lambda m, a, o: cap.__setitem__("gate", o.detach())),
              L.mlp.up_proj.register_forward_hook(lambda m, a, o: cap.__setitem__("up", o.detach())),
              L.mlp.down_proj.register_forward_pre_hook(lambda m, a: cap.__setitem__("h", a[0].detach())),
              L.mlp.register_forward_hook(lambda m, a, o: cap.__setitem__("y", o.detach()))]
    with torch.no_grad(): model(x)
    for h in hs: h.remove()
    q = lambda t: [float("%.4g" % v) for v in t[0, pos + off].tolist()]
    rec = dict(layer=layer_idx, tokens=pieces, pos=pos, x=q(cap["x"]), y=q(cap["y"]))
    if key == "gpt2":
        rec["pre"] = q(cap["pre"])
    else:
        rec["gate"] = q(cap["gate"]); rec["up"] = q(cap["up"]); rec["h"] = q(cap["h"])
    return rec

res = {"text": "WikiText-2 raw, test split (Salesforce/wikitext, wikitext-2-raw-v1)", "chunk": CHUNK, "bins": [LO, HI, NB], "fbins": [FLO, FNB], "models": []}
for key, name, act in MODELS:
    r, model, tok = run(key, name, act)
    if key == "gpt2": r["token"] = one_token(key, model, tok, 6)
    if key == "smol": r["token"] = one_token(key, model, tok, 15)
    res["models"].append(r)
    del model
os.makedirs(os.path.join(HERE, "inputs"), exist_ok=True)
json.dump(res, open(os.path.join(HERE, "inputs", "real_models.json"), "w"), separators=(",", ":"))
print("written")
