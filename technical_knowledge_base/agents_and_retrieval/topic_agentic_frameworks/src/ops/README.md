# Production stack (tab t-ops)

Parts: `parts/33_tab_ops.html` (HTML and scoped CSS), `parts/33_js_a_data.js` (generated), `33_js_b_core.js` (helpers `window.OPU`: step animation, predict-then-reveal, values in prose), `33_js_c_gw.js` (architecture picture, gateway replay, keys table), `33_js_d_sim.js` (gateway simulator), `33_js_e_trace.js` (trace viewer, cost attribution), `33_js_f_evals.js` (regression suite), `33_js_g_mem.js` (memory layers). Ids and classes are prefixed `ops-`; renders register in `window.TAB_RENDER['t-ops']`.

## What was run (5 to 6 October 2026, Apple M1 Pro 16 GB)
- Gateway: LiteLLM 1.104.0 proxy (`code/config.yaml`; Postgres 16 in Docker for virtual keys) in front of `code/fake_upstream.py` (scripted 429/500/503/hang, canned answer on success) and the local model `mlx-community/Qwen3-4B-Instruct-2507-4bit` (mlx-lm 0.32.0, own server on port 8097 after the shared one ran out of GPU memory) behind afsame's logging proxy. Driver `code/gw_record.py`: scenarios direct_ok, direct_429, direct_503, direct_hang, gw_ok, gw_retry, gw_timeout, gw_fallback, gw_cooldown, keys.
- Tracing: OpenTelemetry Collector contrib 0.139.0 in Docker (file exporter, `code/collector.yaml`). `code/traced_loop.py` (afsame's plain loop plus spans) run twice on the running example through the gateway (primary scripted to 503, so every call fell back): `manual` (hand-written GenAI spans) and `auto` (opentelemetry-instrumentation-openai-v2 2.4b0 with opentelemetry-util-genai 0.4b0; 1.2b0 breaks its import). One Claude Code 2.1.289 run (Haiku 4.5, standard task, six tools, acceptEdits, Trace-lab allow-list) with `CLAUDE_CODE_ENABLE_TELEMETRY=1 CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1 OTEL_TRACES_EXPORTER=otlp OTEL_LOGS_EXPORTER=otlp OTEL_LOG_TOOL_DETAILS=1`. That is the tab's only Claude invocation.
- Evals: `code/evals.py`, no model: scores 18 redacted recordings (15 from the harness root's Trace lab, 2 from the Orchestration lab, 1 from this tab), rebuilding final code from each diff and running the visible tests plus the Orchestration lab's six hidden checks.
- Memory: `code/mem.py` and `code/mem_data.py`: minimal Mem0-style facts, Zep-style temporal graph and Letta-style paging, on an invented four-session conversation, local model at temperature 0, plus no-memory and full-history baselines; 49 local calls in the kept run. Raw outputs are logged in `memory.json` (`calls[].raw`). The first run had a strict JSON parser that dropped multi-array outputs; the kept run uses the tolerant parser and still shows a silently lost write (session 3 answered in a bulleted list).

## Pipeline
1. `python3 redact.py <scratchpad>/agents/recordings/afops` writes `recordings/` (whitelisted span and event attributes; no user, account, organisation, session, request or key ids; Claude Code hook/plugin/settings events dropped; paths to /work; em-dashes to ", ") and fails on any leak.
2. `python3 build_data.py` writes `parts/33_js_a_data.js` from `recordings/` only.
3. `sh ../build.sh`, then `python3 check_numbers.py <t-ops innerText>`: regenerates the data part and compares, checks the page embeds it, and recomputes the quoted numbers (20 checks).

## Departures from the brief
- Langfuse self-hosted was not run (six services); the backends are compared from their docs, and the collector stands in as a neutral sink.
- Memory layers are minimal reimplementations from the papers, not the vendors' libraries (Mem0, Graphiti and Letta need embeddings or servers; the shared machine was short of GPU memory).
- Cooldowns could not be shown working: with one deployment per model group LiteLLM exempts it (source comment quoted on the tab); recorded as a finding instead.
- Hosted runtimes and OpenRouter are from docs only (no API key, no account).
