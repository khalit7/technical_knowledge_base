"""KV cache eviction on a real model: does a clever importance score beat a uniformly random choice, and how much
of the saving could a paged engine actually realise?

Model: Qwen/Qwen3-0.6B (safetensors, BF16 weights loaded as float32), PyTorch on CPU, eager attention (so the
attention weights can be read), greedy decoding. Protocol, the same for every policy and keep ratio r:
  1. prefill the prompt except its final token with the full cache (this is what eviction methods do: the full cache
     exists before anything is evicted);
  2. keep a fraction r of the "compressible" positions (Task A: the context before the question; Task B: the context
     before its last 32 tokens), always keep the rest (the question, or the last 32 tokens: the observation window);
  3. continue with the compressed cache: Task A feeds the final prompt token and decodes the answer; Task B scores the
     next 128 tokens of the text (mean negative log-likelihood, perplexity).
Policies:
  full         nothing evicted (r = 1)
  random_nosink  a uniformly random subset of all compressible positions, the same for every layer and head
               (seeds 0, 1, 2): it may drop the first tokens, which act as attention sinks (StreamingLLM)
  random       the first 4 tokens (attention sinks) plus a uniformly random subset of the rest, the same for every
               layer and head (seeds 0, 1, 2): the cheap control done right
  random_head  the first 4 tokens plus a different uniformly random subset for every layer and KV head (Random
               Attention's rule keeps the prompt and draws "uniformly at random within each attention head")
  recent       4 attention-sink tokens plus the most recent positions (StreamingLLM's rule), same everywhere
  snapkv       per layer and KV head: attention from the observation window to each position, summed over the window
               and the query heads sharing that KV head, max-pooled over 7 neighbouring positions, top-k
               (SnapKV's idea; kernel and pooling are this page's choice)
  snapkv_all   the SnapKV score summed over all layers and heads: one selection used everywhere
  h2o          per layer and KV head: attention summed over every prefilled query (H2O's "heavy hitters")
Selections that differ per head or per layer ("snapkv", "h2o") cannot shrink a paged cache, whose blocks hold every
head of every layer for 16 tokens: we count how many 16-token blocks become entirely unused (freeable) for each.
usage: python kvc.py taskA|taskB <n_examples> <out.json>
"""
import json, math, os, random, sys, time
import torch
import torch.nn.functional as F
from transformers import AutoModelForCausalLM, AutoTokenizer

torch.set_num_threads(int(os.environ.get("KVC_THREADS", "2")))
MODEL = os.environ["KVC_MODEL"]
RATIOS = [0.5, 0.25, 0.1]
POLICIES = ["random_nosink", "random", "random_head", "recent", "snapkv", "snapkv_all", "h2o"]
SINK = 4
SEEDS = [0, 1, 2]
BS = 16

NOUNS = ("apple river stone candle garden mirror pencil rocket blanket violin harbor meadow lantern castle "
         "pepper island saddle feather tunnel compass marble dragon helmet orchard parrot quartz ribbon "
         "spider timber velvet wagon yacht zebra anchor basket cactus dolphin engine falcon glacier hammer "
         "igloo jacket kettle ladder magnet needle oyster pillow quiver radar sapphire tiger umbrella valley "
         "walnut xylophone yogurt zipper beacon cobalt desert ember fossil goblet hazel iris jasmine kiwi "
         "lemon mango nectar olive peach quince raven salmon tulip urchin viper willow").split()


def load():
    tok = AutoTokenizer.from_pretrained(MODEL)
    m = AutoModelForCausalLM.from_pretrained(MODEL, torch_dtype=torch.float32, attn_implementation="eager")
    m.eval()
    return tok, m


def task_a_examples(n, n_pairs=60, seed=7):
    r = random.Random(seed)
    out = []
    for e in range(n):
        keys = r.sample(NOUNS, n_pairs)
        vals = [str(r.randint(1000, 9999)) for _ in keys]
        ctx = "".join("The secret code of the %s is %s.\n" % (k, v) for k, v in zip(keys, vals))
        qi = r.randrange(n_pairs)
        q = "\nQuestion: what is the secret code of the %s?\nAnswer: The secret code of the %s is" % (keys[qi], keys[qi])
        before = "".join("The secret code of the %s is %s.\n" % (k, v) for k, v in list(zip(keys, vals))[:qi])
        upto = before + "The secret code of the %s is %s.\n" % (keys[qi], vals[qi])
        out.append({"ctx": ctx, "q": q, "ans": vals[qi], "pos": qi, "before": before, "upto": upto})
    return out


def prefill(m, ids):
    with torch.no_grad():
        o = m(input_ids=ids, use_cache=True, output_attentions=True)
    return o.past_key_values, o.attentions  # attentions: per layer [1, n_heads, T, T]


