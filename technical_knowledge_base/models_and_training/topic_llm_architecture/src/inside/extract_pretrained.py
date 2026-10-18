"""Inside a real model (tab t-inside): everything measured on the two small open models.

For SmolLM2-135M (fp32) and Qwen3-0.6B (fp16), eager attention (the only path that returns attention weights):
  1. the running sequence's text (re-tokenised with the model's own tokenizer, no BOS, as the tokenizer does by default):
     every attention map, the residual stream after every layer (massive activations, norms), the logit lens;
  2. a repeated random token sequence (<|endoftext|> + R + R, R = 100 random ids, 8 seeds): per-token loss on each copy,
     per-head induction and previous-token scores;
  3. the sink ablation: loss on the running text when no query may attend to token 0 (key 0 masked in every layer),
     and with <|endoftext|> prepended;
  4. window attention on a long text (validation stories, 1,024 tokens): full attention, a 64-token window,
     and the same window keeping the first 4 tokens (the StreamingLLM experiment, done with masks: RoPE is relative,
     so masking keys equals evicting them from the cache with positions unchanged).
Writes raw arrays to $LA_SCRATCH/in/<model>/ (scratch, large) and a summary JSON there; make_page_data.py builds the page data.

Run under the bench lock with the MPS cap:
  PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4 nice -n 15 \
    $LA_SCRATCH/venv/bin/python src/inside/extract_pretrained.py [smol|qwen]
"""
import json, os, resource, sys, time
import numpy as np
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, AttentionInterface
from transformers.models.llama.modeling_llama import repeat_kv

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
SCR = os.environ["LA_SCRATCH"]
MODELS = {"smol": ("HuggingFaceTB/SmolLM2-135M", "93efa2f097d58c2a74874c7e644dbc9b0cee75a2", torch.float32, 0),
          "qwen": ("Qwen/Qwen3-0.6B", "c1899de289a04d12100db370d81485cdf75e47ca", torch.float16, 151643)}
L_RAND, N_SEEDS, WIN, N_SINK, LONG_T = 100, 8, 64, 4, 1024

# ---- a custom attention function: eager attention with an extra rule on which keys a query may see ----
MASK_RULE = {"rule": None}   # None, ("nokey0",), ("window", W, n_sink)


def rule_mask(Tq, Tk, device):
    q = torch.arange(Tk - Tq, Tk, device=device)[:, None]; k = torch.arange(Tk, device=device)[None, :]
    ok = k <= q                                          # causal
    r = MASK_RULE["rule"]
    if r and r[0] == "nokey0":
        ok = ok & ((k > 0) | (q == 0))                   # nobody but token 0 itself may look at token 0
    if r and r[0] == "window":
        W, ns = r[1], r[2]
        ok = ok & ((q - k < W) | (k < ns))               # the last W keys, plus the first ns tokens if kept
    return ok


def masked_eager(module, query, key, value, attention_mask, scaling, dropout=0.0, **kw):
    # same arithmetic as transformers' eager_attention_forward (models/llama/modeling_llama.py), mask built here
    k = repeat_kv(key, module.num_key_value_groups); v = repeat_kv(value, module.num_key_value_groups)
    w = torch.matmul(query, k.transpose(2, 3)) * scaling
    w = w.masked_fill(~rule_mask(w.shape[-2], w.shape[-1], w.device), torch.finfo(w.dtype).min)
    w = torch.nn.functional.softmax(w, dim=-1, dtype=torch.float32).to(query.dtype)
    out = torch.matmul(w, v).transpose(1, 2).contiguous()
    return out, w


AttentionInterface.register("in_masked", masked_eager)


def token_loss(logits, ids):
    lp = torch.log_softmax(logits[0, :-1].float(), -1)
    return -lp.gather(-1, ids[0, 1:, None])[:, 0]       # (T-1,) loss of predicting token t+1


def chunked_loss(m, x, chunk=128):
    """Per-token loss without materialising (T, vocab) float32 logits at once (Qwen3's vocab is 151,936)."""
    h = m.model(x).last_hidden_state[0]
    out = []
    for i in range(0, h.shape[0] - 1, chunk):
        lg = m.lm_head(h[i:i + chunk]).float()
        tgt = x[0, i + 1:i + 1 + chunk]
        lg = lg[:tgt.shape[0]]
        out.append(-torch.log_softmax(lg, -1).gather(-1, tgt[:, None])[:, 0])
    return torch.cat(out)


def long_text(tok, n):
    """Validation stories 1, 2, 3, ... of TinyStories joined with blank lines, cut to n tokens."""
    import pyarrow.parquet as pq
    p = os.path.join(SCR, "dl", "tinystories")
    f = [x for x in os.listdir(p) if x.startswith("validation")][0]
    stories = pq.read_table(os.path.join(p, f)).column("text").to_pylist()
    text, i = "", 1
    while len(tok(text).input_ids) < n + 10:
        text += stories[i].strip() + "\n\n"; i += 1
    return tok(text).input_ids[:n], i - 1


