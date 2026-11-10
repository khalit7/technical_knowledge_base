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

## 2026-11-10: split layout, two 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html` (after `01b_css.html` in `build.sh`), `25_js_s3.js` (renderer v2), `99_js_tabs.js` (key `mistral-tab`). The page has no `21_js_rd_common.js`: its 2D cache animation keeps its own controller (`11_js_swa.js`), given the motion rules. `build.sh` keeps its explicit part lists (new: `11a_data.js`, `25_js_s3.js`, `41_js_sc_mix.js`, `42_js_sc_now.js`; removed: `12_js_moe.js`, deleted) and now writes its em-dash test as bytes. A small `mi-split` style block at the end of `01b_css.html` lays the hero rows out for the right column.
- **Data**: `11a_data.js` (`window.MI`) rebuilds Mistral 7B, Mixtral 8x7B, Large 3, Small 4 and Medium 3.5 from their configs with `recompute.py`'s formulas: per-layer attention, expert and router sizes, layer sums stored and read, KV bytes per token and at 256K. `check_stages.mjs` checks the layer sums against `parts_params.json` and every number in the two stages' step lists against `MI`.
- **Fig. 2 `stg-mix`** (5 steps, `41_js_sc_mix.js`): Mistral 7B to Mixtral. The 32-block tower with slab thickness to scale (attention 41.9M, feed-forward 176.2M); one block exploded with flows (32 query heads over 8 shared key-value heads, each reading the last 4,096 of 32,768 positions); Mixtral's block (eight feed-forward copies on the router's glass plate, the window gone); the router's top 2 with flows into the two experts and out to the sum; both towers to scale (46.7B stored, 12.9B read, against 7.24B). Which experts are lit is illustrative (said on the page). Replaces the 2D layer animation; its Mistral 7B and Mixtral captions became the step list, its Small 4 mode is Fig. 3's first two steps.
- **Fig. 3 `stg-now`** (5 steps, `42_js_sc_now.js`): the current line. One layer each of Large 3, Small 4 and Medium 3.5, tile area to one scale (11.55B, 3,275M and 1,384M per layer with attention); a token reads 5 of 129 experts in the MoE layers (about 5%) and all of the dense one (2.2 times a Large 3 layer); whole models as towers, volume to scale (layers only; 671.5B / 38.1B, 117.9B / 5.6B, 121.8B all read) with the read part as a solid column; the 16-bit KV cache of one 256K sequence as teal glass columns (17.2, 5.6 and 88 GiB). Large 4 is not drawn: its card gives expert counts but no widths.
- **2D cache animation `#swa`**: the caption box is gone; its 18 captions are three `ol.sx` lists (`sx-swa-swa`, `sx-swa-gqa`, `sx-swa-mha`, one shown per mode). Motion rules: plays once half in view, pauses off screen, stops for good on any reader control or at the last step, a mode toggle restarts and replays, never moves under reduced motion; `data-playing` while it plays. It opens on step 1 drawn complete and replays step 1 when autoplay starts.
- **Routing**: the Table 5 chart (`drawRP` in `13_js_read.js`) went to its owner, the Mixtral of Experts paper page, which charts the same table (OWNERS.md); the section keeps the finding, the serving consequence, Figure 8 beside it and a link. Ledger units 59, 60, 230 are `owned:whats_new/papers/mixtral_of_experts` (keys checked there).
- **Splits** (text left, visual right): top (beside the hero), Mistral 7B (cache animation), Mixtral (Fig. 2), routing (Figure 8), current line (Fig. 3), memory against compute (the bars), lineage (the timeline), training (the reward group), the licence chooser. Full width: Small 4's active-count block, release notes, Large 4 and its blocks, the licence table, the dated lineup (volatile, unchanged, read October and November 2026), which model when, the Weights tab (a tool across every model) and Further reading.
- **Text**: the Mistral 7B worked paragraph lost the numbers the step list now carries (full MHA, the 32 times); "Why both?" lost the cache sentence (Fig. 3, step 5); the predict prompts say the animations play by themselves.
- **Checks**: `check_stages.mjs` (new; from the repo root, with a shots dir outside the repo): both stages and `#swa` play in view, step to the end with one list item per step, stop off screen, never move under reduced motion; `#swa` modes replay; splits two columns at 1400 px and one below 1100; numbers against `MI` and `parts_params.json`. `check_controls.mjs`: its never-autoplay assertion inverted (now: each plays in view, none moves under reduced motion), 1400 px added, list items clicked, the remembered tab cleared.
- No new real image: Figure 8 stays; nothing else shows a physical object the page needs.

### Length judgement (2026-11-10)
| | Before (audit 2026-11-10, before this pass) | After |
|---|---|---|
| Reading, core | 5,211 words, 22.7 min | 6,235 words, 27.1 min |
| Reading, closed details | 2,190 words, 9.5 min | unchanged |
| Weights / Further reading | 3.2 / 2.1 min | unchanged |
| Visuals inline in Reading (audit count) | 5 | 5 (the layer animation became Fig. 2, the routing chart went to its owner, Fig. 3 is new) |

The added words are step lists (16 items, plus 12 for the two hidden cache modes, about 400 words, so a first read is about 25 minutes). The cache animation's 18 captions were script text the audit could not count; now they are static. Fig. 2 and Fig. 3 add per-layer and whole-model sums the page did not give before. Where a list now carries a paragraph's numbers, the paragraph shrank. Nothing was cut.

### Knowledge ledger (2026-11-10; problems 0)
252 units: core 175, depth 20, volatile 21, owned 16, fat 20. Six core units added for the new step lists; 59, 60 and 230 now owned by the Mixtral paper page; re-keyed: 51 and 229 ("slab thickness is to scale"), 54 ("which experts the router picks is illustrative"), 80 (the cache sizes, now in Fig. 3's step 5). No key contains a reading time.
