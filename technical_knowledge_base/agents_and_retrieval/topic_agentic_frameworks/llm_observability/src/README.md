# Source for the LLM observability page

`sh build.sh` writes `../index.html` from `parts/` (HTML parts in name order, then every `*.js` part in its own script, `99_js_tabs.js` last). Then `python3 check_page.py`.

## Parts
- `01_head.html` shared CSS (from the langchain_and_langgraph sibling), `10_header.html` title and tab bar, `05z_errbox.js.html`.
- Reading: `20_read_a.html` (wrapper, CSS, nav, s0, s1), `20_read_b.html` (s2, s3), `20_read_c.html` (s4 to s6), `20_read_d.html` (s7 to s10), `20_read_e.html` (reliability table, mistakes, interview questions, corrections; closes the tab).
- JS: `21_js_rd_common.js` (RD helpers, step-animation controller), `22_js_data.js` (generated: window.FOBS), `23_js_fobs_core.js` (values, waterfall, s1), `24_js_fobs_read.js` (s2 to s9), `31_*` Eight instrumentations, `32_*` Pipeline lab, `39_tab_more.html` Further reading, `99_js_tabs.js`.

## What was run (6 October 2026, Apple M1 Pro 16 GB)
Scripts as run are in `code/` (they ran from a scratch folder; paths there are redacted to /work in everything committed).
1. **Local-model run**: `code/agent.py record` (the parent's plain loop) on the running example against mlx-community/Qwen3-4B-Instruct-2507-4bit (mlx-lm 0.32.0, the shared server on 127.0.0.1:8090, every request through the shared lock proxy `mlx_call.py proxy`). 8 requests. Recorded by the proxy.
2. **Eight instrumentation variants**: `code/replay.py` answered with the recorded responses in order; `code/run_variants.sh` ran `agent.py` in modes manual, manual_content, otel_v2, otel_v2_content, openllmetry, openinference, langfuse and `agent_pai.py` (Pydantic AI), each on a fresh copy of the repository; spans to a file and to Langfuse. `code/compare.py` classifies them against the conventions; `code/lf_fetch.py` reads Langfuse back. Versions: openai 3.25.0, opentelemetry-sdk 1.45.1, opentelemetry-instrumentation-openai-v2 2.4b0 with opentelemetry-util-genai pinned to 0.4b0 (1.2b0 breaks its import, re-confirmed), opentelemetry-instrumentation-openai 0.62.4 (OpenLLMetry), openinference-instrumentation-openai 0.1.63, langfuse 4.17.0, pydantic-ai-slim 2.54.0.
3. **Langfuse 4.53.0** self-hosted: `code/langfuse-docker-compose.v4.53.0.yml` (upstream file at that tag, images pinned, host ports moved to localhost), `code/langfuse.env.example` (telemetry off). Docker project `fobs-lf`.
4. **Claude Code runs**: `code/cc_app.py` (an application span, then `claude -p` with Haiku 4.5, Claude Code 2.1.291, tools Read, Edit, Bash, Grep, Glob, acceptEdits, `--setting-sources project --strict-mcp-config --no-session-persistence`, beta tracing to a capture collector, TRACEPARENT passed down; `code/shim/sitecustomize.py` behind a python3 wrapper on PATH adds a span for the test runner). Two runs: default telemetry, and with `OTEL_LOG_USER_PROMPTS`, `OTEL_LOG_TOOL_DETAILS`, `OTEL_LOG_TOOL_CONTENT` on. The only Claude invocations for this page.
5. **Collector experiments** (otelcol-contrib 0.162.0, configs in `code/collector/`): `to_langfuse.yaml` (raw, GenAI-mapped and 1-hour-keyed replays of the Claude Code trace via `code/otlp_replay.py`); `redact.yaml` (three redaction policies, measured by `code/redaction_measure.py`); `sampling.yaml` and `sampling2.yaml` (tail sampling, real-time replay by `code/sampling_replay.py`, the failure injected on the last tool execution and the root).
6. **Scores and dataset**: `code/scorer.py` wrote 11 rule-based scores to Langfuse and read them back (v3 scores API); one dataset item promoted from a trace (curl, recorded in the notes).

## Pipeline
1. `python3 redact.py <scratch>/agents/fobs` writes `recordings/` and `data/` (paths to /work; home folder, login name, git identity and any non-example e-mail replaced at run time by `code/redact_common.py`, which contains none of them; Claude Code identity attributes and ids replaced by labels; signatures and rate-limit events dropped). Fails on any leak. No em-dashes occurred in model output.
2. `python3 gen_data.py` writes `parts/22_js_data.js` from data/, recordings/ and inputs/ only.
3. `sh build.sh`, then `python3 check_page.py`: data part regenerates identically and is embedded; the run's cost recomputes from its usage and list prices; Langfuse's 1-hour total and the cost metric equal it; the 16% gap equals exactly the 5-minute vs 1-hour cache-write price difference; quoted timings and counts match the recordings; no em-dash or private string in the folder (`live.md` excluded: verbatim old page that names the owner).

## Inputs
- `live.md` old Notion page (read-only fetch 2026-10-06). `coverage.json` maps every claim.
- `inputs/research.md` primary-source checks by a research helper (2026-10-06), with quotes and URLs.
- `inputs/semconv_cb10b70.json` span types, attributes and levels extracted from the GenAI conventions model at commit cb10b70.
- Excerpts: tail sampling and redaction processor READMEs at v0.162.0; Claude Code monitoring docs, span attributes.

## Departures from the method
- No `recompute.py`: the only derived numbers are costs and counts, recomputed in `check_page.py`.
- The instrumentation comparison uses a replayed run rather than eight live runs, so differences are the instrumentation's alone; tool calls still ran for real.
- Phoenix, LangSmith and Braintrust were not run (docs only, marked); Langfuse was.
