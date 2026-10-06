#!/usr/bin/env python3
"""Edit-format bench: the 13 edits of tasks.py, each asked for in five formats, applied by each
format's own applier, checked, and (when the applier reports an error) retried once with that error.

Usage:
  bench.py local OUT.jsonl [--temp T] [--seed S]          local model through mlx_lm.server
  bench.py claude OUT.jsonl --model haiku|sonnet          Claude through claude -p (subscription)
  options: --only t01,t02  --formats exact,sr  --aider DIR (Aider's appliers, see setup_aider.sh)

Formats:  exact  exact-string replacement as a TOOL CALL (edits: [{old_string, new_string}]), the
                 shape of Claude Code's Edit tool; each old_string must occur exactly once.
          sr     Aider's SEARCH/REPLACE blocks (text).
          udiff  a unified diff (text), as diff -U3 or git diff writes it.
          whole  the whole new file (text).
          patch  Codex's apply_patch envelope (text).
One reply can be applied several ways ("appliers"): sr strictly and with Aider's own fallbacks, udiff
with git apply, git apply --recount, and Aider's udiff applier. The first applier of each format is the
one whose error drives the retry: exact, sr_aider, udiff_git, whole, patch.
"""
import argparse, difflib, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tasks as T
import codex_patch as CP

SYSTEM = "You edit one file at a time. Reply only with the edit, in exactly the format requested. Never use the em-dash character."

EX_FILE = "app/greet.py"
EX_BEFORE = 'def greet(name):\n    return "Hello " + name\n'

SPEC = {
"exact": """Make the change by calling the edit_file tool once. Its argument edits is a list of
{"old_string": ..., "new_string": ...} pairs applied in order. Each old_string must be copied exactly
from the file (same indentation and spacing) and must occur exactly once in the file, so include enough
surrounding lines to make it unique. Use several pairs for changes in several places.""",
"sr": f"""Reply with one or more SEARCH/REPLACE blocks. Each block is: the file path alone on a line,
an opening fence, the line <<<<<<< SEARCH, the exact existing lines to find, the line =======, the lines
to put in their place, the line >>>>>>> REPLACE, and a closing fence. The SEARCH part must match the
file exactly, character for character, including indentation. Example for {EX_FILE}:

{EX_FILE}
```python
<<<<<<< SEARCH
    return "Hello " + name
=======
    return f"Hello {{name}}!"
>>>>>>> REPLACE
```""",
"udiff": f"""Reply with a unified diff of the file in one fenced block, in the format that
diff -u or git diff produces: --- a/PATH and +++ b/PATH header lines, then hunks that each start with
@@ -start,count +start,count @@, with context lines starting with a space, removed lines with -, added
lines with +. Line numbers and counts must be correct. Example for {EX_FILE}:

```diff
--- a/{EX_FILE}
+++ b/{EX_FILE}
@@ -1,2 +1,2 @@
 def greet(name):
-    return "Hello " + name
+    return f"Hello {{name}}!"
```""",
"whole": f"""Reply with the complete new content of the file, every line of it including the
unchanged ones, in one fenced block with the file path alone on the line before the fence. Example:

{EX_FILE}
```python
def greet(name):
    return f"Hello {{name}}!"
```""",
"patch": f"""Reply with a patch in the apply_patch format, in one fenced block. The patch starts
with the line *** Begin Patch and ends with *** End Patch. Inside, *** Update File: PATH, then one or
more hunks. A hunk may start with @@ followed by a line that occurs just before the change (such as the
def line of the function) to say where it is; then context lines starting with a space, removed lines
starting with -, added lines starting with +. Show about 3 lines of context around each change. No line
numbers. Example:

```
*** Begin Patch
*** Update File: {EX_FILE}
@@ def greet(name):
-    return "Hello " + name
+    return f"Hello {{name}}!"
*** End Patch
```""",
}

