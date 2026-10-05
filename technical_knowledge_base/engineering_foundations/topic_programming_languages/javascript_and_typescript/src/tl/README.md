# Part 3 of the JavaScript and TypeScript page: "LLM apps and agents" (part key `tl`)

Owner files: `../parts/13_tabs_tl.html` and `../parts/50_*` to `../parts/53_*` (all generated from `tpl/` by `gen.py`; edit the templates, not the parts). Tabs: `t-tl-read` (Reading, sections `#tl-s0` to `#tl-s14`), `t-tl-loop` (Agent loop stepper), `t-tl-mcp` (MCP message flow). CSS is scoped under `[id^="t-tl-"]`; element ids and classes start with `tl-`; data attributes are `data-tl-*`; the data object is `window.TL`. Animations use `RD.anim` from `21_js_rd_common.js` and register their redraws on `t-tl-read`, `t-tl-loop`, `t-tl-mcp` themselves.

## No paid calls, no keys
No API key was set in the environment, so no real model was called. `run_all.sh` unsets `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` and `ANTHROPIC_AUTH_TOKEN` and points npm at an empty npmrc (the user npmrc holds a token). Every model answer comes from `code/mock_model.ts`, a local server that speaks the Anthropic Messages and OpenAI Responses wire formats (JSON and SSE) with scripted, synthetic answers and token counts estimated as characters / 4. The SDKs, tools, MCP server and client, HTTP servers and timings are real. `check/check_embed.py` also fails if any output contains a key-like string.

## Reproduce
- `sh run_all.sh`: copies `code/` and the root's `chat.jsonl` to `pl/tl/work`, type-checks everything with tsc 7.0.2 (`outputs/tsc.txt`), runs every example with Node 24.21.0, writes `outputs/*.txt|json` and `versions.txt` (about 1 minute). Toolchain: `pl/tl` (npm packages, see `versions.txt`; install recorded in `pl/tl.lock`), `pl/tl/inspector` (MCP Inspector 2.9.0), Node 24.21.0 from `pl/ja`.
- `python3 gen.py`: expands `tpl/` into `../parts/`, inlining code and outputs and the datasets of `window.TL`.
- `sh ../build.sh`; then `python3 check/check_embed.py` (page embeds exactly the recorded outputs, code and data), `node check/check_ui.mjs` (every frame of every animation mode and every control at 390 px dark and 920 px light: no errors, NaN, undefined, sideways scroll), `node check/shots.mjs <tab> <width> <scheme> <selector> [frame] [mode]` for single screenshots.

## Code (`code/`)
`mock_model.ts` (the mock), `tools.ts` (count_tokens as a function, a synthetic profile service), `a1` first call, `a2` OpenAI Responses, `a3` retries/timeouts/typed errors (its own failing server), `b1`/`b2` streaming, `c1` hand-written agent loop (4 scenarios), `c2` tool runner, `d1` structured output with zod, `e1` conversation state, `f1` Vercel AI SDK, `f2` Claude Agent SDK against the mock (config dir in the work folder), `g1` MCP server (stdio and Streamable HTTP), `mcp_tap.ts` transport recorder, `g2` stdio client, `g3` HTTP client with a logging fetch, `g4` Inspector CLI, `g5` agent with MCP tools, `h1` streaming server with cancellation, `h2` backpressure, `i1` logging hook and a tiny eval.

## Findings worth passing on
- `zodOutputFormat` (anthropic-sdk 0.131.0) sends `pattern`, `minimum` and `maximum` as text in `description`, not as JSON Schema constraints; only the shape is constrained by the API, the rest is checked by zod after the reply.
- AI SDK 7: `generateText`/`streamText` default to `stopWhen: isStepCount(1)` (one step); `ToolLoopAgent` defaults to 20.
- Claude Agent SDK 0.3.289: one `query()` sent a ~59 KB request with 20 tool definitions, plus a GET `/api/hello`; `allowedTools` is the auto-approve list, `tools` restricts the list.
- A transport wrapper that does not forward the optional `setProtocolVersion` makes the MCP HTTP client omit `mcp-protocol-version` silently.
- Node 24's default stream `highWaterMark` is 65,536 bytes; ignoring `write()`'s return value queued the whole 2 MB response in memory.

## Departures from the child-page method
One part of a page with a part bar: no separate Further reading tab (the Reading ends with "Further reading for Part 3"); no `src/live.md` of its own (the old Notion pages are saved in the root's `src/read/old/`; the facts this part owns are in `coverage.json`).
