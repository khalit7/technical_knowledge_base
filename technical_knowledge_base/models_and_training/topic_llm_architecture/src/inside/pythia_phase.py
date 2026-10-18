"""Inside a real model (tab t-inside): induction heads appearing during training, read from Pythia-70M-deduped's
published training checkpoints (EleutherAI; 6 layers x 8 heads, d_model 512, about 2.1M tokens per step).
Not trained here: the checkpoints are the published ones (revisions in src/inside/out/pythia_manifest.json);
the measurement (inference only, CPU, 4 threads) is ours.

For each checkpoint: 8 repeated random sequences (<|endoftext|> + R + R, R = 100 ids drawn uniformly from [1000, 50000), seed 0):
loss on each copy, per-head induction score and previous-token score; the running sequence's text: loss and attention
mass on the first token. Writes $LA_SCRATCH/in/pythia/phase.json (copied into src/inside/out by make_page_data.py).

Run: LA_SCRATCH=... OMP_NUM_THREADS=4 nice -n 15 $LA_SCRATCH/venv/bin/python src/inside/pythia_phase.py
"""
import json, os, time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from huggingface_hub import list_repo_refs

HERE = os.path.dirname(os.path.abspath(__file__))
SCR = os.environ["LA_SCRATCH"]
REPO = "EleutherAI/pythia-70m-deduped"
STEPS = [0, 128, 256, 512, 1000, 2000, 3000, 4000, 8000, 16000, 33000, 66000, 100000, 143000]
L_RAND, N_SEEDS = 100, 8


@torch.inference_mode()
def main():
    torch.set_num_threads(4)
    br = {b.name: b.target_commit for b in list_repo_refs(REPO).branches}
    tok = AutoTokenizer.from_pretrained(REPO, revision=br["step143000"])
    text = json.load(open(os.path.join(HERE, "..", "data", "running_sequence.json")))["text"]
    run = torch.tensor([tok(text).input_ids])
    g = torch.Generator().manual_seed(0)
    R = torch.randint(1000, 50000, (N_SEEDS, L_RAND), generator=g)
    seq = torch.cat([torch.zeros(N_SEEDS, 1, dtype=torch.long), R, R], 1)   # id 0 is <|endoftext|> in Pythia's tokenizer
    qs = torch.arange(L_RAND + 1, 2 * L_RAND + 1)
    out = {"repo": REPO, "tokens_per_step": 2097152, "n_running_tokens": run.shape[1], "checkpoints": []}
    for s in STEPS:
        t0 = time.time()
        m = AutoModelForCausalLM.from_pretrained(REPO, revision=br["step%d" % s], dtype=torch.float32,
                                                 attn_implementation="eager", use_safetensors=False).eval()
        o = m(seq, output_attentions=True)
        lp = torch.log_softmax(o.logits[:, :-1].float(), -1)
        loss = -lp.gather(-1, seq[:, 1:, None])[..., 0]
        ind = [a[:, :, qs, qs - L_RAND + 1].mean(dim=(0, 2)) for a in o.attentions]       # per layer: (H,)
        T = seq.shape[1]
        prev = [a[:, :, torch.arange(2, T), torch.arange(1, T - 1)].mean(dim=(0, 2)) for a in o.attentions]
        best = max(((l, h) for l in range(len(ind)) for h in range(ind[0].numel())), key=lambda lh: ind[lh[0]][lh[1]].item())
        row = o.attentions[best[0]][0, best[1], 150].tolist()                               # one query in copy 2, seed 0
        o2 = m(run, output_attentions=True)
        lp2 = torch.log_softmax(o2.logits[0, :-1].float(), -1)
        rl = -lp2.gather(-1, run[0, 1:, None])[:, 0]
        r4 = lambda v: [round(float(x), 4) for x in v]
        out["checkpoints"].append({
            "step": s, "revision": br["step%d" % s], "tokens": s * 2097152,
            "loss_copy1": round(loss[:, 1:L_RAND].mean().item(), 4), "loss_copy2": round(loss[:, L_RAND + 1:].mean().item(), 4),
            "loss_by_pos": r4(loss.mean(0)),
            "ind": [r4(v) for v in ind], "prev": [r4(v) for v in prev], "best_head": list(best),
            "best_row_q150": r4(row[:151]),
            "running_loss": round(rl.mean().item(), 4),
            "sink_by_layer": r4([a[0, :, 8:, 0].mean().item() for a in o2.attentions])})
        c = out["checkpoints"][-1]
        print(s, c["loss_copy1"], c["loss_copy2"], best, round(ind[best[0]][best[1]].item(), 3), c["running_loss"],
              round(time.time() - t0, 1), "s", flush=True)
        del m, o, o2
    os.makedirs(os.path.join(SCR, "in", "pythia"), exist_ok=True)
    json.dump(out, open(os.path.join(SCR, "in", "pythia", "phase.json"), "w"))


if __name__ == "__main__":
    main()
