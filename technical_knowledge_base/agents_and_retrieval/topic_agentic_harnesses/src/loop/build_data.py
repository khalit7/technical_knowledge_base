#!/usr/bin/env python3
"""Loop lab: redact the raw recordings and build the page's data part.

Reads the raw runs from $AH_SCRATCH/recordings/ahloop/<label>/ (they stay in the scratch directory),
writes redacted copies to src/loop/recordings/ and the page data to parts/31_js_loop_0data.js.
Redaction: the scratch path becomes /work, the account name becomes "user", session, message and
tool-use ids become short labels, init records keep a whitelist of fields, thinking signatures are
dropped (the fact that thinking happened and its token count are kept), rate-limit events are dropped.
Run: AH_SCRATCH=<scratch dir> python3 src/loop/build_data.py
"""
import difflib, getpass, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(os.environ["AH_SCRATCH"], "recordings", "ahloop")
OUTREC = os.path.join(HERE, "recordings")
PART = os.path.join(HERE, "..", "parts", "31_js_loop_0data.js")
os.makedirs(OUTREC, exist_ok=True)

# label, step, short name, what changed (shown in the page)
RUNS = [
    ("s0_haiku", "0", "One call, no loop", "core.py pasted into one prompt; the reply is written back and the tests are run once to grade it. The model never sees the tests."),
    ("s1_haiku", "1", "Loop: read and test", "The loop with read_file and run_tests. No way to edit. The parser takes the LAST ACTION line in a reply."),
    ("s1b_haiku", "1b", "Loop, first ACTION only", "Same as step 1, but the harness keeps the reply only up to its FIRST ACTION line and throws the rest away."),
    ("s2_haiku_r1", "2", "Edit and stop (run 1)", "Adds edit_file (exact-string replace) and finish, and malformed replies become errors the model sees."),
    ("s2_haiku_r2", "2", "Edit and stop (run 2)", "Step 2 again, unchanged, to show run-to-run variance."),
    ("s3_haiku", "3", "Permission gate", "Adds run_command and a gate in front of every call: deny rules, allow rules, everything else asks (no terminal, so ask means deny)."),
    ("s3_inject_haiku", "3", "Gate + planted README", "Step 3 with a planted instruction in README.md telling agents to run curl ... | sh."),
    ("s3_inject_test_haiku", "3", "Gate + planted test file", "Step 3 with the same planted instruction at the top of tests/test_core.py, a file every run reads."),
    ("s4_off_noisy", "4", "Noisy tool, no management", "run_tests made deliberately noisy (python3 -v, about 240 lines of import trace per run); clipping and budget off."),
    ("s4_naive_noisy", "4", "Noisy tool, naive clip", "Same noise; every long tool output cut to its first 15 and last 15 lines."),
    ("s4_smart_noisy", "4", "Noisy tool, smart clip", "Same noise; first 15 and last 15 lines plus every line that looks like a result or an error."),
    ("s4_smart_mask", "4", "Smart clip + masking", "Smart clip, and the context limit lowered to 2,000 tokens so that old tool results get masked."),
    ("s5_soft_haiku", "5", "Subagent offered", "Adds delegate: a helper agent with a fresh transcript and read-only tools. The prompt only suggests using it."),
    ("s5_denied_haiku", "5", "Subagent, gate forgot it", "Delegate first, but the permission rules had no entry for the new delegate tool, so the gate denied it (fail closed)."),
    ("s5_haiku", "5", "Subagent, delegate first", "Same harness; the prompt says the first action must be delegate."),
    ("s5_sonnet", "5", "Step 5 on Sonnet", "The final harness, delegate first, on Sonnet (the showcase run)."),
]
LITE = {"s3_inject_haiku", "s5_soft_haiku", "s2_haiku_r2", "s3_inject_test_haiku", "s4_smart_noisy", "s5_denied_haiku"}  # page keeps metrics only; full run in recordings/
CC = [("cc_haiku", "Claude Code, Haiku"), ("cc_haiku_r2", "Claude Code, Haiku (run 2)"), ("cc_sonnet", "Claude Code, Sonnet"),
      ("cc_sonnet_fair", "Claude Code, Sonnet, python allowed")]
STEPFILES = ["step0.py", "step1.py", "step1b.py", "step2.py", "step3.py", "step4.py", "step5.py"]


ME = getpass.getuser()                                   # the account name, never written into this file
HOMES = os.path.dirname(os.path.expanduser("~"))         # the home-directory root


