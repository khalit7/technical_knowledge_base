"""What an SDK 2.3.0 Streamable HTTP server does with hostile or malformed requests (sent with httpx, recorded).
Usage: python wire_checks.py OUT.json   (ckpt_server on 30761)"""
import json, os, subprocess, sys, time, httpx
H = os.path.dirname(os.path.abspath(__file__)); PY = sys.executable; U = "http://127.0.0.1:30761/mcp"
META = {"io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {}}


def body(method, name=None, args=None, meta=META, extra=None):
    p = {"_meta": meta} if meta is not None else {}
    if name: p.update({"name": name, "arguments": args or {}})
    if extra: p.update(extra)
    return {"jsonrpc": "2.0", "id": 7, "method": method, "params": p}


def hdr(method, name=None, **kw):
    h = {"accept": "application/json, text/event-stream", "content-type": "application/json", "mcp-protocol-version": "2026-07-28", "mcp-method": method}
    if name: h["mcp-name"] = name
    h.update(kw); return h


CASES = [
    ("baseline: a well-formed call", hdr("tools/call", "list_checkpoints"), body("tools/call", "list_checkpoints", {"run": "llama-7b-sft"})),
    ("Mcp-Name says one tool, the body calls another", hdr("tools/call", "list_checkpoints"), body("tools/call", "delete_checkpoint", {"name": "llama-7b-step-1000"})),
    ("Mcp-Method header missing", {k: v for k, v in hdr("tools/call", "list_checkpoints").items() if k != "mcp-method"}, body("tools/call", "list_checkpoints", {"run": "x"})),
    ("MCP-Protocol-Version header disagrees with _meta", hdr("tools/call", "list_checkpoints", **{"mcp-protocol-version": "2025-11-25"}), body("tools/call", "list_checkpoints", {"run": "x"})),
    ("unsupported protocol version", hdr("tools/call", "list_checkpoints", **{"mcp-protocol-version": "1900-01-01"}), body("tools/call", "list_checkpoints", {"run": "x"}, meta={**META, "io.modelcontextprotocol/protocolVersion": "1900-01-01"})),
    ("_meta missing entirely", hdr("tools/call", "list_checkpoints"), body("tools/call", "list_checkpoints", {"run": "x"}, meta=None)),
    ("unknown tool", hdr("tools/call", "rm_rf"), body("tools/call", "rm_rf", {})),
    ("arguments fail the input schema", hdr("tools/call", "list_checkpoints"), body("tools/call", "list_checkpoints", {"run": 42})),
    ("unknown method", hdr("tools/teleport"), body("tools/teleport")),
    ("browser page on another site (Origin: http://evil.example)", hdr("tools/call", "list_checkpoints", origin="http://evil.example"), body("tools/call", "list_checkpoints", {"run": "x"})),
    ("DNS rebinding (Host: rebind.evil.example)", hdr("tools/call", "list_checkpoints", host="rebind.evil.example"), body("tools/call", "list_checkpoints", {"run": "x"})),
    ("a tampered requestState", hdr("tools/call", "delete_checkpoint"), body("tools/call", "delete_checkpoint", {"name": "llama-7b-step-1000"},
        extra={"inputResponses": {"confirm": {"action": "accept", "content": {"confirm": True}}}, "requestState": "v1.AAAAforgedAAAA"})),
    ("legacy GET stream on a modern request path", None, None),
]

srv = subprocess.Popen([PY, os.path.join(H, "ckpt_server.py"), "http", "30761"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(100):
    try:
        httpx.get(U, timeout=0.2); break
    except Exception:
        time.sleep(0.1)
out = []
try:
    for name, h, b in CASES:
        if h is None:
            r = httpx.get(U, headers={"accept": "text/event-stream", "mcp-protocol-version": "2026-07-28"}, timeout=3)
            sent = {"method": "GET", "headers": {"accept": "text/event-stream", "mcp-protocol-version": "2026-07-28"}}
        else:
            r = httpx.post(U, headers=h, content=json.dumps(b), timeout=5)
            sent = {"method": "POST", "headers": h, "body": b}
        rec = {"case": name, "sent": sent, "status": r.status_code, "resp": r.text[:500]}
        out.append(rec); print(r.status_code, name, "|", r.text[:150])
finally:
    srv.terminate()
json.dump(out, open(sys.argv[1], "w"), indent=1)
