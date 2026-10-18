"""mtp_frozen.py: MTP modules trained on top of the FROZEN reference tiny GPT, then used as drafts (CPU, about 6 min).

1. Train two depth-1 modules (mtp.py) for 600 steps on the frozen ref_baseline_s1500: "sequential" (DeepSeek-V3:
   sees h_t and the embedding of x_{t+1}) and "parallel" (Gloeckle et al.: sees h_t only). Only the module learns;
   the embedding, final norm and output head are the main model's, shared and frozen.
2. Held-out (16 x 8 windows of 256): loss and top-1 accuracy at t+2 for each module; the main model's own next-token
   numbers for scale; and the teacher-forced acceptance: how often the draft's top-1 equals the main model's greedy
   choice for that position.
3. Self-speculative greedy decoding on the 8 evaluation prompts (120 new tokens each): one main forward verifies the
   previous draft and makes a new one, so each forward emits 1 or 2 tokens. Output must equal plain greedy decoding.
   Also run with the module trained jointly from scratch (runs/fo_mtp_joint), if present.
Writes out/mtp_frozen.json.
"""
import json, math, time
import torch
import torch.nn.functional as F

import fo_common as C
from fo_common import SCR, Batches, load_ref, trunk, tokenizer, eval_prompts, running_sequence
from mtp import MTPModule, n_params
from tiny_gpt import GPT, GPTConfig

torch.set_num_threads(4)


def train_module(model, kind, steps=600, batch=16, lr=1e-3):
    torch.manual_seed(1)
    m = MTPModule(model.cfg, kind)
    opt = torch.optim.AdamW(m.parameters(), lr=lr, betas=(0.9, 0.95), weight_decay=0.1)
    b = Batches("train", batch, 256, 21)
    curve = []
    for s in range(steps):
        lr_s = lr * min(1.0, (s + 1) / 50) * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * s / steps)))
        for g in opt.param_groups:
            g["lr"] = lr_s
        xy = b.next(); x, y = xy[:, :-1], xy[:, 1:]
        with torch.no_grad():
            h, _ = trunk(model, x)
        lg = m(model, h[:, :-1], x[:, 1:])
        loss = F.cross_entropy(lg.reshape(-1, lg.shape[-1]), y[:, 1:].reshape(-1))
        loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step(); opt.zero_grad()
        if s % 20 == 0 or s == steps - 1:
            curve.append([s, round(loss.item(), 4)])
    return m.eval(), curve


@torch.no_grad()
def held_out(model, mods):
    b = Batches("val", 16, 256, 1234)
    acc = {"main_next": [0, 0, 0.0]}
    for k in mods:
        acc[k] = [0, 0, 0.0]; acc[k + "_accept"] = [0, 0, 0.0]
    for _ in range(8):
        xy = b.next(); x, y = xy[:, :-1], xy[:, 1:]
        h, logits = trunk(model, x)
        g = logits.argmax(-1)                                     # main greedy choice for x_{t+1} at every t
        a = acc["main_next"]; a[0] += (g == y).sum().item(); a[1] += y.numel()
        a[2] += F.cross_entropy(logits.reshape(-1, logits.shape[-1]), y.reshape(-1), reduction="sum").item()
        for k, m in mods.items():
            lg = m(model, h[:, :-1], x[:, 1:])                    # draft of x_{t+2}
            d = lg.argmax(-1)
            a = acc[k]; a[0] += (d == y[:, 1:]).sum().item(); a[1] += d.numel()
            a[2] += F.cross_entropy(lg.reshape(-1, lg.shape[-1]), y[:, 1:].reshape(-1), reduction="sum").item()
            a = acc[k + "_accept"]; a[0] += (d == g[:, 1:]).sum().item(); a[1] += d.numel()
    return {k: {"top1": round(v[0] / v[1], 4), **({"loss": round(v[2] / v[1], 4)} if v[2] else {})} for k, v in acc.items()}


@torch.no_grad()
def greedy_plain(model, ids, n):
    x = list(ids)
    for _ in range(n):
        _, lg = trunk(model, torch.tensor([x]))
        x.append(int(lg[0, -1].argmax()))
    return x[len(ids):]


