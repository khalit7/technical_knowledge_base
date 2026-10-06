"""Read a logging-proxy JSONL file into a list of calls: request (messages, tools, params) and the
response as one assistant message (content, tool_calls, finish_reason, usage), streamed or not."""
import json


def parse_sse(raw):
    content, tcs, finish, usage = "", {}, None, {}
    for line in raw.splitlines():
        line = line.strip()
        if not line.startswith("data:"):
            continue
        d = line[5:].strip()
        if d == "[DONE]":
            break
        try:
            j = json.loads(d)
        except Exception:
            continue
        if j.get("usage"):
            usage = j["usage"]
        for ch in j.get("choices") or []:
            dl = ch.get("delta") or {}
            content += dl.get("content") or ""
            for tc in dl.get("tool_calls") or []:
                k = tc.get("index", 0)
                t = tcs.setdefault(k, {"id": None, "name": "", "arguments": ""})
                t["id"] = tc.get("id") or t["id"]
                f = tc.get("function") or {}
                t["name"] += f.get("name") or ""
                t["arguments"] += f.get("arguments") or ""
            if ch.get("finish_reason"):
                finish = ch["finish_reason"]
    return {"content": content, "tool_calls": [tcs[k] for k in sorted(tcs)], "finish_reason": finish, "usage": usage}


def parse_json(s):
    ch = (s.get("choices") or [{}])[0]
    m = ch.get("message") or {}
    tcs = [{"id": t.get("id"), "name": t["function"]["name"], "arguments": t["function"]["arguments"]}
           for t in (m.get("tool_calls") or [])]
    return {"content": m.get("content") or "", "tool_calls": tcs, "finish_reason": ch.get("finish_reason"),
            "usage": s.get("usage") or {}}


def load(path):
    calls = []
    for l in open(path):
        r = json.loads(l)
        if not r["path"].endswith("/chat/completions") or not isinstance(r["request"], dict):
            continue
        s = r["response"]
        resp = parse_json(s) if isinstance(s, dict) else parse_sse(s)
        calls.append({"t0": r["t0"], "t1": r["t1"], "status": r.get("status"), "request": r["request"], "resp": resp})
    return calls


if __name__ == "__main__":
    import sys
    for i, c in enumerate(load(sys.argv[1])):
        q, r = c["request"], c["resp"]
        u = r["usage"]
        print(i, "msgs", len(q.get("messages", [])), "tools", len(q.get("tools") or []),
              "in", u.get("prompt_tokens"), "out", u.get("completion_tokens"), "dt", round(c["t1"] - c["t0"], 1),
              "fin", r["finish_reason"], "tc", [(t["name"], t["arguments"][:70]) for t in r["tool_calls"]],
              repr(r["content"][:90]))