EDIT_TOOL = {"type": "function", "function": {"name": "edit_file",
             "description": "Edit the file by exact string replacement. Each old_string must occur exactly once in the file.",
             "parameters": {"type": "object", "properties": {"edits": {"type": "array", "items": {
                 "type": "object", "properties": {"old_string": {"type": "string"}, "new_string": {"type": "string"}},
                 "required": ["old_string", "new_string"]}}}, "required": ["edits"]}}}
EDIT_SCHEMA = EDIT_TOOL["function"]["parameters"]


def prompt_for(path, content, instruction, fmt):
    lang = {"json": "json", "py": "python"}.get(path.rsplit(".", 1)[-1], "")
    return (f"File {path}:\n```{lang}\n{content}```\n\nChange request: {instruction}\n\n{SPEC[fmt]}")


# ---------------------------------------------------------------- appliers: each returns new text or raises
class ApplyError(Exception):
    pass


def fence_blocks(text):
    return re.findall(r"^```[^\n]*\n(.*?)^```", text, re.M | re.S)


def ap_exact(content, reply, msg="native"):
    edits = reply.get("edits") if isinstance(reply, dict) else None
    if not isinstance(edits, list) or not edits:
        raise ApplyError("error: edits must be a non-empty list of {old_string, new_string}")
    for i, e in enumerate(edits, 1):
        old, new = e.get("old_string"), e.get("new_string")
        if not isinstance(old, str) or not isinstance(new, str) or old == "":
            raise ApplyError(f"error: edit {i} needs a non-empty old_string and a new_string")
        n = content.count(old)
        if n == 0:
            raise ApplyError(exact_msg("missing", i, old, content, msg))
        if n > 1:
            raise ApplyError(exact_msg("many", i, old, content, msg, n))
        content = content.replace(old, new)
    return content


def exact_msg(kind, i, old, content, level, n=0):
    """Three error messages for the same failure (the tool-design experiment)."""
    if level == "terse":
        return "Edit failed."
    if kind == "many":
        base = (f"Found {n} matches of the string to replace, but replace_all is false. To replace all occurrences, "
                "set replace_all to true. To replace only one occurrence, please provide more context to uniquely "
                "identify the instance.")  # Claude Code 2.1.289's wording, as recorded on the claude_code page
        if level == "native":
            return f"edit {i}: " + base
        lines = content.splitlines()
        first = old.splitlines()[0]
        hits = [k + 1 for k, l in enumerate(lines) if first in l]
        show = "\n".join(f"  line {h}: {lines[h - 1].strip()}  (inside {enclosing(lines, h)})" for h in hits[:6])
        return (f"edit {i}: old_string occurs {n} times, so the harness cannot tell which one you mean:\n{show}\n"
                "Add a neighbouring line that differs (for example the def line) to old_string.")
    base = "String to replace not found in file."
    if level == "native":
        return f"edit {i}: " + base
    lines = content.splitlines()
    first = (old.strip().splitlines() or [""])[0]
    best = difflib.get_close_matches(first.strip(), [l.strip() for l in lines], n=1, cutoff=0.5)
    near = ""
    if best:
        k = [l.strip() for l in lines].index(best[0])
        lo, hi = max(0, k - 1), min(len(lines), k + 2)
        near = "\nThe closest text in the file is at lines {}-{}:\n{}".format(
            lo + 1, hi, "\n".join(repr(l) for l in lines[lo:hi]))
    ws = " Note: this file uses CRLF line endings; old_string spanning lines must contain \\r\\n." if "\r\n" in content and "\n" in old else ""
    return f"edit {i}: old_string was not found exactly (it must match character for character, including indentation).{near}{ws}"


def enclosing(lines, lineno):
    for k in range(lineno - 1, -1, -1):
        m = re.match(r"(def|class) (\w+)", lines[k])
        if m:
            return f"{m.group(1)} {m.group(2)}"
    return "top level"


def ap_sr_strict(content, text):
    blocks = sr_blocks(text)
    for i, (_p, before, after) in enumerate(blocks, 1):
        n = content.count(before)
        if n != 1:
            raise ApplyError(f"block {i}: SEARCH text found {n} times (strict: must be exactly once)")
        content = content.replace(before, after)
    return content


