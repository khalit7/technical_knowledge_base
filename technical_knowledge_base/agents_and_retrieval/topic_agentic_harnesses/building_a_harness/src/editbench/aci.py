#!/usr/bin/env python3
"""Tool-design experiment: does the wording of an error change whether the model recovers?

For every edit in a bench log whose FIRST attempt failed to apply, the retry is asked again with two
other error messages, so each failure is retried three ways from the same first reply:
  terse        "Edit failed."
  native       the applier's own message (git apply, Codex, Aider, or Claude Code's wording); this
               retry is the bench's own second attempt, so it is not re-run here
  instructive  a diagnosis computed by the harness: wrong hunk counts and the real line numbers, an @@
               line that is itself being changed, the closest lines in the file, CRLF line endings
Usage: aci.py BENCH_LOG OUT.jsonl claude|local [--model haiku] [--no-thinking] --aider DIR --empty DIR
"""
import argparse, difflib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def closest(content, lines_wanted, k=3):
    lines = content.replace("\r\n", "\n").splitlines()
    first = next((l for l in lines_wanted if l.strip()), "")
    best = difflib.get_close_matches(first.strip(), [l.strip() for l in lines], n=1, cutoff=0.4)
    if not best:
        return ""
    i = [l.strip() for l in lines].index(best[0])
    lo, hi = max(0, i - 1), min(len(lines), i + k)
    return "\n".join(f"{n + 1:>4}| {lines[n]}" for n in range(lo, hi))


def diag_udiff(content, text):
    lines = content.replace("\r\n", "\n").splitlines()
    out, hunks = [], re.split(r"^(@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@.*)$", text, flags=re.M)
    for h in range(1, len(hunks), 2):
        m = re.match(r"@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@", hunks[h])
        body = hunks[h + 1].split("\n")[1:]          # [0] is the rest of the header line
        body = body[:next((i for i, l in enumerate(body) if l.startswith("```") or l.startswith("--- ")), len(body))]
        while body and body[-1] == "":
            body.pop()
        old = [l[1:] for l in body if l[:1] in (" ", "-") or l == ""]
        new = [l[1:] for l in body if l[:1] in (" ", "+") or l == ""]
        say_old, say_new = int(m.group(2) or 1), int(m.group(4) or 1)
        where = next((i + 1 for i in range(len(lines) - len(old) + 1) if lines[i:i + len(old)] == old), None)
        msg = f"Hunk {h // 2 + 1}: its header says {say_old} old and {say_new} new lines, but its body has {len(old)} old and {len(new)} new lines."
        if where is None:
            msg += " Its old lines (context and -) do not appear together in the file. The closest lines are:\n" + closest(content, old)
        elif where != int(m.group(1)):
            msg += f" Its old lines start at line {where} of the file, not line {m.group(1)}."
        out.append(msg)
    crlf = ("\nThe file uses CRLF (Windows) line endings, so each - and context line must end with a carriage return"
            " to match.") if "\r\n" in content else ""
    return "\n".join(out) + "\nFix each header so the numbers match the body: @@ -START,OLD +START,NEW @@." + crlf


def diag_patch(content, text, err):
    m = re.search(r"Failed to find context '(.*)' in", err)
    if m:
        ctx = m.group(1)
        removed = [l[1:] for l in text.splitlines() if l.startswith("-")]
        if ctx in removed:
            return (f"The @@ line '{ctx}' is itself one of the lines you remove. The @@ line must be an unchanged line that "
                    "comes BEFORE the change (for example the line above it); the changed line goes below it with - and +.")
        return f"The @@ line '{ctx}' was not found after the previous hunk. Closest lines in the file:\n" + closest(content, [ctx])
    m = re.search(r"Failed to find expected lines in [^:]+:\n(.*)", err, re.S)
    if m:
        want = m.group(1).split("\n")
        hint = ""
        hunks = re.findall(r"^@@ (.+)$", text, re.M)
        if hunks and any(h.strip() == w.strip() for h in hunks for w in want):
            hint = " Your @@ line repeats a line that the hunk also lists; the hunk is searched for only AFTER the @@ line, so it cannot match."
        return ("These lines (context and -) were not found in this order after the @@ line:\n" + "\n".join(want[:6]) +
                hint + "\nClosest lines in the file:\n" + closest(content, want))
    return err + "\nThe patch must start with *** Begin Patch, then *** Update File: PATH, and end with *** End Patch."