def scores(att, window, comp, n_kv):
    """Per layer and KV head: SnapKV score (window rows) and H2O score (all rows), over the compressible columns."""
    snap, h2o = [], []
    for a in att:
        a = a[0]  # [heads, T, T]
        H = a.shape[0]
        g = H // n_kv
        s_w = a[:, window, :][:, :, comp].sum(1)  # [heads, C]
        s_a = a[:, :, comp].sum(1)
        s_w = s_w.view(n_kv, g, -1).sum(1)
        s_a = s_a.view(n_kv, g, -1).sum(1)
        s_w = F.max_pool1d(s_w.unsqueeze(0), kernel_size=7, stride=1, padding=3)[0]
        snap.append(s_w)
        h2o.append(s_a)
    return torch.stack(snap), torch.stack(h2o)  # [L, n_kv, C]


def select(policy, C, k, snap, h2o, seed):
    """Returns kept compressible indices: a LongTensor [L, n_kv, k] (same rows when the policy is uniform)."""
    L, G = snap.shape[0], snap.shape[1]
    if policy == "random_nosink":
        g = torch.Generator().manual_seed(1000 + seed)
        idx = torch.randperm(C, generator=g)[:k].sort().values
        return idx.expand(L, G, k).clone()
    if policy == "random":
        g = torch.Generator().manual_seed(3000 + seed)
        idx = torch.cat([torch.arange(SINK), SINK + torch.randperm(C - SINK, generator=g)[:k - SINK]]).sort().values
        return idx.expand(L, G, k).clone()
    if policy == "random_head":
        g = torch.Generator().manual_seed(2000 + seed)
        return torch.stack([torch.stack([torch.cat([torch.arange(SINK), SINK + torch.randperm(C - SINK, generator=g)[:k - SINK]]).sort().values
                                         for _ in range(G)]) for _ in range(L)])
    if policy == "recent":
        sink = min(4, k)
        idx = torch.cat([torch.arange(sink), torch.arange(C - (k - sink), C)]) if k > sink else torch.arange(sink)
        return idx.sort().values.expand(L, G, k).clone()
    if policy == "snapkv":
        return snap.topk(k, dim=-1).indices.sort(-1).values
    if policy == "snapkv_all":
        idx = snap.sum((0, 1)).topk(k).indices.sort().values
        return idx.expand(L, G, k).clone()
    if policy == "h2o":
        return h2o.topk(k, dim=-1).indices.sort(-1).values
    raise ValueError(policy)


def compress(cache, keep_comp, comp_start, comp_end, T):
    """Build a new cache keeping [0:comp_start) + chosen compressible + [comp_end:T). keep_comp: [L, n_kv, k] (relative)."""
    from transformers import DynamicCache
    new = DynamicCache()
    for l, layer in enumerate(cache.layers):
        K, V = layer.keys, layer.values  # [1, n_kv, T, d]
        rows_k, rows_v = [], []
        for g in range(K.shape[1]):
            idx = torch.cat([torch.arange(0, comp_start), comp_start + keep_comp[l, g], torch.arange(comp_end, T)])
            rows_k.append(K[0, g, idx])
            rows_v.append(V[0, g, idx])
        new.update(torch.stack(rows_k).unsqueeze(0), torch.stack(rows_v).unsqueeze(0), l)
    return new


def freeable_blocks(keep_comp, C):
    """Share of 16-token blocks of the compressible region that no layer and no head keeps any token of."""
    used = torch.zeros(C, dtype=torch.bool)
    used[keep_comp.reshape(-1)] = True
    nb = math.ceil(C / BS)
    free = sum(1 for b in range(nb) if not used[b * BS:(b + 1) * BS].any())
    return free / nb


