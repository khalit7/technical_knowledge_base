"""Smoke test of the inspection model(s): eager attention maps and hidden-state norms on the running sequence.

The running sequence's TEXT is re-tokenised with each model's own tokenizer (its ids differ from the tiny GPT's).
Run (bench lock held, MPS capped):
  PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 <venv>/bin/python src/data/pretrained_smoke.py
Writes src/data/smoke/pretrained_smoke.json (summary numbers only).
"""
import json, os, resource, time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = [("HuggingFaceTB/SmolLM2-135M", "93efa2f097d58c2a74874c7e644dbc9b0cee75a2", torch.float32),
          ("Qwen/Qwen3-0.6B", "c1899de289a04d12100db370d81485cdf75e47ca", torch.float16)]


@torch.inference_mode()
def main():
    torch.set_num_threads(4)
    dev = "mps" if torch.backends.mps.is_available() else "cpu"
    text = json.load(open(os.path.join(HERE, "running_sequence.json")))["text"]
    out = {"device": dev, "torch": torch.__version__, "models": []}
    for repo, rev, dt in MODELS:
        t0 = time.time()
        tok = AutoTokenizer.from_pretrained(repo, revision=rev)
        m = AutoModelForCausalLM.from_pretrained(repo, revision=rev, dtype=dt, attn_implementation="eager").to(dev).eval()
        t_load = time.time() - t0
        ids = tok(text, return_tensors="pt").input_ids.to(dev)
        t1 = time.time()
        o = m(ids, output_attentions=True, output_hidden_states=True)
        if dev == "mps":
            torch.mps.synchronize()
        t_fwd = time.time() - t1
        att = [a[0].float() for a in o.attentions]                        # L x (H, T, T)
        sink = [round(a[:, 8:, 0].mean().item(), 4) for a in att]        # mass on token 0, queries past position 8
        prev = [round(torch.diagonal(a, -1, -2, -1).mean().item(), 4) for a in att]  # mass on the previous token
        norms = [round(h[0].float().norm(dim=-1).median().item(), 2) for h in o.hidden_states]
        lp = torch.log_softmax(o.logits[0, :-1].float(), -1).gather(-1, ids[0, 1:, None])
        out["models"].append({"repo": repo, "revision": rev, "dtype": str(dt).replace("torch.", ""),
                              "params": sum(p.numel() for p in m.parameters()),
                              "n_tokens": ids.shape[1], "load_s": round(t_load, 2), "forward_s": round(t_fwd, 3),
                              "running_text_loss": round(-lp.mean().item(), 4),
                              "attn_shape_per_layer": list(o.attentions[0].shape), "n_layers": len(att),
                              "sink_mass_by_layer": sink, "prev_token_mass_by_layer": prev,
                              "median_resid_norm_by_layer": norms,
                              "mps_driver_mb": round(torch.mps.driver_allocated_memory() / 1e6) if dev == "mps" else None,
                              "peak_rss_mb": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1e6)})
        print(json.dumps({k: out["models"][-1][k] for k in ("repo", "n_tokens", "load_s", "forward_s", "running_text_loss", "mps_driver_mb", "peak_rss_mb")}))
        del m, o, att
        if dev == "mps":
            torch.mps.empty_cache()
    os.makedirs(os.path.join(HERE, "smoke"), exist_ok=True)
    json.dump(out, open(os.path.join(HERE, "smoke", "pretrained_smoke.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
