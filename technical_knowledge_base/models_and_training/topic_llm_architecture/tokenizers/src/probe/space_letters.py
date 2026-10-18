"""Two tokenizer failures shown with real model outputs (CPU, inference_mode, greedy):
1. A prompt that ends in a space: next-token distributions with and without it, for SmolLM2-135M and for the running
   example's tiny GPT (ref_baseline_s1500).
2. Letters inside tokens: Qwen3-0.6B (thinking off) counting a letter in 24 words, written normally and spelled out
   with spaces, plus a reversal.
Run: LA_SCRATCH=<scratch>/la HF_HUB_OFFLINE=1 OMP_NUM_THREADS=4 nice -n 15 <venv>/bin/python space_letters.py
-> ../out/space_letters.json
"""
import json, os, sys, time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data")); sys.path.insert(0, DATA)
from eval import load
from tokenizers import Tokenizer
torch.set_num_threads(4)
res = {"torch": torch.__version__, "device": "cpu"}

def top(p, dec, k=5):
    v, i = p.topk(k); return [[dec(int(j)), round(float(x), 4)] for x, j in zip(v, i)]

# 1a. SmolLM2-135M
REV = "93efa2f097d58c2a74874c7e644dbc9b0cee75a2"
tk = AutoTokenizer.from_pretrained("HuggingFaceTB/SmolLM2-135M", revision=REV)
m = AutoModelForCausalLM.from_pretrained("HuggingFaceTB/SmolLM2-135M", revision=REV, dtype=torch.float32).eval()
rows = []
with torch.inference_mode():
    for base in ["The capital of France is", "Once upon a time, there was a"]:
        for s in (base, base + " "):
            enc = tk(s, return_tensors="pt", add_special_tokens=False)
            p = torch.softmax(m(**enc).logits[0, -1].float(), -1)
            g = m.generate(**enc, max_new_tokens=12, do_sample=False, pad_token_id=tk.eos_token_id)
            rows.append({"prompt": s, "pieces": [tk.decode([i]) for i in enc.input_ids[0]], "top5": top(p, lambda j: tk.decode([j])),
                         "greedy": tk.decode(g[0, enc.input_ids.shape[1]:])})
res["space_smollm2"] = {"model": "HuggingFaceTB/SmolLM2-135M", "revision": REV, "rows": rows}
del m
# 1b. tiny GPT, the running example
tok = Tokenizer.from_file(os.path.join(DATA, "tokenizer.json")); g = load("ref_baseline_s1500", "cpu")
rows = []
with torch.no_grad():
    for s in ("Once upon a time, there was a", "Once upon a time, there was a "):
        ids = [0] + tok.encode(s).ids; x = torch.tensor([ids])
        lg, *_ = g(x); p = torch.softmax(lg[0, -1].float(), -1)
        out = g.generate(x, 12)[0, len(ids):].tolist()
        rows.append({"prompt": s, "pieces": [tok.decode([i]) for i in ids[1:]], "top5": top(p, lambda j: tok.decode([j])),
                     "greedy": tok.decode(out)})
res["space_tiny"] = {"model": "tiny GPT ref_baseline_s1500", "rows": rows}
del g
# 2. letters, Qwen3-0.6B
REVQ = "c1899de289a04d12100db370d81485cdf75e47ca"
tq = AutoTokenizer.from_pretrained("Qwen/Qwen3-0.6B", revision=REVQ)
mq = AutoModelForCausalLM.from_pretrained("Qwen/Qwen3-0.6B", revision=REVQ, dtype=torch.float32).eval()
WORDS = [("strawberry", "r"), ("banana", "a"), ("mississippi", "s"), ("bookkeeper", "e"), ("committee", "t"), ("raspberry", "r"),
         ("tokenizer", "e"), ("parallel", "l"), ("assessment", "s"), ("onomatopoeia", "o"), ("necessary", "s"), ("millennium", "n"),
         ("occurrence", "c"), ("embarrassment", "r"), ("independence", "e"), ("cappuccino", "p"), ("coffee", "f"), ("balloon", "l"),
         ("address", "d"), ("success", "c"), ("referee", "e"), ("possession", "s"), ("hippopotamus", "p"), ("rhinoceros", "o")]
def ask(q, n=24):
    msgs = [{"role": "user", "content": q}]
    t = tq.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True, enable_thinking=False)
    enc = tq(t, return_tensors="pt", add_special_tokens=False)
    o = mq.generate(**enc, max_new_tokens=n, do_sample=False, pad_token_id=tq.eos_token_id)
    return tq.decode(o[0, enc.input_ids.shape[1]:], skip_special_tokens=True).strip()
import re
rows = []
with torch.inference_mode():
    for w, c in WORDS:
        truth = w.count(c); r = {"word": w, "letter": c, "truth": truth, "pieces": [tq.decode([i]) for i in tq(" " + w, add_special_tokens=False).input_ids]}
        for style, shown in (("word", w), ("spelled", " ".join(w))):
            a = ask(f"How many times does the letter \"{c}\" appear in \"{shown}\"? Answer with a number only.")
            nums = re.findall(r"\d+", a); r["ans_" + style] = a; r[style + "_ok"] = bool(nums) and int(nums[0]) == truth
        rows.append(r)
    rev = {w: ask(f"Write the word \"{w}\" backwards, letter by letter reversed. Answer with the reversed word only.") for w in ("strawberry", "tokenizer", "rhinoceros")}
res["letters"] = {"model": "Qwen/Qwen3-0.6B", "revision": REVQ, "thinking": False, "rows": rows,
                  "acc_word": sum(r["word_ok"] for r in rows) / len(rows), "acc_spelled": sum(r["spelled_ok"] for r in rows) / len(rows),
                  "reverse": rev}
json.dump(res, open(os.path.join(HERE, "..", "out", "space_letters.json"), "w"), indent=1, ensure_ascii=False)
for k in ("space_smollm2", "space_tiny"):
    for r in res[k]["rows"]: print(repr(r["prompt"]), r["pieces"][-3:], r["top5"][:3], repr(r["greedy"]))
print("acc word", res["letters"]["acc_word"], "spelled", res["letters"]["acc_spelled"])
for r in rows[:8]: print(r["word"], r["letter"], r["truth"], r["pieces"], "|", r["ans_word"], "|", r["ans_spelled"])
print(rev)
