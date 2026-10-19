# Coverage: "LLM release history" (child) into Topic: llms

Child: `llm_release_history/` (index.html built from `src/parts/`). Parent destinations: tab `t-time` (`src/parts/30_tab_time.html`, sections `#rh-tl`, `#rh-fs`, `#rh-sz`, `#rh-cd`, `#rh-tb`, `#rh-ab`), the Reading section "How we got here" in `src/parts/20_read.html` (`#s-hist`), and the parent's Further reading tab (links listed at the end, for the orchestrator).

## Data: all 140 rows
| Child | Now |
|---|---|
| `parts/15a_data.js`: 140 rows (date, model, lab, weights and licence, size, note, source, kind tags) | `src/data/release_history.json` (single source) -> `src/history/mk_data.py` -> `parts/30_js_time_a_data.js`. Same 140 rows, same order, every field identical (checked field by field). |
| The five corrections (Aya Expanse licence and 32B, GLM-4.7 355 / 32, Gemma 4 31B, GLM-5.3 744 / 40, Grok-1 active 78.5B derived) | Applied in `release_history.json` (`fix`, `fix_url`, `active_derived`); shown in the table (red line and note), in every row detail, and listed under About the data, "Corrected in this version". |
| Month-only dates (7 rows) | Kept as YYYY-MM; sort to month start, drawn at the 15th (the old parent timeline had replaced them by the 15th). |
| Not in the child page: the JSON's date notes (62 rows) | Now shown in the table's "Why it matters" cell and in row details (Aya's outdated "not confirmed" note dropped, superseded by its correction). |
| `live_rows.json`, `parse_live.py`, `mk_data.py`, `recompute.py`, `viz_ideas.md` | `src/history/` (paths fixed; all three scripts run). |

## Header and Reading tab
| Child | Now |
|---|---|
| Subtitle: one sourced row per release, Feb 2023 to Sep 2026; data as of 1 October 2026 | Tab lead; About the data, "What it is" (data date). |
| Reading time line | Dropped (the parent header carries its own). |
| What this table is: lead paragraph | Tab lead and About, "What it is". |
| Headline stats (rows, labs, open/closed, closed with no size, MoE rows with both sizes and sparsity range) | `#rhStats` at the top of the tab (same computation). |
| Rows per year 12, 22, 46, 60 | About, "What it is"; draft bullet 4. |
| Description of the tabs Sizes, Firsts, Cadence; "the lane timeline lives on the parent page" | Replaced by the sub-nav; the timeline is now in the same tab. |
| How it was compiled (sources, agreement with the parent page, first public date, "not disclosed", point releases left out) | About, "What it is" and "Size conventions". |
| Kind tags are the compiler's labels | About, "Kind tags". |
| How to read the size column (billions, 1T = 1,000B, dense vs MoE, total / active, sparsity formula) | Sizes section intro (formula in words: total ÷ active). |
| MoE picker with total and active bars, sparsity sentence; "defaults reproduce" line (DeepSeek-V3 18.1, V4 Pro 32.7) | Sizes section card (`#szPick`), same text. |
| Conventions: family rows list, Llama 4 Maverick (Scout 109B), K2 Horizon 375B-A23B, DeepSeek V4.1-Flash 16B decode / 8B prefill, filled sizes, the two closed rows with a size | About, "Size conventions". |
| Weights and licences: open is not one set of rights; 4 of 9, 4 of 16, 25 of 32, 24 of 33 | About, "Weights and licences"; draft bullet 6. |
| Licence bars by year with click-to-filter, legend, grouping definitions, Magistral note | About card (`#licBars`, `#licLeg`), same text; click sets the shared filters and jumps to the table. |
| Caveat: "First" means first in this table (OpenAI gpt-oss "since GPT-2", InfoQ link) | Firsts `.co warn` box, and caveat "Point releases are left out" (with the InfoQ link). |
| Caveat: seven month-only rows (named) | About caveat, same list. |
| Caveat: point releases left out (full list) | About caveat, same list plus Grok 4.1. |
| Caveat: Fugu and Jev not LLMs in the usual sense | About caveat. |
| Caveat: Grok-1 dating and weights date (xAI link); Step 5 Preview closed; Llama 3 vs 3.1 | About caveat. |
| Caveat: where sources disagree (MiMo-V2.6 21 vs 22 Sep, Wikipedia link; MiMo-V2.5 310 vs 309B, Xiaomi link) | About caveat. |
| Caveat: sources and licences not all primary; unconfirmed KDA / IndexPool and qk-clip | About caveat. |
| Corrected in this version (list) | About, open by default. |
| The table: Try line, search, lab, year, weights (with licence groups), kind chips with counts, reset, count line, size-sort select, phone sort bar, sortable headers, highlight, lab links, footnote | Search, lab, year, weights, kind chips and reset moved to the shared filter panel `#rhF` (they now also drive timeline, sizes and cadence); the rest in `#rh-tb`. The nav bar shows the active filter count and a reset. |

## Sizes tab
| Child | Now |
|---|---|
| Intro, Try line, mode seg (total and active, total, active, sparsity), closed-rows checkbox, chart, record line, trailing median band, record labels, time-lapse with back / play / forward / scrub / speed, caption per quarter, four counters, detail, footnote, "What it shows" | `#rh-sz`, all kept. Now filtered by the shared filters (record and medians recomputed on the filtered rows, caption says so). Autoplay now starts when the chart first scrolls into view, not on tab open (the tab is long); never under reduced motion. The link to the MoE page became a link to the Deeper: inside an MoE tab (`#t-moe`). |

## Firsts tab
| Child | Now |
|---|---|
| Intro (24 labs), "First in this table" box, feature chips with lab counts, adoption step curves, first-dates matrix (sortable, earliest outlined, click for detail), footnote (tie, tags), "What it shows" | `#rh-fs`, all kept; box extended with "closed labs do not disclose architecture". |
| (parent) Timeline checkbox "label each lab's first" | Merged: the timeline labels each lab's first row matching the shared filters; the Firsts section's "Label on the timeline" buttons set the filter for one feature, tick the labels and scroll to the timeline. Same definition of first (date order, month-only rows at month start) in both. |

## Cadence tab
| Child | Now |
|---|---|
| Heatmap per lab per quarter, open/closed fill, row and column totals, median gap, sort select, cell detail with "Show in the table", footnote, "What it shows" | `#rh-cd`, all kept. Its own open/closed select is replaced by the shared Weights filter; labs with no matching row are hidden when filtered; median gap stays computed on all rows (stated). Added: 38 rows from 20 labs in 2026 Q3; 3 labs in early 2023. |

## Parent's old Release timeline (kept)
Lead, Try line, range seg, dots, nudging, per-period bars, legend, Others list, detail: all in `#rh-tl`; its own highlight seg (all, open, closed, reasoning, MoE, hybrid attention) replaced by the shared filters (Weights and kind chips). "How to read it" bullets: steps not every version and first-in-table (About and Firsts box), launch dates and month-only rows (About), sizes only what labs publish (About), the data link to the child page (dropped: the child is folded in). "Within four months" corrected to "within about four months" (DeepSeek-R1 and Kimi k1.5 came 4 months and 8 days after o1-preview).

## Further reading tab of the child (for the parent's Further reading tab)
In this knowledge base (the parent itself, MoE and reasoning pages, now tabs): Topic: llms (~12 min) dropped (it is the page); Mixture-of-Experts (MoE) models (~15 min) and Reasoning models and test-time compute (~17 min) are now the `#t-moe` / `#t-ttc` tabs; LLM Architecture Gallery `n:3c65c17b0d0d81be8a07f2562fa2030a` (~11 min); the lab pages (OpenAI ~27, Anthropic ~22, Google ~28, xAI ~6, Meta ~20, DeepSeek ~34, Qwen ~22, Kimi ~27, GLM ~8, MiniMax ~20, Mistral ~20, OLMo ~5, Other notable providers ~10 min), already in the parent's tab.
Best resources (to add to the parent's Further reading if missing):
- Epoch AI: AI models database, https://epoch.ai/data/ai-models (explorer, ~20 min)
- Our World in Data: parameters in notable AI systems, https://ourworldindata.org/grapher/artificial-intelligence-parameter-count (chart, ~5 min)
- Epoch AI: open-weight models lag by about 3 months, https://epoch.ai/data-insights/open-weights-vs-closed-weights-models (~5 min)
- LifeArchitect: timeline of AI and language models, https://lifearchitect.ai/timeline/ (~15 min to skim)

## Dropped, and why
- Child reading-time line and tab descriptions: superseded by the parent header and the sub-nav.
- "The parent page's release timeline is drawn from this table": both are now one tab.
- `release_history.json` notes still mention Aya Expanse's licence as unconfirmed; the correction supersedes it (not shown on the page).
