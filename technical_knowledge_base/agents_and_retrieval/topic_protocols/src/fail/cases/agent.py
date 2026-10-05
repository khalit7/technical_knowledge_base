"""Agent protocol failures: MCP stdio stdout corruption, a Streamable HTTP session that expired, and a tool result
carrying a prompt injection (a benign demonstration: the bytes only, nothing acts on them)."""
import time
import lab
from lab import run, save, start

GREP = " 2>&1 | grep -E 'Invalid JSON|initialized|tools:|result|Error|after'"
INIT = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"raw","version":"0"}}}'
NOTE = '{"jsonrpc":"2.0","method":"notifications/initialized"}'
CALL = '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"%s","arguments":%s}}'
H = "-H 'content-type: application/json' -H 'accept: application/json, text/event-stream'"
U = "http://127.0.0.1:27500/mcp"


def main():
    save("mcp_stdout", [
        run("$PY $CL/mcp_client.py noisy count_tokens '{\"text\":\"the sky is blue\"}'" + GREP,
            note="SDK server with a print() before mcp.run(): one stray line, logged and skipped"),
        run("$PY $CL/mcp_client.py raw count_tokens '{\"text\":\"the sky is blue\"}'" + GREP,
            note="hand-rolled server whose tool prints a fragment without a newline: the response is glued to it and lost"),
        run(f"printf '%s\\n%s\\n' '{INIT}' '{CALL % ('count_tokens', '{\"text\":\"the sky is blue\"}')}' | $PY raw_mcp.py",
            note="the bytes on the server's stdout"),
        run("$PY $CL/mcp_client.py clean count_tokens '{\"text\":\"the sky is blue\"}'" + GREP, note="the fix: log to stderr"),
    ])
    start([lab.PY, "mcp_tools.py", "http", "27500"], log="mcp_http.log", port=27500)
    init = f"curl -sS -D - -o /dev/null {U} {H} -d '{INIT}'"
    save("mcp_session", [
        run(init + " | grep -iE '^HTTP|mcp-session-id|content-type'"),
        run(f"S=$({init} | grep -i mcp-session-id | cut -d' ' -f2 | tr -d '\\r'); "
            f"curl -sS -o /dev/null -w 'initialized notification: %{{http_code}}\\n' {U} {H} -H \"mcp-session-id: $S\" -H 'mcp-protocol-version: 2025-11-25' -d '{NOTE}'; "
            f"curl -sS -w '\\ntools/list right away: %{{http_code}}\\n' {U} {H} -H \"mcp-session-id: $S\" -H 'mcp-protocol-version: 2025-11-25' -d '{{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\"}}' | grep -E '^data|tools/list' | cut -c1-120; "
            "sleep 5; "
            f"curl -sS -w '\\ntools/list after 5 s idle: %{{http_code}}\\n' {U} {H} -H \"mcp-session-id: $S\" -H 'mcp-protocol-version: 2025-11-25' -d '{{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/list\"}}'"),
    ])
    save("prompt_injection", [
        run(f"(printf '%s\\n%s\\n%s\\n' '{INIT}' '{NOTE}' '{CALL % ('fetch_page', '{\"url\":\"https://example.com/release-notes\"}')}'; sleep 1) | $PY mcp_tools.py fetch 2>/dev/null | tail -1",
            note="the tool result exactly as it crosses the wire"),
        run("$PY $CL/mcp_client.py fetch fetch_page '{\"url\":\"https://example.com/release-notes\"}'" + GREP),
    ])
