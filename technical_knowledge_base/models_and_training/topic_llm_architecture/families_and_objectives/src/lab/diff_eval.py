"""diff_eval.py: the masked-diffusion tiny GPT (train_diffusion.py) against the causal reference (CPU, a few minutes).

1. Fill in the blanks: 16 held-out windows, a fixed random 15%, 50% or 90% of positions masked. The diffusion model
   sees the corrupted window both ways in one pass; the causal reference predicts the same positions from the TRUE
   left context only. Loss and top-1 accuracy on the masked positions.
2. Generation: the 8 evaluation prompts, 48 new tokens, LLaDA's sampler (all masked positions predicted every step,
   the most confident k = 48 / steps committed, the rest stay masked: "low-confidence remasking"), steps 48, 24,
   12, 6, 3; random remasking at 48 and 12 steps; the causal reference greedy and sampled (T 0.8) for comparison.
   Quality: per-token loss of the continuation under SmolLM2-135M (an independent judge, its own tokenizer) and
   under the reference tiny GPT, plus the share of distinct bigrams (repetition).
3. Trajectories for prompt 7 (the running sequence's opening) at 48, 12 and 6 steps, for the page animation.
Writes out/diffusion_eval.json.
"""
import json, sys, time
import torch
import torch.nn.functional as F

import fo_common as C
from fo_common import MASK, SCR, Batches, load_ref, tokenizer, eval_prompts
from tiny_gpt import GPT, GPTConfig

torch.set_num_threads(4)
C.enable_masks()
MASK_ID = 4096
GEN = 48


RUN = sys.argv[1] if len(sys.argv) > 1 else "fo_diffusion"


def load_diff():
    ck = torch.load(SCR / "runs" / RUN / "ckpt.pt", map_location="cpu", weights_only=False)
    m = GPT(GPTConfig(**ck["config"])); m.load_state_dict(ck["model"]); m.eval()
    return m, ck["shift"]


@torch.no_grad()
def diff_logits(m, x, shift):
    MASK.update(mode="bidir")
    lg, *_ = m(x)
    MASK.update(mode="causal")
    if shift:
        lg = torch.cat([lg[:, :1], lg[:, :-1]], 1)
    lg = lg.float(); lg[..., MASK_ID] = float("-inf")
    return lg


@torch.no_grad()
def fill_in(diff, shift, ref):
    out = {}
    b = Batches("val", 16, 256, 4321); x0 = b.next()[:, :256]
    for rate in (0.15, 0.5, 0.9):
        g = torch.Generator().manual_seed(5)
        masked = torch.rand(x0.shape, generator=g) < rate
        masked[:, 0] = False
        xt = torch.where(masked, torch.full_like(x0, MASK_ID), x0)
        lg = diff_logits(diff, xt, shift)
        ce_d = F.cross_entropy(lg.transpose(1, 2), x0, reduction="none")[masked]
        acc_d = (lg.argmax(-1) == x0)[masked].float()
        lr, *_ = ref(x0[:, :-1])                                  # causal: position i-1 predicts token i
        lr = torch.cat([lr[:, :1], lr], 1).float()
        ce_r = F.cross_entropy(lr.transpose(1, 2), x0, reduction="none")[masked]
        acc_r = (lr.argmax(-1) == x0)[masked].float()
        out[str(rate)] = {"n_masked": int(masked.sum()), "diffusion_loss": round(ce_d.mean().item(), 4),
                          "diffusion_top1": round(acc_d.mean().item(), 4), "causal_loss": round(ce_r.mean().item(), 4),
                          "causal_top1": round(acc_r.mean().item(), 4)}
        print("fill", rate, out[str(rate)], flush=True)
    return out