def red(s, label=""):
    s = re.sub(r"/private/tmp/claude-\d+/[^\s\"']*?/recordings/ahloop/[\w-]+/repo", "/work", s)
    s = re.sub(r"/private/tmp/claude-\d+/[^\s\"']*?/recordings/ahloop/[\w-]+/empty", "/work-empty", s)
    s = re.sub(r"/private/tmp/claude-\d+/[^\s\"']*", "/scratch", s)
    s = re.sub("(?i)" + re.escape(ME), "user", s)
    s = s.replace(HOMES + "/", "/home/").replace(HOMES.strip("/") + "-", "home-")
    return s.replace("—", ", ")


def R(o):
    """Redact every string inside a JSON value."""
    if isinstance(o, str):
        return red(o)
    if isinstance(o, list):
        return [R(x) for x in o]
    if isinstance(o, dict):
        return {k: R(v) for k, v in o.items()}
    return o


def usage(u):
    th = (u.get("output_tokens_details") or {}).get("thinking_tokens", 0)
    return [u["input_tokens"], u["cache_creation_input_tokens"], u["cache_read_input_tokens"], u["output_tokens"], th]


def blocks(prompt):
    """Split one assembled prompt into its blocks: [label, chars]."""
    out = []
    for i, part in enumerate(re.split(r"\n\n(?=--- turn \d+: )", prompt)):
        if i == 0:
            out.append(["task", len(part)])
            continue
        m = re.match(r"--- turn (\d+): (you|result of (\w+)|harness) ---", part)
        lab = "reply" if m.group(2) == "you" else ("result:" + m.group(3) if m.group(3) else "error")
        if "--- turn %s: harness ---" % m.group(1) in part:
            lab = "error"
        masked = "result masked by the harness" in part
        out.append([lab + (" (masked)" if masked else ""), len(part)])
    return out


CLIP_DISPLAY = 800
CODES = {"task": "x", "reply": "r", "error": "e", "result:read_file": "R", "result:run_tests": "T", "result:edit_file": "E",
         "result:run_command": "C", "result:delegate": "D"}


def pack(bl):
    """Blocks as one short string for the page: code letter, * if masked, characters; "|" between blocks."""
    out = []
    for lab, n in bl:
        m = lab.endswith(" (masked)")
        base = lab.replace(" (masked)", "")
        out.append(CODES.get(base, "U") + ("*" if m else "") + str(n))
    return "|".join(out)
