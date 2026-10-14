"""Retrieval as a tool: what the tool description and its results cost in tokens, and the loop's token formula checked
against the recorded runs. Deterministic, CPU (tokenizer only, no model).

1. The same search tool described two ways to Qwen3, rendered by its own chat template (transformers
   apply_chat_template, the Qwen3-1.7B tokenizer folder from the inference topic's model store):
     text   the root's ReAct system prompt r2 (Thought / Action: search[...] / finish[...])
     json   an OpenAI-style function schema passed as tools=[...] (what an API or llama-server --jinja sends)
2. One search result (3 paragraphs) formatted four ways, averaged over every search the root's 1.7B ReAct agent made:
   full paragraphs with titles (the root's format), titles plus first sentence, titles only (a "browse then read"
   tool pair), and full paragraphs as JSON objects.
3. The loop formula T_in = (n + 1) s + r n (n + 1) / 2 with s and r measured per question, against the prompt tokens
   llama-server actually counted for that question (recorded n_in summed over calls).
Writes ../data/tool.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json

import numpy as np
from transformers import AutoTokenizer

import arlib as A
import strategies as ST  # the root's prompts (read only)

qs, corpus, by = A.mh()
tok = AutoTokenizer.from_pretrained(os.path.join(A.L.scratch(), "..", "inf", "models", "hf", "Qwen3-1.7B"))


def n_chat(msgs, tools=None):
    ids = tok.apply_chat_template(msgs, tools=tools, add_generation_prompt=True, tokenize=True, enable_thinking=False)
    if isinstance(ids, dict) or hasattr(ids, "keys"):
        ids = ids["input_ids"]
    return len(ids)


q0 = qs[0]["question"]
text_sys = ST.REACT_SYS["r2"].format(budget=4)
TOOLS = [{"type": "function", "function": {
    "name": "search", "description": "Search a collection of Wikipedia paragraphs. Returns the 3 best matching paragraphs, "
    "each with its title. Use a short query naming one entity or fact.",
    "parameters": {"type": "object", "properties": {"query": {"type": "string", "description": "A short search query"}},
                   "required": ["query"]}}}]
user = [{"role": "user", "content": "Question: " + q0}]
schema = {
    "bare": n_chat(user),
    "text": n_chat([{"role": "system", "content": text_sys}] + user),
    "json": n_chat(user, tools=TOOLS),
    "json_plus_rules": n_chat([{"role": "system", "content": "Answer the question. Search as often as you need (at most 4 times), "
                                "then reply with the short answer only."}] + user, tools=TOOLS),
}
rendered_json = tok.apply_chat_template(user, tools=TOOLS, add_generation_prompt=True, tokenize=False, enable_thinking=False)

# 2. result formats over the recorded searches
rx = A.root_run("test_1.7b_react")


def fmt(pids, how):
    if how == "full":
        return "Observation:\n" + "\n".join("[%d] %s: %s" % (i + 1, by[p]["title"], by[p]["text"]) for i, p in enumerate(pids))
    if how == "first":
        return "Observation:\n" + "\n".join("[%d] %s: %s" % (i + 1, by[p]["title"], by[p]["sentences"][0].strip()) for i, p in enumerate(pids))
    if how == "titles":
        return "Observation:\n" + "\n".join("[%d] %s" % (i + 1, by[p]["title"]) for i, p in enumerate(pids))
    if how == "json":
        return json.dumps([{"id": p, "title": by[p]["title"], "text": by[p]["text"]} for p in pids], ensure_ascii=False)


formats = {}
allsearch = [s for r in rx.values() for s in r["searches"]]
for how in ("full", "first", "titles", "json"):
    formats[how] = A.r3(np.mean([A.ntok(fmt(s["pids"], how)) for s in allsearch]))
# answer sentence location: how often is the gold supporting sentence the paragraph's first sentence?
first_sent = sum(1 for q in qs for t, i in q["supporting_facts"] if i == 0)
n_sf = sum(len(q["supporting_facts"]) for q in qs)

# 3. the formula against recorded totals
rows = []
for q in qs:
    r = rx[q["qid"]]
    c = r["calls"]
    n = len(r["searches"])
    if n == 0 or len(c) != n + 1:
        continue
    s = c[0]["n_in"]
    # r per search: growth of the prompt between consecutive calls, minus the model's own output that was appended
    grow = [c[i + 1]["n_in"] - c[i]["n_in"] for i in range(n)]
    rr = float(np.mean(grow))
    pred = (n + 1) * s + rr * n * (n + 1) / 2
    rows.append([n, s, round(rr, 1), round(pred), sum(x["n_in"] for x in c), sum(x["n_in_new"] or 0 for x in c)])
R = np.array(rows, float)
err = np.abs(R[:, 3] - R[:, 4]) / R[:, 4]
res = {"schema": schema, "rendered_json_head": rendered_json[:1600], "formats": formats, "n_searches": len(allsearch),
       "first_sent": first_sent, "n_sf": n_sf, "formula_n": len(rows), "formula_mape": A.r3(err.mean()),
       "formula_max_err": A.r3(err.max()), "s_mean": A.r3(R[:, 1].mean()), "r_mean": A.r3(R[:, 2].mean()),
       "billed_mean": A.r3(R[:, 4].mean()), "prefilled_mean": A.r3(R[:, 5].mean()),
       "by_n": {str(int(k)): {"q": int((R[:, 0] == k).sum()), "billed": A.r3(R[R[:, 0] == k, 4].mean()),
                              "pred": A.r3(R[R[:, 0] == k, 3].mean()), "prefilled": A.r3(R[R[:, 0] == k, 5].mean())}
                for k in sorted(set(R[:, 0]))}}
A.save("tool.json", res)
print({k: v for k, v in res.items() if k != "rendered_json_head"})
print(rendered_json[:900])
