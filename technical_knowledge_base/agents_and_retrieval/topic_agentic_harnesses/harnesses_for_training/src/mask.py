"""Loss masks on real local-model rollouts: render each recorded trajectory through Qwen3-4B-Instruct-2507's own
chat template (the tokenizer in the local Hugging Face cache), label every token by who produced it, and check
the token counts against what mlx_lm.server reported while the rollout ran.
Usage (the MLX env has transformers): python3 mask.py RAW_RUN_DIR OUT_JSON [label ...]
RAW_RUN_DIR holds the raw local_*.jsonl (full tool outputs; the repo copies are cut at 1,500 characters).
Writes per-rollout counts for all local rollouts and a token-by-token view for the labels given.
Classes: sys (system prompt and tool schemas), user (task), gen (tokens the model sampled: loss on),
ins (an empty think block the template inserts into past assistant turns: never sampled, loss off),
obs (tool output the environment wrote: loss off), tmpl (template tokens around turns: loss off)."""
import json, os, sys
from transformers import AutoTokenizer

RAW, OUT = sys.argv[1], sys.argv[2]
SHOW = set(sys.argv[3:])
tok = AutoTokenizer.from_pretrained("mlx-community/Qwen3-4B-Instruct-2507-4bit")


def load(path):
    L = [json.loads(l) for l in open(path)]
    meta = L[0]
    msgs = [{"role": "system", "content": meta["system"]}, {"role": "user", "content": meta["prompt"]}]
    calls = []
    for d in L[1:]:
        if d["type"] == "call":
            m = {"role": "assistant", "content": d["content"] or ""}
            if d["tool_calls"]:
                m["tool_calls"] = [{"id": c["id"], "type": "function", "function": {"name": c["name"], "arguments": json.loads(c["arguments"] or "{}")}} for c in d["tool_calls"]]
            msgs.append(m)
            calls.append(d)
        elif d["type"] == "tool":
            msgs.append({"role": "tool", "tool_call_id": d["id"], "content": d["output"]})
    return meta, msgs, calls, L[-1]


def ids(msgs, tools, gen_prompt=False):
    r = tok.apply_chat_template(msgs, tools=tools, tokenize=True, add_generation_prompt=gen_prompt)
    return list(r["input_ids"]) if isinstance(r, dict) or hasattr(r, "keys") else list(r)


def analyse(path, show):
    meta, msgs, calls, end = load(path)
    tools = meta["tools"]
    full = ids(msgs, tools)
    S, E = tok.convert_tokens_to_ids("<|im_start|>"), tok.convert_tokens_to_ids("<|im_end|>")
    # split the rendered sequence into turns at <|im_start|>; each turn is <|im_start|>role\n ... <|im_end|>\n
    starts = [i for i, t in enumerate(full) if t == S]
    cls = ["tmpl"] * len(full)
    turns = []
    for n, st in enumerate(starts):
        en = starts[n + 1] if n + 1 < len(starts) else len(full)
        head = tok.decode(full[st:st + 3])
        role = "system" if head.startswith("<|im_start|>system") else "assistant" if head.startswith("<|im_start|>assistant") else "user"
        # header tokens: <|im_start|>, role, newline
        h = st
        while h < en and tok.decode(full[st:h + 1]).count("\n") < 1:
            h += 1
        body = list(range(h + 1, en))
        turns.append((role, body))
    k_user = 0
    gen_counts = []
    for role, body in turns:
        if role == "system":
            for i in body:
                cls[i] = "sys"
        elif role == "user":
            txt = tok.decode([full[i] for i in body[:3]])
            c = "user" if k_user == 0 else "obs"
            k_user += 1
            for i in body:
                cls[i] = c
        else:
            # an empty think block may come first: written by the template, never sampled
            j, acc = 0, ""
            if tok.decode(full[body[0]:body[0] + 1]).startswith("<think>"):
                for j0, i in enumerate(body):
                    acc += tok.decode([full[i]])
                    if acc.endswith("</think>\n\n"):
                        j = j0 + 1
                        break
            for i in body[:j]:
                cls[i] = "ins"
            for i in body[j:]:
                cls[i] = "gen"
            gen_counts.append((j, len(body) - j))
        # the newline after <|im_end|> is template; <|im_end|> itself is sampled in assistant turns
        if body and tok.decode([full[body[-1]]]) == "\n":
            cls[body[-1]] = "tmpl"
            if role == "assistant":
                gen_counts[-1] = (gen_counts[-1][0], gen_counts[-1][1] - 1)
        if role != "assistant":
            for i in body:
                if full[i] == E:
                    cls[i] = "tmpl"
    checks = []
    for ci, c in enumerate(calls):
        pr = len(ids(msgs[:2 + sum(1 for m in msgs[2:] if True) and 0] if False else msgs[:msg_index(msgs, ci)], tools, gen_prompt=True))
        ins, g = gen_counts[ci] if ci < len(gen_counts) else (None, None)
        checks.append({"call": ci, "rendered_prompt": pr, "server_prompt": c["prompt_tokens"], "gen_tokens": g,
                       "server_reply": c["completion_tokens"], "inserted": ins})
    counts = {}
    for c in cls:
        counts[c] = counts.get(c, 0) + 1
    out = {"id": os.path.basename(path)[:-6], "total": len(full), "counts": counts, "checks": checks,
           "reward": end["reward"]["binary"], "partial": end["reward"]["partial"]}
    if show:
        toks, run = [], None
        for t, c in zip(full, cls):
            s = tok.decode([t])
            if run and run[1] == c:
                run[0] += s
            else:
                run = [s, c]
                toks.append(run)
        out["runs"] = toks
    return out


def msg_index(msgs, ci):
    """Index of the ci-th assistant message (the prompt for call ci is everything before it)."""
    n = -1
    for k, m in enumerate(msgs):
        if m["role"] == "assistant":
            n += 1
            if n == ci:
                return k
    return len(msgs)


res = []
for f in sorted(os.listdir(RAW)):
    if f.startswith("local_") and f.endswith(".jsonl") and os.path.exists(os.path.join(RAW, f[:-6] + ".done")):
        try:
            res.append(analyse(os.path.join(RAW, f), f[:-6] in SHOW))
        except Exception as e:
            res.append({"id": f[:-6], "error": repr(e)[:200]})
json.dump(res, open(OUT, "w"))
print(len(res), "rollouts")
