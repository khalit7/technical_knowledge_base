"""Prepare the running example's data: TinyStories -> a 4096-token byte-level BPE -> uint16 token arrays.

Inputs (downloaded by the setup agent, pinned revision in README.md): $LA_SCRATCH/dl/tinystories/*.parquet
Outputs:
  $LA_SCRATCH/data/train.bin, val.bin   uint16 token ids, stories separated by <|endoftext|> (id 0)
  src/data/tokenizer.json               the fixed tokenizer (committed)
  src/data/running_sequence.json        the 256-token running sequence: text, ids, token strings (committed)
  src/data/data_stats.json              counts and hashes (committed)
Run: LA_SCRATCH=<scratch>/la RAYON_NUM_THREADS=4 nice -n 15 <venv>/bin/python src/data/prepare_data.py
"""
import hashlib, json, os, sys
import numpy as np
import pyarrow.parquet as pq
from tokenizers import Tokenizer, models, trainers, pre_tokenizers, decoders

HERE = os.path.dirname(os.path.abspath(__file__))
SCR = os.environ["LA_SCRATCH"]
DL = os.path.join(SCR, "dl", "tinystories")
OUT = os.path.join(SCR, "data")
VOCAB = 4096
EOT = "<|endoftext|>"
TRAIN_FILE = "train-00000-of-00004-2d5a1467fff1081b.parquet"
VAL_FILE = "validation-00000-of-00001-869c898b519ad725.parquet"
RUNNING_STORY_INDEX = 1  # validation story 1 (Roxy the rhinoceros and the icy hill): names and phrases repeat, good for attention and induction demos


def stories(fn):
    return [s.strip() for s in pq.read_table(os.path.join(DL, fn)).column("text").to_pylist() if s and s.strip()]


def main():
    os.makedirs(OUT, exist_ok=True)
    train, val = stories(TRAIN_FILE), stories(VAL_FILE)
    print("stories", len(train), len(val))

    tok_path = os.path.join(HERE, "tokenizer.json")
    if os.path.exists(tok_path):
        tok = Tokenizer.from_file(tok_path)
    else:
        tok = Tokenizer(models.BPE())
        tok.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
        tok.decoder = decoders.ByteLevel()
        tr = trainers.BpeTrainer(vocab_size=VOCAB, special_tokens=[EOT], min_frequency=2,
                                 initial_alphabet=pre_tokenizers.ByteLevel.alphabet(), show_progress=False)
        tok.train_from_iterator(train, trainer=tr)  # trained on the train shard only, never on validation
        tok.save(tok_path)
    eot = tok.token_to_id(EOT)
    assert eot == 0 and tok.get_vocab_size() == VOCAB

    stats = {"tokenizer": {"type": "byte-level BPE", "vocab_size": VOCAB, "eot_id": eot,
                           "sha256": hashlib.sha256(open(tok_path, "rb").read()).hexdigest()}}
    for name, ss in (("train", train), ("val", val)):
        enc = tok.encode_batch(ss)
        n = sum(len(e.ids) + 1 for e in enc)
        arr = np.empty(n, dtype=np.uint16); i = 0
        for e in enc:
            arr[i] = eot; arr[i + 1:i + 1 + len(e.ids)] = e.ids; i += 1 + len(e.ids)
        arr.tofile(os.path.join(OUT, f"{name}.bin"))
        stats[name] = {"stories": len(ss), "tokens": int(n), "chars": int(sum(map(len, ss))),
                       "chars_per_token": round(sum(map(len, ss)) / (n - len(ss)), 3),
                       "sha256": hashlib.sha256(arr.tobytes()).hexdigest()}
        print(name, stats[name])

    s = val[RUNNING_STORY_INDEX]
    ids = [eot] + tok.encode(s).ids
    assert len(ids) >= 256, len(ids)
    ids = ids[:256]
    run = {"source": f"TinyStories validation split, story index {RUNNING_STORY_INDEX}, first 256 tokens incl. a leading <|endoftext|>",
           "ids": ids, "tokens": [tok.id_to_token(i) for i in ids],
           "pieces": [tok.decode([i]) for i in ids], "text": tok.decode(ids[1:])}
    json.dump(run, open(os.path.join(HERE, "running_sequence.json"), "w"), indent=0)
    stats["running_sequence"] = {"n_tokens": 256, "story_index": RUNNING_STORY_INDEX}
    json.dump(stats, open(os.path.join(HERE, "data_stats.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
