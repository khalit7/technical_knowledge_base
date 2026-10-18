"""CPU analysis of one trained tiny-GPT run for the MoE child page (inference only, 4 threads, low priority).

Run: LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=4 nice -n 15 <venv>/bin/python src/analysis/analyse.py <run name> [...]
Writes src/analysis/out/<run>.json: held-out loss and expert load per layer (20 fixed validation batches of 32 x 256,
the same windows as train.py's held-out loss), router choices on the running sequence, and for MoE runs the
interventions (capacity factor at inference, batch size, top-k at inference, masking the top experts, the shared
expert switched off) on the first 10 of those batches, plus which tokens each expert takes.
"""
import json, os, sys, time
import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import moe_probe as P  # noqa: E402
from tokenizers import Tokenizer  # noqa: E402

OUT = os.path.join(P.HERE, "out")
torch.set_num_threads(4)
TOK = Tokenizer.from_file(os.path.join(P.DATA, "tokenizer.json"))
RUN = json.load(open(os.path.join(P.DATA, "running_sequence.json")))


def r3(v):
    return round(float(v), 3)


@torch.inference_mode()
def loss_and_load(model, batches, **opts):
    P.set_opts(model, **opts)
    tot, n_drop, n_ass, all_drop, n_tok = 0.0, 0, 0, 0, 0
    E = model.cfg.n_experts
    loads = [torch.zeros(E, dtype=torch.long) for b in model.blocks if b.is_moe]
    batch_vio = [[] for _ in loads]
    top1 = [torch.zeros(E, dtype=torch.long) for _ in loads]
    ent, p1 = [0.0] * len(loads), [0.0] * len(loads)
    for x, y in batches:
        _, loss, _, rec = model(x, targets=y)
        tot += loss.item()
        j = 0
        for b in model.blocks:
            if not b.is_moe:
                continue
            L = b.ffn.last
            loads[j] += L["load"]
            lf = L["load"].float()
            batch_vio[j].append(float((lf.max() - lf.mean()) / lf.mean()))
            top1[j] += torch.bincount(L["top_i"][..., 0].flatten(), minlength=E)
            n_drop += L["dropped_frac"] * L["top_i"].numel(); n_ass += L["top_i"].numel()
            all_drop += L["tok_all_dropped"]; n_tok += x.numel()
            j += 1
    P.set_opts(model)
    res = {"loss": round(tot / len(batches), 4)}
    if loads:
        res["load"] = [l.tolist() for l in loads]
        res["maxvio_global"] = [r3((l.max() - l.float().mean()) / l.float().mean()) for l in loads]
        res["maxvio_batch"] = [r3(sum(v) / len(v)) for v in batch_vio]
        res["top1"] = [t.tolist() for t in top1]
        res["dropped_assign_frac"] = round(n_drop / max(1, n_ass), 4)
        res["tokens_all_dropped_frac"] = round(all_drop / max(1, n_tok), 4)
    return res


@torch.inference_mode()
def router_entropy(model, batches):
    """Mean entropy (nats) of the full router distribution and mean top-1 score, per MoE layer (softmax routers);
    for sigmoid routers the scores are normalised to sum 1 first."""
    P.set_opts(model, record_probs=True)
    out = []
    acc = None
    for x, _ in batches:
        model(x)
        cur = []
        for b in model.blocks:
            if not b.is_moe:
                continue
            s = b.ffn.last["scores"].reshape(-1, model.cfg.n_experts)
            p = s / s.sum(-1, keepdim=True)
            cur.append([float(-(p * p.clamp_min(1e-12).log()).sum(-1).mean()), float(p.max(-1).values.mean())])
        acc = cur if acc is None else [[a[0] + c[0], a[1] + c[1]] for a, c in zip(acc, cur)]
    P.set_opts(model)
    return [[r3(a[0] / len(batches)), r3(a[1] / len(batches))] for a in acc]


@torch.inference_mode()
def running_sequence(model):
    ids = torch.tensor([RUN["ids"]])
    P.set_opts(model, record_probs=True)
    logits, *_ = model(ids)
    P.set_opts(model)
    lp = torch.log_softmax(logits[0, :-1].float(), -1).gather(-1, ids[0, 1:, None])[:, 0]
    res = {"mean_loss": round(-lp.mean().item(), 4)}
    if model.cfg.n_experts:
        lay = []
        for b in model.blocks:
            if not b.is_moe:
                continue
            L = b.ffn.last
            lay.append({"top_i": L["top_i"][0].tolist(), "top_w": [[r3(w) for w in row] for row in L["top_w"][0].tolist()],
                        "scores64": [[r3(w) for w in row] for row in L["scores"][0, :64].tolist()],
                        "logits8": [[r3(w) for w in row] for row in L["logits"][0, 1:9].tolist()],
                        "e_bias": [round(float(v), 4) for v in b.ffn.e_bias.tolist()]})
        res["layers"] = lay
    return res