@torch.inference_mode()
def main(key):
    torch.set_num_threads(4)
    repo, rev, dt, eot = MODELS[key]
    dev = "mps" if torch.backends.mps.is_available() else "cpu"
    out_dir = os.path.join(SCR, "in", key); os.makedirs(out_dir, exist_ok=True)
    tok = AutoTokenizer.from_pretrained(repo, revision=rev)
    m = AutoModelForCausalLM.from_pretrained(repo, revision=rev, dtype=dt, attn_implementation="in_masked").to(dev).eval()
    cfg = m.config
    S = {"repo": repo, "revision": rev, "dtype": str(dt).replace("torch.", ""), "device": dev, "torch": torch.__version__,
         "n_layers": cfg.num_hidden_layers, "n_heads": cfg.num_attention_heads, "n_kv_heads": cfg.num_key_value_heads,
         "d_model": cfg.hidden_size, "vocab": cfg.vocab_size, "tied": bool(cfg.tie_word_embeddings)}
    t0 = time.time()

    # 1. running text
    text = json.load(open(os.path.join(DATA, "running_sequence.json")))["text"]
    ids = torch.tensor([tok(text).input_ids], device=dev)
    MASK_RULE["rule"] = None
    stream = []                                                                   # raw residual stream: embedding output, then after each layer
    grab = lambda mod, i, out: stream.append((out[0] if isinstance(out, tuple) else out)[0].float())
    hooks = [m.model.embed_tokens.register_forward_hook(grab)] + [l.register_forward_hook(grab) for l in m.model.layers]
    o = m(ids, output_attentions=True)
    for h in hooks: h.remove()
    att = torch.stack([a[0].cpu().float() for a in o.attentions])                 # (L, H, T, T)
    resid = torch.stack(stream)                                                   # (L+1, T, d) before any final norm
    tl = token_loss(o.logits, ids).cpu()
    S["running"] = {"n_tokens": ids.shape[1], "loss": round(tl.mean().item(), 4)}
    np.savez_compressed(os.path.join(out_dir, "running.npz"), ids=ids[0].cpu().numpy(), att=att.half().numpy(),
                        tok_loss=tl.numpy())
    # logit lens: the model's final norm + lm_head applied to the stream after each layer (layer 0 = embedding output)
    norm, head = m.model.norm, m.lm_head
    final_lp = torch.log_softmax(o.logits[0].float(), -1)
    lens_top, lens_p, lens_tgt, lens_kl = [], [], [], []
    for li in range(resid.shape[0]):
        lg = head(norm(resid[li].to(dt))).float()
        if li == resid.shape[0] - 1:
            S["lens_last_matches_logits_maxabs"] = round((lg - o.logits[0].float()).abs().max().item(), 5)
        lp = torch.log_softmax(lg, -1)
        top = lp.topk(3, -1)
        lens_top.append(top.indices.cpu()); lens_p.append(top.values.exp().cpu())
        lens_tgt.append(-lp[:-1].gather(-1, ids[0, 1:, None])[:, 0].cpu())
        lens_kl.append((final_lp.exp() * (final_lp - lp)).sum(-1).cpu())
    np.savez_compressed(os.path.join(out_dir, "lens.npz"), top=torch.stack(lens_top).numpy(), p=torch.stack(lens_p).numpy(),
                        tgt=torch.stack(lens_tgt).numpy(), kl=torch.stack(lens_kl).numpy())
    resid = resid.cpu()
    S["resid_shape"] = list(resid.shape)
    S["resid_max_abs"] = round(resid.abs().max().item(), 2)
    np.savez_compressed(os.path.join(out_dir, "resid.npz"), x=resid.numpy().astype(np.float32))
    del stream
    del o, att
    if dev == "mps": torch.mps.empty_cache()

    # 2. repeated random sequences
    g = torch.Generator().manual_seed(0)
    R = torch.randint(1000, min(cfg.vocab_size, 49152) - 1, (N_SEEDS, L_RAND), generator=g)
    seq = torch.cat([torch.full((N_SEEDS, 1), eot), R, R], 1).to(dev)                # (8, 201)
    o = m(seq, output_attentions=True)
    lp = torch.log_softmax(o.logits[:, :-1].float(), -1)
    loss = -lp.gather(-1, seq[:, 1:, None])[..., 0].cpu()                         # (8, 200); index j predicts token j+1
    att = torch.stack([a.cpu().float() for a in o.attentions])                     # (L, B, H, T, T)
    T = seq.shape[1]
    qs = torch.arange(L_RAND + 1, 2 * L_RAND + 1)                                 # queries in the second copy (positions 101..200)
    ind = att[:, :, :, qs, qs - L_RAND + 1].mean(dim=(1, 3))                      # (L, H): mass on the token after the earlier copy
    prev_r = att[:, :, :, torch.arange(2, T), torch.arange(1, T - 1)].mean(dim=(1, 3))
    S["rand"] = {"L": L_RAND, "n_seeds": N_SEEDS, "id_range": [1000, min(cfg.vocab_size, 49152) - 1],
                 "loss_first_copy": round(loss[:, 1:L_RAND].mean().item(), 4),     # predicting tokens 2..100 of copy 1
                 "loss_second_copy": round(loss[:, L_RAND + 1:].mean().item(), 4)}  # predicting tokens 2..100 of copy 2
    np.savez_compressed(os.path.join(out_dir, "rand.npz"), seq=seq.cpu().numpy(), loss=loss.numpy(), ind=ind.numpy(),
                        prev=prev_r.numpy(), att0=att[:, 0].half().numpy())
    del o, att
    if dev == "mps": torch.mps.empty_cache()

    # 3. sink ablation on the running text
    abl = {}
    for name, rule, pre_ids in [("full", None, []), ("no_key0", ("nokey0",), []), ("eot_first", None, [eot]),
                                ("eot_first_no_key0", ("nokey0",), [eot])]:
        MASK_RULE["rule"] = rule
        x = torch.tensor([pre_ids + tok(text).input_ids], device=dev)
        lg = m(x).logits
        tl = token_loss(lg, x)[len(pre_ids):]        # same predicted tokens in every variant (tokens 2..T of the text)
        abl[name] = {"loss": round(tl.mean().item(), 4), "n": int(tl.numel())}
        if name == "eot_first":
            MASK_RULE["rule"] = None
            oo = m(x, output_attentions=True)
            abl[name]["sink_mass_by_layer"] = [round(a[0, :, 8:, 0].float().mean().item(), 4) for a in oo.attentions]
            abl[name]["sink_mass_on_first_text_token"] = [round(a[0, :, 8:, 1].float().mean().item(), 4) for a in oo.attentions]
            del oo
        if name == "no_key0":
            gen_ids = tok("Once upon a time,", return_tensors="pt").input_ids.to(dev)
            for r2, lab in [(None, "greedy_full"), (("nokey0",), "greedy_no_key0")]:
                MASK_RULE["rule"] = r2
                g2 = m.generate(gen_ids, max_new_tokens=40, do_sample=False)
                abl[lab] = tok.decode(g2[0])
    MASK_RULE["rule"] = None
    S["sink_ablation"] = abl

    if dev == "mps": torch.mps.empty_cache()
    # 4. window attention on a long text
    lids, n_st = long_text(tok, LONG_T)
    x = torch.tensor([lids], device=dev)
    win = {"T": LONG_T, "stories": n_st, "W": WIN, "n_sink": N_SINK}
    curves = {}
    for name, rule in [("full", None), ("window", ("window", WIN, 0)), ("window_sink", ("window", WIN, N_SINK)),
                       ("window_sink1", ("window", WIN, 1))]:
        MASK_RULE["rule"] = rule
        tl = chunked_loss(m, x).cpu()
        curves[name] = tl.numpy()
        if dev == "mps": torch.mps.empty_cache()
        win[name] = {"loss_all": round(tl.mean().item(), 4), "loss_after_W": round(tl[WIN:].mean().item(), 4)}
    MASK_RULE["rule"] = None
    S["window"] = win
    np.savez_compressed(os.path.join(out_dir, "window.npz"), ids=np.array(lids), **curves)

    # 5. what eager vs sdpa gives back (the error a reader hits)
    try:
        m.set_attn_implementation("sdpa")
        oo = m(ids[:, :16], output_attentions=True)
        a = oo.attentions
        S["sdpa_output_attentions"] = "attentions=" + ("None" if a is None else "tuple of %d" % len(a) + ("" if not len(a) else ", first is " + ("None" if a[0] is None else "a tensor")))
    except Exception as e:  # record the message
        S["sdpa_output_attentions"] = type(e).__name__ + ": " + str(e)[:400]
    m.set_attn_implementation("in_masked")

    S["seconds"] = round(time.time() - t0, 1)
    S["mps_driver_mb"] = round(torch.mps.driver_allocated_memory() / 1e6) if dev == "mps" else None
    S["peak_rss_mb"] = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1e6)
    json.dump(S, open(os.path.join(out_dir, "summary.json"), "w"), indent=1)
    print(json.dumps({k: S[k] for k in ("repo", "seconds", "mps_driver_mb", "peak_rss_mb", "running", "rand")}))
    print(json.dumps(S["sink_ablation"])[:1500]); print(json.dumps(S["window"])); print(S["sdpa_output_attentions"])


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "smol")
