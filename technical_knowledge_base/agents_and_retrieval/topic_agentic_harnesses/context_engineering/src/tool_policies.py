"""Tool-output policies applied to one noisy tool result: the Trace and context lab's ci.log
(6,005 lines, 490,895 bytes, five relevant lines at 3101 to 3105).
Usage: python3 tool_policies.py CI_LOG OUTDIR
Writes OUTDIR/<policy>.txt (what the model would see) and OUTDIR/policies.json (chars, lines, whether each of the
five relevant lines survives verbatim). Token counts are measured separately by count_tokens.sh, which sends each
text to Claude Haiku 4.5 through claude -p and reads the input token count (minus an empty-prompt baseline)."""
import json, os, sys

log, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
L = open(log).read().splitlines()
KEY = [l for l in L if "heartbeat" not in l]
assert len(KEY) == 5, KEY
raw = "\n".join(L) + "\n"

def head_tail_chars(s, n):
    h = n // 2
    return s[:h] + f"\n... [{len(s) - n} characters omitted] ...\n" + s[-h:]

P = {}
P["raw"] = ("The whole output, unclipped", raw)
P["cc_valid"] = ("Claude Code Bash, valid result over 30,000 characters: file path plus the first 2,000 characters (documented)",
                 "Output too large. Full output saved to: /tmp/claude-task-output/ci_output.txt\nPreview (first 2000 chars):\n" + raw[:2000])
P["cc_failure"] = ("Claude Code Bash, failed command: head-and-tail excerpt of about 10,000 characters (documented)", head_tail_chars(raw, 10000))
P["head_tail_lines"] = ("First 15 and last 15 lines (the Loop lab's naive clip)",
                        "\n".join(L[:15] + [f"... [{len(L) - 30} lines omitted] ..."] + L[-15:]) + "\n")
P["page_2000"] = ("Paged: first page of 2,000 lines, with a note on how to read more",
                  "\n".join(f"{i+1}\t{l}" for i, l in enumerate(L[:2000])) + "\n[PARTIAL view: lines 1-2000 of 6005. Use offset and limit to read more.]\n")
P["filter"] = ("Filtered: lines that are not heartbeats (grep -v heartbeat), with a count of what was dropped",
               "\n".join(KEY) + f"\n[{len(L) - 5} heartbeat lines dropped]\n")
P["mask"] = ("Masked after use: the result replaced by a one-line stub on later calls",
             "[tool result cleared to save context: cat ci.log, 6,005 lines; run the command again to see it]\n")
meta = {}
for k, (desc, text) in P.items():
    open(os.path.join(out, k + ".txt"), "w").write(text)
    meta[k] = {"desc": desc, "chars": len(text), "lines": text.count("\n"),
               "key_lines_kept": sum(1 for x in KEY if x in text)}
json.dump({"log_lines": len(L), "log_bytes": os.path.getsize(log), "key_lines": KEY,
           "key_line_numbers": [L.index(x) + 1 for x in KEY], "policies": meta}, open(os.path.join(out, "policies.json"), "w"), indent=1)
for k, v in meta.items():
    print(k, v["chars"], v["key_lines_kept"])
