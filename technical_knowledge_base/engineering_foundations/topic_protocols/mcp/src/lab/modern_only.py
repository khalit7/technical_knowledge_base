"""A hand-rolled stdio server that speaks only MCP 2026-07-28 (about 40 lines, no SDK): the 'modern-only' column
of the compatibility experiment. One tool, list_checkpoints. Per the spec it names its supported versions when
an old client sends initialize."""
import json, sys
V = "2026-07-28"
INFO = {"io.modelcontextprotocol/serverInfo": {"name": "modern-only", "version": "0.1"}}
TOOL = {"name": "list_checkpoints", "description": "List checkpoints of a run.",
        "inputSchema": {"type": "object", "properties": {"run": {"type": "string"}}, "required": ["run"]}}


def send(m):
    sys.stdout.write(json.dumps(m) + "\n"); sys.stdout.flush()


for line in sys.stdin:
    m = json.loads(line)
    if "id" not in m:
        continue
    i, meth, p = m["id"], m.get("method"), m.get("params") or {}
    ver = (p.get("_meta") or {}).get("io.modelcontextprotocol/protocolVersion")
    if meth == "initialize":
        send({"jsonrpc": "2.0", "id": i, "error": {"code": -32601, "message": f"initialize is not supported; this server speaks MCP {V} only"}})
    elif ver is None:
        send({"jsonrpc": "2.0", "id": i, "error": {"code": -32602, "message": "missing _meta io.modelcontextprotocol/protocolVersion"}})
    elif ver != V:
        send({"jsonrpc": "2.0", "id": i, "error": {"code": -32022, "message": "Unsupported protocol version", "data": {"supported": [V], "requested": ver}}})
    elif meth == "server/discover":
        send({"jsonrpc": "2.0", "id": i, "result": {"resultType": "complete", "supportedVersions": [V], "capabilities": {"tools": {}}, "_meta": INFO}})
    elif meth == "tools/list":
        send({"jsonrpc": "2.0", "id": i, "result": {"resultType": "complete", "tools": [TOOL], "ttlMs": 60000, "cacheScope": "public", "_meta": INFO}})
    elif meth == "tools/call":
        send({"jsonrpc": "2.0", "id": i, "result": {"resultType": "complete", "content": [{"type": "text", "text": "llama-7b-step-1000, llama-7b-step-2000, llama-7b-step-3000"}], "isError": False, "_meta": INFO}})
    else:
        send({"jsonrpc": "2.0", "id": i, "error": {"code": -32601, "message": "Method not found"}})
