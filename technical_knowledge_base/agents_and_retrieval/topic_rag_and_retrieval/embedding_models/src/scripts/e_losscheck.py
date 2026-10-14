"""Checks for e_train.py, on CPU (no lock, 2 threads, a batch of 8 SciFact train pairs + 8 mined negatives):
1. its loss equals sentence-transformers 6.1.0 MultipleNegativesRankingLoss (scale 20, cos_sim) on the same embeddings
   when no column is masked;
2. gradient caching (chunks of 4) gives the same parameter gradients as one plain backward pass.
usage: python -I -B e_losscheck.py   -> ../data/losscheck.json"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import torch  # noqa: E402
from emblib import L, scratch, save, r4  # noqa: E402
import e_train as T  # noqa: E402

torch.set_num_threads(2)
from transformers import AutoTokenizer, AutoModel  # noqa: E402
from sentence_transformers.sentence_transformer.losses.multiple_negatives_ranking import MultipleNegativesRankingLoss  # noqa: E402

md = L.model_dir("bge-small")
tok = AutoTokenizer.from_pretrained(md)
corpus, queries, qrels = L.beir("scifact")
neg = json.load(open(scratch("negatives.json")))
bp = [tuple(p) for p in neg["pairs"][:8]]
qt = [T.PREFIX + queries[q] for q, _ in bp]
dl = [d for _, d in bp] + [neg["pools"]["dense_f"][q + "|" + d][0] for q, d in bp]
dt = [L.doc_text(corpus[d]) for d in dl]
nomask = torch.zeros(8, 16, dtype=torch.bool)
T.MAXLEN = 256


def grads(model):
    return torch.cat([p.grad.flatten() for p in model.parameters() if p.grad is not None])


torch.manual_seed(0)
m1 = AutoModel.from_pretrained(md)
m1.train(False)  # no dropout, so the two passes are comparable
Qe = T.encode(m1, tok, qt, "cpu", grad=True)
De = T.encode(m1, tok, dt, "cpu", grad=True)
mine = T.loss_fn(Qe, De, nomask)


class Stub:  # MNRL only needs .similarity_fct etc.; call its embedding-level function directly
    pass


st = MultipleNegativesRankingLoss.__new__(MultipleNegativesRankingLoss)
torch.nn.Module.__init__(st)
st.scale = 20.0
from sentence_transformers.util import cos_sim  # noqa: E402
st.similarity_fct = cos_sim
st.gather_across_devices = False
st.directions = ("query_to_doc",)
st.partition_mode = "joint"
st.hardness_mode = None
st.hardness_strength = 0.0
ref = st.compute_loss_from_embeddings([Qe, De[:8], De[8:]], None)
mine.backward()
g_plain = grads(m1).clone()

m2 = AutoModel.from_pretrained(md)
m2.train(False)
T.CHUNK = 4
with torch.no_grad():
    Qn = torch.cat([T.encode(m2, tok, qt[i:i + 4], "cpu") for i in range(0, 8, 4)])
    Dn = torch.cat([T.encode(m2, tok, dt[i:i + 4], "cpu") for i in range(0, 16, 4)])
Qn.requires_grad_(True); Dn.requires_grad_(True)
l2 = T.loss_fn(Qn, Dn, nomask)
l2.backward()
for txt, g in ((qt, Qn.grad), (dt, Dn.grad)):
    for i in range(0, len(txt), 4):
        T.encode(m2, tok, txt[i:i + 4], "cpu", grad=True).backward(g[i:i + 4])
g_cache = grads(m2)
rel = float((g_plain - g_cache).norm() / g_plain.norm())
out = dict(loss_mine=r4(mine.item()), loss_st_mnrl=r4(ref.item()), loss_abs_diff=float(abs(mine.item() - ref.item())),
           gradcache_rel_diff=rel)
print(out)
save("losscheck.json", out)
