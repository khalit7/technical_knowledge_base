"""Real numbers for the Reading tab's "one claim through the model" animation. CPU, no lock.
One short SciFact test claim and its labelled abstract through bge-small (CLS), all-MiniLM-L6 (mean) and
Qwen3-Embedding-0.6B (last token): the tokens, the first 16 numbers of every token's final hidden state, the pooled
vector (first 16), its length before normalisation, and the claim-abstract cosine with the model's own pooling and with
the other two poolings applied to the same hidden states.
usage: python -I -B e_anim.py   -> ../data/anim.json"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import torch  # noqa: E402
import torch.nn.functional as F  # noqa: E402
from emblib import L, save, r4  # noqa: E402

torch.set_num_threads(2)
from transformers import AutoModel, AutoTokenizer  # noqa: E402

corpus, queries, qrels = L.beir("scifact")
# shortest test claim (by characters) with exactly one relevant abstract, ties by id
cands = sorted([q for q in qrels["test"] if len(qrels["test"][q]) == 1], key=lambda q: (len(queries[q]), int(q)))
q = cands[0]
d = next(iter(qrels["test"][q]))
out = dict(asof="2026-10-14", qid=q, claim=queries[q], docid=d, doc_title=corpus[d]["title"], models={})


def pools(h, mask):
    m = mask.unsqueeze(-1).float()
    return {"cls": h[:, 0], "mean": (h * m).sum(1) / m.sum(1), "last": h[torch.arange(h.shape[0]), mask.sum(1) - 1]}


for key, own in (("bge-small", "cls"), ("minilm-l6", "mean"), ("qwen3-emb-0.6b", "last")):
    md = L.model_dir(key)
    tok = AutoTokenizer.from_pretrained(md)
    tok.padding_side = "right"
    m = AutoModel.from_pretrained(md, dtype=torch.float32).eval()
    qp = L.query_prefix(key, "scifact")
    enc = tok([qp + queries[q], L.doc_text(corpus[d])], truncation=True, max_length=512, padding=True, return_tensors="pt")
    with torch.no_grad():
        h = m(**enc).last_hidden_state
    P = pools(h, enc["attention_mask"])
    n_q = int(enc["attention_mask"][0].sum())
    ids = enc["input_ids"][0][:n_q].tolist()
    toks = tok.convert_ids_to_tokens(ids)
    n_prompt = len(tok(qp, add_special_tokens=False)["input_ids"]) if qp else 0
    cos = {p: r4(F.cosine_similarity(P[p][0], P[p][1], dim=0)) for p in P}
    out["models"][key] = dict(pool=own, tokens=toks, n_prompt=n_prompt, n_doc_tokens=int(enc["attention_mask"][1].sum()),
                              hidden=[[round(float(x), 3) for x in h[0, i, :16]] for i in range(n_q)],
                              pooled=[round(float(x), 3) for x in P[own][0, :16]], dim=int(h.shape[-1]),
                              length=round(float(P[own][0].norm()), 3), lengths={p: round(float(P[p][0].norm()), 3) for p in P}, cos=cos)
    print(key, toks[:12], cos, flush=True)
    del m
save("anim.json", out)
