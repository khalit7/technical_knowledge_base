"""Locate every source excerpt the page quotes by pattern, so file and line numbers are checked, not typed.
Sources: huggingface/tokenizers tag v0.23.3 (commit 301277072263fb3830eb66eec7e47adadf76f1dc, shallow clone in scratch),
transformers 5.20.1 (installed wheel), the root's src/data/tiny_gpt.py.
Run: TK_SRC=<scratch>/la/src/tokenizers TF_SRC=<venv site-packages>/transformers python3 quotes.py -> ../out/quotes.json
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOTDATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data"))
TK, TF = os.environ["TK_SRC"], os.environ["TF_SRC"]
Q = [  # key, base, display prefix, relative path, start pattern, number of lines
    ("bpe_order", TK, "tokenizers v0.23.3: ", "tokenizers/src/models/bpe/trainer.rs", "impl Ord for Merge {", 10),
    ("bpe_loop", TK, "tokenizers v0.23.3: ", "tokenizers/src/models/bpe/trainer.rs", "// Stop as soon as we have a big enough vocabulary", 18),
    ("bpe_apply", TK, "tokenizers v0.23.3: ", "tokenizers/src/models/bpe/word.rs", "pub(super) fn merge_all(", 19),
    ("byte_regex", TK, "tokenizers v0.23.3: ", "tokenizers/src/pre_tokenizers/byte_level.rs", "static RE: LazyLock<SysRegex>", 3),
    ("pad_vocab", TF, "transformers 5.20.1: ", "modeling_utils.py", "pad_to_multiple_of (`int`, *optional*):", 7),
    ("tie", ROOTDATA, "Topic: llm-architecture src/data/", "tiny_gpt.py", "self.wte = nn.Embedding(cfg.vocab_size, cfg.d_model)", 12),
]
out = {}
for key, base, disp, rel, pat, n in Q:
    lines = open(os.path.join(base, rel), encoding="utf-8").read().split("\n")
    hits = [i for i, l in enumerate(lines) if pat in l]
    if key == "pad_vocab":  # the docstring appears twice; take the one inside resize_token_embeddings
        d = [i for i, l in enumerate(lines) if "def resize_token_embeddings(" in l]; assert len(d) == 1
        hits = [h for h in hits if d[0] < h < d[0] + 30]
    assert len(hits) == 1, (key, len(hits))
    i = hits[0]
    out[key] = {"file": disp + rel, "line": i + 1, "last": i + n, "text": "\n".join(lines[i:i + n])}
    print(key, out[key]["file"], out[key]["line"], "-", out[key]["last"])
json.dump(out, open(os.path.join(HERE, "..", "out", "quotes.json"), "w"), indent=1)
