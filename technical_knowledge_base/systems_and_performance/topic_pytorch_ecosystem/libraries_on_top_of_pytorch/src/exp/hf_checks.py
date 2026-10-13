"""Hugging Face transformers 5.19.0 facts checked by running them (no download: tiny random models from configs).

1. attn_implementation: the default, and "eager" / "sdpa" / "flex_attention" on a tiny Llama, CPU and MPS,
   forward and backward, logits compared with eager.
2. A transformers causal LM accepts **kwargs, so the Trainer passes num_items_in_batch and its loss is
   sum / num_items_in_batch: checked against a hand computation.
3. The Trainer's get_decay_parameter_names on the running example.
Deterministic, no timing. Run: python hf_checks.py"""
from common import *
import torch.nn.functional as F
torch.set_num_threads(2)
import transformers
from transformers import LlamaConfig, LlamaForCausalLM

res = {}
cfgL = LlamaConfig(vocab_size=128, hidden_size=64, intermediate_size=128, num_hidden_layers=2, num_attention_heads=4,
                   num_key_value_heads=2, max_position_embeddings=64)
ids = torch.randint(0, 128, (2, 32), generator=torch.Generator().manual_seed(0))


def build(impl, device):
    import copy
    torch.manual_seed(0)
    kw = {} if impl is None else {"attn_implementation": impl}
    return LlamaForCausalLM._from_config(copy.deepcopy(cfgL), **kw).to(device)


ref = None
att = {}
for dev in ["cpu", "mps"]:
    for impl in [None, "eager", "sdpa", "flex_attention"]:
        key = f"{impl or 'default'}@{dev}"
        r = {}
        try:
            m = build(impl, dev)
            r["chosen"] = m.config._attn_implementation
            out = m(ids.to(dev), labels=ids.to(dev))
            lg = out.logits.detach().float().cpu()
            if ref is None:
                ref = build("eager", "cpu")(ids, labels=ids).logits.detach()
            r["max_abs_diff_vs_eager_cpu"] = float((lg - ref).abs().max())
            r["forward"] = "ok"
            try:
                out.loss.backward(); r["backward"] = "ok"
            except Exception as e:
                r["backward"] = "error: " + clean(e, 200)
        except Exception as e:
            r["forward"] = "error: " + clean(e, 240)
        try:   # inference only (no autograd)
            with torch.no_grad():
                lg = build(impl, dev)(ids.to(dev)).logits.float().cpu()
            r["no_grad_forward"] = "ok, max abs diff vs eager CPU %.2e" % float((lg - ref).abs().max()) if ref is not None else "ok"
        except Exception as e:
            r["no_grad_forward"] = "error: " + clean(e, 240)
        att[key] = r
        print(key, r)
res["attn"] = att
res["attention_functions"] = sorted(transformers.modeling_utils.AttentionInterface._global_mapping.keys())

# 2. num_items_in_batch
m = build("sdpa", "cpu")
import inspect
res["accepts_loss_kwargs"] = bool(getattr(m, "accepts_loss_kwargs", None)) if hasattr(m, "accepts_loss_kwargs") else \
    any(p.kind == p.VAR_KEYWORD for p in inspect.signature(m.forward).parameters.values())
labels = ids.clone(); labels[0, 20:] = -100
n = int((labels[..., 1:] != -100).sum())
with torch.no_grad():
    lg = m(ids).logits
    s = F.cross_entropy(lg[:, :-1].reshape(-1, 128).float(), labels[:, 1:].reshape(-1), reduction="sum", ignore_index=-100)
    l_mean = m(ids, labels=labels).loss
    l_items = m(ids, labels=labels, num_items_in_batch=torch.tensor(3 * n)).loss
res["num_items"] = {"valid_targets": n, "mean_loss": round(l_mean.item(), 6), "sum_over_n": round((s / n).item(), 6),
                    "loss_with_num_items_3n": round(l_items.item(), 6), "sum_over_3n": round((s / (3 * n)).item(), 6),
                    "note": "the model shifts labels itself: targets are labels[:, 1:]"}
print(res["num_items"], res["accepts_loss_kwargs"])

# 3. decay parameter names on the running example
from transformers import Trainer, TrainingArguments
from model import GPTConfig, make_model
g = make_model(GPTConfig())
names = Trainer.get_decay_parameter_names(None, g)
pdict = dict(g.named_parameters(remove_duplicate=False))
hf_ids = {id(pdict[n]) for n in names}
res["decay_names"] = {"names": len(names), "tensors": len(hf_ids), "all_tensors": len(list(g.parameters())),
                      "same_tensors_as_plain_loop": hf_ids == {id(p) for p in g.parameters() if p.dim() >= 2},
                      "aliases": sorted(set(names) - {n for n, p in g.named_parameters()})}
print(res["decay_names"])
save("hf_checks", res)
