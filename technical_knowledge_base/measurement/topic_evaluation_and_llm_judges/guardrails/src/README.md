# Source of the Guardrails page

Build: `sh fetch_inputs.sh` (downloads XSTest prompts and Mistral-7B-Instruct-v0.1 answers into the gitignored `inputs/raw/`), `python3 mk_data.py` (writes `parts/22_js_data.js` from the released data and the guard runs), then `sh build.sh` (writes `../index.html`).
Checks: `node checks/check_page.mjs` (opens every closed block, then every control at 390 dark and 920 light; element screenshots in `../.shots/el-*.png`; dumps the page's computations to `checks/js_out.json`), `python3 recompute.py` (recomputes every tally, threshold, stream and PII figure from the raw inputs and the arithmetic on quoted published figures, against the page), `python3 mk_coverage.py` (writes `coverage.json`: every fact of the old page with the string that proves it is on the page), `sh ../../../../../html_utils/checkpage.sh ..` from this folder's parent's root.

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` (child page), rebuilt 2026-10-24 to the teaching contract. Written as a child of Topic: agentic-harnesses, beside Agent security (Khalid moved it there; the lead moves the folder). Tabs: Reading, Guard model scorecards (a dataset view used by section 7), Further reading.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence, a new static hero (`29_js_rd_hero.js`: the three stages of rails around one call, what each sees, costs and misses, and the permission boundary outside the model), "You need" (agentic-harnesses root, Agent security, Evaluation metrics), new terms, a who-owns-what line. The old "In one screen" table is a closed reference block.
- **The Pipeline lab tab was removed; each of its cards moved beside the claim it proves**: the trade-off curve (now with its own threshold slider) to section 1, the injection-set card to section 2, the configurator to section 5 under the 450-conversation animation, the refusal-flag cross-tab and the conformal threshold to section 9. The 450-row and 116-row lists sit in closed blocks and are written only when opened (they are data views, not reading).
- **New visuals**: the hero; AgentDojo defences as before/after arrows (`29_js_rd_ad.js`, published figures, the old table kept closed); ShieldGemma's ToxicChat scores by runner (`29_js_rd_spread.js`).
- **Rosters condensed** into one compact dated table (guard models, frameworks, managed services, as of 4 October 2026); the per-framework notes, prices, acquisitions, the old guard-model table and its corrections are closed blocks.
- **Architecture (section 6) shortened**: the threat model and controls are Agent security's; the Grok case is stepped through on the Grok page and Muse on the Meta page; this page keeps what they mean for rails, details closed.
- **No autoplay**: `21_js_common.js` (this page's own controller, which takes a tab id) no longer starts an animation when it scrolls into view, and the 450-conversation animation no longer plays on a mode switch. `99_js_tabs.js` is the skill template (storage key `gr-tab`, delegated tab links, errors reported to the error box).
- **Deleted as fat**: the "what changed since September" recap, pointers to the removed tab, failure modes that restated sections (each unit's reason is in the ledger's `note`).
- Header: reading time is written by hand from `html_utils/audit_pages.mjs` (the build's static estimate misses script-written text).

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core | 38.6 min (8,877 words) | 37.0 min (8,516) |
| Reading, closed details | 1.6 min | 8.6 min |
| Other tabs, core | Pipeline lab 69.1 (mostly the 450-row list) + scorecards 4.8 + further reading 3.2 | scorecards 4.8 + further reading 3.5 |
| Visuals drawn in Reading | 3 | 7 |

Why 37 minutes is right: the page owns a whole runtime layer (four input rails, action and streaming rails, output rails, guard models, latency and cost, evaluation of rails), and the lab's explanatory cards (curve, injection set, configurator, refusal flag, conformal threshold) now sit in the Reading flow instead of a 69-minute tab; that added about 6 minutes of captions while about 8 minutes of restatement, recap, architecture detail and roster notes left the core. Nearly every remaining core unit is a number with its source that a reader needs to set or judge a rail; volatile rosters are one table.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
295 units: core 223, depth 31, volatile 18, fat 23 (each with a `note`). 291 drafted by `ledger.py init`; 4 added by hand for script-rendered results (stream rail, PII table, independence check, loose input rail), their keys written into static captions.

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
`01_head`, `02_css` (shared look, from the Safety and honesty page), `03_css_page`, `10_header`, `20_read_a` to `_d`, `33_tab_card`, `39_tab_more`; JS `21_js_common` (animation controller, never autoplays), `22_js_data` (generated), `23_js_core` (the pipeline model), `24_js_rd_small` (base-rate calculator, label splits, injection rows, timing, independence), `25_js_rd_pii`, `26_js_rd_stream`, `27_js_rd_pipe` (the before/after animation), `28_js_rd_lat`, `29_js_rd_hero`, `29_js_rd_ad`, `29_js_rd_spread`, `29_js_stack`, `31_js_pipe` (curve, injection set, configurator and lists, conformal threshold, refusal flag: Reading cards that were the Pipeline lab), `32_js_card_data` (transcribed scorecards), `34_js_card`, `99_js_tabs` (skill template).

## Research notes (inputs/)
`research_guard_models.md`, `research_frameworks.md`, `research_agents_eval.md`: every table transcribed with URLs and fetch dates (4 October 2026), contradictions listed. The web-search budget was exhausted during research, so sources were fetched by known URL; 2026 guard models were found through Hugging Face listings.

## Departures from the method
None of substance. The scorecards tab adds a "runner" field beside the metric because guard-model tables are mostly rival re-runs; the methodology has no such rule yet (noted in viz_ideas.md).