def sr_blocks(text):
    eb = AIDER["editblock_coder"]
    try:
        blocks = list(eb.find_original_update_blocks(text, valid_fnames=None))
    except ValueError as e:
        raise ApplyError(str(e)[:600])
    blocks = [b for b in blocks if b[0] is not None]
    if not blocks:
        raise ApplyError("no SEARCH/REPLACE blocks found")
    return blocks


def ap_sr_aider(content, text, path):
    """Aider's do_replace per block (perfect match, then leading-whitespace-tolerant, then '...' elision);
    on failure, Aider's own error message (SearchReplaceNoExactMatch plus 'Did you mean')."""
    eb = AIDER["editblock_coder"]
    blocks = sr_blocks(text)
    with tempfile.TemporaryDirectory() as d:
        fp = os.path.join(d, os.path.basename(path)); open(fp, "w", newline="").write(content)
        for _p, before, after in blocks:
            new = eb.do_replace(fp, content, before, after, ("```", "```"))
            if not new:
                did = eb.find_similar_lines(before, content)
                msg = (f"# 1 SEARCH/REPLACE block failed to match!\n\n## SearchReplaceNoExactMatch: This SEARCH block failed "
                       f"to exactly match lines in {path}\n<<<<<<< SEARCH\n{before}=======\n{after}>>>>>>> REPLACE\n\n")
                if did:
                    msg += f"Did you mean to match some of these actual lines from {path}?\n\n```\n{did}\n```\n\n"
                msg += ("The SEARCH section must exactly match an existing block of lines including all white space, "
                        "comments, indentation, docstrings, etc\n")
                raise ApplyError(msg)
            content = new
    return content


def diff_text(text):
    blocks = fence_blocks(text)
    t = next((b for b in blocks if "@@" in b), blocks[0] if blocks else text)
    if "@@" not in t:
        raise ApplyError("no unified diff hunk (@@ ... @@) found")
    return t if t.endswith("\n") else t + "\n"


def ap_git(content, text, path, recount=False):
    patch = diff_text(text)
    with tempfile.TemporaryDirectory() as d:
        fp = os.path.join(d, path); os.makedirs(os.path.dirname(fp), exist_ok=True)
        open(fp, "w", newline="").write(content)
        open(os.path.join(d, "x.patch"), "w").write(patch)
        strip = "-p1" if re.search(r"^--- a/", patch, re.M) else "-p0"
        cmd = ["git", "apply", strip] + (["--recount"] if recount else []) + ["x.patch"]
        r = subprocess.run(cmd, cwd=d, capture_output=True, text=True)
        if r.returncode:
            raise ApplyError((r.stderr or r.stdout).replace(d, "").strip()[:600])
        return open(fp, newline="").read()


def ap_udiff_aider(content, text, path):
    ud = AIDER["udiff_coder"]
    edits = list(ud.find_diffs("```diff\n" + diff_text(text) + "```\n"))
    if not edits:
        raise ApplyError("no diff hunks found")
    with tempfile.TemporaryDirectory() as d:
        fp = os.path.join(d, "f"); open(fp, "w", newline="").write(content)
        for _p, hunk in edits:
            hunk = ud.normalize_hunk(hunk)
            if not hunk:
                continue
            try:
                new = ud.do_replace(fp, content, hunk)
            except ud.SearchTextNotUnique:
                raise ApplyError("UnifiedDiffNotUnique: the hunk's lines match more than one place")
            if not new:
                raise ApplyError("UnifiedDiffNoMatch: the hunk's - and context lines are not in the file")
            content = new
    return content


def ap_whole(content, text, path):
    blocks = fence_blocks(text)
    if not blocks:
        raise ApplyError("no fenced block with the file content found")
    return max(blocks, key=len)


def ap_patch(content, text, path):
    blocks = fence_blocks(text)
    t = next((b for b in blocks if "*** Begin Patch" in b), text)
    try:
        files = CP.parse(t)
    except CP.PatchError as e:
        raise ApplyError(str(e))
    if not files:
        raise ApplyError("invalid patch: no *** Update File hunk")
    try:
        for _p, chunks in files:
            content = CP.apply(content, chunks, path)
    except CP.PatchError as e:
        raise ApplyError(str(e))
    return content


