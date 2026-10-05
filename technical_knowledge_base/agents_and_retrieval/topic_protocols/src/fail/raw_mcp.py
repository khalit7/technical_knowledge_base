"""A hand-rolled MCP stdio server (no SDK), the 30 lines people write for a quick tool: python raw_mcp.py
It reads one JSON-RPC message per line on stdin and writes one per line on stdout (the MCP stdio transport).
Its tool handler has a debug print with no newline, which lands on stdout, in front of the next response."""
import json, sys

def send(msg):
    sys.stdout.write(json.dumps(msg) + "\n"); sys.stdout.flush()

for line in sys.stdin:
    m = json.loads(line)
    if "id" not in m:
        continue  # a notification
    if m["method"] == "initialize":
        send({"jsonrpc": "2.0", "id": m["id"], "result": {"protocolVersion": "2025-11-25", "capabilities": {"tools": {}},
                                                           "serverInfo": {"name": "raw-tools", "version": "0.1"}}})
    elif m["method"] == "tools/list":
        send({"jsonrpc": "2.0", "id": m["id"], "result": {"tools": [{"name": "count_tokens", "description": "Count tokens",
              "inputSchema": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}}]}})
    elif m["method"] == "tools/call":
        text = m["params"]["arguments"]["text"]
        print(f"[debug] counting {len(text)} chars", end=" ")  # the bug: stdout is the protocol channel
        send({"jsonrpc": "2.0", "id": m["id"], "result": {"content": [{"type": "text", "text": str(len(text.split()))}]}})
    else:
        send({"jsonrpc": "2.0", "id": m["id"], "error": {"code": -32601, "message": "Method not found"}})
