"""Long inputs for SmolLM2-135M built from TinyStories validation stories (CDLA-Sharing-1.0), re-tokenised with
SmolLM2's tokenizer. Pass-key items: one 'secret number' sentence planted at a depth, question at the end.
Copy items: a target story planted at a depth, then repeated after the haystack (the model can copy it only if
the earlier copy is still in its cache). New-story items: the continuation is an unseen story (local modelling)."""
import os, random, torch
import pyarrow.parquet as pq

VAL = os.path.join(os.environ["LA_SCRATCH"], "dl/tinystories/validation-00000-of-00001-869c898b519ad725.parquet")
_cache = {}


def stories(tok, n=4000):
    if "s" not in _cache:
        txt = pq.read_table(VAL).column("text").to_pylist()[2:2 + n]   # skip stories 0-1 (1 is the running sequence)
        _cache["s"] = [tok(t.strip() + "\n\n", add_special_tokens=False)["input_ids"] for t in txt]
    return _cache["s"]


def haystack(tok, n_tokens, seed, exclude=()):
    st = stories(tok); rng = random.Random(seed); order = list(range(len(st))); rng.shuffle(order)
    out = []
    for i in order:
        if i in exclude:
            continue
        out.append(st[i])
        if sum(map(len, out)) >= n_tokens:
            break
    return out  # list of story token lists


def passkey(tok, length, depth, seed):
    rng = random.Random(1000 + seed)
    key = str(rng.randint(10000, 99999))
    needle = tok("The secret number is %s. Remember it.\n\n" % key, add_special_tokens=False)["input_ids"]
    q = tok("Question: What is the secret number?\nAnswer: The secret number is", add_special_tokens=False)["input_ids"]
    ans = tok(" " + key, add_special_tokens=False)["input_ids"]
    budget = length - len(needle) - len(q)
    hs = haystack(tok, budget, seed)
    flat = []
    for s in hs:
        flat += s
    flat = flat[:budget]
    # cut back to a story boundary near the requested depth
    bounds = [0]
    for s in hs:
        bounds.append(bounds[-1] + len(s))
    want = int(depth * budget)
    cut = min((b for b in bounds if b <= budget), key=lambda b: abs(b - want))
    ctx = flat[:cut] + needle + flat[cut:] + q
    a = next(i for i in range(cut, cut + len(needle)) if needle[i - cut:i - cut + len(ans)] == ans)
    return {"key_span": [a, a + len(ans)], "ctx": torch.tensor(ctx), "ans": torch.tensor(ans), "key": key,
            "needle_span": [cut, cut + len(needle)], "q_len": len(q), "depth_tokens": cut}


def copy_item(tok, length, depth, seed, n_cont=128):
    st = stories(tok); rng = random.Random(2000 + seed)
    tgt = rng.choice([i for i, s in enumerate(st) if len(s) >= n_cont + 20])
    hs = haystack(tok, length - len(st[tgt]), seed, exclude={tgt})
    flat = [t for s in hs for t in s][: length - len(st[tgt])]
    bounds = [0]
    for s in hs:
        bounds.append(bounds[-1] + len(s))
    want = int(depth * len(flat))
    cut = min((b for b in bounds if b <= len(flat)), key=lambda b: abs(b - want))
    ctx = flat[:cut] + st[tgt] + flat[cut:]
    return {"ctx": torch.tensor(ctx), "cont": torch.tensor(st[tgt][:n_cont]), "span": [cut, cut + len(st[tgt])]}


def new_item(tok, length, seed, n_cont=128):
    st = stories(tok); rng = random.Random(3000 + seed)
    tgt = rng.choice([i for i, s in enumerate(st) if len(s) >= n_cont + 20])
    hs = haystack(tok, length, seed, exclude={tgt})
    flat = [t for s in hs for t in s][:length]
    return {"ctx": torch.tensor(flat), "cont": torch.tensor(st[tgt][:n_cont])}
