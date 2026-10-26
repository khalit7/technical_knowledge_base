# Gateways and routing: source

Child of Topic: agentic-frameworks. A new page (the Notion page held only a "being built" line, so there is no `live.md` or `coverage.json`). It extends the parent's Production stack tab (its gateway section) and links it rather than repeating it.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/` (Reading `20_read_a..f`; `39` Further reading). JS: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `fgw-tab`; nothing moves before the reader acts), `22_js_fgw_data.js` (generated), `23`/`24` Reading figures, `26_js_fgw_fail.js`, `26_js_fgw_lim.js`, `26_js_fgw_route.js` (the former lab tabs, now inside Reading).
- `python3 extract.py <raw run dir>` redacts and compacts the raw runs (kept outside the repo) into `recordings/fgw_runs.json` and fails on anything private; `python3 gen_data.py` writes `parts/22_js_fgw_data.js` from that file only.
- `python3 recompute.py` re-derives every number the page quotes (including the four rate limiters replayed on the recorded traces); `python3 check_page.py` checks the page embeds exactly the recordings and that 33 prose numbers match them.
- From the repo root: `sh html_utils/checkpage.sh <this page folder>`; `node <this page folder>/src/check_controls.mjs <this page folder>/index.html` clicks every control in both themes and widths and checks nothing autoplays; `python3 html_utils/ledger.py check <page path>` checks the knowledge ledger (`ledger.json`).

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

## Overlap fix (2026-10-19)
This page owns the gateway, fallbacks, rate limits and budgets. Moved here from ML system design (whose sections 3 to 5 are now one paragraph each with links): the gateway's duties in order and the "Gateways in production" box (Uber GenAI Gateway, Envoy AI Gateway / Agent Router two tiers, Huyen, Kong and Portkey, cost and when not to run one) in section 1; fallback planning in section 3; RFC 6585, the two-customer token example, OpenAI's reservation, Envoy's charge-after with overshoot and its policy, concurrent-stream caps in section 5; rate limit, quota and capacity refusals (Anthropic 529) and the price-table caveat in section 6; tier, context and policy rules (prices, Huyen's intent classifier, Anthropic's August 2025 routing bug) in section 10. `check_page.py` carries a needle for each moved quote.

## The 2026-10-24 rebuild to the teaching contract
Editing only, no new runs. What changed and why:
- **Top**: the core idea in one sentence and a new static hero (callers, the gateway's duties in the order a request meets them with the three decisions whose rules differ from the config's wording highlighted, model groups and a fallback group), "You need", new terms in one paragraph. The old "whole page in one screen" findings list was cut as fat: every finding is said once in its section. Provenance ("What is real on this page") is a closed block.
- **Lab tabs dissolved into Reading** (each explained one or two mechanisms): the four-limiter replay replaced the old recorded-ticks chart inline in section 5 (it also exposed that a calendar-minute window lets the same 19 through, now said); the OpenRouter endpoint chart with filters replaced the simpler inline one in section 9; the router threshold slider with a labelled curve replaced the static curve in section 10 (default lands on the measured complexity router: 42 of 48 at 25%). The strategy replay (section 2), every failed attempt (end of section 4), every budget call (section 6) and the 48-question table (section 10) are closed blocks beside their sections. Tabs now: Reading, Further reading.
- **Ownership gaps filled** (brief, OWNERS row): cascades (FrugalGPT, read 24 Oct 2026) beside routers in section 10; semantic caching and its gateway-specific risks (shared across tenants, frozen replies, invisible false hits) in section 7, linking the Caching page's Threshold lab for the measured false-hit rates; a new section 11 compares the tools by design (LiteLLM, OpenRouter, Portkey, Envoy AI Gateway / Agent Router, Azure API Management and Cloudflare AI Gateway; docs read 24 Oct 2026) and puts every volatile price, fee, roster and version in one dated table (closed).
- **No autoplay**: mode switches used to start playback (`an.play()`); removed. `check_controls.mjs` confirms no caption changes before input.
- **Moved to closed blocks**: production gateways (Uber, Envoy, Huyen), the three admission answers in their own words with Envoy's YAML and Anthropic's cache-aware ITPM, two recorded failure cases (allowed_fails 1, context window), the router approaches table in full, Sakana Fugu, the old "your setup" checklist, interview rehearsal (one new question: router or cascade).
- **Deleted as fat**: the findings summary, the common-mistakes block (each restated a section; the gateway-429 against provider-429 point moved into section 6), pointers to the removed tabs, headings restated as sentences.
- `check_page.py`: three phrase needles updated to the new wording (same numbers).

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 38 min (8,792 words) | 33 min (7,566 words) |
| Reading, closed details | 2 min | 17 min |
| Other tabs | 14 min (three labs plus Further reading) | 3 min (Further reading) |
| Visuals inline | 5 | 8 (hero, request stepper, strategy bars, failure strips, retry lanes, four-limiter replay, budget stepper, router curve; plus the OpenRouter bars and translation cards) |

The core fell by 5 minutes while absorbing three lab tabs (about 10 minutes of tab reading) and gaining cascades, semantic caching risks and the tools comparison. It stays at 33 minutes because almost every unit is a recorded mechanism with its number: each section is one rule from the source, one recording that tests it, and what follows for an agent. About 900 of the core words are widget text (tables, captions, counters), which the audit counts. Cutting further would mean dropping recordings, which the ledger shows are core.

Ledger (`ledger.json`, 382 units drafted from the old page): core 294, depth 66, fat 17, owned 2 (the five rate-limit algorithms on Reliability engineering; the Stripe news on the parent), volatile 3 (kept in the dated table on this page); `ledger.py check` problems 0.

Images: none. This is a mechanism page; no physical object teaches here, and a vendor dashboard screenshot would be an unclear licence and add nothing a recording does not show.

## Update pass 2026-10-26 (update-kb)
Core 32.9 to 34.0 min (header 34). Integrated: the gateway as the prize for its provider keys, with the LiteLLM 1.107.0 signed-release compromise and what to do (section 1 costs; chain owned by Agent security section 3); OpenAI models on Vertex AI in private preview (section 3 fallbacks); Claude API `2026-10-21` (sampling parameters return 400, SDKs send `Authorization: Bearer`) in section 8; the dated table's LiteLLM row; two checklist rows. The budget-run segmented control now wraps (it overflowed at 390 px in Linux Chromium fonts). `check_page.py` flags the login name as a forbidden string, so in a cloud sandbox whose home folder name is also an ordinary English word on the page, run it with a neutral `HOME`.