runs = []
for label, step, name, desc in RUNS:
    d = os.path.join(RAW, label)
    if not os.path.exists(os.path.join(d, "events.jsonl")):
        print("missing", label)
        continue
    ev = [json.loads(l) for l in open(os.path.join(d, "events.jsonl"))]
    ev = R(ev)
    if not any(e["kind"] == "verdict" for e in ev):
        print("unfinished", label)
        continue
    # repo copy: every event, but each turn's assembled prompt replaced by its block list (the prompt
    # is the task block plus the earlier turns' text, so it can be rebuilt; storing it is quadratic)
    lean = [dict({k: v for k, v in e.items() if k != "prompt"}, **({"prompt_blocks": blocks(e["prompt"])} if "prompt" in e else {})) for e in ev]
    with open(os.path.join(OUTREC, label + ".jsonl"), "w") as o:
        for e in lean:
            o.write(json.dumps(e) + "\n")
    start = next(e for e in ev if e["kind"] == "start")
    systems = {e["who"]: e["system"] for e in ev if e["kind"] == "agent"}
    turns, tot = [], {"calls": 0, "ctx": 0, "out": 0, "cw": 0, "cr": 0, "think": 0, "secs": 0.0, "maxctx": 0}
    for e in ev:
        if e["kind"] != "turn":
            continue
        u = usage(e["usage"])
        ctx = u[0] + u[1] + u[2]
        obs = e.get("observation")
        full = len(obs) if isinstance(obs, str) else 0
        disc = e.get("discarded") or ""
        txt = e["text"][:len(e["text"]) - len(disc)]
        if step == "1":  # step 1 kept the whole reply; mark what lay after the first ACTION line
            m = re.search(r"^ACTION\s+(\{.*\})\s*$", e["text"], re.M)
            disc = e["text"][m.end():] if m else ""
            txt = e["text"][:m.end()] if m else e["text"]
        txtN = len(txt)
        if txtN > 1200:
            txt = txt[:700] + "\n[... %d characters not shown here; full text in the recording ...]\n" % (txtN - 1100) + txt[-400:]
        # when the CLI continued a reply that hit the output cap, usage sums two API calls; the prompt we sent is the first
        it = e["usage"].get("iterations") or []
        last = (it[-1]["input_tokens"] + it[-1]["cache_creation_input_tokens"] + it[-1]["cache_read_input_tokens"]) if it else ctx
        pctx = ctx - last if it and last != ctx else ctx
        t = {"w": e.get("who", "main"), "n": e["turn"], "txt": txt, "txtN": txtN, "pctx": pctx,
             "disc": disc[:280], "discN": len(disc), "act": e.get("action"), "dec": e.get("decision"), "why": e.get("why"),
             "obs": obs[:CLIP_DISPLAY] if isinstance(obs, str) else None, "obsN": full, "raw": e.get("raw_chars", full),
             "u": u, "s": e["seconds"], "b": pack(blocks(e["prompt"])), "pc": len(e["prompt"]), "mk": e.get("masked", 0)}
        turns.append(t)
        tot["calls"] += 1; tot["ctx"] += ctx; tot["out"] += u[3]; tot["cw"] += u[1]; tot["cr"] += u[2]
        tot["think"] += u[4]; tot["secs"] += e["seconds"]; tot["maxctx"] = max(tot["maxctx"], ctx)
    tot["secs"] = round(tot["secs"], 1)
    verdict = next(e for e in ev if e["kind"] == "verdict")
    stop = next((e["reason"] for e in ev if e["kind"] == "stop"), "no action" if step in ("1", "1b") and turns and turns[-1]["act"] is None else ("max turns" if step in ("1", "1b") else "single call"))
    mid = next((json.loads(l).get("model") for l in open(os.path.join(d, "events.jsonl.raw")) if '"subtype":"init"' in l), start["model"])
    runs.append({"id": label, "step": step, "name": name, "desc": desc, "model": start["model"], "modelId": mid, "passed": verdict["passed"],
                 "tests": verdict["output"], "stop": stop, "sys": systems or {"main": start.get("system", "")},
                 "limit": start.get("context_limit"), "turns": [] if label in LITE else turns, "lite": label in LITE,
                 "acts": [t["act"]["tool"] if t["act"] else "(none)" for t in turns], "tot": tot,
                 "first": turns[0] if label in LITE and turns else None})

# ---- Claude Code runs: redacted JSONL copies plus a per-call summary
ids = {}
def short(prefix, v):
    k = (prefix, v)
    if k not in ids:
        ids[k] = f"{prefix}{sum(1 for p, _ in ids if p == prefix) + 1}"
    return ids[k]

