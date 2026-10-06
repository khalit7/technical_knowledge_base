#!/usr/bin/env python3
"""What the model writes after its own action when nothing stops it there. Local model only.

A. Text protocol (the Loop lab's step 1 format: "ACTION {json}" as the last line). The same prompt is
   sampled N times without a stop sequence and N times with stop=["--- turn"], the line the harness
   writes before a tool result. Two states: turn 1, and turn 2 after the real read_file result.
B. Native protocol (the model's own chat template). A recorded native.py conversation is rendered up to
   and including one of the model's tool calls and its end-of-turn token <|im_end|>; the raw text is
   sent to /v1/completions so generation continues PAST the boundary that normally ends the reply.
   Whatever comes next is what the harness would have received if it ignored the end-of-turn token.
Usage: boundary.py RUN.jsonl OUT.jsonl [--n 10]
   RUN.jsonl: a native.py log (the conversation used in part B and the real results used in part A).
"""
import argparse, json, os, sys, time, urllib.request
from transformers import AutoTokenizer

ap = argparse.ArgumentParser()
ap.add_argument("run"); ap.add_argument("out"); ap.add_argument("--n", type=int, default=10)
ap.add_argument("--base", default="http://127.0.0.1:8090/v1")
ap.add_argument("--parts", default="AB")
A = ap.parse_args()
MODEL, REV = "mlx-community/Qwen3-4B-Instruct-2507-4bit", "50d427756c6b1b2fe0c0a10f67fbda1fc8e82c1b"
TASK = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests."
FILES = ["README.md", "tests/test_core.py", "textstats/__init__.py", "textstats/core.py"]
STEP1_SYSTEM = """You are a coding agent. You cannot see or change anything yourself: you act by asking
the harness to run one tool per reply. Tools:
  read_file  {"path": "<path relative to the repository>"}  returns the file's text
  run_tests  {}                                             runs python3 tests/test_core.py
Write at most three short sentences of reasoning, then end your reply with exactly one line:
ACTION {"tool": "<name>", "args": {...}}
Never use the em-dash character."""   # the Loop lab's step 1 system prompt, verbatim


def post(path, body):
    req = urllib.request.Request(A.base + path, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    for attempt in range(4):   # the shared server sometimes drops a connection under load: retry, and say so in the log
        t = time.time()
        try:
            with urllib.request.urlopen(req, timeout=900) as r:
                return json.loads(r.read()), round(time.time() - t, 2)
        except Exception as e:
            print("retrying after infrastructure error:", e, flush=True)
            time.sleep(20)
    raise RuntimeError("server unavailable")


def log(**d):
    with open(A.out, "a") as f:
        f.write(json.dumps(d) + "\n")


recs = [json.loads(l) for l in open(A.run)]
start = next(r for r in recs if r["kind"] == "start")
turns = [r for r in recs if r["kind"] == "turn"]
core = open(os.path.join(os.path.dirname(__file__), "..", "editbench", "files", "textstats", "core.py")).read()

# ---- A. text protocol, with and without a stop sequence
t1 = f"TASK: {TASK}\nFILES IN THE REPOSITORY:\n" + "\n".join(FILES)
t2 = (t1 + '\n\n--- turn 1: you ---\nI will read the code first.\nACTION {"tool": "read_file", "args": {"path": "textstats/core.py"}}'
      + "\n\n--- turn 1: result of read_file ---\n" + core)
for state, transcript in ((("turn1", t1), ("turn2", t2)) if "A" in A.parts else ()):
    prompt = transcript + "\n\nYour next reply:"
    for stop in (None, ["--- turn"]):
        for s in range(1, A.n + 1):
            body = {"model": MODEL, "messages": [{"role": "system", "content": STEP1_SYSTEM}, {"role": "user", "content": prompt}],
                    "temperature": 0.7, "max_tokens": 700, "seed": s}
            if stop:
                body["stop"] = stop
            resp, secs = post("/chat/completions", body)
            ch = resp["choices"][0]
            log(part="A", state=state, stop=stop, seed=s, text=ch["message"].get("content") or "",
                finish=ch.get("finish_reason"), usage=resp.get("usage"), seconds=secs)
            print("A", state, bool(stop), s, ch.get("finish_reason"), flush=True)

# ---- B. native protocol, generation continued past <|im_end|>
tok = AutoTokenizer.from_pretrained(MODEL, revision=REV)
msgs = [{"role": "system", "content": start["system"]},
        {"role": "user", "content": start.get("user") or TASK + "\nFILES IN THE REPOSITORY:\n" + "\n".join(FILES)}]
for k, r in enumerate(turns if "B" in A.parts else []):
    if not r["tool_calls"]:
        break
    a = {"role": "assistant", "content": r["content"],
         "tool_calls": [{"type": "function", "id": c.get("id", ""), "function": c["function"]} for c in r["tool_calls"]]}
    raw = tok.apply_chat_template(msgs + [a], tools=start["tools"], tokenize=False)
    real = [x["output"] for x in r["results"]]
    for s in range(1, A.n + 1):
        resp, secs = post("/completions", {"model": MODEL, "prompt": raw, "temperature": 0.7, "max_tokens": 400, "seed": s,
                                           "logprobs": True})
        ch = resp["choices"][0]
        ids = [t["id"] for t in ((ch.get("logprobs") or {}).get("content") or [])]
        raw_out = tok.decode(ids, skip_special_tokens=False) if ids else None   # every generated token, tool-call text included
        log(part="B", state=f"after turn {r['turn']}", seed=s, prompt_tail=raw[-300:], text=ch.get("text") or "",
            tool_calls=ch.get("tool_calls"), ids=ids, raw=raw_out, finish=ch.get("finish_reason"), usage=resp.get("usage"), seconds=secs,
            real_results=real, calls=[c["function"] for c in r["tool_calls"]])
        print("B", r["turn"], s, ch.get("finish_reason"), repr((ch.get("text") or "")[:60]), flush=True)
    msgs.append(a)
    for c, res in zip(r["tool_calls"], r["results"]):
        msgs.append({"role": "tool", "tool_call_id": c.get("id", ""), "content": res["output"]})
