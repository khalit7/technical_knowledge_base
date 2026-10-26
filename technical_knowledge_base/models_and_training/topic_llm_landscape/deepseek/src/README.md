# Source of "DeepSeek"

Child page of Topic: llm-landscape (storage key `ds-tab`). Built 2026-10-01; pilot cut on 2026-10-23 (attention and KV-cache sizing moved to their owners); rebuilt 2026-10-24 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing only, no new runs.

## Build and checks
- `sh build.sh` writes `../index.html`: HTML parts `01_head` (CSS, title, header with the measured reading time, tab bar), `02_read_a` (top, attention, V4.1-Flash), `03_read_b` (MoE, training systems), `04_read_c` (serving, post-training, cost, lineup with closed release notes, trade-offs), `05_tabs` (Config diff), `07_more` (Further reading); then the scripts `10_js_common`, `21_js_rd_common` (skill template), `12_js_attn` (V4.1-Flash phase switch), `13_js_moe` (MoE layouts grid), `14_js_misc` (Sinkhorn toy, closed block), `20_js_pipe` (DualPipe port), `21_js_r1` (R1 flow, distilled students), `22_js_eplb` (EPLB port), `23_js_v41` (V4.1 layer modes, indexer funnel), `24_js_cfg` (Config diff), `30_js_figs` (hero, attention factors, cost bar), and `99_js_tabs` (skill template) last. `{{text|url}}` links are expanded by the build (`n:<id>` for Notion pages, `#t-tab` for tabs).
- `node <page>/src/check_controls.mjs <page>/index.html` (from the repository root): every select, range, checkbox, button and clickable SVG group in every tab, closed blocks opened, 390 px dark and 920 px light; fails on errors, sideways scroll or NaN/undefined/Infinity, and checks that nothing requests animation frames after load under reduced motion.
- `python3 html_utils/ledger.py check <page>`: the knowledge ledger in `ledger.json`.
- Nothing on the page animates: every visual is static or moves only on a click.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence ("every named idea answers one question at a different layer: what does a frontier-quality model cost to serve, and to train on bandwidth-limited GPUs"), a new hero (layer by release: which release first shipped DeepSeek's answer for each part of the model, each carried forward), "You need" and eight new terms. The hero replaces both the "where each answer sits" table and the Lineage tab's timeline.
- **Attention**: a new static before/after of the DeepSeek instance (entry size, entries read, entries stored, each to scale, derived from the configs), short sections on what MLA, DSA and CSA/HCA bought in DeepSeek's numbers, and links to Attention variants for the mechanisms and the MLA animation first built here.
- **MoE**: kept what DeepSeek configured (the generation table, the layouts grid, the bias rule with V3's values and the worked example, anticipatory routing, MTP as used). The DeepSeekMoE equations moved to a closed block. The toy balancing loop was removed: Mixture of experts animates recorded load curves from trained models.
- **Training systems**: FP8 recipe, DualPipe (table and simulator inline; Distributed Training links here for these schedules), DeepEP, and mHC and Muon as DeepSeek used them; the mHC equation and the Sinkhorn toy moved to a closed block.
- **Serving**: DeepSeek's EP32/EP144 deployment and EPLB (port kept inline); the generic disaggregation explanation is the serving page's.
- **Post-training**: GRPO as DeepSeek introduced it in one paragraph (its widget removed: RL for LLMs owns the group-advantage visual), R1-Zero and R1 with the flow inline plus a static caption of the stage numbers, distilled students with a static caption of the scores, hybrid thinking, V4's specialists and on-policy distillation.
- **Cost**: a new section and one static bar (V3's priced run by stage, R1's hours, research excluded); the $5.6M and 545% facts moved here from the mistakes block.
- **Lineup**: one compact dated table (volatile, read October 2026) and the rerouting warning; everything else that was dated (the Lineage tab's per-release items, AA comparisons, the 1017 benchmark table, Vals AI, Search and Fetch, the vision variant) is in one closed "Release notes" block.
- **Tabs**: Lineage removed (hero plus release notes); its config diff became the Config diff tab (a tool across nine models). The tab scripts are the skill templates; `15_js_cache.js` (timeline) and `90_js_tabs.js` were deleted.
- **Mistakes block removed**: each mistake is now said where it belongs (the bias never enters the gradient; one active count does not describe V4.1-Flash; the $5.6M and 545%; vision routing in the release notes).
- **Real images**: none. The subject has no physical object, and the canonical paper figures are under arXiv's non-exclusive distribution licence.

## Length judgement
| | Before (2026-10-23 audit) | After the pilot (2026-10-23) | After (2026-10-24) |
|---|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 41 min | 29.7 min | 23.1 min |
| Reading, closed details | 2 min | 1.0 min | 5.7 min |
| Other tabs | 11 min | Lineage 5.4 + Further reading 3.4 | Config diff 2.2 + Further reading 3.4 |
| Visuals drawn inline in Reading (svg, canvas, img over 120 x 80) | 8 | 6 | 8 |

Why 23 minutes is right: the page owns about fifteen DeepSeek-specific choices (three attention cuts, the encoder-decoder, the MoE configuration and bias rule, anticipatory routing, MTP as used, FP8, DualPipe, DeepEP, mHC and Muon as used, EPLB, GRPO's origin, the R1 recipe and students, post-training consolidation, what it cost), each with the number that matters and, where it is a mechanism DeepSeek invented, its visual. Every generic mechanism is now one sentence and a link. What made the old page long (re-taught attention, a lineage tab of dated items, models-today benchmarks, toy widgets duplicating owners) is with the owners or in closed blocks.

## Knowledge ledger (`ledger.json`, `ledger.py check`: problems 0)
320 units: core 192, depth 8, volatile 38, owned 47, fat 35. 266 drafted by `ledger.py init` from the pilot-cut page; 15 added by hand (keys for script-drawn visuals: hero, attention bars, cost bar, R1 stages, distilled scores, MoE grid, config note); 39 carried from the 2026-10-23 pilot (attention and cache units moved to Attention variants and Long context). Owned units point at Attention variants, Long context, Mixture of experts, Distributed Training and Distributed and disaggregated serving, each key checked on the owner's built page. Volatile units stay on this page (the provider page holds them), dated, in the lineup table and the release notes. Fat units carry a `note`.

## Departures from the page-kind shape
- The lineage is not a section or tab of its own: the hero carries the order (it explains the design: each release attacks the next cost) and the dated detail is a closed block.
- The Sinkhorn toy is kept in a closed block rather than removed, because the owner (Normalisation, residuals and stability) does not draw the projection; proposed for absorption there.

2026-10-26 (final follow-up sweep): What it cost links the DeepSeek-V3 paper page's bill section (#s-bill).