def run_a(tok, m, n):
    exs = task_a_examples(n)
    n_kv = m.config.num_key_value_heads
    res = []
    for e, ex in enumerate(exs):
        t0 = time.time()
        c_ids = tok(ex["ctx"], add_special_tokens=False).input_ids
        q_ids = tok(ex["q"], add_special_tokens=False).input_ids
        ids = c_ids + q_ids
        T = len(ids) - 1  # prefill all but the final token
        C = len(c_ids)
        cache, att = prefill(m, torch.tensor([ids[:T]]))
        snap, h2o = scores(att, list(range(C, T)), list(range(0, C)), n_kv)
        del att
        n0 = len(tok(ex["before"], add_special_tokens=False).input_ids)
        n1 = len(tok(ex["upto"], add_special_tokens=False).input_ids)
        row = {"i": e, "C": C, "T": T, "ans": ex["ans"], "pos": ex["pos"], "needle": [n0, n1], "out": {}}
        if e == 0:
            row["masks"] = {}

        def answer(cc):
            with torch.no_grad():
                past = cc
                nxt = ids[T]
                pos = T
                outt = []
                for _ in range(6):
                    o = m(input_ids=torch.tensor([[nxt]]), past_key_values=past, position_ids=torch.tensor([[pos]]), use_cache=True)
                    past = o.past_key_values
                    nxt = int(o.logits[0, -1].argmax())
                    outt.append(nxt)
                    pos += 1
            txt = tok.decode(outt)
            digits = "".join(ch for ch in txt if ch.isdigit())[:4]
            return txt, digits == ex["ans"]

        full = compress(cache, torch.arange(C).expand(cache.layers[0].keys.shape[1], C).expand(len(cache.layers), -1, -1), 0, C, T)
        txt, ok = answer(full)
        row["out"]["full"] = {"ok": ok, "txt": txt}
        for r in RATIOS:
            k = max(1, int(round(r * C)))
            for p in POLICIES:
                for s in (SEEDS if p.startswith("random") else [0]):
                    kc = select(p, C, k, snap, h2o, s)
                    txt, ok = answer(compress(cache, kc, 0, C, T))
                    nk = ((kc >= n0) & (kc < n1)).sum().item() / (kc.shape[0] * kc.shape[1] * max(1, n1 - n0))
                    row["out"]["%s|%g|%d" % (p, r, s)] = {"ok": ok, "txt": txt, "free": freeable_blocks(kc, C), "needle": round(nk, 4)}
                    if e == 0 and r == 0.25 and s == 0:
                        cov = torch.zeros(C)
                        for l in range(kc.shape[0]):
                            for g in range(kc.shape[1]):
                                cov[kc[l, g]] += 1
                        row["masks"][p] = [round(float(x), 3) for x in (cov / (kc.shape[0] * kc.shape[1]))]
        row["sec"] = time.time() - t0
        res.append(row)
        print(json.dumps({"i": e, "C": C, "full": row["out"]["full"]["ok"], "sec": round(row["sec"], 1)}), flush=True)
    return res


def run_b(tok, m, n, ctx_len=1024, cont=128, win=32):
    text = open(os.environ["KVC_TEXT"]).read()
    ids_all = tok(text, add_special_tokens=False).input_ids
    n_kv = m.config.num_key_value_heads
    stride = (len(ids_all) - ctx_len - cont) // n
    res = []
    for e in range(n):
        t0 = time.time()
        st = e * stride
        ids = ids_all[st:st + ctx_len + cont]
        T = ctx_len
        C = ctx_len - win
        cache, att = prefill(m, torch.tensor([ids[:T]]))
        snap, h2o = scores(att, list(range(C, T)), list(range(0, C)), n_kv)
        del att
        tgt = torch.tensor(ids[T:T + cont])

        def nll(cc):
            with torch.no_grad():
                inp = torch.tensor([ids[T - 1:T + cont - 1]])
                # the last context token is already in the cache: drop it and feed it again so the cache stays aligned
                pos = torch.arange(T - 1, T + cont - 1).unsqueeze(0)
                o = m(input_ids=inp, past_key_values=cc, position_ids=pos, use_cache=True)
                lp = F.log_softmax(o.logits[0].float(), -1)
                return float(-lp[torch.arange(cont), tgt].mean())

        row = {"i": e, "start": st, "C": C, "out": {}}
        # caches below hold positions [0, T-1): the final context token is re-fed with the continuation
        full_keep = torch.arange(C).expand(len(cache.layers), cache.layers[0].keys.shape[1], C)
        row["out"]["full"] = {"nll": nll(compress(cache, full_keep, 0, C, T - 1))}
        for r in RATIOS:
            k = max(1, int(round(r * C)))
            for p in POLICIES:
                for s in (SEEDS if p.startswith("random") else [0]):
                    kc = select(p, C, k, snap, h2o, s)
                    row["out"]["%s|%g|%d" % (p, r, s)] = {"nll": nll(compress(cache, kc, 0, C, T - 1)), "free": freeable_blocks(kc, C)}
        row["sec"] = time.time() - t0
        res.append(row)
        print(json.dumps({"i": e, "full": round(row["out"]["full"]["nll"], 3), "sec": round(row["sec"], 1)}), flush=True)
    return res


if __name__ == "__main__":
    task, n, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    tok, m = load()
    t0 = time.time()
    res = run_a(tok, m, n) if task == "taskA" else run_b(tok, m, n)
    meta = {"task": task, "n": n, "ratios": RATIOS, "policies": POLICIES, "seeds": SEEDS, "torch": torch.__version__,
            "threads": torch.get_num_threads(), "wall_s": time.time() - t0}
    import transformers
    meta["transformers"] = transformers.__version__
    json.dump({"meta": meta, "rows": res}, open(out, "w"))
