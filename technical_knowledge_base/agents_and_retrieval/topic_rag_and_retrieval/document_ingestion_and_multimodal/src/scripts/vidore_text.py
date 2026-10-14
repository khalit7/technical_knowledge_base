"""Text retrieval over Tesseract OCR of ViDoRe pages: BM25 and a dense text embedder.
usage: python -I vidore_text.py <ING_DIR> <set> <RAG_SCRATCH>
BM25: bm25s, Lucene variant, k1 1.2, b 0.75, English stopwords, Snowball stemmer (the root's settings).
Dense: BAAI/bge-small-en-v1.5 from the shared model store (the root's 'bge-small': query prefix
"Represent this sentence for searching relevant passages: ", 512 tokens, CLS pooling), on CPU, 4 threads.
Writes <set>/rank_bm25.json and rank_bge.json: {qid: [top 100 page indexes]}."""
import json, os, sys
import numpy as np
import bm25s, Stemmer

ING, NAME, RS = sys.argv[1:4]
d = os.path.join(ING, "vidore", NAME)
meta = json.load(open(os.path.join(d, "meta.json")))
texts = [open(os.path.join(d, "ocr", "%d.txt" % i)).read() for i in range(len(meta["pages"]))]
qs = meta["queries"]
st = Stemmer.Stemmer("english")
r = bm25s.BM25(method="lucene", k1=1.2, b=0.75)
r.index(bm25s.tokenize(texts, stopwords="en", stemmer=st, show_progress=False), show_progress=False)
ids, _ = r.retrieve(bm25s.tokenize([q["query"] for q in qs], stopwords="en", stemmer=st, show_progress=False),
                    k=min(100, len(texts)), show_progress=False)
json.dump({q["qid"]: [int(x) for x in row] for q, row in zip(qs, ids)}, open(os.path.join(d, "rank_bm25.json"), "w"))
import torch
torch.set_num_threads(4)
from sentence_transformers import SentenceTransformer
m = SentenceTransformer(os.path.join(RS, "models", "bge-small-en-v1.5"), device="cpu")
m.max_seq_length = 512
D = m.encode(texts, batch_size=16, normalize_embeddings=True, show_progress_bar=False)
Q = m.encode(["Represent this sentence for searching relevant passages: " + q["query"] for q in qs],
             batch_size=64, normalize_embeddings=True, show_progress_bar=False)
S = Q @ D.T
top = np.argsort(-S, axis=1)[:, :100]
json.dump({q["qid"]: [int(x) for x in row] for q, row in zip(qs, top)}, open(os.path.join(d, "rank_bge.json"), "w"))
print(NAME, "text rankings done", len(texts), "pages", len(qs), "queries")
