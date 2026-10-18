"""Letters inside tokens: Qwen3-1.7B counts a letter in 24 words, with the word written normally and spelled out with
spaces. Few-shot completion (no chat template), greedy, 4 new tokens, first integer parsed. CPU, bf16, inference_mode.
(space_letters.py first asked the 0.6B chat model for "a number only"; it ignored the format and wrote explanations that
24 new tokens cut off, so that part is kept in out/space_letters.json only as a record and superseded by this script.)
Run: HF_HUB_OFFLINE=1 OMP_NUM_THREADS=4 nice -n 15 <venv>/bin/python letters.py -> ../out/letters.json
"""
import json, os, re, torch
from transformers import AutoModelForCausalLM, AutoTokenizer
torch.set_num_threads(4)
HERE = os.path.dirname(os.path.abspath(__file__))
REPO, REV = "Qwen/Qwen3-1.7B", "70d244cc86ccca08cf5af4e1e306ecf908b1ad5e"
tq = AutoTokenizer.from_pretrained(REPO, revision=REV); m = AutoModelForCausalLM.from_pretrained(REPO, revision=REV, dtype=torch.bfloat16).eval()
WORDS = [("strawberry", "r"), ("banana", "a"), ("mississippi", "s"), ("bookkeeper", "e"), ("committee", "t"), ("raspberry", "r"),
         ("tokenizer", "e"), ("parallel", "l"), ("assessment", "s"), ("onomatopoeia", "o"), ("necessary", "s"), ("millennium", "n"),
         ("occurrence", "c"), ("embarrassment", "r"), ("independence", "e"), ("cappuccino", "p"), ("coffee", "f"), ("balloon", "l"),
         ("address", "d"), ("success", "c"), ("referee", "e"), ("possession", "s"), ("hippopotamus", "p"), ("rhinoceros", "o")]
SHOTS = [("apple", "p"), ("letter", "t"), ("seventeen", "e")]
def prompt(w, c, spell):
    f = (lambda x: " ".join(x)) if spell else (lambda x: x)
    lines = [f'Q: How many times does the letter "{sc}" appear in "{f(sw)}"?\nA: {sw.count(sc)}' for sw, sc in SHOTS]
    return "\n\n".join(lines) + f'\n\nQ: How many times does the letter "{c}" appear in "{f(w)}"?\nA:'
rows = []
with torch.inference_mode():
    for w, c in WORDS:
        r = {"word": w, "letter": c, "truth": w.count(c), "pieces": [tq.decode([i]) for i in tq(" " + w, add_special_tokens=False).input_ids]}
        for style, sp in (("word", False), ("spelled", True)):
            enc = tq(prompt(w, c, sp), return_tensors="pt", add_special_tokens=False)
            o = m.generate(**enc, max_new_tokens=4, do_sample=False, pad_token_id=tq.eos_token_id)
            a = tq.decode(o[0, enc.input_ids.shape[1]:], skip_special_tokens=True).strip().split("\n")[0]
            n = re.findall(r"\d+", a); r["ans_" + style] = a; r[style + "_ok"] = bool(n) and int(n[0]) == r["truth"]
        rows.append(r); print(w, r["truth"], r["ans_word"], r["ans_spelled"], flush=True)
res = {"model": REPO, "revision": REV, "dtype": "bfloat16", "device": "cpu", "shots": SHOTS, "rows": rows, "example_prompt": prompt("strawberry", "r", False),
       "acc_word": sum(r["word_ok"] for r in rows) / len(rows), "acc_spelled": sum(r["spelled_ok"] for r in rows) / len(rows)}
json.dump(res, open(os.path.join(HERE, "..", "out", "letters.json"), "w"), indent=1)
print("acc word", res["acc_word"], "spelled", res["acc_spelled"])
