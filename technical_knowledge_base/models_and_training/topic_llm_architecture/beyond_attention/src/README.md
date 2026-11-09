# Beyond attention: page source

`sh build.sh` writes `../index.html` (Notion page 3fd5c17b0d0d8142bc9ecac1fc366966, a child of Topic: llm-architecture).
The build is the attention_variants child's: it includes the root's `src/parts/33_js_cc_1core.js` (window.CC, the
Config calculator core) unchanged before this page's scripts.

## Tabs (since the 2026-10-23 rebuild)
| Tab | id | Parts | What |
|---|---|---|---|
| Reading | t-read | 20_read_a..j, 20_read_z; JS 21_js_rd_common (skill template), 22_js_rd_0data (generated), 22_js_rd_1fill, 23_js_rd_write, 24_js_rd_ssm, 25_js_rd_figs, plus the moved lab scripts 31_js_mm_2ui (race), 32_js_rc_1ui, 33_js_si_1ui | sections 0 to 10 core, section 11 and per-section closed blocks depth |
| State vs KV cache | t-mem | 31_tab_mem_a.html, 31_js_mm_* | calculator, all-model chart, tiny GPT presets (a tool used across the page) |
| Further reading | t-more | 39_tab_more.html | |
Shared helpers: `30_js_ba_core.js` (window.BA; its controller never autoplays). Storage key `ba-tab`. The old parts are kept in `retired/parts/` for provenance.

## Data and scripts (outputs in each folder's `out/`, all small)
- `runs/collect.py`: copies the training runs (ba_ssm, ba_ssm_s1, ba_hybrid, ba_hybrid2 trained here with the root's train.py; at_mha, at_mha_s1 from the Attention lab; pe_nope from the Positional child) into `runs/out/runs.json`.
- `state/state_rules.py`: the write-rule toy (Python reference of 23_js_rd_write.js).
- `mem/statecalc.py`: KV vs state for 15 configs (root calc.py + KDA and Qwen3.5 additions).
- `recall/mqar.py`, `recall/tiny_recall.py`, `recall/pretrained_copy.py`: the three recall probes.
- `inside/ssm_inside.py`: half-lives, hidden attention maps, dual-vs-recurrent check on ba_ssm.
- `code/quotes.py` (source lines located by pattern), `code/demos.py` (linear attention two ways; decay-mask precision), `code/make_code_part.py` (writes 20_read_j.html, the closed code block).
- `make_page_data.py` writes `parts/22_js_rd_0data.js`. `scripts/run_pending.sh` reruns everything.
- `inputs/research_quotes.md`: verbatim quotes and table rows of every published source used, with URLs, read 2026-10-19.

## Checks
From the repo root: `sh html_utils/checkpage.sh <this folder>`; `node <src>/check_controls.mjs`; `node <src>/check_data.mjs`
(BAD equals recorded outputs; MM.cache equals statecalc.py at 6 contexts for 15 models; BA_WR equals state_rules.py; every static
prose number, table cell and summary against the recorded outputs: 428 checks); `python3 html_utils/ledger.py check <this folder>`;
reading time with `node html_utils/audit_pages.mjs` (230 words a minute; `src/reading_time.mjs` is the older 200-a-minute script).
`check_controls.mjs` also scrolls every animation into view at normal motion and fails if one starts by itself.

## The 2026-10-23 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`); editing only, no new runs.
- **Top**: the core idea in one sentence, a hero grid (every design as one cell of "how the state forgets" by "how it writes", with the layers that ship in 2026 outlined), "You need" (Attention variants for the attention layers, Long context for whole-model cache sizing), new terms. The old comparison table is a closed reference block; the "what this page measured" box and the one-sentence answer were restatements (their numbers live in sections 7 to 10).
- **Every core mechanism has its visual inline**: section 1 the attention-against-recurrent stepper (moved here from the root, which retired it on 2026-10-23 and names this page as its owner); section 2 a new static figure of linear attention's two forms; section 3 the five write rules (unchanged); section 4 the trained SSM's per-token decay (selection) and its hidden attention maps beside real ones (moved from the retired Inside tab), half-lives in a closed block; section 6 a new static figure, one forget rate per head against one per key channel; section 7 the attention-against-hybrid race (moved from the State vs KV cache tab); section 8 the Pythia-160M against Mamba-130M curves (moved from the retired Recall probes tab), with name recall and MQAR in a closed block; section 9 the running-sequence token strip (moved); section 10 a new static rollback figure (KV cache against state snapshots).
- **Tabs**: Recall probes and Inside the trained SSM each explained one mechanism, so their visuals moved into Reading; State vs KV cache stays as a tool used across the page.
- **No script-written knowledge**: the hybrid table, runs table, copy and phone-book numbers, name recall, MQAR, half-lives and the tiny presets table are static HTML (the root links here for the SSM and hybrid losses and the Mamba-130M copy numbers). `data-v` spans keep their key; `22_js_rd_1fill.js` now only marks a static number that disagrees with the data, and `check_data.mjs` fails on it.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; `BA.anim` lost its play-on-scroll line.
- **Depth closed**: S4 discretisation and the Path-X correction, Mamba kernel detail, SSD against FlashAttention-2, Mamba-3, RWKV scale, Gated DeltaNet's tables, Kimi's claims, NVIDIA/IBM/TII ratios and the unused RoPE, the full ratio quotes, MQAR/BASED quotes, vendor speedups, SSM costs and curves, four mistakes, five design questions, the code.
- **Deleted as fat**: headings, the old intro, pointers to retired tabs, three mistakes and four interview answers that restated sections.
- **Fixed a break caused upstream**: the root's Config calculator began refusing Nemotron 3 configs on 2026-10-19 (it cannot count latent-MoE parameters), which made this page's all-model chart throw. `MM.ext` and `statecalc.py`'s `cache_ext` now size Nemotron 3 Super's cache and state from its layer pattern; they equal the recorded `statecalc.json` at every context.

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 words a minute) | 34.7 min | 29.5 min |
| Reading, closed details | 4.6 min | 17.1 min |
| Other tabs, core | State vs KV 2.3 + Recall 4.2 + Inside 2.3 = 8.8 min | State vs KV 1.7 min |
| Core total, excluding Further reading | 43.5 min | 31.2 min |
| Visuals drawn in Reading | 3 | 16 |

