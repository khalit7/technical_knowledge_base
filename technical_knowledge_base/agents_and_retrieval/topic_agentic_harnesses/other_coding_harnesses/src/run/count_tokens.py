"""For calls whose streamed response carried no usage (Gemini CLI through the gateway), count prompt tokens with the
model's own chat template (tools included) and completion tokens from the streamed text and tool calls."""
import json, sys
sys.path.insert(0, sys.argv[2])
import proxylib
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained("mlx-community/Qwen3-4B-Instruct-2507-4bit")
out = []
for c in proxylib.load(sys.argv[1]):
    q, r = c["request"], c["resp"]
    msgs = q["messages"]
    for m in msgs:
        if isinstance(m.get("content"), list):
            m["content"] = "".join(p.get("text", "") for p in m["content"] if isinstance(p, dict))
        if m.get("content") is None:
            m["content"] = ""
        for t in m.get("tool_calls") or []:
            if isinstance(t["function"].get("arguments"), str):
                try:
                    t["function"]["arguments"] = json.loads(t["function"]["arguments"])
                except Exception:
                    pass
    ids = tok.apply_chat_template(msgs, tools=q.get("tools"), add_generation_prompt=True, tokenize=True)
    comp = r["content"] + "".join(json.dumps({"name": t["name"], "arguments": t["arguments"]}) for t in r["tool_calls"])
    ids = ids["input_ids"] if hasattr(ids, "keys") else ids
    out.append({"prompt_tokens": len(ids), "completion_tokens": len(tok.encode(comp))})
print(json.dumps(out))
