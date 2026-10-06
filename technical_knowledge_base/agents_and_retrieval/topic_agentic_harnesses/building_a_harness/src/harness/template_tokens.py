#!/usr/bin/env python3
"""Render a recorded native-harness conversation through the local model's own chat template and
tokenise it, to show what a tool call is at the token level.

Usage: template_tokens.py RUN.jsonl TURNS OUT.json
  RUN.jsonl: a log written by native.py; TURNS: how many recorded turns to include (their assistant
  replies and tool results). Uses the Hugging Face tokenizer files of
  mlx-community/Qwen3-4B-Instruct-2507-4bit (snapshot 50d427756c6b1b2fe0c0a10f67fbda1fc8e82c1b).
Writes: the messages, the rendered text, and every token (id, text, special or not, which message it
belongs to), plus the ids of the end-of-turn tokens from generation_config.json.
"""
import json, sys
from transformers import AutoTokenizer

MODEL = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
REV = "50d427756c6b1b2fe0c0a10f67fbda1fc8e82c1b"
run, turns, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
recs = [json.loads(l) for l in open(run)]
start = next(r for r in recs if r["kind"] == "start")
msgs = [{"role": "system", "content": start["system"]}]
tok = AutoTokenizer.from_pretrained(MODEL, revision=REV)
# the first user message as native.py sent it: the task plus the running example's file list
FILES = ["README.md", "tests/test_core.py", "textstats/__init__.py", "textstats/core.py"]
msgs.append({"role": "user", "content": start.get("user") or start["task"] + "\nFILES IN THE REPOSITORY:\n" + "\n".join(FILES)})
for r in [r for r in recs if r["kind"] == "turn"][:turns]:
    a = {"role": "assistant", "content": r["content"]}
    if r["tool_calls"]:
        a["tool_calls"] = [{"type": "function", "id": c.get("id", ""),
                            "function": {"name": c["function"]["name"], "arguments": c["function"]["arguments"]}}
                           for c in r["tool_calls"]]
    msgs.append(a)
    for c, res in zip(r["tool_calls"], r["results"]):
        msgs.append({"role": "tool", "tool_call_id": c.get("id", ""), "content": res["output"]})
text = tok.apply_chat_template(msgs, tools=start["tools"], tokenize=False, add_generation_prompt=True)
enc = tok(text, add_special_tokens=False, return_offsets_mapping=True)
special = set(tok.added_tokens_encoder.values())
tokens = []
for i, (a, b) in zip(enc["input_ids"], enc["offset_mapping"]):
    tokens.append({"id": i, "text": text[a:b], "special": i in special})
json.dump({"model": MODEL, "revision": REV, "transformers": __import__("transformers").__version__,
           "messages": msgs, "text": text, "tokens": tokens,
           "eos_ids": [151645, 151643]}, open(out, "w"), indent=0)
print(len(tokens), "tokens;", sum(t["special"] for t in tokens), "special")
