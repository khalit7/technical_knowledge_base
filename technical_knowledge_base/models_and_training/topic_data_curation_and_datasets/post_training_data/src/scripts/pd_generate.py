"""Pending GPU jobs for this page: local Qwen3 models through llama-server (llama.cpp, OpenAI-compatible API).

  answers  <out> <n> <port> <label>     Qwen3 answers OpenR1-Math problems (seeded sample of the 6k), thinking on,
                                        max 4,096 new tokens; then pd_check.py-style extraction on them (checker lab,
                                        'local model' view).
  judge    <out> <n> <port> <label>     Qwen3 rates both answers of UltraFeedback H4 pairs, in both orders (A/B and
                                        B/A), 1 to 10 each: position bias and length preference of a small judge.
  delta    <out> <n> <port> <label>     one answer per Tulu 3 SFT-sample prompt (thinking off, max 1,024 tokens), to
                                        pair a large model's answer (chosen) with a small model's (rejected), as OLMo 3's
                                        delta learning does; run once per model.
Sampling: Qwen3 model-card settings (thinking: temperature 0.6, top-p 0.95; non-thinking: 0.7, 0.8), top-k 20.
Resumable: ids already in <out> are skipped.
"""
import json
import os
import random
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pd_common as C  # noqa: E402

JUDGE = ("You are grading two answers to the same user request. Rate each answer from 1 (useless) to 10 (excellent) "
         "for helpfulness, correctness and instruction following. Reply with exactly two lines:\nA: <score>\nB: <score>"
         "\n\n[Request]\n{p}\n\n[Answer A]\n{a}\n\n[Answer B]\n{b}")


def chat(port, msg, think, max_tokens):
    body = dict(messages=[{"role": "user", "content": msg}], top_k=20, max_tokens=max_tokens,
                temperature=0.6 if think else 0.7, top_p=0.95 if think else 0.8,
                chat_template_kwargs={"enable_thinking": think})
    req = urllib.request.Request(f"http://127.0.0.1:{port}/v1/chat/completions", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    t0 = time.time()
    r = json.load(urllib.request.urlopen(req, timeout=3600))
    m = r["choices"][0]["message"]
    return dict(text=m.get("content") or "", reasoning=m.get("reasoning_content") or "",
                finish=r["choices"][0].get("finish_reason"), tokens=r.get("usage", {}).get("completion_tokens"),
                seconds=round(time.time() - t0, 2))


def jobs(kind, n):
    rng = random.Random(11)
    if kind == "answers":
        d = C.frame("openr1_math")
        idx = sorted(rng.sample(range(len(d)), n))
        return [(f"r{i}", d.problem.iloc[i] + "\n\nPut the final answer in \\boxed{}.", True, 4096) for i in idx]
    if kind == "judge":
        rows = C.P.records("pref")
        idx = sorted(rng.sample(range(len(rows)), n))
        out = []
        for i in idx:
            r = rows[i]
            p, c, j = r["prompt"][:3000], r["chosen"][:3000], r["rejected"][:3000]
            out.append((f"p{i}ab", JUDGE.format(p=p, a=c, b=j), False, 16))
            out.append((f"p{i}ba", JUDGE.format(p=p, a=j, b=c), False, 16))
        return out
    if kind == "delta":
        rows = [r for r in C.P.records("sft") if r["turns"] == 1 and len(r["prompt"]) < 3000]
        idx = sorted(rng.sample(range(len(rows)), n))
        return [(rows[i]["id"], rows[i]["prompt"], False, 1024) for i in idx]
    raise SystemExit("unknown job " + kind)


def main():
    kind, out, n, port, label = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5]
    par = int(sys.argv[6]) if len(sys.argv) > 6 else 4
    done = set()
    if os.path.exists(out):
        done = {json.loads(x)["id"] for x in open(out)}
    todo = [j for j in jobs(kind, n) if j[0] not in done]
    with open(out, "a") as f, ThreadPoolExecutor(par) as pool:
        for j, res in zip(todo, pool.map(lambda j: chat(port, j[1], j[2], j[3]), todo)):
            res.update(id=j[0], model=label, job=kind)
            f.write(json.dumps(res) + "\n")
            f.flush()
            print(j[0], res["tokens"], res["seconds"], flush=True)


if __name__ == "__main__":
    main()
