"""Real expert routing of a small mixture-of-experts model, for the Expert balancer tab.

Model: ibm-granite/granite-3.1-1b-a400m-base (Apache 2.0; 24 layers, 32 experts per layer, 8 chosen per token),
revision 408b6e90baab8cf24f4aa9f8e19703ffa0a53b29, run on CPU in bfloat16 (the dtype of the released weights) with transformers (2 threads).
Text: WikiText-2 test split (raw), cut into 512-token windows; the first half of the windows is "history"
(what a balancer would see), the second half is "traffic" (what it is judged on).
For every window, layer and expert we count the tokens the router sends there (top-k of the router logits,
as the model's own forward does). Writes counts.json.
usage: python route.py MODEL_DIR WIKI_RAW OUT_JSON [n_windows]
"""
import json, sys, time
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

torch.set_num_threads(2)
mdir, wiki, outp = sys.argv[1], sys.argv[2], sys.argv[3]
NW = int(sys.argv[4]) if len(sys.argv) > 4 else 64
tok = AutoTokenizer.from_pretrained(mdir)
model = AutoModelForCausalLM.from_pretrained(mdir, dtype=torch.bfloat16)
model.eval()
cfg = model.config
K, E, L = cfg.num_experts_per_tok, cfg.num_local_experts, cfg.num_hidden_layers
text = open(wiki, encoding="utf-8").read()
ids = tok(text, return_tensors="pt").input_ids[0]
W = 512
counts = []  # [window][layer][expert]
t0 = time.time()
with torch.no_grad():
    for w in range(NW):
        x = ids[w * W:(w + 1) * W].unsqueeze(0)
        o = model(x, output_router_logits=True)
        rl = o.router_logits  # tuple over layers of [tokens, E]
        cw = []
        for l in range(L):
            top = torch.topk(rl[l].float(), K, dim=-1).indices.flatten()
            cw.append(torch.bincount(top, minlength=E).tolist())
        counts.append(cw)
        if w % 8 == 0:
            print(w, "%.0fs" % (time.time() - t0), flush=True)
json.dump(dict(model="ibm-granite/granite-3.1-1b-a400m-base", revision="408b6e90baab8cf24f4aa9f8e19703ffa0a53b29",
               K=K, E=E, L=L, window=W, n_windows=NW, text="WikiText-2 test (raw), first %d x %d tokens" % (NW, W),
               torch=torch.__version__, counts=counts), open(outp, "w"))
print("done", time.time() - t0)
