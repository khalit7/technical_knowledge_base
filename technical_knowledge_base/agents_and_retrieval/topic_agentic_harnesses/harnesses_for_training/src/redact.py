"""Normalise and redact the raw rollout recordings into src/recordings/ (one schema for all three loops).
Usage: python3 redact.py RAW_RUN_DIR GYM_DIR
RAW_RUN_DIR holds the raw recordings (local_*.jsonl from our own loop, sdk-*.jsonl from the Claude Agent SDK,
cc-*.jsonl from claude -p stream-json) and ws/<label>/ (each rollout's workspace after the run).
GYM_DIR is code/gym (the clean repository the workspaces started from).

Schema "htrain/1", one JSON object per line:
  meta : id, model, harness, task, rollout, loop, tools (names), system (our harnesses only), prompt
  call : i, inp (all input tokens of the call), fresh, cw (cache write), cr (cache read), out, text,
         thinking (true if a thinking block was present; its text is never recorded), tools [{name, args}]
  obs  : i (the call it answers), name, out (tool output, cut at 1,500 characters), chars (length the model got)
  end  : stop, calls, wall_s, cost_usd (Claude runs: total_cost_usd, an API-price equivalent), usage, reward, diff
Redaction: the workspace path becomes /work, other scratch paths /scratch, the home folder ~; the recording
machine's user name, git identity and every e-mail address become placeholders; session ids, uuids, message ids,
signatures, request ids, the init record's skills, plugins, slash commands, agents, memory and socket paths are
never copied (only whitelisted fields are); em-dashes become ", ". MCP tool names lose their "mcp__env__" prefix
(the SDK runs serve our tools from an in-process MCP server named env). A final scan fails on any forbidden string."""
import difflib, getpass, json, os, re, subprocess, sys

RAW, GYM = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "recordings")
HOME, USER = os.path.expanduser("~"), getpass.getuser()
SCRATCH = os.path.dirname(os.path.dirname(os.path.dirname(RAW)))  # .../scratchpad/agents/htrain/runs/X -> scratchpad/agents
EM = chr(0x2014)
CUT = 1500


def _git(k):
    try:
        return subprocess.run(["git", "config", "--global", k], capture_output=True, text=True).stdout.strip()
    except Exception:
        return ""


GIT_NAME, GIT_EMAIL = _git("user.name"), _git("user.email")   # read at run time, never written here
FORBID = ["/Us" + "ers/", "Us" + "ers-", USER, "gl" + "pat", "sk-" + "ant", HOME] + [x for x in (GIT_NAME, GIT_EMAIL) if x]
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
stats = {"em": 0, "files": 0, "workspace_path": 0, "scratch_path": 0, "home": 0, "user_name": 0, "email_or_git_identity": 0}


def scrub(s, ws):
    if not isinstance(s, str):
        return s
    for a in (ws, os.path.realpath(ws)):
        stats["workspace_path"] += s.count(a); s = s.replace(a, "/work")
    for a in (os.path.realpath(SCRATCH), SCRATCH):
        stats["scratch_path"] += s.count(a); s = s.replace(a, "/scratch")
    stats["home"] += s.count(HOME); s = s.replace(HOME, "~")
    for x, rep in ((GIT_EMAIL, "user@example.com"), (GIT_NAME, "Example User")):
        if x:
            s, n = re.subn(re.escape(x), rep, s, flags=re.I); stats["email_or_git_identity"] += n
    def em(m):
        if m.group(0).endswith(("example.com", "anthropic.com")):
            return m.group(0)
        stats["email_or_git_identity"] += 1
        return "user@example.com"
    s = EMAIL.sub(em, s)
    s, n = re.subn(re.escape(USER), "user", s, flags=re.I); stats["user_name"] += n
    n = s.count(EM)
    if n:
        stats["em"] += n
        s = s.replace(EM, ", ")
    return s


def deep(o, ws):
    if isinstance(o, str):
        return scrub(o, ws)
    if isinstance(o, list):
        return [deep(x, ws) for x in o]
    if isinstance(o, dict):
        return {k: deep(v, ws) for k, v in o.items()}
    return o


def cut(s):
    s = s or ""
    return (s if len(s) <= CUT else s[:CUT] + f"\n[... {len(s) - CUT} more characters cut from this repo copy ...]"), len(s)


def tname(n):
    return n[len("mcp__env__"):] if n.startswith("mcp__env__") else n


