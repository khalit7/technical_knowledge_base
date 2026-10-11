"""Shared helpers for the speculative-decoding experiments (MLX, real Qwen3 models).
Distributions are computed by a full forward pass over prompt + prefix (no KV cache), cached by prefix,
so every call for the same prefix returns the same numbers."""
import numpy as np, mlx.core as mx
from mlx_lm import load

PROMPTS = {
 "sea": "Write one sentence about the sea.",
 "animal": "Name an animal and say one thing about it.",
 "code_edit": "Here is a Python function:\n\ndef mean(xs):\n    total = 0\n    for x in xs:\n        total += x\n    return total / len(xs)\n\nRewrite it so it returns 0.0 for an empty list, adds type hints and a docstring, and keeps everything else the same. Show the full function.",
 "summarize": "Summarize in about 150 words why large language model inference is usually limited by memory bandwidth during decoding and by compute during prompt processing.",
 "story": "Write a short story of about 200 words about a lighthouse keeper who finds a message in a bottle.",
 "list": "List the numbers from 1 to 60, one per line, each followed by its square, like '1: 1'.",
}

def chat_ids(tok, q):
    return tok.apply_chat_template([{"role": "user", "content": q}], add_generation_prompt=True, enable_thinking=False)

class Dist:
    """p(. | prompt + prefix) after temperature T and top-k K, as (ids, probs) sorted by prob desc."""
    def __init__(self, model, prompt_ids, T=1.0, K=50):
        self.m, self.p, self.T, self.K, self.cache, self.calls = model, list(prompt_ids), T, K, {}, 0
    def logits(self, prefix):
        x = mx.array([self.p + list(prefix)])
        lg = self.m(x)[0, -1].astype(mx.float32)
        mx.eval(lg); self.calls += 1
        return np.array(lg, dtype=np.float64)
    def __call__(self, prefix):
        key = tuple(prefix)
        if key not in self.cache:
            lg = self.logits(prefix)
            if self.T == 0:
                i = int(np.argmax(lg)); self.cache[key] = (np.array([i]), np.array([1.0]))
            else:
                ids = np.argpartition(-lg, self.K)[: self.K]
                z = lg[ids] / self.T; z -= z.max(); pr = np.exp(z); pr /= pr.sum()
                o = np.argsort(-pr); self.cache[key] = (ids[o], pr[o])
        return self.cache[key]

def as_dict(d):
    return dict(zip(d[0].tolist(), d[1].tolist()))

def load_pair(models_dir, target="Qwen3-1.7B-4bit", draft="Qwen3-0.6B-4bit"):
    tm, tok = load(models_dir + "/mlx/" + target)
    dm, _ = load(models_dir + "/mlx/" + draft)
    return tm, dm, tok
