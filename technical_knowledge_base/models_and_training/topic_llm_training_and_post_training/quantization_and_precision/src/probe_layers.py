"""Survey every linear layer of Qwen2.5-0.5B on the calibration text: weight and input-activation outlier statistics.
  uv run --with torch --with transformers --with numpy python probe_layers.py
Writes inputs/layer_survey.json (small). Used only to choose the one layer the page quantises."""
import json, os, torch, numpy as np
from transformers import AutoModelForCausalLM, AutoTokenizer
HERE = os.path.dirname(os.path.abspath(__file__))
M = 'Qwen/Qwen2.5-0.5B'
tok = AutoTokenizer.from_pretrained(M); model = AutoModelForCausalLM.from_pretrained(M, torch_dtype=torch.float32).eval()
text = open(os.path.join(HERE, 'inputs/calib_pride_and_prejudice.txt')).read().split('\n', 1)[1]
ids = tok(text, return_tensors='pt').input_ids[:, :512]
acts = {}
def hook(name):
    def f(mod, inp, out): acts[name] = inp[0][0].detach().numpy()
    return f
for n, m in model.named_modules():
    if isinstance(m, torch.nn.Linear) and 'layers.' in n: m.register_forward_hook(hook(n))
with torch.no_grad(): model(ids)
rows = []
for n, m in model.named_modules():
    if n not in acts: continue
    X = acts[n][1:]  # drop first token (attention sink, massive activations)
    W = m.weight.detach().numpy()
    cmax = np.abs(X).max(0); med = np.median(cmax)
    rows.append(dict(name=n, K=W.shape[1], N=W.shape[0], x_absmax=float(np.abs(X).max()), x_chan_ratio=float(cmax.max() / med),
        x_chan_over_20x=int((cmax > 20 * med).sum()), w_absmax=float(np.abs(W).max()), w_std=float(W.std()),
        w_kurt=float(((W - W.mean()) ** 4).mean() / W.var() ** 2), x0_absmax=float(np.abs(acts[n][0]).max())))
json.dump(dict(model=M, tokens=int(ids.shape[1]), rows=rows), open(os.path.join(HERE, 'inputs/layer_survey.json'), 'w'), indent=0)
for r in rows:
    if r['x_chan_ratio'] > 15: print(r['name'], r['K'], r['N'], round(r['x_absmax'], 1), round(r['x_chan_ratio'], 1), r['x_chan_over_20x'], round(r['w_kurt'], 1), round(r['x0_absmax']))
