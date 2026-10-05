#!/bin/sh
# Reproduce every output shown in Part 3 (LLM apps and agents). No API key is used and no paid call is made:
# every model answer comes from code/mock_model.ts (synthetic). Toolchains live in the session scratchpad; point PL at your copy.
# Writes outputs/*.txt and outputs/*.json, and versions.txt.
set -u
PL=${PL:-/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/pl}
NODE=$PL/ja/node-v24.21.0-darwin-arm64/bin/node
export PATH=$PL/ja/node-v24.21.0-darwin-arm64/bin:$PL/tl/inspector/node_modules/.bin:$PATH NO_COLOR=1
export NPM_CONFIG_USERCONFIG=$PL/ja/empty.npmrc         # the user npmrc holds a token; never let npm read or print it
unset ANTHROPIC_API_KEY OPENAI_API_KEY ANTHROPIC_AUTH_TOKEN          # never reach a real API from here
cd "$(dirname "$0")"; HERE=$(pwd); OUT=$HERE/outputs; W=$PL/tl/work; mkdir -p "$OUT" "$W"
rm -f "$W"/*.ts "$W"/*.log; cp code/*.ts code/*.sh code/tsconfig.json "$W/"; cp "$HERE/../../../src/rosetta/data/chat.jsonl" "$W/"
ln -sfn "$PL/tl/node_modules" "$W/node_modules"; echo '{"type":"module"}' > "$W/package.json"
clean() { sed -e "s|$W/||g" -e "s|$W|<work>|g" -e "s|$PL|<pl>|g"; }
cd "$W"
{ "$PL/tl/node_modules/.bin/tsc" -p . && echo "tsc -p . (TypeScript $("$PL/tl/node_modules/.bin/tsc" -v | sed 's/Version //'), strict): 0 errors in $(ls *.ts | wc -l | tr -d ' ') files"; } 2>&1 | clean > "$OUT/tsc.txt"
for f in a1_first_call a2_openai_first a3_errors d1_structured e1_state c2_tool_runner f1_aisdk f2_agent_sdk g5_agent_mcp h1_serve h2_backpressure i1_eval; do
  echo "run $f"; { "$NODE" $f.ts 2>&1; c=$?; [ $c -ne 0 ] && echo "[exit code $c]"; } | clean > "$OUT/$f.txt"; done
"$NODE" b1_stream.ts "$OUT/b1_stream.json" | clean > "$OUT/b1_stream.txt"
"$NODE" b2_stream_openai.ts "$OUT/b2_stream_openai.json" | clean > "$OUT/b2_stream_openai.txt"
"$NODE" c1_agent_loop.ts "$OUT/c1_agent_loop.json" | clean > "$OUT/c1_agent_loop.txt"
"$NODE" g2_mcp_client.ts "$OUT/g2_mcp_client.json" | clean > "$OUT/g2_mcp_client.txt"
"$NODE" g3_mcp_http.ts "$OUT/g3_mcp_http.json" | clean > "$OUT/g3_mcp_http.txt"
sh g4_inspector.sh 2>&1 | clean > "$OUT/g4_inspector.txt"
cd "$HERE"
{ echo "node $($NODE -v)"; for p in @anthropic-ai/sdk openai ai @ai-sdk/anthropic @modelcontextprotocol/sdk @anthropic-ai/claude-agent-sdk zod typescript @types/node; do
    echo "$p $($NODE -p "require('$PL/tl/node_modules/$p/package.json').version")"; done
  echo "@modelcontextprotocol/inspector $($NODE -p "require('$PL/tl/inspector/node_modules/@modelcontextprotocol/inspector/package.json').version")"
  sw_vers -productVersion | sed 's/^/macOS /'; sysctl -n machdep.cpu.brand_string; uptime | sed 's/.*load/load/'; date -u +%Y-%m-%dT%H:%MZ; } > versions.txt 2>&1
echo done
