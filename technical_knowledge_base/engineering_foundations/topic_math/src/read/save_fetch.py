"""Save a Notion fetch result verbatim from an agent transcript (jsonl).
Usage: python3 save_fetch.py <transcript.jsonl> <notion id without dashes> <out.md>
Writes the fetch's "text" field exactly as Notion returned it (read only fetch)."""
import json, sys
path, nid, out = sys.argv[1:4]
found = None
for line in open(path):
    try: rec = json.loads(line)
    except Exception: continue
    msg = rec.get("message") or {}
    content = msg.get("content")
    if not isinstance(content, list): continue
    for c in content:
        if c.get("type") != "tool_result": continue
        parts = c.get("content")
        texts = [p.get("text", "") for p in parts] if isinstance(parts, list) else [parts or ""]
        for t in texts:
            if f"/p/{nid} as of" not in t: continue
            try: found = json.loads(t)["text"]
            except Exception: found = t
if found is None: sys.exit(f"no fetch of {nid} found")
open(out, "w").write(found)
print(out, len(found))
