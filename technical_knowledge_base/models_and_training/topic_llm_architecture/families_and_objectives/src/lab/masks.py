"""masks.py: what the attention mask does to the trained tiny GPT (CPU, about 3 minutes).

1. swap: ref_baseline_s1500 (trained causal) evaluated with its causal mask, then with the mask swapped at inference
   (bidirectional; prefix LM with a 128-token bidirectional prefix), on the 20 fixed held-out windows of train.py
   and on the running sequence. Reproduces the lab's held-out loss first (2.278 on MPS).
2. leak: the same checkpoint fine-tuned for 150 steps with a BIDIRECTIONAL mask and the next-token objective.
   The target is visible in the input, so the loss collapses; then greedy generation (which cannot see the future)
   writes nonsense. Records the curve, the attention each position pays to the next position, and the bad output.
Writes out/masks.json.
"""
import json, time
import torch
import torch.nn.functional as F

import fo_common as C
from fo_common import MASK, Batches, load_ref, running_sequence, eval_prompts, tokenizer

torch.set_num_threads(4)
C.enable_masks()


def set_mask(mode, prefix=0):
    MASK.update(mode=mode, prefix=prefix)


@torch.no_grad()
def per_token_loss(model, x, y):
    logits, *_ = model(x)
    return F.cross_entropy(logits.float().transpose(1, 2), y, reduction="none")  # (B,T)


@torch.no_grad()
def held_out(model, mode, prefix=0):
    set_mask(mode, prefix)
    b = Batches("val", 32, 256, 1234)
    rows = []
    for _ in range(20):
        xy = b.next(); rows.append(per_token_loss(model, xy[:, :-1], xy[:, 1:]))
    set_mask("causal")
    L = torch.cat(rows)  # (640, 256)
    return L


@torch.no_grad()
def next_attention(model, x):
    """Mean attention weight a query pays to the key one position to its right (the answer under a leak), per layer."""
    _, _, _, rec = model(x, record=True)
    out = []
    for w in rec["attn"]:
        d = torch.diagonal(w, offset=1, dim1=-2, dim2=-1)  # (B,H,T-1)
        out.append(round(d.mean().item(), 4))
    return out


@torch.no_grad()
def greedy(model, ids, n):
    """Greedy continuation WITHOUT a cache (full forward each step), with whatever mask is set."""
    x = torch.tensor([ids])
    for _ in range(n):
        lg, *_ = model(x[:, -256:])
        x = torch.cat([x, lg[:, -1].argmax(-1, keepdim=True)], 1)
    return x[0, len(ids):].tolist()


def main():
    tok = tokenizer()
    rs = running_sequence()
    ids = torch.tensor([rs["ids"]])
    model = load_ref().eval()
    res = {"swap": {}, "leak": {}}
    t0 = time.time()
    # 1. swap the mask at inference
    for mode, P in (("causal", 0), ("bidir", 0), ("prefix", 128)):
        L = held_out(model, mode, P)
        set_mask(mode, P)
        rl = per_token_loss(model, ids[:, :-1], ids[:, 1:])[0]
        set_mask("causal")
        key = mode if mode != "prefix" else "prefix128"
        res["swap"][key] = {"held_out": round(L.mean().item(), 4),
                            "held_out_first128": round(L[:, :128].mean().item(), 4),
                            "held_out_last128": round(L[:, 128:].mean().item(), 4),
                            "running_seq": round(rl.mean().item(), 4)}
        print(key, res["swap"][key], f"{time.time() - t0:.0f}s", flush=True)
    res["swap"]["attn_next_causal_model"] = None
    # 2. the leak: bidirectional mask, next-token objective, fine-tuned from the reference
    torch.manual_seed(0)
    leak = load_ref().train()
    opt = torch.optim.AdamW(leak.parameters(), lr=1e-3, betas=(0.9, 0.95), weight_decay=0.0)
    b = Batches("train", 16, 256, 7)
    curve = []
    set_mask("bidir")
    for step in range(150):
        xy = b.next()
        _, loss, _, _ = leak(xy[:, :-1], targets=xy[:, 1:])
        loss.backward(); torch.nn.utils.clip_grad_norm_(leak.parameters(), 1.0); opt.step(); opt.zero_grad()
        if step % 5 == 0 or step == 149:
            curve.append([step, round(loss.item(), 4)])
            if step % 25 == 0:
                print("leak step", step, round(loss.item(), 4), f"{time.time() - t0:.0f}s", flush=True)
    leak.eval()
    res["leak"]["curve"] = curve
    res["leak"]["held_out_bidir"] = round(held_out(leak, "bidir").mean().item(), 4)
    res["leak"]["held_out_causal"] = round(held_out(leak, "causal").mean().item(), 4)
    set_mask("bidir")
    res["leak"]["attn_next"] = next_attention(leak, ids[:, :-1])
    set_mask("causal")
    MASK.update(mode="bidir")
    res["swap"]["attn_next_causal_model"] = next_attention(model, ids[:, :-1])
    MASK.update(mode="causal")
    # generation: the prompt is the running sequence's opening (eval prompt 7); 40 new tokens, greedy
    p = eval_prompts()
    prompts = p if isinstance(p, list) else p.get("prompts", p)
    ptxt = prompts[6]["text"] if isinstance(prompts[6], dict) else prompts[6]
    pid = [0] + tok.encode(ptxt).ids
    gens = {}
    for who, m, mode in (("reference, causal mask", model, "causal"), ("leak model, bidirectional mask", leak, "bidir"),
                         ("leak model, causal mask", leak, "causal")):
        set_mask(mode)
        out = greedy(m, pid, 40)
        gens[who] = tok.decode(out)
    set_mask("causal")
    res["leak"]["prompt"] = ptxt
    res["leak"]["generations"] = gens
    res["seconds"] = round(time.time() - t0, 1)
    res["note"] = "measured on Apple M1 Pro (CPU, 4 threads, nice 15), torch " + torch.__version__
    C.dump("masks.json", res)
    print(json.dumps(gens, indent=1))


if __name__ == "__main__":
    main()
