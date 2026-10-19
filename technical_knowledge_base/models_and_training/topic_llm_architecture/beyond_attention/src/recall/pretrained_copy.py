"""Copying and phone-book lookup: Pythia-160M (attention) against Mamba-130M (Mamba-1, no attention).

Both were trained by their authors on the same data (the Pile, 300B tokens) with the same GPT-NeoX tokenizer, which
makes them the closest public pair for "same data, different sequence mixer" at this size (the Mamba paper compares
them in its Table 3). Two probes, in the spirit of Jelassi et al. 2024 (arXiv 2402.01032), on fixed seeded inputs:

1. copy: L random common words, a blank line, then the same L words again. Accuracy = share of tokens of the second
   copy (after its first token) that the model predicts exactly (argmax, teacher forcing). L = 8 ... 1000 words.
2. phonebook: N lines "First Last: ddd-dddd", then two example lookups from the book and a query name; the answer
   is generated greedily (12 tokens) and must contain the right number. N = 5 ... 200 entries.

Run on CPU (4 threads): <venv>/bin/python src/recall/pretrained_copy.py  -> out/pretrained_copy.json
"""
import json, os, random, re, time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = [("EleutherAI/pythia-160m", "50f5173d932e8e61f858120bcb800b97af589f46"),
          ("state-spaces/mamba-130m-hf", "1e76775f628fbf1350fbe4dbb3d971ba64af25a1")]
COPY_L = [8, 16, 32, 64, 128, 256, 512, 1000]
BOOK_N = [5, 10, 20, 40, 80, 120, 200]
N_COPY, N_BOOK = 12, 20
FIRST = ("James Mary Robert Linda Michael Susan William Karen David Nancy Richard Lisa Joseph Betty Thomas Sandra "
         "Charles Ashley Daniel Donna Matthew Emily Anthony Carol Mark Michelle Paul Amanda Steven Melissa Andrew "
         "Laura Kevin Rebecca Brian Sharon George Cynthia Edward Kathleen").split()
LAST = ("Smith Johnson Brown Jones Garcia Miller Davis Wilson Moore Taylor Anderson Thomas Jackson White Harris "
        "Martin Thompson Young Allen King Wright Scott Green Baker Adams Nelson Hill Campbell Mitchell Roberts "
        "Carter Phillips Evans Turner Parker Collins Edwards Stewart Morris Murphy").split()


def word_list(tok):
    """Common lowercase words that are one token with a leading space in the GPT-NeoX vocabulary (low ids first)."""
    vocab = tok.get_vocab()
    words = sorted((i, t[1:]) for t, i in vocab.items() if re.fullmatch(r"Ġ[a-z]{3,9}", t))
    return [w for _, w in words[:3000]]


@torch.no_grad()
def copy_probe(m, tok, words):
    out = []
    for L in COPY_L:
        rng = random.Random(1000 + L); accs = []
        for _ in range(N_COPY):
            ws = [rng.choice(words) for _ in range(L)]
            text = " ".join(ws)
            a = tok(text).input_ids; b = tok("\n\n").input_ids
            ids = torch.tensor([a + b + a])
            lg = m(ids).logits[0]
            start = len(a) + len(b)                     # first token of the second copy
            pred = lg[start:-1].argmax(-1)              # predictions for tokens start+1 .. end
            accs.append((pred == ids[0, start + 1:]).float().mean().item())
        out.append({"words": L, "tokens_per_copy": len(a), "acc": round(sum(accs) / len(accs), 4),
                    "acc_each": [round(x, 3) for x in accs]})
        print("copy", L, out[-1]["acc"], flush=True)
    return out


@torch.no_grad()
def book_probe(m, tok):
    out = []
    for N in BOOK_N:
        rng = random.Random(2000 + N); right = 0; toks = 0; fails = []
        for q in range(N_BOOK):
            names = rng.sample([(f, l) for f in FIRST for l in LAST], N)
            nums = [f"{rng.randint(200, 999)}-{rng.randint(0, 9999):04d}" for _ in range(N)]
            book = "\n".join(f"{f} {l}: {n}" for (f, l), n in zip(names, nums))
            i1, i2, iq = rng.sample(range(N), 3) if N >= 3 else (0, 1, 2)
            ex = lambda i: f"{names[i][0]} {names[i][1]}: {nums[i]}"
            prompt = book + "\n\nLookup:\n" + ex(i1) + "\n" + ex(i2) + "\n" + f"{names[iq][0]} {names[iq][1]}:"
            ids = tok(prompt, return_tensors="pt").input_ids; toks = ids.shape[1]
            g = m.generate(ids, max_new_tokens=8, do_sample=False, pad_token_id=tok.eos_token_id)
            ans = tok.decode(g[0, ids.shape[1]:])
            ok = nums[iq] in ans.split("\n")[0]
            right += ok
            if not ok and len(fails) < 3:
                fails.append({"query": f"{names[iq][0]} {names[iq][1]}", "want": nums[iq], "got": ans.split("\n")[0].strip()})
        out.append({"entries": N, "prompt_tokens": toks, "acc": round(right / N_BOOK, 4), "n": N_BOOK, "fails": fails})
        print("book", N, out[-1]["acc"], toks, flush=True)
    return out


def main():
    torch.set_num_threads(4); torch.manual_seed(0)
    res = {"date": "2026-10-19", "device": "cpu (4 threads)", "torch": torch.__version__, "models": []}
    import transformers; res["transformers"] = transformers.__version__
    for name, rev in MODELS:
        t0 = time.time()
        tok = AutoTokenizer.from_pretrained(name, revision=rev)
        m = AutoModelForCausalLM.from_pretrained(name, revision=rev, dtype=torch.float32).eval()
        words = word_list(tok)
        with torch.no_grad():                               # rough timing of one 1,000-token forward (shared machine)
            x = torch.randint(1000, 20000, (1, 1000)); m(x); t1 = time.time(); m(x); fwd = time.time() - t1
        r = {"forward_1000_tokens_s": round(fwd, 2), "name": name, "revision": rev, "params": sum(p.numel() for p in m.parameters()),
             "copy": copy_probe(m, tok, words), "phonebook": book_probe(m, tok)}
        r["sec"] = round(time.time() - t0, 1); res["models"].append(r)
        del m
    res["word_list_head"] = words[:20]
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    json.dump(res, open(os.path.join(HERE, "out", "pretrained_copy.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