def appliers(fmt):
    return {"exact": [("exact", lambda c, r, p: ap_exact(c, r))],
            "sr": [("sr_aider", ap_sr_aider), ("sr_strict", lambda c, r, p: ap_sr_strict(c, r))],
            "udiff": [("udiff_git", ap_git), ("udiff_recount", lambda c, r, p: ap_git(c, r, p, True)),
                      ("udiff_aider", ap_udiff_aider)],
            "whole": [("whole", ap_whole)], "patch": [("patch", ap_patch)]}[fmt]


# ---------------------------------------------------------------- models
def local_call(messages, fmt, A):
    body = {"model": A.local_model, "messages": messages, "temperature": A.temp, "max_tokens": 3000, "seed": A.seed}
    if fmt == "exact":
        body["tools"] = [EDIT_TOOL]
    req = urllib.request.Request(A.base + "/chat/completions", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    for attempt in range(4):   # infrastructure errors (dropped connection) are retried, never scored
        t = time.time()
        try:
            with urllib.request.urlopen(req, timeout=900) as r:
                resp = json.loads(r.read())
            break
        except Exception as e:
            print("retrying after infrastructure error:", e, flush=True)
            time.sleep(20)
    else:
        raise RuntimeError("server unavailable")
    msg = resp["choices"][0]["message"]
    out = {"text": msg.get("content") or "", "finish": resp["choices"][0].get("finish_reason"),
           "usage": resp.get("usage", {}), "seconds": round(time.time() - t, 2)}
    if fmt == "exact":
        edits = []
        for c in msg.get("tool_calls") or []:
            try:
                a = json.loads(c["function"]["arguments"])
                edits += a.get("edits", []) if isinstance(a, dict) else []
            except Exception as e:
                out["tool_parse_error"] = str(e)
        out["reply"] = {"edits": edits} if msg.get("tool_calls") else None
        out["tool_calls"] = msg.get("tool_calls") or []
    else:
        out["reply"] = out["text"]
    return out


def claude_call(prompt, fmt, A):
    cmd = ["claude", "-p", "--output-format", "stream-json", "--verbose", "--no-session-persistence",
           "--setting-sources", "project", "--strict-mcp-config", "--model", A.model, "--tools", "",
           "--system-prompt", SYSTEM]
    if fmt == "exact":
        cmd += ["--json-schema", json.dumps(EDIT_SCHEMA)]
    t = time.time()
    env = dict(os.environ, **({"MAX_THINKING_TOKENS": "0"} if A.no_thinking else {}))
    r = subprocess.run(cmd, input=prompt, capture_output=True, text=True, cwd=A.empty, timeout=900, env=env)
    recs = [json.loads(l) for l in r.stdout.splitlines() if l.startswith("{")]
    res = [x for x in recs if x.get("type") == "result"]
    res = res[-1] if res else {}
    out = {"text": res.get("result", ""), "usage": res.get("usage", {}), "cost": res.get("total_cost_usd"),
           "num_turns": res.get("num_turns"), "seconds": round(time.time() - t, 2), "subtype": res.get("subtype"),
           "model_ids": sorted((res.get("modelUsage") or {}).keys()), "raw": recs,
           "thinking_blocks": sum(1 for x in recs if x.get("type") == "assistant"
                                  for c in x["message"].get("content", []) if c.get("type") == "thinking")}
    if fmt == "exact":
        out["reply"] = res.get("structured_output")
    else:
        out["reply"] = out["text"]
    return out


def flatten(prompt, first, err):
    shown = json.dumps(first["reply"]) if isinstance(first["reply"], dict) else (first["reply"] or "")
    return (prompt + "\n\n--- your previous reply ---\n" + shown + "\n--- the harness could not apply it ---\n" + err +
            "\n\nReply again with a corrected edit, in the same format.")


# ---------------------------------------------------------------- run
def run_case(tid, path, instruction, check, fmt, A, log):
    content = T.read(path)
    prompt = prompt_for(path, content, instruction, fmt)
    rec = {"task": tid, "path": path, "format": fmt, "attempts": []}
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}]
    for attempt in (1, 2):
        if A.backend == "local":
            out = local_call(messages, fmt, A)
        else:
            out = claude_call(prompt if attempt == 1 else flatten(prompt, rec["attempts"][0]["out"], rec["attempts"][0]["error"]), fmt, A)
        results, primary_err = {}, None
        for i, (name, fn) in enumerate(appliers(fmt)):
            try:
                if out["reply"] is None:
                    raise ApplyError("no edit_file tool call in the reply" if fmt == "exact" else "empty reply")
                new = fn(content, out["reply"], path)
                ok, why = check(content, new)
                results[name] = {"applied": True, "ok": ok, "why": why, "changed": new != content}
            except ApplyError as e:
                results[name] = {"applied": False, "ok": False, "why": str(e)[:700]}
                if i == 0:
                    primary_err = str(e)
            except Exception as e:  # an applier crash counts as a failure to apply
                results[name] = {"applied": False, "ok": False, "why": f"applier crashed: {type(e).__name__}: {e}"[:300]}
                if i == 0:
                    primary_err = results[name]["why"]
        rec["attempts"].append({"attempt": attempt, "out": out, "results": results, "error": primary_err})
        if primary_err is None or A.no_retry:
            break
        if A.backend == "local":  # the retry is a real second turn: the reply, then the error as the next message
            if fmt == "exact" and out.get("tool_calls"):
                messages += [{"role": "assistant", "content": out["text"], "tool_calls": out["tool_calls"]},
                             {"role": "tool", "tool_call_id": out["tool_calls"][0].get("id", ""), "content": primary_err}]
            else:
                messages += [{"role": "assistant", "content": out["text"]},
                             {"role": "user", "content": "The harness could not apply your edit:\n" + primary_err +
                              "\nReply again with a corrected edit, in the same format."}]
    with open(log, "a") as f:
        f.write(json.dumps(rec) + "\n")
    first = rec["attempts"][0]["results"]
    last = rec["attempts"][-1]["results"]
    p = appliers(fmt)[0][0]
    print(tid, fmt, "first:", first[p]["ok"], "final:", last[p]["ok"], (first[p]["why"] or "")[:70].replace("\n", " "), flush=True)