def diag_sr(content, text, err):
    import tasks  # noqa
    m = re.search(r"<<<<<<< SEARCH\n(.*?)=======", err, re.S)
    want = m.group(1).split("\n") if m else []
    crlf = " The file uses CRLF (Windows) line endings: copy the lines exactly; the harness matches them byte for byte." if "\r\n" in content else ""
    return ("The SEARCH text was not found exactly." + crlf + "\nClosest lines in the file (number| text):\n" + closest(content, want))


def instructive(fmt, content, first_reply, err):
    import bench
    if fmt == "udiff":
        return diag_udiff(content, first_reply)
    if fmt == "patch":
        return diag_patch(content, first_reply, err)
    if fmt == "sr":
        return diag_sr(content, first_reply, err)
    if fmt == "exact":
        e = (first_reply or {}).get("edits", []) if isinstance(first_reply, dict) else []
        for i, x in enumerate(e, 1):
            old = x.get("old_string", "")
            n = content.count(old)
            if n != 1:
                return bench.exact_msg("many" if n > 1 else "missing", i, old, content, "instructive", n)
        return err
    return err


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("log"); ap.add_argument("out"); ap.add_argument("backend", choices=["claude", "local"])
    ap.add_argument("--model", default="haiku"); ap.add_argument("--no-thinking", action="store_true")
    ap.add_argument("--aider", required=True); ap.add_argument("--empty", default="/tmp")
    ap.add_argument("--base", default="http://127.0.0.1:8090/v1")
    ap.add_argument("--local-model", default="mlx-community/Qwen3-4B-Instruct-2507-4bit")
    ap.add_argument("--temp", type=float, default=0.0); ap.add_argument("--seed", type=int, default=0)
    A = ap.parse_args()
    sys.path.insert(0, A.aider)
    import bench, tasks as T
    import editblock_coder, udiff_coder
    bench.AIDER.update({"editblock_coder": editblock_coder, "udiff_coder": udiff_coder})
    checks = {tid: (path, ins, chk) for tid, path, ins, chk in T.TASKS}
    for line in open(A.log):
        r = json.loads(line)
        a1 = r["attempts"][0]
        if a1["error"] is None or r["format"] == "whole":
            continue
        path, ins, chk = checks[r["task"]]
        content = T.read(path)
        prompt = bench.prompt_for(path, content, ins, r["format"])
        first = a1["out"]
        for level in ("terse", "instructive"):
            msg = "Edit failed." if level == "terse" else instructive(r["format"], content, first["reply"], a1["error"])
            if A.backend == "claude":
                out = bench.claude_call(bench.flatten(prompt, first, msg), r["format"], A)
            else:
                msgs = [{"role": "system", "content": bench.SYSTEM}, {"role": "user", "content": prompt}]
                if r["format"] == "exact" and first.get("tool_calls"):
                    msgs += [{"role": "assistant", "content": first["text"], "tool_calls": first["tool_calls"]},
                             {"role": "tool", "tool_call_id": first["tool_calls"][0].get("id", ""), "content": msg}]
                else:
                    msgs += [{"role": "assistant", "content": first["text"]},
                             {"role": "user", "content": "The harness could not apply your edit:\n" + msg +
                              "\nReply again with a corrected edit, in the same format."}]
                out = bench.local_call(msgs, r["format"], A)
            name, fn = bench.appliers(r["format"])[0]
            try:
                if out["reply"] is None:
                    raise bench.ApplyError("no edit")
                new = fn(content, out["reply"], path)
                ok, why = chk(content, new); applied = True
            except bench.ApplyError as e:
                ok, why, applied = False, str(e)[:400], False
            out.pop("raw", None)
            native_ok = r["attempts"][-1]["results"][name]["ok"] if len(r["attempts"]) > 1 else None
            with open(A.out, "a") as f:
                f.write(json.dumps({"task": r["task"], "format": r["format"], "level": level, "message": msg,
                                    "applied": applied, "ok": ok, "why": why, "native_retry_ok": native_ok,
                                    "native_message": a1["error"], "out": out}) + "\n")
            print(r["task"], r["format"], level, ok, why[:60].replace("\n", " "), flush=True)


if __name__ == "__main__":
    main()
