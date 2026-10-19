"""The premise of sparse attention, measured: how much of each query's attention lands on a few keys.

CPU only (Apple M1 Pro, 4 threads), inference only, eager attention so the weights are returned.
 A. SmolLM2-135M (revision 93efa2f0, fp32) on 1,024 tokens of TinyStories validation text (the first validation
    stories, decoded from the running example's token array and re-tokenized with SmolLM2's tokenizer; no BOS, as the
    tokenizer adds none). For queries at positions >= 256, per layer, averaged over heads and queries:
      top-k mass (k = 8 .. 256), the same with token 0 excluded (the sink), top-n blocks of 64 (NSA-style block
      selection), token 0's share, the last 64 keys (a sliding window), and window plus token 0.
 B. The Attention lab's at_mha tiny GPT on the running sequence (256 tokens), queries >= 64, blocks of 16.
 C. For the explorer: SmolLM2's real attention on the running text (226 tokens) for 8 query positions in 6 layers,
    the head mean and the single most concentrated head, quantised to 1/63 steps of the row maximum.
Writes ../out/topk_mass.json.  Run: LA_SCRATCH=<scratch>/la python topk_mass.py
"""
import json, os, sys, time
import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.abspath(os.path.join(HERE, "..", "..", "..", "src", "data"))
sys.path.insert(0, DATA)
from tiny_gpt import GPT, GPTConfig  # noqa: E402
from tokenizers import Tokenizer  # noqa: E402
SCR = os.environ["LA_SCRATCH"]
torch.set_num_threads(4)
REPO, REV = "HuggingFaceTB/SmolLM2-135M", "93efa2f097d58c2a74874c7e644dbc9b0cee75a2"
KS = [1, 2, 4, 8, 16, 32, 64, 128, 256]


def stats(att, q0, block, ks, nblocks, window=64):
    """att: (L, H, T, T) attention weights. Returns per-layer means over heads and queries q >= q0."""
    L, H, T, _ = att.shape
    rows = []
    for l in range(L):
        a = att[l, :, q0:, :]                                   # (H, Q, T)
        srt = np.sort(a, -1)[..., ::-1]
        cs = np.cumsum(srt, -1)
        no0 = a.copy(); no0[..., 0] = 0
        cs0 = np.cumsum(np.sort(no0, -1)[..., ::-1], -1)
        nb = T // block
        bl = a[..., : nb * block].reshape(H, a.shape[1], nb, block).sum(-1)
        bcs = np.cumsum(np.sort(bl, -1)[..., ::-1], -1)
        qpos = np.arange(q0, T)
        win = np.zeros_like(a[0, :, :], dtype=bool)
        for i, q in enumerate(qpos):
            win[i, max(0, q - window + 1): q + 1] = True
        wm = (a * win[None]).sum(-1)
        sink = a[..., 0]
        sw = wm + np.where(qpos[None] - window + 1 > 0, sink, 0)
        rows.append({"layer": l + 1,
                     "topk": {str(k): round(float(cs[..., k - 1].mean()), 4) for k in ks},
                     "topk_no_tok0": {str(k): round(float(cs0[..., k - 1].mean()), 4) for k in ks},
                     "top_blocks": {str(n): round(float(bcs[..., n - 1].mean()), 4) for n in nblocks},
                     "tok0": round(float(sink.mean()), 4), "window64": round(float(wm.mean()), 4),
                     "window64_plus_tok0": round(float(sw.mean()), 4)})
    return rows


def q6(row):
    m = float(row.max()) or 1.0
    return m, "".join(chr(48 + int(round(v / m * 63))) for v in row)   # 64 levels as printable characters '0'..'o'


@torch.no_grad()
def main():
    t0 = time.time()
    from transformers import AutoModelForCausalLM, AutoTokenizer
    tok_tiny = Tokenizer.from_file(os.path.join(DATA, "tokenizer.json"))
    val = np.memmap(os.path.join(SCR, "data", "val.bin"), dtype=np.uint16, mode="r")
    text = tok_tiny.decode(val[:1600].astype(np.int64).tolist(), skip_special_tokens=False).replace("<|endoftext|>", "\n\n")
    tk = AutoTokenizer.from_pretrained(REPO, revision=REV, local_files_only=True)
    m = AutoModelForCausalLM.from_pretrained(REPO, revision=REV, local_files_only=True, attn_implementation="eager",
                                             dtype=torch.float32).eval()
    ids = tk(text, return_tensors="pt").input_ids[:, :1024]
    o = m(ids, output_attentions=True)
    att = torch.stack([a[0] for a in o.attentions]).numpy()      # (30, 9, 1024, 1024)
    out = {"date": "2026-10-19", "device": "Apple M1 Pro, CPU, 4 threads, fp32, eager attention",
           "smollm2": {"repo": REPO, "revision": REV, "tokens": int(ids.shape[1]), "queries_from": 256, "block": 64,
                       "layers": stats(att, 256, 64, KS, [1, 2, 4, 8, 16])}}
    del att, o
    # C. explorer rows on the running text
    run = json.load(open(os.path.join(DATA, "running_sequence.json")))
    rids = tk(run["text"].replace("<|endoftext|>", ""), return_tensors="pt").input_ids
    o = m(rids, output_attentions=True)
    T = rids.shape[1]
    qs = [16, 40, 80, 120, 160, 200, T - 2, T - 1]
    lays = [1, 6, 12, 18, 24, 30]
    ex = {"tokens": [tk.decode([i]) for i in rids[0].tolist()], "queries": qs, "layers": lays, "rows": []}
    for l in lays:
        a = o.attentions[l - 1][0].numpy()                       # (H, T, T)
        for q in qs:
            r = a[:, q, : q + 1]
            mean = r.mean(0)
            conc = np.sort(r, -1)[:, ::-1][:, :8].sum(-1)            # most concentrated head: largest top-8 mass
            hmax = int(np.argmax(conc))
            mm, sm = q6(mean); mh, sh = q6(r[hmax])
            ex["rows"].append({"layer": l, "q": q, "mean_max": round(mm, 4), "mean": sm,
                               "head": hmax, "head_max": round(mh, 4), "head_row": sh,
                               "mean_top16": round(float(np.sort(mean)[::-1][:16].sum()), 4),
                               "head_top16": round(float(np.sort(r[hmax])[::-1][:16].sum()), 4)})
    out["explorer"] = ex
    del m, o
    # B. tiny GPT
    ck = torch.load(os.path.join(SCR, "runs", "at_mha", "ckpt.pt"), map_location="cpu")
    g = GPT(GPTConfig(**ck["config"])); g.load_state_dict(ck["model"]); g.eval()
    _, _, _, rec = g(torch.tensor([run["ids"]]), record=True)
    att = torch.stack([w[0] for w in rec["attn"]]).numpy()      # (6, 8, 256, 256)
    out["tiny_at_mha"] = {"tokens": 256, "queries_from": 64, "block": 16,
                          "layers": stats(att, 64, 16, KS[:8], [1, 2, 4, 8])}
    out["seconds"] = round(time.time() - t0, 1)
    json.dump(out, open(os.path.join(HERE, "..", "out", "topk_mass.json"), "w"), indent=1)
    for nm in ("smollm2", "tiny_at_mha"):
        for r in out[nm]["layers"]:
            print(nm, r["layer"], "top16", r["topk"]["16"], "top16-no0", r["topk_no_tok0"]["16"], "blocks4", r["top_blocks"]["4"],
                  "tok0", r["tok0"], "win", r["window64"], "win+0", r["window64_plus_tok0"])
    print(out["seconds"], "s")


if __name__ == "__main__":
    main()