AIDER = {}


def main():
    global AIDER
    ap = argparse.ArgumentParser()
    ap.add_argument("backend", choices=["local", "claude"]); ap.add_argument("out")
    ap.add_argument("--model", default="haiku"); ap.add_argument("--temp", type=float, default=0.0)
    ap.add_argument("--seed", type=int, default=0); ap.add_argument("--only", default="")
    ap.add_argument("--formats", default="exact,sr,udiff,whole,patch")
    ap.add_argument("--aider", required=True, help="folder with Aider's editblock_coder.py and udiff_coder.py (setup_aider.sh)")
    ap.add_argument("--base", default="http://127.0.0.1:8090/v1")
    ap.add_argument("--local-model", default="mlx-community/Qwen3-4B-Instruct-2507-4bit")
    ap.add_argument("--empty", default=tempfile.gettempdir(), help="cwd for claude -p (an empty folder)")
    ap.add_argument("--no-retry", action="store_true")
    ap.add_argument("--no-thinking", action="store_true", help="claude: MAX_THINKING_TOKENS=0 (no thinking blocks)")
    A = ap.parse_args()
    sys.path.insert(0, A.aider)
    import editblock_coder, udiff_coder
    AIDER = {"editblock_coder": editblock_coder, "udiff_coder": udiff_coder}
    only = set(A.only.split(",")) if A.only else None
    for tid, path, instruction, check in T.TASKS:
        if only and tid not in only:
            continue
        for fmt in A.formats.split(","):
            run_case(tid, path, instruction, check, fmt, A, A.out)


if __name__ == "__main__":
    main()
