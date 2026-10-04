# Source of the Guardrails page

Build: `sh fetch_inputs.sh` (downloads XSTest prompts and Mistral-7B-Instruct-v0.1 answers into the gitignored `inputs/raw/`), `python3 mk_data.py` (writes `parts/22_js_data.js` from the released data and the guard runs), then `sh build.sh` (writes `../index.html`).
Checks: `node checks/check_page.mjs` (every control at 390 dark and 920 light; element screenshots in `../.shots/el-*.png`; dumps the page's computations to `checks/js_out.json`), `python3 recompute.py` (recomputes every tally, threshold, stream and PII figure from the raw inputs and the arithmetic on quoted published figures, against the page), `python3 mk_coverage.py` (writes `coverage.json`: every fact of the old page with the string that proves it is on the page), `sh ../../../../../html_utils/checkpage.sh ..` from this folder's parent's root.

Shape: Part B of `html_utils/methods/topic_pages.md` (child page). Reading follows the request path (in one screen; a rail is a classifier; before, during and after the call; the 450-conversation before/after; architecture; frameworks; guard models; latency and cost; evaluating rails; failure modes; checklist). Two data tabs: Pipeline lab (the real conversations under every configuration) and Guard model scorecards (published numbers by runner). About 35 minutes, more than other children, because the page owns frameworks, guard models and evaluation of rails, and carries the old page in full.

## Guard runs (src/runs/, outputs in inputs/runs/)
- `run_qwen.py`: Qwen/Qwen3Guard-Gen-0.6B (Apache 2.0), greedy, model-card template, on the 450 XSTest prompts, the 450 prompt and plain-answer pairs, and the 116 deepset/prompt-injections test items. Records label, categories, refusal flag and the probabilities of the three label tokens at the label position (the page's threshold score is P(Unsafe) + P(Controversial)). Apple MPS, fp32. Transformers 5.x.
- `run_pi.py`: protectai/deberta-v3-base-prompt-injection-v2 (Apache 2.0) on the XSTest prompts and the deepset test split; P(INJECTION).
- `run_stream.py`: Qwen/Qwen3Guard-Stream-0.6B, user turn at once then the answer token by token (re-tokenised into Qwen's vocabulary as its card advises); capped at about 20 minutes: all 128 full compliances with unsafe prompts plus 40 full compliances with safe prompts drawn with random.Random(0). Needs transformers 4.57.1 (`uv run --with 'transformers==4.57.1'`).
- `run_pii.py`: a seven-pattern regex rail and urchade/gliner_multi_pii-v1 (Apache 2.0, 18 labels, threshold 0.2 with scores kept) on nvidia/Nemotron-PII test rows 0 to 199 (CC BY 4.0, saved as `inputs/nemotron_pii_test200.json`). URL is not among GLiNER's labels.
- `time_guards.py`: a clean latency pass run alone (medians over 40 items after warm-up).
- `dl.py`: model download helper (the page's runs used curl from the Hugging Face resolve URLs when the hub client stalled).

## Data rules
- XSTest prompts are CC BY 4.0. Answers carry their model owners' licences: only human labels and 80-character excerpts are copied, and answers to unsafe prompts that were not full refusals are withheld (the Safety and honesty page's rule). One prompt (id 195) was reworded in the prompt file after the answers were released; the page shows the wording the models saw.
- "Harmful" = full compliance with an unsafe (contrast) prompt, by XSTest's human label.
- PII grouping used in the Reading table: direct identifiers = names, email, phone, SSN, card, CVV, PIN, street address, date of birth, account, routing and customer numbers, medical record and health plan numbers, employee id, fax, user name, password, licence plate, vehicle id, certificate number, SWIFT, IP and MAC addresses, API key, tax id, unique id, biometric id, cookie, URL, coordinate; quasi-identifiers = occupation, race or ethnicity, religion, political view, sexuality, gender, age, education, employment status, language, blood type, company name. Dates, times and place names are in "all spans" only.

## Parts
`01_head`, `02_css` (shared look, from the Safety and honesty page), `03_css_page`, `10_header`, `20_read_a` to `_d`, `30_tab_pipe`, `33_tab_card`, `39_tab_more`; JS `21_js_common` (animation controller, from the Safety and honesty page), `22_js_data` (generated), `23_js_core` (the pipeline model shared by Reading and the lab), `24_js_rd_small` (base-rate calculator, label splits, injection rows, timing, independence), `25_js_rd_pii`, `26_js_rd_stream`, `27_js_rd_pipe` (the before/after animation), `28_js_rd_lat`, `31_js_pipe`, `32_js_card_data` (transcribed scorecards), `34_js_card`, `99_js_tabs`.

## Research notes (inputs/)
`research_guard_models.md`, `research_frameworks.md`, `research_agents_eval.md`: every table transcribed with URLs and fetch dates (4 October 2026), contradictions listed. The web-search budget was exhausted during research, so sources were fetched by known URL; 2026 guard models were found through Hugging Face listings.

## Departures from the method
None of substance. The scorecards tab adds a "runner" field beside the metric because guard-model tables are mostly rival re-runs; the methodology has no such rule yet (noted in viz_ideas.md).
