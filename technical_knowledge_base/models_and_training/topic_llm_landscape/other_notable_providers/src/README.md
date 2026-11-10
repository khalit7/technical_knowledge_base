# Source of "Other notable providers"

(2026-11-10: split layout, three 3D stages and explained, autoplaying animations; the section at the end supersedes the build notes where they differ.)

Child page of Topic: llm-landscape (storage key `onp-tab`). Rebuilt 2026-10-24 to the teaching contract, with the Ai2: OLMo page merged in as a section and a tab.

## Build and checks
`sh src/build.sh` (the skill template, unchanged) writes `../index.html` from `parts/`: `01_head.html`, `10_header.html`, `20_read_a` to `20_read_g` (Reading), `30_tab_cmp`, `32_tab_run`, `39_tab_more`, then every `*.js` part in file-name order, `99_js_tabs.js` last. Links are `{{text|url}}`, `{{text|n:<notion id>}}` or `{{text|#t-tab}}`.

Run from the repo root unless noted:
- `sh html_utils/checkpage.sh <page>`: must end `fail=0, emdash 0, errbox 1, clipped 0`.
- `node <page>/src/checks/check_controls.mjs <page>/index.html`: every control in every tab at 390 dark and 920 light, plus a no-autoplay check (normal and reduced motion) on the three animations.
- `python3 src/checks/check_data.py` (from the page folder): prose numbers against `recompute.py`, `olmo/recompute.py` and the data parts.
- `node <page>/src/checks/shot_el.mjs <page>/index.html <out dir> '#hy' ...`: element screenshots.
- `python3 html_utils/ledger.py check <page>` and the same for `ai2_olmo` (its units point here).

## Parts
| Part | What |
|---|---|
| `20_read_a` | core idea, hero (`17_js_hero.js`: eight constraints, labs, the number that shows each bet), You need, new terms |
| `20_read_b` | Data quality per parameter (Phi); Memory per token (Nemotron hybrid cache animation `11_js_hyb.js`, hybrid camp) |
| `20_read_c` | Auditability (Cohere, IBM; two-lever chart `13_js_mem.js`); Bits per weight (Bonsai 2); Distribution (Nova, Bedrock) |
| `20_read_d` | Open scale: sparsity chart (`16_js_size_*`, moved from the old Scale and sparsity tab), Tencent, Xiaomi, NaiveAI before/after layer strip (`18_js_naive.js`, new), StepFun, Atria and the rest of China, cost frontier (`14_js_aa_*`), Arcee, Reflection, Aleph Alpha |
| `20_read_e` | Ai2 OLMo (merged): six artefacts, model-flow animation (`41_js_ol_flow.js`), question explorer, AA bars, stability before/after (moved from the old Training log tab, `43_js_ol_log.js`), stage scores, token bar, Think table (`42_js_ol_read.js`); lineage, Tulu 3, Ettin, uses in closed blocks |
| `20_read_f` | IFM K2 Horizon, Prime Intellect DiLoCo animation (`12_js_dl.js`), SmolLM3, Nous, Upstage, Reka |
| `20_read_g` | Not a single model: call-shape diagram (`19_js_route.js`, new), Fugu, Jev, the decision-model tier |
| `30_tab_cmp` | Compare labs: the page's one dated lineup table (`15_js_cmp_*`; Ai2, Reflection AI, Aleph Alpha rows added) |
| `32_tab_run` | Inspect an open run: Olmo 3's W&B training log and the data mixes (the old OLMo Training log and Data mix tabs, `43`, `44`, data `40_js_ol_0data.js`) |

