"""Build the reference sets (positives) and the negatives for the fastText classifiers trained on this page.

Follows DCLM Appendix J (arXiv 2406.11794v3) as closely as the public data allows; departures are listed in
../README.md. Every set is written as one document per line, lines joined with a space (the DCLM / Dolma form).
Output: $DC_SCRATCH/qc/ref/<name>.txt (one text per line, no label) and ../data/out/refsets.json (counts, sources).

  oh      OpenHermes 2.5 (teknium/OpenHermes-2.5 @ b8203782): conversation turns joined in order (DCLM: "we do not
          further pre-process"; the serialisation is ours, see README)
  eli5    sentence-transformers/eli5 @ 6e3b20a7 (question + top answer pairs); DCLM filtered raw Reddit pages by vote
          scores, which this mirror does not carry
  wiki    wikimedia/wikipedia 20231101.en shard 0 @ b04c8d1c, "See also" / "References" section titles removed (as DCLM)
  owt2    OpenWebText (Skylion007/openwebtext @ 79d93d78, parquet shard 0 of 80, CC0): the 2019 open reproduction of
          WebText. DCLM used OpenWebText2 from the Pile, which pile-uncopyrighted no longer carries (checked: no
          OpenWebText2 rows in its first 1.5 GB), so OWT1 stands in for it
  books   Project Gutenberg (PG-19) rows from the head of pile-uncopyrighted train/00 @ 3be90335, cut into chunks of at most 1,500 words (DCLM: 2,048 tokens;
          RedPajama books also held Books3, which is not distributable)
  rw      negatives: falcon-refinedweb train-00000 and -00001 @ c7358405 (DCLM used its own RefinedWeb reproduction)
  cc_raw  negatives for the GPT-3-style classifier: two CC-MAIN-2024-30 WET files from other segments, English by lid.176
"""
import json
import os
import random
import re
import sys

import numpy as np
import pandas as pd

import qc_common as C

REF = C.sdir("ref", "x")[:-1]
os.makedirs(REF, exist_ok=True)
CAP = 200_000
rng = random.Random(0)
info = {}


def clean(t):
    return C.one_line(t).replace("\x00", " ").strip()


def write(name, texts, src):
    texts = [t for t in (clean(x) for x in texts) if len(t.split()) >= 10]
    with open(os.path.join(REF, name + ".txt"), "w") as f:
        for t in texts:
            f.write(t + "\n")
    w = [len(t.split()) for t in texts]
    info[name] = {"docs": len(texts), "median_words": int(np.median(w)), "source": src}
    print(name, info[name], flush=True)


PARTS = sys.argv[1:] or ["oh", "eli5", "wiki", "owt2", "books", "rw", "cc_raw"]
if os.path.exists(os.path.join(C.OUT, "refsets.json")):
    info.update(json.load(open(os.path.join(C.OUT, "refsets.json"))))


def shuffled(x, seed=0):
    x = list(x)
    random.Random(seed).shuffle(x)
    return x


if "oh" in PARTS:
    def stream(path):  # the file is one JSON array of ~1M conversations; decode it object by object (low memory)
        dec = json.JSONDecoder()
        buf, pos = "", 0
        with open(path) as f:
            first = True
            while True:
                chunk = f.read(1 << 22)
                if not chunk and pos >= len(buf):
                    return
                buf = buf[pos:] + chunk
                pos = 0
                if first:
                    pos = buf.index("[") + 1
                    first = False
                while True:
                    while pos < len(buf) and buf[pos] in " ,\n\r\t":
                        pos += 1
                    if pos >= len(buf) or buf[pos] == "]":
                        break
                    try:
                        obj, end = dec.raw_decode(buf, pos)
                    except json.JSONDecodeError:
                        break  # object continues in the next chunk
                    yield obj
                    pos = end
                if not chunk:
                    return
    P = C.ddir("oh25", "openhermes2_5.json")
    n = sum(1 for _ in stream(P))
    pick = set(shuffled(range(n))[:CAP // 2])
    oh = [r for i, r in enumerate(stream(P)) if i in pick]
    info["oh_total_rows"] = n
    write("oh", ["\n".join(t["value"] for t in r["conversations"]) for r in oh],
          "teknium/OpenHermes-2.5 openhermes2_5.json, 100,000 random conversations (seed 0), turns joined in order")
    del oh
if "eli5" in PARTS:
    e = pd.read_parquet(C.ddir("eli5", "pair", "train-00000-of-00001.parquet"))
    e = e.iloc[shuffled(range(len(e)))[:CAP // 2]]
    write("eli5", (e.question + "\n" + e.answer).tolist(), "sentence-transformers/eli5 pair, 100,000 random rows (seed 0), question then answer")
if "wiki" in PARTS:
    w = pd.read_parquet(C.ddir("wiki", "20231101.en", "train-00000-of-00041.parquet"), columns=["text"])
    SEC = re.compile(r"^(See also|References|External links|Further reading|Notes)\s*$", re.M)
    write("wiki", shuffled(SEC.sub("", t) for t in w.text.tolist())[:CAP],
          "wikimedia/wikipedia 20231101.en shard 0, random articles (seed 0), section titles See also / References / External links / Further reading / Notes removed")
if "owt2" in PARTS:
    o = pd.read_parquet(C.ddir("owt", "plain_text", "train-00000-of-00080.parquet"), columns=["text"])
    write("owt2", shuffled(o.text.tolist())[:CAP], "Skylion007/openwebtext parquet shard 0 of 80, random rows (seed 0); stands in for OpenWebText2")
if "books" in PARTS:
    chunks = []
    for l in open(C.ddir("pile_pg19.jsonl")):
        words = json.loads(l)["text"].split()
        for i in range(0, len(words), 1500):
            if len(words[i:i + 1500]) >= 200:
                chunks.append(" ".join(words[i:i + 1500]))
    write("books", shuffled(chunks)[:CAP], "Gutenberg (PG-19) rows in the first 1.5 GB of pile-uncopyrighted train/00 (290 books), cut into chunks of at most 1,500 words")
if "rw" in PARTS:
    rw = []
    for fn in sorted(os.listdir(C.ddir("refinedweb", "data"))):
        if fn.endswith(".parquet"):
            rw += pd.read_parquet(C.ddir("refinedweb", "data", fn), columns=["content"]).content.tolist()
    write("rw", shuffled(rw)[:CAP + 20_000], "tiiuae/falcon-refinedweb train-00000 and train-00001, random rows (seed 0); rows after the first 200,000 are a held-out pool for thresholds")
    del rw
if "cc_raw" in PARTS:
    import fasttext
    from warcio.archiveiterator import ArchiveIterator
    fasttext.FastText.eprint = lambda *a, **k: None
    lid = fasttext.load_model(C.L.model_path("lid176"))
    raw = []
    for fn in sorted(os.listdir(C.ddir("wet"))):
        if not fn.endswith(".gz"):
            continue
        with open(C.ddir("wet", fn), "rb") as f:
            for r in ArchiveIterator(f):
                if r.rec_type != "conversion":
                    continue
                t = r.content_stream().read().decode("utf-8", "replace")
                labs, ps = lid.predict(clean(t)[:5000], k=1)
                if labs[0] == "__label__en" and ps[0] > 0.65:
                    raw.append(t)
    write("cc_raw", raw, "two CC-MAIN-2024-30 WET files from other segments (00899 of 1720763514900.59, 00399 of 1720763517878.80), English by lid.176 > 0.65, no other filter")
C.dump("refsets.json", info)