def final_diff(ws, task=None):
    """Unified diff from the task's starting (buggy) repository to the workspace after the rollout."""
    import tempfile
    sys.path.insert(0, GYM)
    from tasks import make_workspace
    start = os.path.join(tempfile.mkdtemp(), "start")
    make_workspace(task, start)
    out = []
    for rel in ["textstats/__init__.py", "textstats/core.py", "textstats/__main__.py", "tests/test_core.py"]:
        a = open(os.path.join(start, rel)).read().splitlines(keepends=True)
        p = os.path.join(ws, rel)
        b = open(p).read().splitlines(keepends=True) if os.path.exists(p) else []
        out += difflib.unified_diff(a, b, "a/" + rel, "b/" + rel, n=1)
    extra = []
    for root, dirs, files in os.walk(ws):
        dirs[:] = [d for d in dirs if d != "__pycache__" and not d.startswith(".")]
        for f in files:
            rel = os.path.relpath(os.path.join(root, f), ws)
            if not os.path.exists(os.path.join(GYM, "clean", rel)) and not f.endswith(".pyc"):
                extra.append(rel)
    return "".join(out), sorted(extra)


def bug_diff_note(task):
    return json.load(open(os.path.join(GYM, "meta.json")))[task]["bugs"]


def rew(r):
    keep = ["binary", "partial", "f2p_pass", "f2p_total", "p2p_pass", "p2p_total", "visible_all_pass", "heldout_fail", "tests_untouched", "results", "error"]
    return {k: r[k] for k in keep if k in r}


def norm_local(lines, label, ws):
    ev, meta = [], lines[0]
    ev.append({"ev": "meta", "id": label, "model": meta["model"], "harness": meta["harness"], "task": meta["task"],
               "rollout": meta["rollout"], "loop": "own loop (rollout_local.py), mlx_lm.server 0.32.0",
               "sampling": {"temperature": meta["temperature"], "top_p": meta["top_p"], "max_tokens": meta["max_tokens"]},
               "tools": [t["function"]["name"] for t in meta["tools"]], "system": meta["system"], "prompt": meta["prompt"]})
    end = None
    for d in lines[1:]:
        if d["type"] == "call":
            ev.append({"ev": "call", "i": d["call"], "inp": d["prompt_tokens"], "fresh": d["prompt_tokens"], "cw": 0, "cr": 0,
                       "out": d["completion_tokens"], "wall_s": d["wall_s"], "finish": d["finish"], "text": d["content"] or "", "thinking": False,
                       "tools": [{"name": c["name"], "args": c["arguments"]} for c in d["tool_calls"]]})
        elif d["type"] == "tool":
            o, n = cut(d["output"])
            ev.append({"ev": "obs", "i": d["call"], "name": d["name"], "out": o, "chars": n})
        elif d["type"] == "error":
            ev.append({"ev": "error", "i": d["call"], "error": d["error"][:300]})
        elif d["type"] == "end":
            end = d
    return ev, {"stop": end["stop"], "calls": end["calls"], "wall_s": end["wall_s"], "cost_usd": None, "reward": rew(end["reward"])}


def norm_claude_msgs(msgs, ev):
    """msgs: list of (kind, payload) where kind in assistant/user; payload has content blocks, message id, usage."""
    calls, idx, last = {}, -1, None
    for kind, mid, content, usage in msgs:
        if kind == "assistant":
            if mid != last:
                idx += 1
                last = mid
                u = usage or {}
                fresh, cw, cr = u.get("input_tokens", 0), u.get("cache_creation_input_tokens", 0), u.get("cache_read_input_tokens", 0)
                c = {"ev": "call", "i": idx, "inp": fresh + cw + cr, "fresh": fresh, "cw": cw, "cr": cr, "out": None,
                     "text": "", "thinking": False, "tools": []}
                calls[idx] = c
                ev.append(c)
            c = calls[idx]
            for b in content:
                if "thinking" in b or b.get("type") in ("thinking", "redacted_thinking"):
                    c["thinking"] = True
                elif "text" in b and b.get("type", "text") == "text":
                    c["text"] = (c["text"] + "\n" + b["text"]).strip()
                elif "name" in b and "input" in b:
                    c["tools"].append({"name": tname(b["name"]), "args": json.dumps(b["input"], ensure_ascii=False)})
        else:
            for b in content:
                if isinstance(b, dict) and "tool_use_id" in b:
                    cc = b.get("content")
                    if isinstance(cc, list):
                        cc = "\n".join(x.get("text", "") for x in cc if isinstance(x, dict))
                    o, n = cut(cc if isinstance(cc, str) else json.dumps(cc))
                    ev.append({"ev": "obs", "i": idx, "name": None, "out": o, "chars": n, "is_error": bool(b.get("is_error"))})
    # name each observation after the tool call it answers (calls are answered in order)
    q = []
    for e in ev:
        if e["ev"] == "call":
            q = [t["name"] for t in e["tools"]]
        elif e["ev"] == "obs" and e["name"] is None:
            e["name"] = q.pop(0) if q else "?"


