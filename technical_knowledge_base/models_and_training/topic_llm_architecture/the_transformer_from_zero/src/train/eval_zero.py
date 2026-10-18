"""Evaluate a gpt_zero run exactly as src/data/eval.py evaluates a tiny_gpt run: held-out loss on 100 fixed
validation windows, per-token loss on the running sequence, greedy and sampled (T 0.8, seed 0) continuations of
the 8 evaluation prompts. Also accepts tiny_gpt baseline-family runs (--tiny), loaded into gpt_zero.GPT.
Run: LA_SCRATCH=<scratch>/la python eval_zero.py <run> [--tiny] [--device cpu]  -> $LA_SCRATCH/runs/<run>/eval_tz.json
"""
import argparse, json, os, sys
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..", "..", "src", "data")
sys.path.insert(0, os.path.join(HERE, "..", "zero")); sys.path.insert(0, DATA)
from train import held_out_loss, SCR
from gpt_zero import GPT, Config, load_tiny
from tokenizers import Tokenizer


def load(name, device, tiny=False):
    ck = torch.load(os.path.join(SCR, "runs", name, "ckpt.pt"), map_location="cpu")
    if tiny:
        c = ck["config"]
        cfg = Config(n_head=c["n_head"], pos=c["pos"] == "learned")
        sd = load_tiny(ck["model"])
    else:
        cfg = Config(**ck["config"]); sd = ck["model"]
    m = GPT(cfg); m.load_state_dict(sd)
    return m.to(device).eval()


@torch.no_grad()
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name"); ap.add_argument("--tiny", action="store_true")
    ap.add_argument("--device", default="cpu"); ap.add_argument("--n_batches", type=int, default=100)
    ap.add_argument("--n_new", type=int, default=60)
    a = ap.parse_args()
    torch.set_num_threads(4)
    tok = Tokenizer.from_file(os.path.join(DATA, "tokenizer.json"))
    m = load(a.name, a.device, a.tiny)
    res = {"name": a.name, "val_loss": round(held_out_loss(m, a.device, m.cfg.ctx, n_batches=a.n_batches), 4),
           "val_windows": a.n_batches * 32}
    run = json.load(open(os.path.join(DATA, "running_sequence.json")))
    ids = torch.tensor([run["ids"]], device=a.device)
    logits, *_ = m(ids)
    lp = torch.log_softmax(logits[0, :-1].float(), -1).gather(-1, ids[0, 1:, None])[:, 0]
    res["running_sequence_token_loss"] = [round(-v, 3) for v in lp.tolist()]
    res["running_sequence_mean_loss"] = round(-lp.mean().item(), 4)
    prompts = json.load(open(os.path.join(DATA, "eval_prompts.json")))["prompts"]
    res["samples"] = []
    g = torch.Generator(device="cpu").manual_seed(0)
    m = m.cpu()
    for p in prompts:
        x = torch.tensor([[0] + tok.encode(p).ids])
        greedy = m.generate(x, a.n_new)[0, x.shape[1]:].tolist()
        sampled = m.generate(x, a.n_new, temperature=0.8, generator=g)[0, x.shape[1]:].tolist()
        cut = lambda t: tok.decode(t[: t.index(0)] if 0 in t else t)
        res["samples"].append({"prompt": p, "greedy": cut(greedy), "sampled_t0.8": cut(sampled)})
    json.dump(res, open(os.path.join(SCR, "runs", a.name, "eval_tz.json"), "w"), indent=1)
    print(json.dumps({k: res[k] for k in ("name", "val_loss", "running_sequence_mean_loss")}))
    print("  ", res["samples"][0]["prompt"], "|", res["samples"][0]["greedy"][:150].replace("\n", " "))


if __name__ == "__main__":
    main()