Why about 30 minutes is right: the page teaches seven mechanisms (recurrence against attention, linear attention, decay and the delta rule, S4 to Mamba-2 with its duality, RWKV, Gated DeltaNet and KDA, hybrids) plus the recall limit and serving, each with its picture and numbers, and now carries the two lab tabs' evidence in the flow. About 1,100 of the counted core words are not prose: the 256-token running-sequence strip, SVG labels, animation counters and select options. What made the old page long beyond that (provenance, per-model detail, code, mistakes, interview answers) is closed and optional.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
363 units: core 242, depth 96, fat 25, owned 0, volatile 0. 337 drafted by `ledger.py init` from the page before the rebuild (keys found by script, numbers and quotes first, then a phrase of four or more words, and the residue by hand); 26 added by hand for formerly script-rendered tables and summaries and for the stepper moved from the root (including the root's owned unit "and each new token reads all of it"). Fat units carry a `note`.

## Departures from the topic-child shape
The hero is an HTML grid rather than an SVG, so its cells wrap at phone width. The Mamba-1 material lives on the Mamba paper page and is linked, not repeated.

2026-10-26 (final follow-up sweep, from the landscape pages): K3's bounded KDA decay (gate_lower_bound -5) in section 6; Qwen's NoPE trial and endless generation in the Kimi NoPE depth block; Qwen's measured 3:1 evidence (Flash-Next Table 1: 49.87, 51.15, 53.81) in section 7; lightning attention's left and right products as the chunked kernel in section 2, linking MiniMax; Nemotron 3 Nano's 533-token crossover against Qwen3-30B-A3B in section 10, linking Other notable providers.

## 2026-11-09: split layout, seven 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html`, `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `ba-tab`). `build.sh` is the template's as on Attention variants (C-locale part order, `02_split.html` after `01_head.html`, the em-dash test written as bytes) plus the root's `33_js_cc_1core.js` before this page's scripts.
- **Seven stages**, one scene file each on `40_js_sc0kit.js` (window.BAS: label hand-over, bricks for KV entries, blue glass for states, signed combs, bar fields on plates, layer patterns read from configs), each with an `ol.sx` step list and no per-step caption:
  - Fig. 1 `stg-rec` (5 steps, `41_js_sc_rec.js`, s1): one Qwen3-Next attention layer's cache as bricks against one Gated DeltaNet layer's state as 32 plates, volumes to scale, equal at 512 tokens. From the config in BAD.mem. Replaces the 2D stepper; its log chart is a closed block.
  - Fig. 2 `stg-lin` (6, `42_js_sc_lin.js`, s2): linear attention on the section 3 toy (BA_WR, d 8): key and value combs, v kᵀ as a bar field, the running sum, a query read out, overfill, the masked 12 x 12 form (prints its largest difference from the recurrence). Replaces the static two-forms figure.
  - Fig. 3 `stg-wr` (6, `43_js_sc_wr.js`, s3): the same 12 writes under linear, decay, delta (with the 11th write in close-up) and gated delta, then delta at d 16, with read-back cosines. The 2D write-rule animation is now a widget (`auto:false`) in a closed block; `23_js_rd_write.js` also returns the toy's keys and values.
  - Fig. 4 `stg-scan` (5, `44_js_sc_scan.js`, s4): layer 1's most variable head of `ba_ssm` (BAD.inside): the median decay against the measured a_t on 17 tokens, the state carried, the surviving share of one write, Mamba-2's mask L. The decay explorer moved into a closed block; section 4 is two splits (the Mamba-2 part with the hidden-map widget, now layer chips).
  - Fig. 5 `stg-hyb` (5, `45_js_sc_hyb.js`, s7): mixer patterns of ten configs (BAS.mixers equals every model's recorded mixer counts), cache columns only on attention layers, totals from MM.cache, Falcon-H1 in parallel. The token-by-token race became a context slider in the State vs KV cache tab.
  - Fig. 6 `stg-recall` (4, `46_js_sc_recall.js`, s8): Pythia-160M's cache slabs (one per 32 tokens) against Mamba-130M's state, accuracy columns from BAD.copy (32, 256, 1,000 words, the 40-entry phone book). The curves moved into the probes' closed block.
  - Fig. 7 `stg-runs` (5, `47_js_sc_runs.js`, s9): the five tiny GPT runs as rows of six layers, memory at 256 tokens, signed loss bars against `at_mha` (held-out, running sequence, the later pieces of " Roxy" from BAD.rs_tokens).
- **Kept 2D**: the hero grid (a taxonomy), the hidden attention maps (heatmaps, a widget), the running-sequence strip (a widget with model chips, the whole story), decay granularity and rollback (static, split with their text), all closed-block charts, the State vs KV cache tab (a calculator, full width). `BA.anim` was removed (no users left).
- **Checks**: `check_stages.mjs` (new, adapted from Attention variants): every stage plays in view, steps to its end with one list item per step, stops off screen, never moves under reduced motion, the write-rule widget never plays, splits are two columns at 1400 px and one below 1100 px, and every number in the step lists equals the page's data (problems 0). `check_controls.mjs`' never-autoplay assertion is inverted (stages play, widgets do not). `check_data.mjs` 428 checks pass.
- **Length**: Reading core 30.2 to 36.3 min, closed 17.7 to 19.6 min, State vs KV cache 1.7 to 2.5 min (the race moved there). The growth is the seven step lists (about 1,400 words), each explaining a stage step by step as the rollout requires; section 3's "What it shows" paragraph now overlaps its step list and could be condensed in a later pass. Visuals drawn in Reading: 16 to 21.
- **Ledger**: 375 units (core 251, depth 99, fat 25); 9 core units added for the step lists' new measured facts; 4 units re-keyed to moved captions; 6 Further-reading keys re-keyed off their minutes. `ledger.py check`: problems 0.