@torch.no_grad()
def diffuse(m, shift, ids, steps, remask="low", seed=0, trace=False):
    P = len(ids)
    x = torch.tensor([ids + [MASK_ID] * GEN])
    g = torch.Generator().manual_seed(seed)
    per = [GEN // steps + (1 if i < GEN % steps else 0) for i in range(steps)]
    tr = []
    for s in range(steps):
        lg = diff_logits(m, x, shift)[0, P:]
        prob = lg.softmax(-1); conf, pred = prob.max(-1)
        still = x[0, P:] == MASK_ID
        score = conf if remask == "low" else torch.rand(GEN, generator=g)
        score = score.masked_fill(~still, -1.0)
        pick = score.topk(per[s]).indices
        x[0, P + pick] = pred[pick]
        if trace:
            tr.append({"commit": sorted(pick.tolist()), "guess": pred.tolist(),
                       "conf": [round(c, 3) for c in conf.tolist()]})
    return x[0, P:].tolist(), tr


@torch.no_grad()
def ar(ref, ids, temp=0.0, seed=0):
    g = torch.Generator().manual_seed(seed)
    out = ref.generate(torch.tensor([ids]), GEN, temperature=temp, generator=g)
    return out[0, len(ids):].tolist()


def distinct2(t):
    bg = list(zip(t, t[1:]))
    return len(set(bg)) / max(1, len(bg))


def main():
    t0 = time.time()
    tok = tokenizer()
    ref = load_ref().eval()
    diff, shift = load_diff()
    res = {"shift": shift, "fill_in": fill_in(diff, shift, ref)}
    from transformers import AutoModelForCausalLM, AutoTokenizer
    jt = AutoTokenizer.from_pretrained("HuggingFaceTB/SmolLM2-135M", revision="93efa2f097d58c2a74874c7e644dbc9b0cee75a2")
    jm = AutoModelForCausalLM.from_pretrained("HuggingFaceTB/SmolLM2-135M", revision="93efa2f097d58c2a74874c7e644dbc9b0cee75a2",
                                              torch_dtype=torch.float32).eval()

    @torch.no_grad()
    def judge(prompt_text, cont_ids):
        a = jt(prompt_text)["input_ids"]; full = jt(prompt_text + tok.decode(cont_ids))["input_ids"]
        n = len(full) - len(a)
        lg = jm(torch.tensor([full])).logits[0, :-1].float()
        ce = F.cross_entropy(lg, torch.tensor(full[1:]), reduction="none")[-n:]
        return ce.mean().item()

    @torch.no_grad()
    def self_judge(ids, cont):
        x = torch.tensor([ids + cont]); lg, *_ = ref(x[:, :-1])
        ce = F.cross_entropy(lg[0].float(), x[0, 1:], reduction="none")[-len(cont):]
        return ce.mean().item()

    prompts = eval_prompts()["prompts"]
    settings = [("ar_greedy", None, None), ("ar_t0.8", None, None)] + \
               [(f"diff_{k}_low", k, "low") for k in (48, 24, 12, 6, 3)] + [(f"diff_{k}_random", k, "random") for k in (48, 12)]
    gens = {s[0]: [] for s in settings}
    timing = {}
    for i, ptxt in enumerate(prompts):
        ids = [0] + tok.encode(ptxt).ids
        for name, k, rm in settings:
            ts = time.time()
            if name == "ar_greedy":
                c = ar(ref, ids)
            elif name == "ar_t0.8":
                c = ar(ref, ids, 0.8, seed=i)
            else:
                c, _ = diffuse(diff, shift, ids, k, rm, seed=i)
            timing.setdefault(name, []).append(time.time() - ts)
            gens[name].append({"prompt": i + 1, "text": tok.decode(c), "judge": round(judge(ptxt, c), 4),
                               "self": round(self_judge(ids, c), 4), "distinct2": round(distinct2(c), 4)})
        print("prompt", i + 1, f"{time.time() - t0:.0f}s", flush=True)
    summ = {}
    for name, k, rm in settings:
        g = gens[name]
        summ[name] = {"steps": k or GEN, "forwards": k or GEN, "tokens_per_forward": round(GEN / (k or GEN), 2),
                      "judge_loss": round(sum(r["judge"] for r in g) / len(g), 3),
                      "self_loss": round(sum(r["self"] for r in g) / len(g), 3),
                      "distinct2": round(sum(r["distinct2"] for r in g) / len(g), 3),
                      "cpu_ms_per_sample": round(1000 * sum(timing[name]) / len(timing[name]))}
    res["summary"] = summ; res["generations"] = gens
    ids = [0] + tok.encode(prompts[6]).ids
    res["trace_prompt"] = prompts[6]
    res["trace"] = {}
    for k in (48, 12, 6):
        c, tr = diffuse(diff, shift, ids, k, "low", seed=6, trace=True)
        res["trace"][str(k)] = {"final": [tok.decode([t]) for t in c],
                                "steps": [{"commit": s["commit"], "guess": [tok.decode([t]) for t in s["guess"]],
                                           "conf": s["conf"]} for s in tr]}
    a = ar(ref, ids)
    res["trace"]["ar"] = {"final": [tok.decode([t]) for t in a]}
    res["prompt_tokens"] = len(ids)
    res["seconds"] = round(time.time() - t0, 1)
    res["note"] = "measured on Apple M1 Pro (CPU, 4 threads, nice 15), torch " + torch.__version__
    res["run"] = RUN
    C.dump("diffusion_eval.json" if RUN == "fo_diffusion" else f"diffusion_eval_{RUN}.json", res)
    print(json.dumps(summ, indent=1))


if __name__ == "__main__":
    main()
