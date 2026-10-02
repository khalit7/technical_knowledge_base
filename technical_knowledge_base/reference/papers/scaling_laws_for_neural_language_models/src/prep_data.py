"""Download WikiText-2 raw (Merity et al. 2016, CC BY-SA 3.0) from Hugging Face and write byte-level tokens.

  SL_DATA=/some/scratch/dir uv run --no-project --with pyarrow python prep_data.py

Tokens: printable ASCII 32..126 map to 1..95, newline to 0, anything else becomes '?' first (14k of 10.9M characters). Vocabulary 96.
The 11 MB of tokens stay outside the repository (SL_DATA)."""
import os, urllib.request
import numpy as np, pyarrow.parquet as pq
OUT = os.environ['SL_DATA']; os.makedirs(OUT, exist_ok=True)
U = 'https://huggingface.co/datasets/Salesforce/wikitext/resolve/main/wikitext-2-raw-v1/%s-00000-of-00001.parquet'
lut = np.full(256, 95, dtype=np.uint8); lut[10] = 0; lut[32:127] = np.arange(1, 96)
for split, name in (('train', 'train'), ('validation', 'valid')):
    p = os.path.join(OUT, split + '.parquet')
    if not os.path.exists(p): urllib.request.urlretrieve(U % split, p)
    s = ''.join(pq.read_table(p).column('text').to_pylist())
    b = np.frombuffer(s.encode('ascii', 'replace'), dtype=np.uint8)
    t = lut[b]; t.tofile(os.path.join(OUT, name + '.u8'))
    print(split, len(s), 'chars ->', len(t), 'tokens; share mapped to the catch-all: %.4f' % (t == 95).mean())
