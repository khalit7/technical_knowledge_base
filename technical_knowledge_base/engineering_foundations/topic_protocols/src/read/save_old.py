"""Extract the verbatim Notion fetch results (old root and ten old children of Topic: protocols) from this
agent's session transcript and save each one to read/old/<slug>.md. Read-only fetches made 2026-10-05.
Usage: python3 save_old.py <transcript.jsonl>"""
import json, sys, re, pathlib
src = pathlib.Path(sys.argv[1]); out = pathlib.Path(__file__).parent / "old"
ids = {"3c65c17b0d0d81ec9355f4eecd6eed02": "00_root_topic_protocols",
 "3c65c17b0d0d811bb035fa3f158b0889": "http_1_1_2_3_llm_services",
 "3c65c17b0d0d813f9695dc4175c44cbb": "model_context_protocol_mcp",
 "3c65c17b0d0d812daa9fdb38719fc82b": "realtime_and_event_delivery",
 "3c65c17b0d0d81cb88a3f1f63e85f27b": "rpc_and_api_styles",
 "3c65c17b0d0d817692dcc8ebd59b5c2b": "auth_oauth_oidc_jwt",
 "3c65c17b0d0d81bdb2a1caea5d41776e": "websocket_rfc6455",
 "3c65c17b0d0d8117b21dcb9041879564": "tcp_udp_ip",
 "3c65c17b0d0d812387d8f92b546f07af": "dns",
 "3c65c17b0d0d8105a37ff2d2f602a421": "tls_and_pki",
 "3c65c17b0d0d81f88f50e478c94ebdcd": "ssh"}
found = {}
for line in src.open():
    try: rec = json.loads(line)
    except Exception: continue
    content = (rec.get("message") or {}).get("content")
    if not isinstance(content, list): continue
    for c in content:
        if not isinstance(c, dict) or c.get("type") != "tool_result": continue
        parts = c.get("content")
        texts = [p.get("text", "") for p in parts] if isinstance(parts, list) else [parts or ""]
        for t in texts:
            if '"metadata":{"type":"page"}' not in t: continue
            try: d = json.loads(t)
            except Exception: continue
            m = re.search(r"/p/([0-9a-f]{32})", d["url"])
            if m and m.group(1) in ids: found[m.group(1)] = d
for k, slug in ids.items():
    d = found.get(k)
    if not d: print("MISSING", slug); continue
    (out / f"{slug}.md").write_text(f"<!-- title: {d['title']} | url: {d['url']} | page_last_edited_at: {d.get('page_last_edited_at')} | fetched read-only 2026-10-05 -->\n" + d["text"])
    print(slug, len(d["text"]))
