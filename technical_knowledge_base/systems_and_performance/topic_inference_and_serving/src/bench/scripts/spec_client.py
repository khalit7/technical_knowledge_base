"""Send fixed prompts to llama-server /completion (non-streaming, greedy) and record its timings
(predicted_per_second, draft_n, draft_n_accepted). usage: spec_client.py URL OUT LABEL REPS"""
import json, sys, time, urllib.request
url, out, label, reps = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
T = "<|im_start|>user\n{q} /no_think<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n"
PROMPTS = {
 "code_edit": "Here is a Python function:\n\ndef mean(xs):\n    total = 0\n    for x in xs:\n        total += x\n    return total / len(xs)\n\nRewrite it so it returns 0.0 for an empty list, adds type hints and a docstring, and keeps everything else the same. Show the full function.",
 "summarize": "Summarize in about 150 words why large language model inference is usually limited by memory bandwidth during decoding and by compute during prompt processing.",
 "story": "Write a short story of about 200 words about a lighthouse keeper who finds a message in a bottle.",
 "list": "List the numbers from 1 to 60, one per line, each followed by its square, like '1: 1'.",
}
res = []
for r in range(reps):
    for k, q in PROMPTS.items():
        body = json.dumps({"prompt": T.format(q=q), "n_predict": 256, "temperature": 0, "cache_prompt": False}).encode()
        t0 = time.perf_counter()
        j = json.load(urllib.request.urlopen(urllib.request.Request(url + "/completion", body, {"Content-Type": "application/json"}), timeout=600))
        wall = time.perf_counter() - t0
        t = j.get("timings", {})
        res.append({"rep": r, "prompt": k, "wall": wall, "n_out": t.get("predicted_n"), "tok_s": t.get("predicted_per_second"),
                    "prompt_ms": t.get("prompt_ms"), "draft_n": t.get("draft_n"), "draft_accepted": t.get("draft_n_accepted"),
                    "text_head": j.get("content", "")[:80]})
        print(label, k, r, round(t.get("predicted_per_second", 0), 1), t.get("predicted_n"), t.get("draft_n"), t.get("draft_n_accepted"), flush=True)
json.dump({"label": label, "runs": res}, open(out, "w"))