@torch.inference_mode()
def specialisation(model, batches, n_top=6):
    """For each layer and expert: the tokens it most often takes as top-1 choice, with the share of that token's
    occurrences routed there; and how deterministic the top-1 choice is given the token id alone."""
    P.set_opts(model)
    E, V = model.cfg.n_experts, model.cfg.vocab_size
    cnt = None
    for x, _ in batches:
        model(x)
        j = 0
        for b in model.blocks:
            if not b.is_moe:
                continue
            t1 = b.ffn.last["top_i"][..., 0].flatten()
            if cnt is None:
                cnt = [torch.zeros(V, E, dtype=torch.long) for bb in model.blocks if bb.is_moe]
            cnt[j].index_put_((x.flatten(), t1), torch.ones_like(t1), accumulate=True)
            j += 1
    res = []
    for c in cnt:
        tot = c.sum(1)
        det = float((c.max(1).values.sum()) / tot.sum())          # P(top-1 = the token's most common expert)
        ex = []
        for e in range(E):
            order = torch.argsort(c[:, e], descending=True)[:n_top]
            ex.append([[TOK.id_to_token(int(t)).replace("Ġ", " "), int(c[t, e]), r3(c[t, e] / tot[t])]
                       for t in order if c[t, e] > 0])
        res.append({"determinism": r3(det), "experts": ex})
    return res


@torch.inference_mode()
def samples(model, prompts, n_new=40):
    out = []
    for p in prompts:
        x = torch.tensor([[0] + TOK.encode(p).ids])
        g = model.generate(x, n_new)[0, x.shape[1]:].tolist()
        g = g[: g.index(0)] if 0 in g else g
        out.append({"prompt": p, "greedy": TOK.decode(g)})
    return out


def main(name):
    t0 = time.time()
    model = P.load(name)
    cfg = model.cfg
    full = P.val_batches(20)
    ten = full[:10]
    res = {"run": name, "config": {k: getattr(cfg, k) for k in ("n_experts", "top_k", "n_shared", "moe_hidden", "router",
                                                              "balance", "capacity_factor", "ffn_hidden")},
           "params": model.param_groups(), "torch": torch.__version__, "device": "cpu"}
    if cfg.n_experts:
        res["identical_check_max_abs"] = P.check_identical(model, full[0][0][:4])
    res["heldout"] = loss_and_load(model, full)
    res["running"] = running_sequence(model)
    prompts = json.load(open(os.path.join(P.DATA, "eval_prompts.json")))["prompts"]
    res["samples"] = samples(model, [prompts[6], prompts[0]])
    if cfg.n_experts:
        E, k = cfg.n_experts, cfg.top_k
        res["entropy_top1"] = router_entropy(model, ten[:4])
        res["cf_sweep"] = {str(cf): loss_and_load(model, ten, capacity_factor=cf)
                           for cf in (0.5, 0.75, 1.0, 1.25, 1.5, 2.0, None)}
        # capacity is computed per batch: the same factor with fewer tokens per batch drops more
        bs = {}
        for nseq in (1, 4, 32):
            bb = [(x[i:i + nseq], y[i:i + nseq]) for x, y in ten[:2] for i in range(0, 32, nseq)]
            bs[str(nseq)] = loss_and_load(model, bb, capacity_factor=1.25)
        res["cf125_by_batch"] = bs
        res["topk_infer"] = {str(kk): loss_and_load(model, ten, top_k=kk)["loss"] for kk in range(1, min(E, 2 * k + 2) + 1)}
        res["mask_top"] = {str(m): loss_and_load(model, ten, mask_top=m)["loss"] for m in (0, 1, 2)}
        if cfg.n_shared:
            res["no_shared"] = loss_and_load(model, ten, no_shared=True)["loss"]
            res["no_shared_plus1"] = loss_and_load(model, ten, no_shared=True, top_k=k + cfg.n_shared)["loss"]
        res["special"] = specialisation(model, ten[:5])
    res["seconds"] = round(time.time() - t0, 1)
    P.jdump(res, os.path.join(OUT, name + ".json"))
    print(name, "loss", res["heldout"]["loss"], "maxvio", res["heldout"].get("maxvio_global"), res["seconds"], "s", flush=True)


if __name__ == "__main__":
    for n in sys.argv[1:]:
        main(n)