@torch.no_grad()
def greedy_spec(model, m, ids, n):
    """Self-speculative greedy decoding with a depth-1 MTP draft. Returns tokens, forwards and per-forward events."""
    seq = list(ids); draft = None; forwards = 0; events = []
    while len(seq) - len(ids) < n:
        inp = seq + ([draft] if draft is not None else [])
        h, lg = trunk(model, torch.tensor([inp])); forwards += 1
        g1 = int(lg[0, len(seq) - 1].argmax())                    # the main model's choice after seq
        if draft is not None and g1 == draft:
            seq.append(draft)
            g2 = int(lg[0, len(seq) - 1].argmax())                # bonus token: the main model's choice after the draft
            seq.append(g2)
            events.append({"emit": [draft, g2], "accepted": True})
            p = len(seq) - 2                                      # h at the draft's position, emb of g2
        else:
            seq.append(g1)
            events.append({"emit": [g1], "accepted": False, "rejected": draft})
            p = len(seq) - 2
        d = m(model, h[:, p:p + 1], torch.tensor([[seq[-1]]]))
        draft = int(d[0, -1].argmax())
    out = seq[len(ids):len(ids) + n]
    return out, forwards, events


def main():
    t0 = time.time()
    tok = tokenizer()
    model = load_ref().eval()
    for p in model.parameters():
        p.requires_grad_(False)
    mods, curves = {}, {}
    for kind in ("sequential", "parallel"):
        mods[kind], curves[kind] = train_module(model, kind)
        print(kind, "trained", curves[kind][-1], f"{time.time() - t0:.0f}s", flush=True)
    res = {"params": {k: n_params(m) for k, m in mods.items()}, "main_params": sum(p.numel() for p in model.parameters()),
           "curves": curves, "held_out": held_out(model, mods)}
    print(json.dumps(res["held_out"]), flush=True)
    joint = None
    jp = SCR / "runs" / "fo_mtp_joint" / "ckpt.pt"
    if jp.exists():
        ck = torch.load(jp, map_location="cpu", weights_only=False)
        jm = GPT(GPTConfig(**ck["config"])); jm.load_state_dict(ck["model"]); jm.eval()
        jmod = MTPModule(jm.cfg, "sequential"); jmod.load_state_dict(ck["mtp"]); jmod.eval()
        joint = (jm, jmod)
        res["held_out_joint"] = held_out(jm, {"joint": jmod})
    prompts = eval_prompts()["prompts"]
    spec = []
    for i, ptxt in enumerate(prompts):
        ids = [0] + tok.encode(ptxt).ids
        plain = greedy_plain(model, ids, 120)
        row = {"prompt": i + 1, "plain_text": tok.decode(plain)}
        for k, m in mods.items():
            out, fw, ev = greedy_spec(model, m, ids, 120)
            row[k] = {"forwards": fw, "tokens_per_forward": round(120 / fw, 3), "identical": out == plain,
                      "accept_rate": round(sum(e["accepted"] for e in ev[1:]) / max(1, len(ev) - 1), 4)}
            if i == 6:
                row[k]["events"] = [{"emit": [tok.decode([t]) for t in e["emit"]], "acc": e["accepted"],
                                     **({"rej": tok.decode([e["rejected"]])} if e.get("rejected") is not None else {})}
                                    for e in ev]
        if joint:
            jplain = greedy_plain(joint[0], ids, 120)
            out, fw, ev = greedy_spec(joint[0], joint[1], ids, 120)
            row["joint"] = {"forwards": fw, "tokens_per_forward": round(120 / fw, 3), "identical": out == jplain,
                            "accept_rate": round(sum(e["accepted"] for e in ev[1:]) / max(1, len(ev) - 1), 4)}
        spec.append(row)
        print(i + 1, {k: (row[k]["forwards"], row[k]["identical"]) for k in row if isinstance(row[k], dict)}, flush=True)
    res["spec"] = spec
    res["seconds"] = round(time.time() - t0, 1)
    res["note"] = "measured on Apple M1 Pro (CPU, 4 threads, nice 15), torch " + torch.__version__
    C.dump("mtp_frozen.json", res)


if __name__ == "__main__":
    main()
