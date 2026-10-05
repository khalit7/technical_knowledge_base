"""Extract the verbatim Notion fetch results (old root and seven old children) from this agent's
session transcript and save each one to read/old/<slug>.md. Read-only fetches made 2026-10-05."""
import json, sys, re, pathlib
src = pathlib.Path(sys.argv[1]); out = pathlib.Path(__file__).parent / "old"
ids = {"3c65c17b0d0d81a2bb1ac0bc8aeb6aa9": "00_root_topic_programming_languages",
 "3cd5c17b0d0d81b28acdea39e7a4d998": "python_zero_to_expert",
 "3c65c17b0d0d81d78b91c4eb4ead83dd": "python_staying_current",
 "3cd5c17b0d0d81ceadcee44fe9c023a0": "cpp_zero_to_expert",
 "3c65c17b0d0d8107a807c1919be09dab": "cpp_modern_practice",
 "3c65c17b0d0d8156bed9ead8a22f33b0": "rust_zero_to_expert",
 "3cd5c17b0d0d81dbac7be3b8686be023": "javascript_zero_to_expert",
 "3cd5c17b0d0d814ea1c7eb69cdeb486d": "typescript_zero_to_expert",
 "3c65c17b0d0d81c39f34d5e070d783c1": "related_topic_cuda_and_gpu_programming"}
found = {}
for line in src.open():
    try: rec = json.loads(line)
    except Exception: continue
    msg = rec.get("message") or {}
    content = msg.get("content")
    if not isinstance(content, list): continue
    for c in content:
        if c.get("type") != "tool_result": continue
        parts = c.get("content")
        texts = [p.get("text","") for p in parts] if isinstance(parts, list) else [parts or ""]
        for t in texts:
            if '"metadata":{"type":"page"}' not in t: continue
            d = json.loads(t)
            m = re.search(r"/p/([0-9a-f]{32})", d["url"])
            if m and m.group(1) in ids: found[m.group(1)] = d
for k, slug in ids.items():
    d = found.get(k)
    if not d: print("MISSING", slug); continue
    (out / f"{slug}.md").write_text(f"<!-- title: {d['title']} | url: {d['url']} | page_last_edited_at: {d.get('page_last_edited_at')} -->\n" + d["text"])
    print(slug, len(d["text"]))
