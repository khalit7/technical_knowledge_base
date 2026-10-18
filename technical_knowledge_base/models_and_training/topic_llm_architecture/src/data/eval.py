"""Evaluate a trained tiny GPT: held-out loss on a larger fixed val set, per-token loss on the running sequence,
and continuations of the 8 fixed evaluation prompts (greedy, and sampled at T=0.8 with a fixed seed).

Run: LA_SCRATCH=<scratch>/la <venv>/bin/python src/data/eval.py <run name> [--device mps|cpu] [--n_batches 100]
Writes $LA_SCRATCH/runs/<name>/eval.json.
"""
import argparse, json, os, sys
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tiny_gpt import GPT, GPTConfig
from train import held_out_loss, SCR
from tokenizers import Tokenizer


def load(name, device):
    ck = torch.load(os.path.join(SCR, "runs", name, "ckpt.pt"), map_location=device)
    m = GPT(GPTConfig(**ck["config"])).to(device)
    m.load_state_dict(ck["model"])
    return m.eval()


@torch.no_grad()
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--device", default="mps" if torch.backends.mps.is_available() else "cpu")
    ap.add_argument("--n_batches", type=int, default=100)
    ap.add_argument("--n_new", type=int, default=60)
    a = ap.parse_args()
    torch.set_num_threads(4)
    tok = Tokenizer.from_file(os.path.join(HERE, "tokenizer.json"))
    m = load(a.name, a.device)
    res = {"name": a.name, "val_loss": round(held_out_loss(m, a.device, m.cfg.ctx, n_batches=a.n_batches), 4),
           "val_windows": a.n_batches * 32}
    run = json.load(open(os.path.join(HERE, "running_sequence.json")))
    ids = torch.tensor([run["ids"]], device=a.device)
    logits, *_ = m(ids)
    lp = torch.log_softmax(logits[0, :-1].float(), -1).gather(-1, ids[0, 1:, None])[:, 0]
    res["running_sequence_token_loss"] = [round(-v, 3) for v in lp.tolist()]
    res["running_sequence_mean_loss"] = round(-lp.mean().item(), 4)
    prompts = json.load(open(os.path.join(HERE, "eval_prompts.json")))["prompts"]
    res["samples"] = []
    g = torch.Generator(device="cpu").manual_seed(0)
    for p in prompts:
        x = torch.tensor([[0] + tok.encode(p).ids], device=a.device)
        greedy = m.generate(x, a.n_new)[0, x.shape[1]:].tolist()
        sampled = m.cpu().generate(x.cpu(), a.n_new, temperature=0.8, generator=g)[0, x.shape[1]:].tolist(); m.to(a.device)
        cut = lambda t: tok.decode(t[: t.index(0)] if 0 in t else t)
        res["samples"].append({"prompt": p, "greedy": cut(greedy), "sampled_t0.8": cut(sampled)})
    json.dump(res, open(os.path.join(SCR, "runs", a.name, "eval.json"), "w"), indent=1)
    print(json.dumps({k: res[k] for k in ("name", "val_loss", "running_sequence_mean_loss")}))
    for s in res["samples"][:3]:
        print("  ", s["prompt"], "|", s["greedy"][:150].replace("\n", " "))


if __name__ == "__main__":
    main()
