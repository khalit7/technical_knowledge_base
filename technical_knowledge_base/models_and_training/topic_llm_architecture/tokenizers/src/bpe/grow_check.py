"""Reference for the Grow tab: the running text encoded by the real library with only the first k merges.
Run: <venv>/bin/python grow_check.py -> ../out/grow_check.json (checked against the page's JS by check_grow.mjs)
"""
import json, os
from tokenizers import Tokenizer, models, pre_tokenizers, decoders
HERE = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data"))
J = json.load(open(os.path.join(DATA, "tokenizer.json"))); text = json.load(open(os.path.join(DATA, "running_sequence.json")))["text"]
vocab = J["model"]["vocab"]; merges = [tuple(m.split(" ")) if isinstance(m, str) else tuple(m) for m in J["model"]["merges"]]
EXTRA = "The capital of France is 12345678, said Roxy's friend Billy: \"Wow!\"\n  def f(x): return x"
out = {}
for k in [0, 1, 2, 7, 10, 50, 100, 255, 767, 1000, 1791, 2500, 3839]:
    v = {t: i for t, i in vocab.items() if i < 257 + k}
    t = Tokenizer(models.BPE(vocab=v, merges=merges[:k])); t.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False); t.decoder = decoders.ByteLevel()
    out[k] = {"run": t.encode(text).ids, "extra": t.encode(EXTRA).ids}
assert out[3839]["run"] == Tokenizer.from_file(os.path.join(DATA, "tokenizer.json")).encode(text).ids
json.dump({"extra": EXTRA, "k": out}, open(os.path.join(HERE, "..", "out", "grow_check.json"), "w"))
print({k: len(v["run"]) for k, v in out.items()})
