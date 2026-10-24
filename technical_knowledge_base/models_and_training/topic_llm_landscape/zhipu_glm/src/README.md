# Zhipu: GLM, interactive page (v4, rebuilt 2026-10-24 to the teaching contract)

Child page of Topic: llm-landscape (storage key `zhipu-tab`). Rebuilt by editing only: no new runs; every number keeps its source; new numbers are derived with their formula (depth against width 92 / 61 = 1.51 and 5,120 / 7,168 = 0.71 from the GLM-4.5 report's Table 1).

## Build and checks
- `sh build.sh` writes `../index.html`: HTML parts `00_top`, `01_css`, `01b_css` (2026-10-24 classes: `.core`, `.terms`, `.hero`, `.zg-*` hero rows and GRPO/critic diagram, `details.dp`, `figure.im`), `02_header` (tabs: Reading, Further reading), `03_read_a` (core idea, hero, you need, terms; ARC; shape with the depth/width figure, head grid, MTP, Muon), `04_read_b` (attention with the inline attention-work chart and the hybrid animation; slime with Figure 10 and the GRPO/critic diagram), `05_read_c` (inference stack chart; lineage timeline with static release notes in a closed block; licences and price; built on GLM; dated lineup table; closed blocks for scores and misreadings), `07_more`; then the error box and one script per JS part: `10_js_common`, `21_js_rd_common` (skill template), `11_js_read` (head grid, throughput chart, depth/width figure), `12_js_hya` (hybrid animation, own controller, never autoplays), `14_js_ctx` (attention work per token, now inline), `15_js_line` (timeline; dot click opens the release note), `99_js_tabs` (skill template).
- Header reading time is written by hand in `02_header.html` from `node html_utils/audit_pages.mjs <out.jsonl> <page>`.
- `node <page>/src/check_controls.mjs <page>/index.html` (from the repo root): every control in 390 px dark, 920 px light and reduced motion; fails if the animation moves before a click.
- `python3 recompute.py`: every derived number from the configs in `inputs/`. `python3 html_utils/ledger.py check <page>`: the knowledge ledger.
- Images: `../img/` (WebP), credited in `../img/CREDITS.md`.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (assembled from published parts, Zhipu's engineering where the bill is, cheap open weights); a new static hero (four generations, adopted parts coloured by source lab against Zhipu's own, cache per token to scale: 368 to 11.7 KiB); "You need" (Attention variants, Beyond attention, Mixture of experts, RL for LLMs); six new terms. The "three bets" list became the core sentence and the hero (fat).
- **Shape**: new to-scale depth against width figure (GLM-4.5 against DeepSeek-V3 and Kimi K2, Table 1) beside the "deeper models reason better" claim; the 744B/753B note closed, with Table 1's counting rule added; MTP and Muon cut to Zhipu's choices with links to Speculative decoding and Optimisers (owners); Muon settings closed.
- **Attention**: the Attention work tab moved inline beside the IndexShare claim (one slider, a predict prompt); its formula and the three reproductions (2.9x, 4.44x, 3.01x) are one closed block; core keeps the conclusions (2.7x, 4.6 = 4.09 × 1.125 × 1.18, 8.0x whole model). MLA and DSA are a sentence each with a link to Attention variants (owner), KDA to Beyond attention, NoPE to Positional encodings.
- **slime**: the sync/async animation was removed because RL for LLMs owns that before/after (on 160 real responses); in its place the GLM-4.5 report's own Figure 10 (CC BY 4.0). GLM-5's staleness rules and token-in, token-out stay. The GRPO formula and worked example became a static GRPO against critic diagram showing why compaction broke group normalisation.
- **Inference stack**: the three feedback levels condensed to one sentence, the full list and the serving stack closed.
- **Lineage tab moved into Reading** ("The line on one axis"); the 19 script-drawn cards became static release notes in a closed block that a dot click opens.
- **Price**: the job-cost calculator and the open-weight AA scatter were removed (prices volatile; cross-provider comparison is the landscape root's). The worked job example stays as one sentence; prices, AA v4.3 scores and Coding Plan tiers are in one dated lineup table, "Where GLM stands" and the misreadings are closed.
- Stale links fixed: "Inference techniques" (that Notion id is now Batching, KV cache and scheduling) replaced by Speculative decoding and Distributed and disaggregated serving; MLA/DSA now link Attention variants, mHC Normalisation, Muon Optimisers.
- Templates `21_js_rd_common.js` and `99_js_tabs.js` replace `90_js_tabs.js`; `06_tabs.html`, `13_js_sla.js` removed.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core | 32.3 min (7,422 words) | 26.0 min (5,977 words) |
| Reading, closed details | 0.9 min | 12.0 min |
| Other tabs | 10.1 min (Attention work 2.5, Lineage 4.9, Further reading 2.7) | 2.9 min (Further reading) |
| Visuals inline in Reading (audit count) | 4 | 6, plus the hero, head grid, GRPO/critic diagram and Figure 10 |

Why about 26 minutes is right: the page owns a lot of Zhipu's own engineering, each with evidence (the head-count finding, MLA-256, IndexShare and its reproduction, the 3 : 1 hybrid and IndexPool, slime's staleness rules, critic-based PPO, the agent-built inference stack), and it absorbed two tabs (7.4 minutes) into the Reading flow while the core still fell 6 minutes. Mechanisms owned elsewhere are a sentence and a link; volatile and per-item detail (release notes, scores, reproductions, settings) is closed.

## Knowledge ledger
290 units: core 190, depth 37, volatile 27, owned 16, fat 20 (`ledger.py check`: problems 0). 270 drafted by `ledger.py init` from the old page, 10 added by hand for script-drawn or new content (the removed slime animation, calculator rows, AA scatter and reproduction lines; the release cards; Table 1's counting rule; the depth/width figure), and the 10 units of the 2026-10-23 pilot (KV-cache sizing on Long context). Owned: KV sizing by Long context; asynchronous RL's before/after by RL for LLMs; Muon's update by Optimisers; the open-weight scatter by the landscape root.

---
Earlier notes (v3): `inputs/` holds the config.json files; `viz_ideas.md` has the scored candidates. 2026-10-23 pilot: whole-model KV-cache sizing moved to Long context's calculator (GLM-4.5, GLM-5/5.1, GLM-5.2/5.3 and GLM-5.3-Flash presets).
