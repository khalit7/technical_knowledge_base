"""Common mistakes with image tokens, run for real on CPU (prefix nm). Writes out/mistakes.json.

  GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I mistakes.py
1. One shared vocabulary for text and image tokens (early fusion): image code c must become id V_text + c. Forget the
   offset and an image code silently becomes a text token; size the embedding for text only and torch raises.
2. Decode tokens with the wrong tokenizer: an out-of-range code raises; an in-range one decodes to garbage silently.
"""
import json, os, sys, traceback

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "..", "src")
sys.path[:0] = [os.path.join(ROOT_SRC, "data"), HERE]
import numpy as np
import torch
import torch.nn as nn
from common import cap_threads, load_split, to_model, from_model, scratch
from objectives import to_image
import fid
from tokenize_data import load_tokenizer

cap_threads(4)
res = {}


def err(fn):
    try:
        fn(); return None
    except Exception as e:
        return f"{type(e).__name__}: {e}".strip()


# 1. shared vocabulary
V_TEXT, K_IMG = 32000, 1000                           # a 32k text vocabulary (Llama-2 size) plus 1,000 image codes
emb_text_only = nn.Embedding(V_TEXT, 8)
img_codes = torch.tensor([472, 473, 512, 999])
res["shared_vocab"] = {
    "embedding_rows_text_only": V_TEXT,
    "ids_with_offset": (img_codes + V_TEXT).tolist(),
    "error_text_only_embedding_with_offset": err(lambda: emb_text_only(img_codes + V_TEXT)),
    "no_offset_silent": "ids " + str(img_codes.tolist()) + " run without error and look up text tokens 472, 473, 512, 999",
}
emb_joint = nn.Embedding(V_TEXT + K_IMG, 8)
res["shared_vocab"]["joint_embedding_ok"] = err(lambda: emb_joint(img_codes + V_TEXT)) is None

# 2. wrong tokenizer at decode time
xv, yv = load_split("val")
z = np.load(scratch("nm", "tokens_fsq1000.npz"))
fsq, vq = load_tokenizer("fsq1000"), load_tokenizer("vq128")
t_fsq = torch.as_tensor(z["val"][:1000].astype(np.int64)).view(-1, 8, 8)
res["wrong_tokenizer"] = {"fsq_tokens_into_vq128_decoder": err(lambda: vq.decode_tokens(t_fsq))}
zv = np.load(scratch("nm", "tokens_vq128.npz"))
t_vq = torch.as_tensor(zv["val"][:1000].astype(np.int64)).view(-1, 8, 8)
with torch.no_grad():
    garbage = from_model(to_image(fsq.decode_tokens(t_vq)))
    right = from_model(to_image(vq.decode_tokens(t_vq)))
clf = fid.load_classifier("cpu")
d_bad, a_bad = fid.fd_fmnist(garbage, clf, "cpu", labels=yv[:1000])
d_ok, a_ok = fid.fd_fmnist(right, clf, "cpu", labels=yv[:1000])
res["wrong_tokenizer"].update({"vq_tokens_into_fsq_decoder_fd": round(float(d_bad), 2), "acc": round(float(a_bad), 4),
                               "right_decoder_fd": round(float(d_ok), 2), "right_acc": round(float(a_ok), 4)})
np.savez_compressed(scratch("nm", "mistakes.npz"), garbage=garbage[:10], right=right[:10], labels=yv[:10])
json.dump(res, open(os.path.join(HERE, "..", "out", "mistakes.json"), "w"), indent=1)
print(json.dumps(res, indent=1))