## Data and scripts
- `recompute.py` / `recompute.out`: KV caches from `inputs/cfg/`, Mamba state, crossover, weight memory, sparsity, prices, AA cost frontier, INTELLECT-1 utilisation, SOLAR layers. Unchanged; output identical after the rebuild.
- `olmo/`: copied from `ai2_olmo/src` on 2026-10-24. `mk_data.py` writes `parts/40_js_ol_0data.js`; `recompute.py` / `recompute.out` (6x tokens, GPU-hours, log wall clock, stage gains). The two W&B histories are gzipped (`inputs/hist_*.json.gz`, under 1 MB each); the scripts read them gzipped. The OLMo 1.7 and OLMo 2 stability histories (`h_olmo17.json`, `h_olmo2_7b.json`) were never committed on the old page, so `mk_data.py` stops at the stability step; the data part is kept as built and its other values were checked unchanged. `viz_ideas_olmo.md` is the old page's visual record.
- `inputs/`: fetched sources for every lab (unchanged).

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence, a static hero that maps the eight constraints to the labs and the one number that shows each bet (it replaces the "How to read" axes and the closing "long tail on one axis" summary), You need, new terms.
- **Every section names the lab's choice, gives the number, links the owner**: Mamba-2 mechanics to Beyond attention, DSA and windows to Attention variants, normalisation fixes to Normalisation, curricula to Data mixing, ternary formats to Quantization, DPO and RLVR to Alignment, reward hacking, decontamination, NoPE to Positional encodings, data parallelism to Distributed training.
- **Visuals inline beside their claims**: the sparsity chart moved from its tab into Open scale; the OLMo stability chart moved from the Training log tab into the OLMo 2 subsection. New: the hero, the NaiveAI before/after layer strip (MiMo-V2.5's nine full-attention layers become DSA, from both cards) and the call-shape diagram for Fugu and Jev. Removed: nothing.
- **No autoplay**: the three animations (hybrid cache, DiLoCo, model flow) had `play:!RM` and restarted on a mode switch; both removed by hand (they keep their own controllers, which already paused off screen). `99_js_tabs.js` is the template plus `__showTab` and `data-to` scrolling.
- **Volatile facts** (lineups, prices, vendor benchmark tables, launch dates) sit in closed blocks marked "volatile" or "vendor" per lab, and in the Compare labs table; the core keeps only the numbers an argument needs.
- **Ai2 OLMo merged** (planned merge): the fully open recipe, what it lets you do, its price, and what the open runs teach (stability fixes checked from the logs, the anneal, Olmo 3's recipe and 6x claim) are core; lineage, Tulu 3, Ettin and uses are closed. Its Training log and Data mix tabs became one tab, Inspect an open run.
- Arcee, Reflection and Aleph Alpha moved from Openness to Open scale (their bet is scale outside China, as the old summary already said).

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core | 30.3 min (+ ai2_olmo 17.4) | 35.2 min |
| Reading, closed details | 0 (+ 0) | 13.7 min |
| Other tabs | Compare 4.7, Scale 0.9 (+ OLMo log 2.6, mix 1.1) | Compare 5.5, Inspect an open run 3.0 |
| Visuals in Reading | 4 (+ 1) | 10 |

Two pages that took 47.7 minutes of core reading now take 35.2. That length is right because the page covers about 25 labs plus the whole OLMo programme, and each core section is now one bet, one number and one visual; what made the old pages long (release chronicles, vendor benchmark tables, prices, the lineage, Ettin and Tulu 3 detail) is closed, not deleted. The Compare labs tab grew slightly with three new rows.

## Knowledge ledger
`ledger.json`: 279 units, core 184, depth 34, volatile 43, owned 1 (the SSM's historical problems, at Beyond attention), fat 17 (wind-ups, tab and motion notes, the summary the hero now carries, the self-link to the Ai2 page). Nine units were added by hand for script-rendered or new visuals. The ai2_olmo ledger (in that folder) has 172 units: 162 owned here, 10 fat.

## 2026-11-10: split layout, three 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html` (added to `build.sh` after `01_head.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js` (new here), `99_js_tabs.js` (key `onp-tab`; the page's own `__showTab` is gone, so the Compare labs table's "Read the section" link now clicks the tab button). `build.sh` keeps its globs (scenes sort after `25_js_s3.js` as `5x_js_sc_*`) and already wrote its em-dash test as bytes. Removed: `11_js_hyb.js` (the 2D hybrid-cache animation) and `41_js_ol_flow.js` (the 2D model-flow animation), each replaced by a stage.
- **`stg-mem`** (7 steps, `50_js_sc_mem.js`): every layer of Qwen3-30B-A3B and Nemotron 3 Nano as a column on one block per model (8 across, in layer order), its height the bytes that layer holds for one sequence, one scale for both, reset per step and named; the new token's keys and values stream into the attention layers. Token 1, 512 (level, the 533-token crossover), 4,096, 131,072, 1,048,576, then the blocks fade and one H100's memory after the BF16 weights fills with sequences of 131,072 tokens (1 against 19). Constants from each config.json, as in `recompute.py` (identical output); the old animation's captions became the step list; its one/eight-H100 select was dropped (the last step uses one H100).
- **`stg-bits`** (6 steps, `51_js_sc_bits.js`): Bonsai 2's 27B weights at 16, 8, 4 and 1.76 bits as columns of bit-plane slabs (one slab = one bit of every weight = 3.375 GB) under a glass plane at one RTX 5090's 32 GB; a close-up of ternary weights with one FP16 scale per group (values and group size illustrative, said on the page); the last step streams every weight to one decoded token (dots proportional to gigabytes read). New: the slab picture, log₂ 3 = 1.58 bits as the floor and the bytes-read-per-token step (derived, no new sourced number).
- **`stg-fa`** (8 steps in two modes, `52_js_sc_fa.js`): the Olmo 3 32B Think flow, one block per stage with the same stages to scale in days on a strip in front, and behind them what each stage put in public (checkpoint stacks one slab per checkpoint, log segments, datasets as glass plates); open weights puts the run in a glass box and lets the final weights out. Same data as the old animation; its two caption sets are the two step lists (`sx-fa-open`, `sx-fa-ow`), swapped by the toggle; its counters (`faCnt`) stay in the left column, updated per step.
- **DiLoCo** (`12_js_dl.js`, 2D, kept): the timeline to scale reads best flat. Its controller got the motion rules (plays once at least half in view, pauses off screen, stops for good on any control or at the end, never under reduced motion, `data-playing`), a hold after each step's motion, and two step lists (`sx-dl-dp`, `sx-dl-dl`) whose static text is the USA case and which the script rewrites for the chosen region; the caption box is gone.
- **Splits** (text left, card right in `.s3side`): the hero, the two-lever chart (Auditability), the sparsity chart (Open scale, with Tencent and Xiaomi), the NaiveAI layer strip, the cost frontier (StepFun and the rest of China), the question explorer, the AA bars, the stability chart, the stage scores, the token bar (Olmo 3), the call-shape diagram, and in Inspect an open run the log and the data-mix cards. Full width: Phi, Distribution, the band outside China, IFM and SmolLM3, the Compare labs tool, Further reading.
- **Kept 2D**: the hero (a table of eight rows), the two-lever chart, the sparsity scatter, the cost frontier and the training log (log axes), the AA bars and the token bar (bars on one axis), the NaiveAI strip (a flat sequence of layers), the call-shape diagram, the question explorer and the Compare labs table (reader-driven tools). A 3D "labs on three axes" view was considered and not built: the table compares more axes and reads better.
- **No real image**: the subjects are labs and releases, not physical objects.
- **Checks**: `check_stages.mjs` (new; from the repo root, with a shots directory outside the repo): every stage and the DiLoCo animation play when scrolled into view, step to their end with one list item per step (both modes of the model-flow stage and of DiLoCo), stop off screen, never move under reduced motion; splits two columns at 1400 px and one below 1100; step-list numbers against the scenes (`ONP_MEM`, `ONP_BITS`, `ONP_FA`). `checks/check_controls.mjs`: 1400 px added, its never-autoplay block removed (inverted in `check_stages.mjs`). `checks/check_data.py`: one prose string updated (814.8 MiB, as `recompute.out` prints).

### Length judgement (2026-11-10)
| | Before this pass | After |
|---|---|---|
| Reading, core | 8,325 words, 36.2 min | 9,557 words, 41.6 min |
| Reading, closed details | 3,371 words, 14.7 min | unchanged |
| Other tabs | Compare 5.5, Inspect 3.0, Further reading 4.0 | unchanged |
| Visuals inline in Reading (audit count) | 10 | 11, three of them 3D stages |

The added words are the step lists (27 items in the modes shown first, 14 more in the hidden alternate modes, which the audit counts). Most replace script-written captions the audit could not count (the hybrid, model-flow and DiLoCo animations' 42 captions); the rest is Bonsai's new walk-through. A reader following one mode of the model-flow stage and of DiLoCo reads about 2 minutes less than the measured total. Nothing was cut.

### Knowledge ledger (2026-11-10; problems 0)
288 units: core 184, depth 35, volatile 50, owned 1, fat 18. Re-keyed to the new wording: 46, 47, 54, 55. Unit 48 (the old animation's model toggle and GPU select labels) is now fat. Every key that held a reading time (253 to 264) now keys on the words before the number; 178 no longer contains a minutes number either.
