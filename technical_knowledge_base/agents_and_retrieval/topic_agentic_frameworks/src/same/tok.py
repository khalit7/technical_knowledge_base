"""Split each captured first request into parts, counted with the served model's own tokenizer and chat template.
Run with an env that has transformers and the model in the HF cache:
  <mlxenv>/bin/python tok.py
Checks that the full count equals the server's prompt_tokens, then writes data/first_tokens.json."""
import json, os
from transformers import AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
tok = AutoTokenizer.from_pretrained("mlx-community/Qwen3-4B-Instruct-2507-4bit")
runs = json.load(open(os.path.join(HERE, "data", "runs.json")))
SYSTEM = None
out = {}


def n(messages, tools=None):
    text = tok.apply_chat_template(messages, tools=tools or None, add_generation_prompt=True, tokenize=False)
    return len(tok(text, add_special_tokens=False)["input_ids"])


for label in ("a1_1", "a2_1", "a3_1", "a4_1", "a5_1"):
    fr = runs["local"][label]["first"]
    msgs = [{"role": m["role"], "content": m["text"]} for m in fr["messages"]]
    tools = fr["tools"]
    full = n(msgs, tools)
    sys_txt = msgs[0]["content"]
    if SYSTEM is None:
        SYSTEM = sys_txt  # the plain loop's system prompt is ours, verbatim
    ours = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": msgs[1]["content"]}]
    bare = n([{"role": "user", "content": "x"}]) - len(tok("x")["input_ids"])  # template scaffolding
    parts = {}
    base_msgs = n(msgs)                        # no tools
    parts["template"] = bare
    parts["system_ours"] = n([{"role": "system", "content": SYSTEM}, {"role": "user", "content": "x"}]) - n([{"role": "user", "content": "x"}])
    parts["system_framework"] = n(msgs[:1] + [{"role": "user", "content": "x"}]) - n([{"role": "user", "content": "x"}]) - parts["system_ours"]
    parts["task"] = base_msgs - bare - parts["system_ours"] - parts["system_framework"]
    own_tools = [t for t in tools if t["function"]["name"] != "final_result"]
    parts["tools"] = n(msgs, own_tools) - base_msgs if own_tools else 0
    parts["output_tool"] = full - base_msgs - parts["tools"] if len(own_tools) < len(tools) else 0
    out[label] = {"full": full, "server": fr["prompt_tokens"], "parts": parts}
    print(label, full, fr["prompt_tokens"], parts)
json.dump(out, open(os.path.join(HERE, "data", "first_tokens.json"), "w"), indent=1)
