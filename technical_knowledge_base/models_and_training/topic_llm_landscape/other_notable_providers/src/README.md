# Source of "Other notable providers"

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
