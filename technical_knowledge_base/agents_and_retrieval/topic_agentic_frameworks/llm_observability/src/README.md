# Source for the LLM observability page

`sh build.sh` writes `../index.html` from `parts/` (HTML parts in name order, then every `*.js` part in its own script, `99_js_tabs.js` last). Then `python3 check_page.py`.

## Parts
- `01_head.html` shared CSS (from the langchain_and_langgraph sibling), `10_header.html` title and tab bar, `05z_errbox.js.html`.
- Reading: `20_read_a.html` (wrapper, CSS, nav, the idea in one screen: core sentence, hero, you need, new terms, running example; section 1), `20_read_b.html` (sections 2, 3), `20_read_c.html` (4 to 6), `20_read_d.html` (7 to 9), `20_read_z.html` (corrections, closed; closes the tab).
- JS: `21_js_rd_common.js` (the skill template: never autoplays), `22_js_data.js` (generated: window.FOBS), `23_js_fobs_core.js` (values, waterfall, section 1), `24_js_fobs_read.js` (sections 2 to 9), `25_js_fobs_figs.js` (static figures: hero, token accounting to scale, Langfuse stack, eval loop), `26_js_fobs_pipe.js` (closed blocks: tail-sampling simulator, per-call cost table, collector configs; was the Pipeline lab tab), `31_*` Eight instrumentations, `39_tab_more.html` Further reading, `99_js_tabs.js` (template, key `fobs-tab`).
- Checks: `check_page.py` (data and prose numbers), `check_controls.mjs` (every control, both themes, no autoplay), `shot_el.mjs` (element screenshots), `../../../../html_utils/ledger.py check`.

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

## The 2026-10-24 rebuild to the teaching contract (editing only, no new runs)
- **Top**: the core idea in one sentence ("record every agent run as one trace ... everything else reads the attributes"), a static hero figure (the local run's trace tree with what each span kind must carry and the section that uses it, then the path SDK, collector, backend, evaluators), "You need", new terms. The four-questions table became the hero's labels (fat).
- **New inline visuals**: hero; section 2 token accounting to scale (Anthropic `input_tokens` = 10 of 13,086 on the first Claude Code call) before the formula; section 4 a real image (Langfuse's own trace view, MIT, `img/CREDITS.md`) and a static diagram of the six-container stack; section 9 the eval loop. Existing steppers and toggles stay inline (one run three ways, three-process waterfall, cost reconciliation, tail sampling, redaction).
- **Pipeline lab tab removed**: each part explained one mechanism, so the simulator moved into section 7, the per-call cost table into section 6 and the collector configurations into section 8, each as a closed block.
- **Sections 10 and the reliability table folded**: hosted runtimes became a dated closed block in section 5 (now "The tools, compared by design"); each reliability pattern went beside the section that records it (retries in 2, fallbacks in 4, budgets in 2, degrade explicitly in 1, prompt versions in 9).
- **Deleted as fat**: common mistakes and interview questions (each restated a section); the two that added something (double counting on parent spans, the gap-diagnosis list) are now core text in section 6.
- **Moved to closed blocks**: what was run and versions, other attributes, who writes which names, why content capture matters, the Langfuse mapping table, Langfuse's other features and gateway spans, corrections.
- **No autoplay**: the template `21_js_rd_common.js`; the sampling toggle no longer starts playback.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 35.2 min | 29.9 min |
| Reading, closed details | 2.4 min | 8.4 min |
| Other tabs | 10.1 min (three tabs) | 6.7 min (Eight instrumentations, Further reading) |
| Visuals inline in Reading (svg, canvas, img) | 1 | 7 |

Thirty minutes is right for this page: it owns nine concepts that the rest of the knowledge base links to (trace structure for agents, the GenAI conventions, instrumentation choices, a backend's data model, tools by design, cost attribution, sampling, redaction, evals on traces), each carried by a measured run and its visual. What was cut is restatement; what moved is depth a first read does not need.

Ledger (`src/ledger.json`, 348 units): core 234, depth 48, volatile 15, fat 51; `ledger.py check` problems 0.

## Update pass 2026-10-26 (update-kb)
Core 29.9 to 30.0 min, closed details 8.4 to 8.9 (header now "plus 9"). Integrated in the runtime table of section 5: ADK 2.13.0's switch to the GenAI conventions v2 and the `call_llm` span going away (release notes read 26 Oct 2026; they say removed in one place and deprecated in another, and the page says so), and Claude Code's `claude_code.safety_event` (2.1.307). The Langfuse ADK screenshot's caption and alt text now say it predates ADK 2.13. Further reading's time for Claude Code, taken apart is now 37 min.

2026-10-26 (final follow-up sweep): section 2's metrics paragraph names the token counters, notes that `gen_ai.client.token.usage` is no longer defined, and names the server-side `gen_ai.server.time_to_first_token` and `time_per_output_token` (checked against `token-metrics.yaml` and `metrics.yaml` at the pinned commit cb10b70), absorbed from ML system design. Two ledger units added.