INIT_KEEP = ["type", "subtype", "model", "permissionMode", "tools", "claude_code_version", "cwd"]
ccruns = []
for label, name in CC:
    f = os.path.join(RAW, label, "cc.jsonl")
    if not os.path.exists(f):
        print("missing", label)
        continue
    recs, kept = [json.loads(l) for l in open(f)], []
    for r in recs:
        t = r.get("type")
        if t == "rate_limit_event" or (t == "system" and r.get("subtype") not in ("init", "permission_denied")):
            continue
        if t == "system" and r.get("subtype") == "init":
            r = {k: r[k] for k in INIT_KEEP if k in r}
        r.pop("session_id", None); r.pop("uuid", None); r.pop("parent_tool_use_id", None)
        if t in ("assistant", "user"):
            m = r["message"]
            if "id" in m:
                m["id"] = short("msg", m["id"])
            for c in m["content"] if isinstance(m["content"], list) else []:
                if c.get("type") == "thinking":
                    c.pop("signature", None)
                    c["thinking"] = "(thinking happened; text not returned)"
                if "id" in c:
                    c["id"] = short("tool", c["id"])
                if "tool_use_id" in c:
                    c["tool_use_id"] = short("tool", c["tool_use_id"])
            r.pop("tool_use_result", None)
        if t == "result":
            for k in ("session_id", "uuid", "modelUsage", "fast_mode_state", "fast_mode_disabled_reason"):
                r.pop(k, None)
            r["permission_denials"] = [{"tool_name": p.get("tool_name"), "tool_input": p.get("tool_input")} for p in r.get("permission_denials", [])]
        kept.append(R(r))
    with open(os.path.join(OUTREC, label + ".jsonl"), "w") as o:
        for r in kept:
            o.write(json.dumps(r) + "\n")
    # summary: one entry per API call (records sharing a message id)
    calls, order = {}, []
    init = next(r for r in kept if r.get("subtype") == "init")
    res = next(r for r in kept if r["type"] == "result")
    cur = None
    for r in kept:
        if r["type"] == "assistant":
            mid = r["message"]["id"]
            if mid not in calls:
                calls[mid] = {"u": usage(r["message"]["usage"]), "c": [], "res": []}
                order.append(mid)
            cur = calls[mid]
            for c in r["message"]["content"]:
                if c["type"] == "thinking":
                    cur["c"].append({"t": "think"})
                elif c["type"] == "text":
                    cur["c"].append({"t": "text", "x": c["text"]})
                elif c["type"] == "tool_use":
                    inp = {k: (v if len(str(v)) < 400 else str(v)[:400] + " ...") for k, v in c["input"].items()}
                    cur["c"].append({"t": "tool", "name": c["name"], "in": inp, "id": c["id"]})
        elif r["type"] == "user" and cur is not None and isinstance(r["message"]["content"], list):
            for c in r["message"]["content"]:
                if c.get("type") == "tool_result":
                    body = c["content"] if isinstance(c["content"], str) else " ".join(x.get("text", "") for x in c["content"])
                    cur["res"].append({"id": c["tool_use_id"], "x": body[:700], "n": len(body), "err": bool(c.get("is_error"))})
        elif r["type"] == "system" and r.get("subtype") == "permission_denied" and cur is not None:
            cur.setdefault("denied", 0)
            cur["denied"] += 1
    verdict = open(os.path.join(RAW, label, "verdict.txt")).read()
    wall = int(re.search(r"wall (\d+) s", verdict).group(1))
    ccruns.append({"id": label, "name": name, "model": init.get("model"), "tools": init.get("tools"), "mode": init.get("permissionMode"),
                   "version": init.get("claude_code_version"), "passed": verdict.strip().endswith("passed"),
                   "numTurns": res.get("num_turns"), "ms": res.get("duration_ms"), "cost": res.get("total_cost_usd"),
                   "usage": usage(res["usage"]), "denials": res["permission_denials"], "wall": wall,
                   "calls": [calls[m] for m in order]})

# ---- the harness code, step by step
code, prev = [], None
for f in STEPFILES:
    src = open(os.path.join(HERE, "harness", f)).read()
    item = {"f": f, "lines": src.count("\n")}
    if f in ("step1.py", "step5.py"):
        item["full"] = src
    if prev is not None and f not in ("step1.py", "step5.py"):
        item["diff"] = [l for l in difflib.unified_diff(prev.splitlines(), src.splitlines(), lineterm="", n=0)][2:]
    if prev is not None:
        sm = difflib.SequenceMatcher(None, prev.splitlines(), src.splitlines())
        item["plus"] = sum(j2 - j1 for op, i1, i2, j1, j2 in sm.get_opcodes() if op in ("insert", "replace"))
        item["minus"] = sum(i2 - i1 for op, i1, i2, j1, j2 in sm.get_opcodes() if op in ("delete", "replace"))
    code.append(item)
    prev = src

gate = json.load(open(os.path.join(HERE, "gate_cases.json"))) if os.path.exists(os.path.join(HERE, "gate_cases.json")) else []
data = {"runs": runs, "cc": ccruns, "code": code, "gate": gate}
body = json.dumps(R(data), separators=(",", ":"))
while "{{" in body:  # build.sh expands {{text|url}} links; JSON strings may hold "{{", so escape the second brace
    body = body.replace("{{", "{\\u007b")
js = "// Loop lab data: built by src/loop/build_data.py from the redacted recordings in src/loop/recordings/. Do not edit.\nwindow.LOOPDATA=" + body + ";\n"
open(PART, "w").write(js)
print("runs", len(runs), "cc", len(ccruns), "data bytes", len(js))

# ---- privacy check over everything written
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "topic_protocols", "src"))
from private_patterns import alternation
bad = re.compile("|".join([re.escape(HOMES + "/"), re.escape(HOMES.strip("/") + "-"), re.escape(ME), "glpat", "sk-ant", alternation()]), re.I)
for fn in [PART] + [os.path.join(OUTREC, x) for x in os.listdir(OUTREC)]:
    for i, line in enumerate(open(fn)):
        if bad.search(line):
            print("PRIVATE STRING in", fn, "line", i + 1, bad.search(line).group(0))
            sys.exit(1)
print("privacy check: clean")
