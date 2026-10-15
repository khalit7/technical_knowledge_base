# MinHash and LSH with datatrove's own code on one real pair (the code shown on the page, plus the loader).
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "data"))
import load
import numpy as np
from datatrove.pipeline.dedup.minhash import MinhashConfig, MinhashDedupSignature
from datatrove.utils.hashing import HashConfig

docs = list(load.run0("filtered"))
a, b = docs[410]["text"], docs[1529]["text"]          # two forums' vBulletin chrome
cfg = MinhashConfig(hash_config=HashConfig(precision=64))  # FineWeb: 5-grams, 14 bands x 8 rows, seed 1
sig = MinhashDedupSignature(output_folder="/dev/null", config=cfg)

sa, sb = sig.get_shingles(a), sig.get_shingles(b)     # uint64 hashes of the word 5-grams
A, B = set(sa.ravel().tolist()), set(sb.ravel().tolist())
print(f"shingles {len(A)} and {len(B)}, shared {len(A & B)}, Jaccard {len(A & B) / len(A | B):.3f}")

ma = np.concatenate(sig.get_signature(sa))            # 112 minimums of (a*x + b) mod (2^61 - 1)
mb = np.concatenate(sig.get_signature(sb))
eq = ma == mb
print(f"equal minimums {eq.sum()} of 112, estimate {eq.mean():.3f}")
bands = eq.reshape(14, 8).all(axis=1)                 # LSH: all 8 rows equal in a band
print("bands where all 8 agree:", (np.nonzero(bands)[0] + 1).tolist(), "-> candidate:", bool(bands.any()))
s = len(A & B) / len(A | B)
print(f"P(candidate) at this similarity: {1 - (1 - s**8)**14:.3f}")
