"""Name recall over a distance in the topic's tiny GPTs: attention, SSM-only and hybrids at the same budget.

The tokenizer splits made-up names into several pieces (" Roxy" is " R" "o" "x" "y"), so once the first piece of a
name is written, the rest can only be predicted well by recalling the earlier mention. For each model:
  probe "seen":    "Once upon a time, there was a little dog named NAME." + d filler tokens + " One day, NAME"
  probe "unseen":  the same text with the first mention replaced by another made-up name (the control)
Score: mean loss (nats) on the name's pieces after its first piece at the second mention; recall benefit =
unseen - seen. d = 0 ... 192 filler tokens from fixed validation windows without a story break. Also the loss on the
later pieces of " Roxy" at each mention in the running sequence.

Run: LA_SCRATCH=<scratch>/la <venv>/bin/python src/recall/tiny_recall.py [--device cpu]  -> out/tiny_recall.json
"""
import argparse, json, os, sys
import numpy as np, torch, torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data"))
sys.path.insert(0, DATA)
from tiny_gpt import GPT, GPTConfig  # noqa: E402
from tokenizers import Tokenizer  # noqa: E402

SCR = os.environ["LA_SCRATCH"]
RUNS = [("at_mha", "attention, RoPE (Attention lab)"), ("pe_nope", "attention, no positions (Positional child)"),
        ("ba_ssm", "SSM only"), ("ba_hybrid", "hybrid, 1 attention in 6 (ssasss)"),
        ("ba_hybrid2", "hybrid, 2 attention in 6 (ssassa)")]
NAMES = ["Zubo", "Kexa", "Vimbo", "Tolka", "Quenn", "Pibsy", "Draxo", "Fennik", "Moxa", "Jurbi"]
DIST = [0, 16, 32, 64, 128, 192]
N_FILL = 8


def load(name, device):
    ck = torch.load(os.path.join(SCR, "runs", name, "ckpt.pt"), map_location=device)
    m = GPT(GPTConfig(**ck["config"])).to(device); m.load_state_dict(ck["model"]); return m.eval()


def fillers(n, length):
    val = np.memmap(os.path.join(SCR, "data", "val.bin"), dtype=np.uint16, mode="r")
    rng = np.random.default_rng(7); out = []
    while len(out) < n:
        s = int(rng.integers(0, len(val) - length - 1)); w = val[s:s + length].astype(np.int64)
        if (w == 0).any(): continue
        out.append(w.tolist())
    return out


@torch.no_grad()
def piece_loss(m, seqs, spans, device):
    """seqs: list of id lists (padded to equal length on the right); spans: (start, end) of the scored pieces."""
    L = max(len(s) for s in seqs)
    x = torch.tensor([s + [0] * (L - len(s)) for s in seqs], device=device)
    lg, *_ = m(x)
    lp = torch.log_softmax(lg.float(), -1)
    out = []
    for b, (a, e) in enumerate(spans):
        tgt = x[b, a:e]; out.append(-lp[b, a - 1:e - 1].gather(-1, tgt[:, None]).mean().item())
    return out


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--device", default="cpu"); a = ap.parse_args()
    torch.set_num_threads(4)
    tok = Tokenizer.from_file(os.path.join(DATA, "tokenizer.json"))
    enc = lambda s: tok.encode(s).ids
    fill = fillers(N_FILL, max(DIST))
    pieces = {n: enc(" " + n) for n in NAMES}
    res = {"names": {n: [tok.id_to_token(i) for i in p] for n, p in pieces.items()}, "dist": DIST,
           "n_fill": N_FILL, "models": []}
    run = json.load(open(os.path.join(DATA, "running_sequence.json")))
    ids = run["ids"]; pcs = run["pieces"]
    for key, label in RUNS:
        if not os.path.exists(os.path.join(SCR, "runs", key, "ckpt.pt")):
            print("missing", key); continue
        m = load(key, a.device); r = {"run": key, "label": label, "layer_types": m.cfg.layer_types, "seen": [], "unseen": []}
        for d in DIST:
            seen_s, seen_sp, un_s, un_sp = [], [], [], []
            for i, n in enumerate(NAMES):
                other = NAMES[(i + 5) % len(NAMES)]
                for f in fill:
                    for first, store, sp in ((n, seen_s, seen_sp), (other, un_s, un_sp)):
                        s = [0] + enc("Once upon a time, there was a little dog named") + pieces[first] + enc(".") + \
                            f[:d] + enc(" One day,")
                        a0 = len(s) + 1; s = s + pieces[n]
                        store.append(s); sp.append((a0, len(s)))
            r["seen"].append(round(float(np.mean(piece_loss(m, seen_s, seen_sp, a.device))), 4))
            r["unseen"].append(round(float(np.mean(piece_loss(m, un_s, un_sp, a.device))), 4))
        # running sequence: later pieces of each mention of Roxy (" Billy" is one token)
        r["running"] = {}
        for nm in ("Roxy",):
            want = enc(" " + nm); occ = [j for j in range(len(ids) - len(want)) if ids[j:j + len(want)] == want]
            r["running"][nm] = [round(v, 3) for v in piece_loss(m, [ids] * len(occ), [(j + 1, j + len(want)) for j in occ], a.device)]
        print(key, r["seen"], r["unseen"], r["running"]["Roxy"][:4], flush=True)
        res["models"].append(r); del m
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    json.dump(res, open(os.path.join(HERE, "out", "tiny_recall.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
