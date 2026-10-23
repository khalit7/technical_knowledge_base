Source of the interactive HTML on the Notion page "Sampling and Decoding" (child of Topic: inference-and-serving; it was a child of Topic: llm-training-and-post-training until it moved on 2026-10-19). Storage key `sampling-tab`. Rebuilt 2026-10-23 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`); editing and figures only, no new model runs.

Build: `sh build.sh` writes `../index.html` from `parts/` (slot order in the comment at the top of build.sh). The header's reading time is measured with `node html_utils/audit_pages.mjs` (230 words a minute) and written into `parts/10_header.html` by hand.

## Tabs and parts
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a.html` (styles, section nav, the idea in one screen: core sentence, hero, you need, new terms, the softmax formula) to `20_read_g.html` (settings, built on sampling); JS: `21_js_rd_common.js` (skill template, never autoplays), `22_js_data.js` (SD data), `25_js_sampler.js` (the sampler), `26_js_rd_hero.js`, `26_js_pipe.js` (top-p against min-p), `26_js_rd_pen.js`, `27_js_beam.js`, `28_js_json.js` (unconstrained against constrained), `28_js_rd_mask.js` (mask at step 0, allowed-set sizes), `29_js_rd_deg.js` (twelve decoders) | sections 0 to 7; long-tail samplers, the toy grammar and the twelve-decoder table and texts in closed blocks |
| Sampler lab `t-lab` | `30_tab_lab.html`, `30_js_lab.js` | every knob on 32 real distributions (a tool used by sections 2 and 4) |
| Further reading `t-more` | `39_tab_more.html` | |

## Data, in order
1. `make_data.py [lab|degen|beam|json|all]` runs Qwen2.5-0.5B-Instruct and GPT-2 small offline (`OMP_NUM_THREADS=2 uv run --with torch --with transformers --with regex python make_data.py all`, about 25 minutes on CPU) and writes `inputs/*.json`.
2. `make_page_data.py` compacts them into `parts/22_js_data.js` (top 60 tokens exact, the rest binned; samples filtered for display).
3. `recompute.py` checks every number the page states from the data; `--exact` re-runs the model for full-vocabulary counts. Output saved in `recompute_output.txt` (unchanged by the rebuild).
4. `reading_numbers.mjs` computes, with the page's own sampler and data, the numbers quoted under the new hero and penalty figures.

Other inputs: text excerpts of the sources whose exact wording or defaults the page relies on (llama.cpp, vLLM, transformers, SGLang code; Anthropic and Azure docs; Holtzman Table 1; Codex temperatures; OpenAI's Structured Outputs post from the Wayback Machine) and the four public-domain passages.

Checks: `node src/check_controls.mjs index.html` (every control in both themes and widths; no animation moves before the reader acts, normal and reduced motion), `node src/shot_el.mjs index.html <out dir>` (screenshots of the Reading figures), `python3 html_utils/ledger.py check <page>`, `sh html_utils/checkpage.sh <page>`.

## The 2026-10-23 rebuild: what changed and why
- **Top**: the core idea in one sentence and a new static hero (`26_js_rd_hero.js`): one real Qwen distribution (the lighthouse story, token 2) through the six stages of a decoder, logits, processors, temperature, truncation, renormalise, choose, with real counts (151,936 in, 22 kept by min-p 0.1 at T 1.5, 6,102 by top-p 0.9). Then "You need", new terms and the softmax formula.
- **Constrained decoding got a proper section** (OWNERS.md lists structured output as a gap): the compile, track state, mask, sample loop in words; a new static figure of the mask at step 0 (model probabilities, 0 or minus infinity, renormalised probabilities, the vocabulary strip with 4 of 151,665 allowed) with the formula in the same names; a new chart of the allowed-set size at each of the 19 constrained steps (log scale, the two whitespace overrules and the integer-type mask called out); the existing before/after animation; the engines as one table (method, mask cost, where it runs); the toy grammar in a closed block; provider structured outputs; the quality and whitespace caveats.
- **Logit processors got a section** (they are owned here): the `LogitsProcessor(input_ids, scores)` interface, logit bias (OpenAI, vLLM), masks as a processor, the repetition controls, and a new static before/after of the pattern prompt's correct repeat under no penalty, repetition 1.3 and frequency 1 (`26_js_rd_pen.js`), moved from a sentence in the lab.
- **The Twelve decoders tab was folded into Reading section 3**: the scatter now sits beside the claims it proves; the table and the sample reader are in a closed block. The Holtzman reproduction note is static text.
- **Owned elsewhere, now linked**: speculative decoding's acceptance rule and expected-tokens formula (Speculative decoding), the speculative calculator (Google DeepMind page), the AR/speculative/diffusion animation (tech news 2026-08-24), pass@k and best-of-n (Topic: llm-landscape).
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; mode switches no longer start the beam and JSON animations.
- **Deleted as fat**: the common-mistakes list (each mistake restated a section; the one on top-p became a predict-then-open block), wind-ups, the where-this-sits note, the old Twelve decoders tab lead and card. The long-tail sampler table and the typical-sampling observation moved into a closed block.

## Length judgement
| | Before (2026-10-19) | After (2026-10-23) |
|---|---|---|
| Reading, core (230 words a minute, `audit_pages.mjs`) | 3,929 words, 17 min | 4,129 words, 18 min |
| Reading, closed details | 169 words, 1 min | 862 words, 4 min |
| Other tabs, core | Sampler lab 652, Twelve decoders 780, Further reading 494: 8 min | Sampler lab 622, Further reading 471: 5 min |
| Core of the subject (Reading plus labs, without Further reading) | 5,361 words, 23 min | 4,751 words, 21 min |
| Visuals drawn as SVG in Reading (audit count) | 0 (three HTML-bar animations, scatter in a tab) | 5 (hero, scatter, penalties, mask, mask sizes), plus the three animations |

Why 18 minutes is right: the page was thin on its own subject, and the contract says a thin page whose subject matters grows. It now teaches four mechanisms in full (search, temperature and truncation, logit processors, constrained decoding) each with its real-data picture beside the claim; the growth is the constrained-decoding and logit-processor sections the knowledge base lacked, paid for by cutting the restated mistakes, the speculative-decoding re-teaching and the Twelve decoders tab's duplicate prose. The whole subject's core reading fell from 23 to 21 minutes. The ledger is almost all core (163 core against 13 depth).

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`; `python3 html_utils/ledger.py check`: problems 0)
199 units: core 163, depth 13, fat 16, owned 4, volatile 3. 187 drafted from the page as built on 2026-10-19 by `ledger.py init`; 12 added by hand (the long-tail table's rows, settings-table quotes, the engine table's facts, the script-rendered twelve-decoder values and beam captions). Owned: the acceptance rule and expected-tokens formula (Speculative decoding), the Table 4 calculator (Google DeepMind page), the decoding animation (tech news 2026-08-24). Volatile: the dated closed-API refusal box, kept here because it decides which knobs a reader can use. Fat units carry a `note`.

`coverage.json` and `live.md` are the 2026-10-03 migration record (every fact of the old Notion page mapped); the ledger supersedes them for the rebuild.
