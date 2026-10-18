"""Tokenization and arithmetic: the same addition problems written plain and with thousands commas.

OLMo-2-0425-1B's tokenizer cuts digit runs into groups of 1 to 3 from the LEFT (\\p{N}{1,3}), so in "1234567"
the chunks are 123|456|7 and do not line up with place value; commas force groups of 3 from the RIGHT (1|234|567),
as Singh and Strouse (2024, arXiv 2402.14903) did for GPT-3.5 and GPT-4. Qwen3-1.7B splits every digit, so the
format should matter little there (control).
CPU only, 4 threads, nice 15, inference_mode, greedy. Writes ../out/arith_<model>.json.
Run: OMP_NUM_THREADS=4 nice -n 15 <venv>/bin/python arith.py olmo|qwen [n]
"""
import json, os, random, sys, time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

torch.set_num_threads(4)
MODELS = {"olmo": ("allenai/OLMo-2-0425-1B", "a1847dff35000b4271fa70afc5db10fd29fedbdf"),
          "qwen": ("Qwen/Qwen3-1.7B", "70d244cc86ccca08cf5af4e1e306ecf908b1ad5e")}
key = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 100
repo, rev = MODELS[key]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out")
os.makedirs(OUT, exist_ok=True)

rng = random.Random(0)
DIG = [int(x) for x in os.environ.get("DIG", "4,5").split(",")]
def num(d): return rng.randrange(10 ** (d - 1), 10 ** d)
def fmt(x, style): return f"{x:,}" if style == "comma" else str(x)
SHOTS = [(num(rng.choice(DIG)), num(rng.choice(DIG))) for _ in range(8)]
PROBS = [(num(rng.choice(DIG)), num(rng.choice(DIG))) for _ in range(N)]

tok = AutoTokenizer.from_pretrained(repo, revision=rev)
model = AutoModelForCausalLM.from_pretrained(repo, revision=rev, dtype=torch.bfloat16)
model.eval()

def prompt(a, b, style):
    lines = [f"{fmt(x, style)} + {fmt(y, style)} = {fmt(x + y, style)}" for x, y in SHOTS]
    return "\n".join(lines) + f"\n{fmt(a, style)} + {fmt(b, style)} ="

res = {"model": repo, "revision": rev, "dtype": "bfloat16", "device": "cpu", "n": N, "shots": 8, "digits": DIG,
       "torch": torch.__version__, "styles": {}}
t0 = time.time()
with torch.inference_mode():
    for style in ("plain", "comma"):
        rows = []
        for i, (a, b) in enumerate(PROBS):
            p = prompt(a, b, style)
            enc = tok(p, return_tensors="pt", add_special_tokens=False)
            out = model.generate(**enc, max_new_tokens=16, do_sample=False, pad_token_id=tok.eos_token_id)
            gen = tok.decode(out[0, enc.input_ids.shape[1]:], skip_special_tokens=True).split("\n")[0].strip()
            want = fmt(a + b, style)
            ok = gen.replace(",", "") == str(a + b)
            q_ids = tok(f" {fmt(a, style)} + {fmt(b, style)} = {want}", add_special_tokens=False).input_ids
            rows.append({"a": a, "b": b, "want": want, "got": gen, "ok": ok,
                         "pieces": [tok.decode([t]) for t in q_ids]})
            if i % 20 == 0: print(style, i, round(time.time() - t0), "s", flush=True)
        acc = sum(r["ok"] for r in rows) / len(rows)
        res["styles"][style] = {"acc": acc, "rows": rows}
        print(style, "acc", acc, flush=True)
res["seconds"] = round(time.time() - t0)
json.dump(res, open(os.path.join(OUT, f"arith_{key}.json"), "w"), indent=1)
