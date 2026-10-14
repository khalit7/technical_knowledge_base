"""Megatron-LM's three GPTDataset indices on real document lengths, ported line for line (NVIDIA/Megatron-LM 80781ab):
  document_index  gpt_dataset.py _build_document_index (lines 734-765): every document once per epoch, shuffled together
  sample_index    helpers.cpp build_sample_idx (lines 144-249): (position in document_index, offset) where each sample starts
  shuffle_index   gpt_dataset.py _build_shuffle_index (lines 768-797): a permutation of the samples
with numpy.random.RandomState(seed) consumed in the same order as GPTDataset._build_document_sample_shuffle_indices
(lines 586-636). For contrast, nanoGPT's get_batch (train.py 116-131 at 3adf61e): random start offsets drawn with
torch.randint, no index, no epochs. Also: what happens to Qwen3 ids written as uint16.
  <venv>/bin/python -I megatron_demo.py <lens json> <qwen3 tokenizer.json> <fineweb parquet> <out.json>
"""
import json, sys
import numpy as np, torch, pyarrow.parquet as pq
from tokenizers import Tokenizer

lens_all = json.load(open(sys.argv[1])); lens_all = lens_all["lens"] if isinstance(lens_all, dict) else lens_all
D = 12; SEQ = 1024; EPOCHS = 2; SEED = 1234; ADD = 1
sizes = np.array([n + 1 for n in lens_all[:D]], dtype=np.int32)  # + end-of-document token (preprocess_data.py --append-eod)
tokens_per_epoch = int(sizes.sum())
rs = np.random.RandomState(SEED)
docs = np.arange(D, dtype=np.int32)
document_index = np.mgrid[0:EPOCHS, 0:len(docs)][1]; document_index[:] = docs
document_index = document_index.reshape(-1).astype(np.int32); rs.shuffle(document_index)

def build_sample_idx(sizes, document_idx, seq_length, num_epochs, tokens_per_epoch, add=1):
    num_samples = (num_epochs * tokens_per_epoch - add) // seq_length  # drop_last_partial_sequence = True
    out = [[0, 0]]; di, off = 0, 0
    while len(out) <= num_samples:
        remaining = seq_length + add
        while remaining != 0:
            dlen = int(sizes[document_idx[di]]) - off
            remaining -= dlen
            if remaining <= 0:
                off += remaining + dlen - add; remaining = 0
            else:
                if di == len(document_idx) - 1:
                    off = int(sizes[document_idx[di]]) - add; break
                di += 1; off = 0
        out.append([di, off])
    return out
sample_index = build_sample_idx(sizes, document_index, SEQ, EPOCHS, tokens_per_epoch, ADD)
ns = len(sample_index) - 1
shuffle_index = np.arange(ns, dtype=np.uint32); rs.shuffle(shuffle_index)
# check: every sample covers SEQ + 1 tokens (the extra token is the last target, shared with the next sample)
flat = np.concatenate([np.full(sizes[d], d) for d in document_index])
pos = lambda e: int(sum(sizes[document_index[:e[0]]]) + e[1])
for k in range(ns): assert pos(sample_index[k + 1]) - pos(sample_index[k]) == SEQ
# coverage after one epoch's worth of samples: Megatron vs nanoGPT random offsets over the same flat array (one epoch)
one = np.concatenate([np.full(sizes[d], d) for d in docs]); n_one = len(one); per_epoch = (tokens_per_epoch - ADD) // SEQ
g = torch.Generator().manual_seed(SEED); starts = torch.randint(n_one - SEQ, (per_epoch,), generator=g).tolist()
cov = np.zeros(n_one, dtype=int)
for s in starts: cov[s:s + SEQ] += 1
res = {"D": D, "seq": SEQ, "epochs": EPOCHS, "seed": SEED, "sizes": sizes.tolist(), "document_index": document_index.tolist(),
       "sample_index": sample_index, "shuffle_index": shuffle_index.tolist(), "num_samples": ns,
       "nanogpt": {"starts": starts, "tokens": n_one, "samples": per_epoch, "unseen_frac": float((cov == 0).mean()),
                   "twice_or_more_frac": float((cov >= 2).mean())}}
# large-scale version of the same coverage question (derived): random windows over a long array
rng = np.random.default_rng(0); n_big, L = 50_000_000, 2048; k = n_big // L
cnt = np.zeros(n_big + 1, dtype=np.int32); st = rng.integers(0, n_big - L, k); np.add.at(cnt, st, 1); np.add.at(cnt, st + L, -1)
c = np.cumsum(cnt)[:n_big]
res["nanogpt_big"] = {"tokens": n_big, "L": L, "samples": int(k), "unseen_frac": float((c == 0).mean()), "exp_minus_1": float(np.exp(-1))}

# uint16 wraparound on real Qwen3 ids
tok = Tokenizer.from_file(sys.argv[2])
texts = pq.read_table(sys.argv[3], columns=["text"]).slice(0, 2000).column(0).to_pylist()
ids = np.concatenate([np.asarray(tok.encode(t, add_special_tokens=False).ids, dtype=np.int64) for t in texts])
big = ids[ids >= 65536]; vals, cnts = np.unique(big, return_counts=True); top = np.argsort(-cnts)[:8]
res["wrap"] = {"tokens": int(len(ids)), "ge65536": int(len(big)),
               "top": [{"id": int(vals[i]), "count": int(cnts[i]), "piece": tok.decode([int(vals[i])]), "wrapped_id": int(vals[i]) % 65536,
                        "wrapped_piece": tok.decode([int(vals[i]) % 65536])} for i in top]}
sent = "Regular cervical screening helps prevent cancer, the clinic says…\n"  # illustrative sentence using two frequent high ids
e = tok.encode(sent, add_special_tokens=False).ids
res["wrap"]["sentence"] = {"text": sent, "ids": e, "decoded_uint16": tok.decode([x % 65536 for x in e]), "n_ge": sum(1 for x in e if x >= 65536)}
json.dump(res, open(sys.argv[4], "w"), indent=1)
print(ns, res["nanogpt"]["unseen_frac"], res["nanogpt_big"], res["wrap"]["top"][:4], res["wrap"]["sentence"])
