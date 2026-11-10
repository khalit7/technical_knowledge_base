# Source of "DeepSeek"

Child page of Topic: llm-landscape (storage key `ds-tab`). Built 2026-10-01; pilot cut on 2026-10-23 (attention and KV-cache sizing moved to their owners); rebuilt 2026-10-24 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing only, no new runs; 2026-11-10 split layout and three 3D stages (the section at the end; it supersedes the build notes below where they differ).

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

## 2026-11-10: split layout, three 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html` (after `01_head.html` in `build.sh`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `ds-tab`). `build.sh` keeps its explicit part lists (new: `26_js_ds_0data.js`, `25_js_s3.js`, `41_js_sc_cut.js`, `42_js_sc_v41.js`, `43_js_sc_srv.js`; removed: `12_js_attn.js`); its em-dash test was already written as bytes.
- **Data**: `26_js_ds_0data.js` (`window.DS`) computes what the stages draw from the configs and reports the page cites: numbers read and stored per decoded token at a 131,072-token context for MHA at V3's dimensions, V3 (MLA), V3.2-Exp (DSA) and V4-Pro (30 CSA + 31 HCA layers); V4.1-Flash's layer modes (moved here from `23_js_v41.js`); the V3/R1 serving layout. `check_stages.mjs` checks every number in the three step lists against it.
- **Fig. 2 `stg-cut`** (5 steps, `41_js_sc_cut.js`), "three cuts to what a decoded token reads": one column per release, solid what one decoded token reads (blue cache entries, gold indexer keys), a teal glass case what the cache stores; the height scale changes between steps (a geometric glide) so each new column is drawn large and a taller one is cut with its ratio written on it; the last step moves in close on V4-Pro's 61 layers, CSA and HCA drawn alternating. It replaces the 2D before/after bars (`att()` in `30_js_figs.js`), which drew the same factors per layer; the stage adds the whole-model totals, the indexer's share (from Attention variants' 128-number indexer key) and the cache stored. Counts are numbers, not bytes (precision differs by release and part); the V4 CSA indexer key is assumed to be 128 numbers, said on the page. The mechanisms stay on Attention variants.
- **Fig. 3 `stg-v41`** (5 steps, `42_js_sc_v41.js`), V4.1-Flash: the 40 layers as an encoder tower and a decoder tower; prompt positions flow up the encoder only (8B active), the encoder's last hidden state becomes the decoder's shared global K/V (orange glass), a generated token runs all 40 (16B), then the slabs coloured by mode (sliding window, full, reindex, reuse) with the four cache copies as glass beside the layers that read them and the Engram layers. It replaces both the prefill/decode switch (`12_js_attn.js`, deleted) and the hoverable layer-mode strip (`draw()` in `23_js_v41.js`); their captions and hover texts became the step list. The two-stage indexer slider stays 2D in its own split (a log-scale widget).
- **Fig. 4 `stg-srv`** (4 steps, `43_js_sc_srv.js`), serving: a prefill unit (4 nodes, 32 GPUs) and a decode unit (18 nodes, 144 GPUs) as GPU boxes on node trays, each GPU a green slab (the shared expert) and its routed experts as blue cubes (9 and 2: 288 copies of 256 experts); request, cache and token flows between the pools; close-ups on each unit with a token's all-to-all; the 32 redundant copies lit gold. Which slots hold copies and which experts a token reaches are illustrative (seeded), said in the step text. The EPLB port stays 2D beside it (a reader-driven tool).
- **2D kept, each in a split** (text left, card right): the hero (a release-by-layer timeline, which reads flat), the indexer funnel, the MoE expert grid, the DualPipe simulator, the EPLB port, the R1 flow, the distilled students, the cost bar (bars of GPU hours read best flat; the stage the brief suggested for it would add nothing a bar does not). Full width: "You need" and terms, the generation table (it wrapped mid-word in the left column), balancing, MTP, FP8, DeepEP, mHC and Muon, DeepInfer, GRPO, hybrid thinking, the lineup (volatile, unchanged, read October 2026), trade-offs, the Config diff tab (a table tool, as on the sibling pages) and Further reading.
- Checks: `check_stages.mjs` (new; from the repo root with a shots dir outside the repo): the three stages play in view, step to the end with one list item per step, stop off screen, never move under reduced motion; splits two columns at 1400 px and one below 1100; the step lists' numbers against `window.DS`. `check_controls.mjs`: 1400 px added; it had no never-autoplay assertion to invert (its reduced-motion check, no animation frames after load, still holds).
- No real image: still no physical object to show (as before).

### Length judgement (2026-11-10)
| | Before (audit 2026-11-10, before this pass) | After |
|---|---|---|
| Reading, core | 5,527 words, 24.0 min | 6,013 words, 26.1 min |
| Reading, closed details | 1,231 words, 5.4 min | unchanged |
| Config diff / Further reading | 2.2 / 3.5 min | unchanged |
| Visuals inline in Reading (audit count) | 8 | 8 (three 2D figures became three stages) |

The added words are the three step lists (14 items). Fig. 2's list adds the whole-model totals and the indexer and stored counts that the old bars did not show; Fig. 3's list holds what the two removed figures' captions and hover texts said (the hover texts were script text the audit could not count); Fig. 4's list replaces the serving paragraph's numbers. Nothing was cut.

### Knowledge ledger (2026-11-10; problems 0)
323 units: core 193, depth 8, volatile 40, owned 47, fat 35 (unchanged counts). Re-keyed to the new wording: 18 (entries read × numbers per entry), 37, 47, 51, 57 (V4.1-Flash, now in Fig. 3's step list), 140 (serving, Fig. 4's list); 268 ("64 times fewer") is now in Fig. 2's step 3. No key contains a reading time.
