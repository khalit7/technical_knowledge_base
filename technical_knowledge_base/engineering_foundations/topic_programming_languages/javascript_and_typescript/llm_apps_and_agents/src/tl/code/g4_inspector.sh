# Test the server from the command line with the official MCP Inspector (CLI mode; without --cli it opens a web UI).
mcp-inspector --cli node g1_mcp_server.ts --method tools/list | head -8
mcp-inspector --cli node g1_mcp_server.ts --method tools/call --tool-name count_tokens --tool-arg path=chat.jsonl --tool-arg top=2
