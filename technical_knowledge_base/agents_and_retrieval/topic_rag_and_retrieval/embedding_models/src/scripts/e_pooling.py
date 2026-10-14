"""What encode() does, rebuilt by hand. CPU, no lock, 2 threads.
For each setup model (and e5-small-v2): read its sentence-transformers modules.json and 1_Pooling/config.json at the
pinned revision, run the bare transformer (transformers AutoModel), apply the pooling and normalisation by hand, and
compare with SentenceTransformer.encode on the same 6 texts (3 SciFact claims with the model's query prompt, 3
abstracts). Also the vector lengths before normalisation and the effect of a wrong pooling choice on the cosine.
Quotes the pooling and normalisation code of the installed sentence-transformers 6.1.0 (file and line) into
data/code.json for the page.
usage: python -I -B e_pooling.py   -> ../data/pooling.json, ../data/code.json"""
import inspect
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn.functional as F  # noqa: E402
from emblib import L, save, r4  # noqa: E402

torch.set_num_threads(2)
import sentence_transformers as stm  # noqa: E402
from sentence_transformers import SentenceTransformer  # noqa: E402
from transformers import AutoModel, AutoTokenizer  # noqa: E402

corpus, queries, qrels = L.beir("scifact")
qs = ["1", "3", "5"] if all(q in queries for q in ("1", "3", "5")) else list(queries)[:3]
ds = [sorted(qrels["test"].get(q, {"4983": 1}), key=int)[0] for q in sorted(qrels["test"], key=int)[:3]]
MODELS = {"minilm-l6": "", "bge-small": L.query_prefix("bge-small", "scifact"), "gte-modernbert": "",
          "e5-small-v2": "query: ", "qwen3-emb-0.6b": L.query_prefix("qwen3-emb-0.6b", "scifact")}
DOCP = {"e5-small-v2": "passage: "}


def mdir(k):
    return L.path("models", "e5-small-v2") if k == "e5-small-v2" else L.model_dir(k)


def pool(h, mask, mode):
    if mode == "cls":
        return h[:, 0]
    if mode == "mean":
        m = mask.unsqueeze(-1).float()
        return (h * m).sum(1) / m.sum(1).clamp(min=1e-9)
    if mode == "lasttoken":  # right padding: the last real token
        last = mask.sum(1) - 1
        return h[torch.arange(h.shape[0]), last]
    raise ValueError(mode)


out = dict(asof="2026-10-14", st_version=stm.__version__, models={})
for k, qp in MODELS.items():
    d = mdir(k)
    mods = json.load(open(os.path.join(d, "modules.json")))
    pc = json.load(open(os.path.join(d, "1_Pooling", "config.json")))
    mode = pc.get("pooling_mode") or next((m for key, m in (("pooling_mode_cls_token", "cls"), ("pooling_mode_mean_tokens", "mean"),
                                                            ("pooling_mode_lasttoken", "lasttoken")) if pc.get(key)), None)
    has_norm = any(m["type"].endswith("Normalize") for m in mods)
    texts = [qp + queries[q] for q in qs] + [DOCP.get(k, "") + L.doc_text(corpus[x]) for x in ds]
    st = SentenceTransformer(d, device="cpu", model_kwargs={"torch_dtype": torch.float32})
    st.max_seq_length = 512
    ref = st.encode(texts, convert_to_numpy=True, batch_size=6)
    tok = AutoTokenizer.from_pretrained(d)
    side = tok.padding_side
    tok.padding_side = "right"
    m = AutoModel.from_pretrained(d, torch_dtype=torch.float32).eval()
    enc = tok(texts, truncation=True, max_length=512, padding=True, return_tensors="pt")
    with torch.no_grad():
        h = m(**enc).last_hidden_state
    raw = pool(h, enc["attention_mask"], mode)
    lens = raw.norm(dim=-1).numpy()
    mine = (F.normalize(raw, dim=-1) if has_norm else raw).numpy()
    diff = float(np.abs(mine - ref).max())
    cosr = float(np.min(np.sum(F.normalize(torch.tensor(mine), dim=-1).numpy() * F.normalize(torch.tensor(ref), dim=-1).numpy(), 1)))
    other = {"cls": "mean", "mean": "cls", "lasttoken": "mean"}[mode]
    wrong = F.normalize(pool(h, enc["attention_mask"], other), dim=-1).numpy()
    rightn = F.normalize(raw, dim=-1).numpy()
    # cosine claim i vs abstract i under the right and the wrong pooling (same weights)
    cos_right = [r4(rightn[i] @ rightn[3 + i]) for i in range(3)]
    cos_wrong = [r4(wrong[i] @ wrong[3 + i]) for i in range(3)]
    out["models"][k] = dict(modules=[x["type"].split(".")[-1] for x in mods], pooling=mode, normalize=has_norm,
                            tokenizer_padding_side=side, include_prompt=pc.get("include_prompt", True),
                            dim=int(raw.shape[1]), max_abs_diff=diff, min_cos_vs_encode=r4(cosr),
                            raw_lengths=[round(float(x), 2) for x in lens], wrong_pooling=other,
                            cos_right=cos_right, cos_wrong=cos_wrong)
    print(k, out["models"][k], flush=True)
    del st, m
save("pooling.json", out)

# quote the code
from sentence_transformers.sentence_transformer.modules import pooling as P  # noqa: E402
from sentence_transformers.base.modules import normalize as N  # noqa: E402
src = inspect.getsource(P).split("\n")


def find(lines, start_pat, end_pat):
    a = next(i for i, l in enumerate(lines) if start_pat in l)
    b = next(i for i in range(a + 1, len(lines)) if end_pat in lines[i])
    return dict(start=a + 1, end=b, text="\n".join(lines[a:b]))


code = dict(version=stm.__version__,
            pooling_file="sentence_transformers/sentence_transformer/modules/pooling.py",
            normalize_file="sentence_transformers/base/modules/normalize.py",
            cls=find(src, 'if mode == "cls":', 'elif mode == "max":'),
            mean=find(src, 'elif mode in ("mean", "mean_sqrt_len_tokens"):', 'elif mode == "weightedmean":'),
            last=find(src, 'elif mode == "lasttoken":', "return output_vectors"))
ns = inspect.getsource(N).split("\n")
code["normalize"] = find(ns, "def forward(self, features", "return features")
code["normalize"]["end"] += 1
code["normalize"]["text"] += "\n" + ns[code["normalize"]["end"] - 1]
from sentence_transformers.sentence_transformer.losses import multiple_negatives_ranking as M  # noqa: E402
ms = inspect.getsource(M).split("\n")
code["mnrl_scale"] = find(ms, "scale: float = 20.0", "gather_across_devices: bool")
code["mnrl_loss"] = find(ms, "# Positive scores (always from query_to_doc)", "return loss")
code["mnrl_loss"]["end"] += 1
code["mnrl_loss"]["text"] += "\n" + ms[code["mnrl_loss"]["end"] - 1]
code["mnrl_file"] = "sentence_transformers/sentence_transformer/losses/multiple_negatives_ranking.py"
save("code.json", code)
