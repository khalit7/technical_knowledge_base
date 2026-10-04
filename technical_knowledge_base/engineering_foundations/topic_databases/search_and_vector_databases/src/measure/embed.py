"""Embed BEIR Quora (522,931 questions; 10,000 test queries) and BEIR SciFact (5,183 abstracts; 300 test claims)
with sentence-transformers/all-MiniLM-L6-v2 (384 dimensions, unit-normalised), the same model as the RAG and
retrieval evaluation page. Writes float32 .npy files into $SV_WORK (default ./sv_work).
Usage: uv run --no-project --python 3.12 --with sentence-transformers --with numpy python embed.py <beir dir>"""
import json, os, sys, time
import numpy as np, torch
from sentence_transformers import SentenceTransformer
torch.set_num_threads(2)
base = sys.argv[1]; out = os.path.abspath(os.environ.get('SV_WORK', 'sv_work')); os.makedirs(out, exist_ok=True)
dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
m = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', device=dev)
log = {}
def run(name):
    d = f'{base}/{name}'
    C = [json.loads(l) for l in open(d + '/corpus.jsonl')]
    Q = {}
    for l in open(d + '/queries.jsonl'):
        q = json.loads(l); Q[q['_id']] = q['text']
    qrels = {}
    for i, l in enumerate(open(d + '/qrels/test.tsv')):
        if i == 0: continue
        a, b, s = l.rstrip('\n').split('\t')
        if int(s) > 0: qrels.setdefault(a, {})[b] = int(s)
    qids = [q for q in Q if q in qrels]
    texts = [((c.get('title') or '') + ' ' + c['text']).strip() for c in C]
    t = time.time()
    E = m.encode(texts, batch_size=256, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False).astype(np.float32)
    te = time.time() - t
    QE = m.encode([Q[q] for q in qids], batch_size=256, normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)
    np.save(f'{out}/{name}_docs.npy', E); np.save(f'{out}/{name}_queries.npy', QE)
    json.dump({'doc_ids': [c['_id'] for c in C], 'texts': texts, 'qids': qids, 'queries': [Q[q] for q in qids], 'qrels': qrels},
              open(f'{out}/{name}_meta.json', 'w'))
    log[name] = {'docs': len(C), 'queries': len(qids), 'embed_s': round(te, 1), 'device': dev}
    print(name, log[name], flush=True)
for n in sys.argv[2].split(',') if len(sys.argv) > 2 else ['scifact', 'quora']:
    run(n)
json.dump(log, open(f'{out}/embed_log.json', 'w'), indent=1)
