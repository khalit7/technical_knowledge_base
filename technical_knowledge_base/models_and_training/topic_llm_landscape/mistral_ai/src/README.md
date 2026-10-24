# Mistral AI, interactive page (v4, rebuilt 2026-10-24 to the teaching contract)

Child page of Topic: llm-landscape (storage key `mistral-tab`). Rebuilt by editing only: no new runs; every number keeps its source.

## Build and checks (current)
- `sh build.sh` writes `../index.html`: HTML parts `00_top`, `01_css`, `01b_css` (2026-10-24 classes: `.core`, `.terms`, `.hero`, `.hr-row`, `details.dp`, `figure.im`), `02_header`, `03_read_a` (core idea, hero, you need, terms; Mistral 7B with the cache animation), `04_read_b` (Mixtral with the layer animation, Figure 8 and the routing chart; the current line with the memory/compute bars; the lineage timeline; Large 4; closed specialist block), `05_read_c` (Magistral's recipe and reward group; licence ladder and chooser; the dated lineup table; which model; closed business and misconceptions blocks), `06_tabs` (Weights), `07_more`; then the error box and one script per JS part: `10_js_common`, `11_js_swa`, `12_js_moe`, `13_js_read`, `14_js_line` (now drawn in Reading), `15_js_fit`, `16_js_hero`, `99_js_tabs` (the skill template).
- The header reading time is written by hand in `02_header.html`: after editing text, run `node html_utils/audit_pages.mjs <out.jsonl> <page>` (230 words a minute, core and closed details apart) and update it.
- `node <page>/src/check_controls.mjs <page>/index.html` (from the repo root): every button, select, checkbox, details block and some lineage dots in 390 px dark and 920 px light; both animations stepped to step 6 in every mode; checks that neither moves before a click (also under reduced motion).
- `python3 recompute.py`: parameter counts and KV sizes from the configs (`parts_params.json`). `python3 html_utils/ledger.py check <page>`: the knowledge ledger.
- Images: `../img/` (WebP), credited in `../img/CREDITS.md`.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (a fast follower that ships proven efficiency ideas early at runnable sizes, with a licence rung per model); a new static hero (each model's layer shape from its config, licence rung, sparsity ratio); "You need" linking Attention variants, Mixture of experts and the Alignment page; four new terms.
- **Mistral 7B**: the intuition paragraph on the KV cache (owned by Long context) and the GQA explainer (owned by Attention variants) became links; the worked example became one concrete paragraph before the animation; the maths block became one line of symbols after it (concrete, picture, formula). The parameter-count check and the 131K misconception are a closed block. The "SWA is a family trait" mistake is now the section's last line.
- **Mixtral**: prose condensed; the routing finding gained the paper's own Figure 8 (CC BY 4.0) beside the claim, before the Table 5 chart.
- **Current line**: four cards became three bullets; Devstral 2's dates, Medium 3.5's dates and the "which active count" box went to one closed block; the ratio worked-through moved into the chart caption.
- **Lineage**: the bullet chronicle became two paragraphs; the timeline moved from its own tab into this section (the order explains the consolidation), with the per-release cards in a closed Release notes block; Shieldstral, Robostral, Leanstral, speech and OCR in a closed block; Large 4's scores in a closed volatile block.
- **Training**: reordered so the RL recipe (Mistral's own choices) leads and the distillation of Magistral Small follows; GRPO itself links to the Alignment page.
- **Lineup**: the catalogue table, the price sentence and the Artificial Analysis scatter became one dated table with prices and index scores (volatile, dated). The 18-model scatter was removed: cross-provider comparison is the landscape root's.
- **Business** and **mistakes**: closed blocks.
- **Tabs**: Reading, Weights (the tool across every model), Further reading. The Lineage tab is gone (moved inline). `90_js_tabs.js` replaced by the skill template `99_js_tabs.js`; the two animations keep their own controllers, which already start paused.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core | 26.6 min (6,124 words) | 21.5 min (4,942 words) |
| Reading, closed details | 0.8 min | 8.9 min |
| Other tabs | 9.6 min (Lineage 4.7, Weights 3.1, Further reading 1.9) | 5.2 min (Weights 3.2, Further reading 2.0) |
| Visuals inline in Reading | 7 (audit count 4) | 9 (audit count 5): hero, cache animation, layer animation, Figure 8, routing chart, memory/compute bars, lineage timeline, reward group, licence chooser |

Why about 21 minutes is right: the core is Mistral's own choices with the evidence for each (the 7B window and buffer, Mixtral's shape and routing finding, the granular-MoE versus dense split, the consolidation, Magistral's recipe, the licence ladder) plus one dated table and a chooser. Mechanisms owned elsewhere are one sentence and a link; volatile and per-item detail (release cards, specialists, business, scores) is closed.

## Knowledge ledger
239 units: core 167, depth 20, volatile 19, owned 13, fat 20 (`ledger.py check`: problems 0). 224 drafted by `ledger.py init` from the old page, 6 added by hand for script-drawn content (the removed scatter, the lineage cards, the hero, Figure 8, the animations' captions, the routing chart), and the 9 units of the 2026-10-23 pilot (KV-cache sizing moved to Long context). Owned: KV-cache intuition and sizing by Long context; GQA's group dial by Attention variants; GRPO by the Alignment page; the open-weight index scatter and test-time compute by the landscape root.

## Sources and supporting files
- `inputs/`: saved sources (configs, model cards, announcements); `parts_params.json`, `recompute.py`.
- `viz_ideas.md`: scored candidates, rejections, and the 2026-10-24 changes.
