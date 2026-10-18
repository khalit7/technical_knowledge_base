"""Inspect the running example's tokenizer (Topic: llm-architecture src/data/tokenizer.json): its merges, how the
running sequence is cut, and the same texts under real tokenizers. CPU, seconds. tokenizers 0.23.3.
Run: HF_HUB_OFFLINE=1 <venv>/bin/python inspect_bpe.py   -> ../out/bpe_inspect.json
"""
import json, os, re, hashlib
from collections import Counter
from tokenizers import Tokenizer
import tokenizers
from huggingface_hub import hf_hub_download

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data"))
OUT = os.path.join(HERE, "..", "out"); os.makedirs(OUT, exist_ok=True)
INP = os.path.join(HERE, "..", "inputs")

tpath = os.path.join(DATA, "tokenizer.json")
J = json.load(open(tpath)); tok = Tokenizer.from_file(tpath)
run = json.load(open(os.path.join(DATA, "running_sequence.json")))
vocab = J["model"]["vocab"]; inv = {v: k for k, v in vocab.items()}
merges = [m.split(" ") if isinstance(m, str) else m for m in J["model"]["merges"]]

# GPT-2 byte to unicode map, to show tokens as real text
def b2u():
    bs = list(range(33, 127)) + list(range(161, 173)) + list(range(174, 256)); cs = bs[:]; n = 0
    for b in range(256):
        if b not in bs: bs.append(b); cs.append(256 + n); n += 1
    return {chr(c): b for b, c in zip(bs, cs)}
U2B = b2u()
def txt(t): return bytes(U2B[c] for c in t).decode("utf-8", "replace") if t not in ("<|endoftext|>",) else t

res = {"tokenizers_version": tokenizers.__version__,
       "sha256": hashlib.sha256(open(tpath, "rb").read()).hexdigest(),
       "vocab_size": tok.get_vocab_size(), "n_merges": len(merges),
       "pre_tokenizer": J["pre_tokenizer"], "special": [a["content"] for a in J["added_tokens"]]}
# id layout: 0 special, 1..256 bytes, 257.. merges in order?
ids_of_merges = [vocab[a + b] for a, b in merges]
res["merge_ids_in_order"] = ids_of_merges == list(range(257, 257 + len(merges)))
res["first_merges"] = [{"rank": i + 1, "a": txt(a), "b": txt(b), "new": txt(a + b)} for i, (a, b) in enumerate(merges[:40])]
lens = Counter(len(txt(inv[i]).encode()) for i in range(1, len(inv)))
res["token_bytes_hist"] = dict(sorted(lens.items()))
longest = sorted(range(257, len(inv)), key=lambda i: -len(txt(inv[i]).encode()))[:15]
res["longest"] = [txt(inv[i]) for i in longest]
res["space_words"] = sum(1 for i in range(257, len(inv)) if re.fullmatch(r" [A-Za-z]+", txt(inv[i])))
# compact merges for the page: pairs of ids, new id = 257 + rank-1
res["merge_pairs"] = [[vocab[a], vocab[b]] for a, b in merges]
res["byte_of_id"] = {str(vocab[c]): U2B[c] for c in U2B if c in vocab}

# running sequence: re-encode its text, compare ids
text = run["text"]
enc = tok.encode(text)
res["running"] = {"text": text, "chars": len(text), "bytes": len(text.encode()), "words": len(text.split()),
                  "ids_match": [0] + enc.ids == run["ids"], "n_tokens": len(enc.ids),
                  "pieces": [txt(t) for t in enc.tokens]}
# words of the running text and their token counts (words = whitespace-led pieces)
word_tok = Counter(); word_n = {}
for w, n in zip(*[[], []]): pass
pre = tok.pre_tokenizer.pre_tokenize_str(text)
for w, _ in pre:
    k = len(tok.model.tokenize(w)); s = txt(w); word_tok[s] += 1; word_n[s] = k
res["running"]["shattered"] = sorted([[w, word_n[w], word_tok[w]] for w in word_n if word_n[w] >= 3], key=lambda x: (-x[1], x[0]))

# the same texts under real tokenizers (cached tokenizer.json files)
REAL = [("ours", None), ("gpt2", "openai-community/gpt2"), ("smollm2", "HuggingFaceTB/SmolLM2-135M"),
        ("llama3", "NousResearch/Meta-Llama-3-8B"), ("olmo2", "allenai/OLMo-2-0425-1B"), ("qwen3", "Qwen/Qwen3-0.6B"),
        ("gemma3", "unsloth/gemma-3-1b-it"), ("dsv3", "deepseek-ai/DeepSeek-V3")]
T = {}
for k, repo in REAL:
    T[k] = tok if repo is None else Tokenizer.from_file(hf_hub_download(repo, "tokenizer.json", local_files_only=True))
ex = json.load(open(os.path.join(INP, "examples.json")))
TEXTS = {"running": text, "code": ex["code"]["text"],
         "english": ex["langs"]["eng_Latn"]["text"], "french": ex["langs"]["fra_Latn"]["text"],
         "chinese": ex["langs"]["zho_Hans"]["text"], "hindi": ex["langs"]["hin_Deva"]["text"],
         "number": "In 2024 the shop sold 12345678 apples."}
cmp = {}
for name, s in TEXTS.items():
    row = {"text": s, "chars": len(s), "bytes": len(s.encode())}
    for k, t in T.items():
        e = t.encode(s, add_special_tokens=False)
        row[k] = len(e.ids)
        if name != "running": row[k + "_pieces"] = [t.decode([i]) for i in e.ids]
    cmp[name] = row
res["compare"] = cmp
res["real_vocab"] = {k: t.get_vocab_size(True) for k, t in T.items()}
json.dump(res, open(os.path.join(OUT, "bpe_inspect.json"), "w"), indent=0, ensure_ascii=False)
print("vocab", res["vocab_size"], "merges", res["n_merges"], "ids in order", res["merge_ids_in_order"])
print("first", [m["new"] for m in res["first_merges"][:20]])
print("running", res["running"]["n_tokens"], "match", res["running"]["ids_match"], "chars/tok", round(len(text) / len(enc.ids), 3))
print("shattered", res["running"]["shattered"][:15])
print("longest", res["longest"]); print("bytes hist", res["token_bytes_hist"])
for n, r in cmp.items(): print(n, r["chars"], {k: r[k] for k in T})
