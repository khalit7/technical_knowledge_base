"""Generate model answers to Tulu 3 RLVR prompts with a local Qwen3 model, so the answer checkers can be compared on
real model output (not only on reference solutions). Talks to a llama-server (llama.cpp) on 127.0.0.1:<port>.

Sample: a fixed, stratified draw of RLVR rows (seed 7): n_per rows from each of gsm8k, MATH and ifeval.
Prompt: the row's user message exactly as in the dataset (GSM8K and MATH rows carry their own few-shot examples).
Sampling: Qwen3's recommended non-thinking settings (model card): temperature 0.7, top-p 0.8, top-k 20;
thinking off (enable_thinking=false); max 1,024 new tokens.

usage: DC_SCRATCH=... python -I -B pt_generate.py <out.jsonl> <n_per> <port> <model_label> [parallel requests, default 1]
Resumable: rows already in <out.jsonl> are skipped.
"""
import json
import os
import random
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pt_common as P  # noqa: E402


def sample(n_per, seed=7):
    rows = P.records("rlvr")
    per = []
    for ds in ("gsm8k", "MATH", "ifeval"):
        rs = [r for r in rows if r["dataset"] == ds]
        random.Random(seed).shuffle(rs)
        per.append(rs[:n_per])
    # interleave so a partial run still covers all three
    out = [r for trio in zip(*per) for r in trio]
    return out


def chat(port, prompt):
    body = dict(messages=[{"role": "user", "content": prompt}], temperature=0.7, top_p=0.8, top_k=20, max_tokens=1024,
                chat_template_kwargs={"enable_thinking": False})
    req = urllib.request.Request(f"http://127.0.0.1:{port}/v1/chat/completions", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    t0 = time.time()
    r = json.load(urllib.request.urlopen(req, timeout=1800))
    txt = r["choices"][0]["message"]["content"]
    return txt, r["choices"][0].get("finish_reason"), r.get("usage", {}), round(time.time() - t0, 2)


def main():
    out, n_per, port, label = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
    done = set()
    if os.path.exists(out):
        done = {json.loads(x)["i"] for x in open(out)}
    par = int(sys.argv[5]) if len(sys.argv) > 5 else 1
    todo = [r for r in sample(n_per) if r["i"] not in done]
    from concurrent.futures import ThreadPoolExecutor
    with open(out, "a") as f, ThreadPoolExecutor(par) as pool:
        for r, (txt, fin, use, sec) in zip(todo, pool.map(lambda r: chat(port, r["prompt"]), todo)):
            f.write(json.dumps(dict(i=r["i"], dataset=r["dataset"], model=label, response=txt, finish=fin,
                                    completion_tokens=use.get("completion_tokens"), seconds=sec)) + "\n")
            f.flush()
            print(r["i"], r["dataset"], use.get("completion_tokens"), sec, flush=True)

if __name__ == "__main__":
    main()
