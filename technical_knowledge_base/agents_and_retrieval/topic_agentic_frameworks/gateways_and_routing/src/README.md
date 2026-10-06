# Gateways and routing: source

Child of Topic: agentic-frameworks. A new page (the Notion page held only a "being built" line, so there is no `live.md` or `coverage.json`). It extends the parent's Production stack tab (its gateway section) and links it rather than repeating it.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/` (Reading `20_read_a..h`, `20_read_z`; tabs `31` Failure lab, `32` Limits lab, `33` Routing lab, `39` Further reading).
- `python3 extract.py <raw run dir>` redacts and compacts the raw runs (kept outside the repo) into `recordings/fgw_runs.json` and fails on anything private; `python3 gen_data.py` writes `parts/22_js_fgw_data.js` from that file only.
- `python3 recompute.py` re-derives every number the page quotes (including the four rate limiters replayed on the recorded traces); `python3 check_page.py` checks the page embeds exactly the recordings and that 33 prose numbers match them.
- From the repo root: `sh html_utils/checkpage.sh <this page folder>`.

## What was run (6 October 2026, Apple M1 Pro 16 GB)
- LiteLLM 1.104.0 (`litellm[proxy]`, latest on PyPI, uploaded 3 Oct 2026), openai 2.54.0, anthropic 1.11.0 (constants only), Postgres 16 (Docker, for virtual keys).
- `code/fake_provider.py`: an OpenAI-shaped server scripted to answer, sleep, fail with 429/500/503/400-context or hang; three copies (A 0.2 s, B 1.0 s, C scripted). Extends the parent's `fake_upstream.py`.
- E1 `code/e1_routing.py`: 40 requests, 4 at a time, under seven strategy settings (litellm.Router).
- E2 `code/e2_failures.py`: 8 failure cases, sequential requests (litellm.Router).
- E3 `code/e3_amplify.py`: OpenAI SDK through the proxy to a hanging provider, three client settings.
- E4/E5 `code/e4_limits.py`, `e5b_budget.py`, `e5c_noreserve.py`: rpm_limit traces and budget runs on the proxy (`code/litellm_config.yaml`; `litellm_config_noreserve.yaml` adds `disable_budget_reservation: true`).
- E6/E7 `code/e6_cache.py`, `e7_translate.py`: response cache and Anthropic-format translation on the local model `mlx-community/Qwen3-4B-Instruct-2507-4bit` (the shared mlx_lm.server, every request through the shared lock).
- Router experiment: `code/r_tasks.py` (48 questions, seed 7), `r_run.py` (local model; Claude Haiku 4.5 through `claude -p` 2.1.291 with `--tools "" --strict-mcp-config --setting-sources project --system-prompt`, one call per question, 48 calls, $0.19 API-price equivalent), `r_score.py` (LiteLLM complexity router, offline).
- OpenRouter: public catalogue only (`inputs/or_models_slim.json`, `inputs/ep_*.json`), no account, no calls.

## Departures and caveats
- The rate-limit replay needs the run's sub-second clock offset, which was not recorded: fitted (`recompute.py`, PHI); stated on the page.
- The budget runs' in-run spend reads can precede LiteLLM's batched spend write; final spends were read back from `/key/list` after all runs (`spend_later`).
- The OpenRouter shares apply the documented inverse-square rule to input prices over all listed endpoints; the docs do not say which price or how many candidates, and the page says so.
- Grading of the router experiment is lenient on units ("2500 grams" counts for 2500); Haiku's raw grade before that was 39 of 48.
- No Langfuse/OTel here: tracing belongs to the LLM observability sibling.