def usage_of(r):
    u = r.get("usage") or {}
    return {"fresh": u.get("input_tokens"), "cw": u.get("cache_creation_input_tokens"), "cr": u.get("cache_read_input_tokens"),
            "out": u.get("output_tokens"), "model_usage": {k: {kk: v.get(kk) for kk in ("inputTokens", "outputTokens", "cacheReadInputTokens", "cacheCreationInputTokens", "costUSD", "thinkingTokens")}
                                                            for k, v in (r.get("model_usage") or r.get("modelUsage") or {}).items()}}


def norm_sdk(lines, label, ws):
    meta = lines[0]
    ev = [{"ev": "meta", "id": label, "model": None, "harness": meta["harness"], "task": meta["task"], "rollout": meta["rollout"],
           "loop": "Claude Agent SDK 0.2.163 (its bundled Claude Code 2.1.286 runs the loop); our system prompt and tools, built-in tools off",
           "tools": [t["function"]["name"] for t in meta["tools"]], "system": meta["system"], "prompt": meta["prompt"]}]
    msgs, res, end = [], None, None
    for d in lines[1:]:
        t = d["_type"]
        if t == "SystemMessage" and d.get("subtype") == "init":
            ev[0]["model"] = d["data"].get("model")
        elif t == "AssistantMessage":
            msgs.append(("assistant", d.get("message_id"), d["content"], d.get("usage")))
        elif t == "UserMessage" and isinstance(d.get("content"), list):
            msgs.append(("user", None, d["content"], None))
        elif t == "ResultMessage":
            res = d
        elif t == "end":
            end = d
    norm_claude_msgs(msgs, ev)
    return ev, {"stop": res and res.get("subtype"), "calls": sum(1 for e in ev if e["ev"] == "call"), "num_turns": res and res.get("num_turns"),
                "wall_s": end["wall_s"], "cost_usd": res and res.get("total_cost_usd"), "usage": res and usage_of(res), "reward": rew(end["reward"])}


def norm_cc(lines, label, ws):
    meta = lines[0]
    ev = [{"ev": "meta", "id": label, "model": None, "harness": "ccfull", "task": meta["task"], "rollout": meta["rollout"],
           "loop": "Claude Code (claude -p), its own system prompt", "tools": None, "system": None, "prompt": meta["prompt"],
           "argv": [a for a in meta["argv"] if a != meta["prompt"]]}]
    msgs, res, end = [], None, None
    for d in lines[1:]:
        t = d.get("type")
        if t == "system" and d.get("subtype") == "init":
            ev[0]["model"], ev[0]["tools"] = d.get("model"), d.get("tools")
            ev[0]["claude_code_version"] = d.get("claude_code_version")
        elif t == "assistant":
            m = d["message"]
            msgs.append(("assistant", m.get("id"), m["content"], m.get("usage")))
        elif t == "user" and isinstance(d["message"].get("content"), list):
            msgs.append(("user", None, d["message"]["content"], None))
        elif t == "result":
            res = d
        elif t == "htrain_end":
            end = d
    norm_claude_msgs(msgs, ev)
    return ev, {"stop": res and res.get("subtype"), "calls": sum(1 for e in ev if e["ev"] == "call"), "num_turns": res and res.get("num_turns"),
                "wall_s": end["wall_s"], "cost_usd": res and res.get("total_cost_usd"), "usage": res and usage_of(res), "reward": rew(end["reward"])}


def main():
    os.makedirs(OUT, exist_ok=True)
    done = 0
    for f in sorted(os.listdir(RAW)):
        if not f.endswith(".jsonl") or not f.split("_")[0] in ("local", "sdk-haiku", "cc-haiku", "sdk-sonnet", "cc-sonnet"):
            continue
        label = f[:-6]
        if not os.path.exists(os.path.join(RAW, label + ".done")) and not label.endswith("_p1"):
            continue                                    # unfinished rollout
        ws = os.path.join(RAW, "ws", label)
        lines = [json.loads(l) for l in open(os.path.join(RAW, f)) if l.strip()]
        fn = norm_local if f.startswith("local") else norm_sdk if f.startswith("sdk") else norm_cc
        ev, end = fn(lines, label, ws)
        d, extra = final_diff(ws, ev[0]["task"])
        end.update({"ev": "end", "diff": d, "new_files": extra, "bugs": bug_diff_note(ev[0]["task"])})
        ev.append(end)
        ev = deep(ev, ws)
        txt = "".join(json.dumps(e, ensure_ascii=False) + "\n" for e in ev)
        for x in FORBID:
            if x and x.lower() in txt.lower():
                raise SystemExit(f"forbidden string left in {label}")
        if EM in txt:
            raise SystemExit("em-dash left in " + label)
        open(os.path.join(OUT, label + ".jsonl"), "w").write(txt)
        done += 1
    stats["files"] = done
    json.dump(stats, open(os.path.join(os.path.dirname(OUT), "inputs", "redaction.json"), "w"), indent=1)
    print(f"wrote {done} recordings; {stats}")


main()
