"""Retrain the running example's byte-level BPE exactly as the root's prepare_data.py does (TinyStories train shard 0,
min_frequency 2, the 256-byte alphabet, <|endoftext|> as id 0) at several vocabulary sizes, and measure what each
size does to the validation split and the running sequence. The 4,096 run must reproduce the committed
tokenizer.json byte for byte. CPU only, RAYON_NUM_THREADS=4, nice 15.
Run: LA_SCRATCH=<scratch>/la RAYON_NUM_THREADS=4 nice -n 15 <venv>/bin/python bpe_sweep.py  -> ../out/bpe_sweep.json
Trained tokenizers are kept in $LA_SCRATCH/tk/bpe_<V>.json (not committed).
"""
import hashlib, json, os, resource, sys, time
import pyarrow.parquet as pq
import tokenizers
from tokenizers import Tokenizer, models, trainers, pre_tokenizers, decoders

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data"))
SCR = os.environ["LA_SCRATCH"]; DL = os.path.join(SCR, "dl", "tinystories"); KEEP = os.path.join(SCR, "tk"); os.makedirs(KEEP, exist_ok=True)
EOT = "<|endoftext|>"
SIZES = [int(x) for x in (sys.argv[1:] or "257 512 1024 2048 4096 8192 16384 32768 65536".split())]
D_MODEL, NON_EMB = 256, 4_721_920   # tiny GPT baseline (root src/data/README.md): non-embedding parameters

def stories(fn): return [s.strip() for s in pq.read_table(os.path.join(DL, fn)).column("text").to_pylist() if s and s.strip()]
train = stories("train-00000-of-00004-2d5a1467fff1081b.parquet")
val = stories("validation-00000-of-00001-869c898b519ad725.parquet")
run = json.load(open(os.path.join(DATA, "running_sequence.json")))
committed = hashlib.sha256(open(os.path.join(DATA, "tokenizer.json"), "rb").read()).hexdigest()
val_chars = sum(map(len, val))
out = {"tokenizers_version": tokenizers.__version__, "train_stories": len(train), "val_stories": len(val),
       "val_chars": val_chars, "running_chars": len(run["text"]), "committed_sha256": committed, "runs": []}
merges_by_V = {}
for V in SIZES:
    t0 = time.time()
    tok = Tokenizer(models.BPE())
    tok.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
    tok.decoder = decoders.ByteLevel()
    tr = trainers.BpeTrainer(vocab_size=V, special_tokens=[EOT], min_frequency=2,
                             initial_alphabet=pre_tokenizers.ByteLevel.alphabet(), show_progress=False)
    tok.train_from_iterator(train, trainer=tr)
    secs = time.time() - t0
    path = os.path.join(KEEP, f"bpe_{V}.json"); tok.save(path)
    sha = hashlib.sha256(open(path, "rb").read()).hexdigest()
    J = json.load(open(path)); merges = J["model"]["merges"]; merges_by_V[V] = merges
    val_tokens = sum(len(e.ids) for e in tok.encode_batch(val))
    run_ids = tok.encode(run["text"]).ids
    Vreal = tok.get_vocab_size()
    r = {"V_target": V, "V": Vreal, "merges": len(merges), "train_seconds": round(secs, 1),
         "peak_rss_mb": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**20),
         "val_tokens": val_tokens, "val_chars_per_token": round(val_chars / val_tokens, 3),
         "running_tokens": len(run_ids), "running_pieces": [tok.decode([i]) for i in run_ids[:60]],
         "emb_params": Vreal * D_MODEL, "emb_share": round(Vreal * D_MODEL / (Vreal * D_MODEL + NON_EMB), 4),
         "sha256": sha, "same_as_committed": sha == committed}
    out["runs"].append(r)
    print(V, {k: r[k] for k in r if k != "running_pieces"}, flush=True)
# BPE's merge lists are nested: a smaller vocabulary's merges are the first merges of a larger one
big = max(merges_by_V); out["prefix_check"] = {str(V): merges_by_V[V] == merges_by_V[big][:len(merges_by_V[V])] for V in merges_by_V}
print("prefix", out["prefix_check"])
json.dump(out, open(os.path.join(HERE, "..", "out", "bpe_sweep.json"), "w"), indent=1, ensure_ascii=False)
