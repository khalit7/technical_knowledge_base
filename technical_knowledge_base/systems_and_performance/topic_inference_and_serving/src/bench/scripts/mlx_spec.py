"""MLX speculative decoding: Qwen3-1.7B-4bit target, Qwen3-0.6B-4bit draft, greedy, same four prompts as the llama.cpp test.
usage: mlx_spec.py <models dir> <out json>"""
import json, sys, time
from mlx_lm import load, stream_generate

M, OUT = sys.argv[1], sys.argv[2]
PROMPTS = {
 "code_edit": "Here is a Python function:\n\ndef mean(xs):\n    total = 0\n    for x in xs:\n        total += x\n    return total / len(xs)\n\nRewrite it so it returns 0.0 for an empty list, adds type hints and a docstring, and keeps everything else the same. Show the full function.",
 "summarize": "Summarize in about 150 words why large language model inference is usually limited by memory bandwidth during decoding and by compute during prompt processing.",
 "story": "Write a short story of about 200 words about a lighthouse keeper who finds a message in a bottle.",
 "list": "List the numbers from 1 to 60, one per line, each followed by its square, like '1: 1'.",
}
target, tok = load(M + "/Qwen3-1.7B-4bit")
draft, _ = load(M + "/Qwen3-0.6B-4bit")
res = []
for k in (0, 2, 3, 4, 6):
    for rep in range(3):
        for name, q in PROMPTS.items():
            prompt = tok.apply_chat_template([{"role": "user", "content": q}], add_generation_prompt=True, enable_thinking=False)
            kw = dict(draft_model=draft, num_draft_tokens=k) if k else {}
            n_draft = 0; text = ""; last = None
            for r in stream_generate(target, tok, prompt, max_tokens=256, **kw):
                text += r.text; last = r
                if getattr(r, "from_draft", False):
                    n_draft += 1
            res.append({"k": k, "rep": rep, "prompt": name, "gen_tps": last.generation_tps, "n_out": last.generation_tokens,
                        "from_draft": n_draft, "text": text})
            print(k, rep, name, round(last.generation_tps, 1), last.generation_tokens, n_draft, flush=True)
json.dump({"target": "mlx Qwen3-1.7B-4bit", "draft": "mlx Qwen3-0.6B-4bit (converted here)", "runs": res}, open(OUT, "w"))
