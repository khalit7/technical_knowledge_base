# The Llama 3 Herd of Models: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81aca58ccb9d720b474e, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`) and the reference folder `attention_is_all_you_need_transformer/src/`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card (generated), then Problem, The herd, Data, Scaling law (3D stage Fig. 1; predict: the printed constants), 16K GPUs, Keeping it running (predict: how often; Table 5 bars), Recipe (run chart), Post-training (3D stage Fig. 2, RS + SFT + DPO against PPO; predict: DPO masking with calculator), Post-training data, Capabilities (expandable), Results (Table 2 frontier with intervals; predict: human evaluation), Why it matters, Connections, How much of this to believe, What it takes to use this. |
| Refit the forecast | `t-fit` | Figures 2, 3, 4 rebuilt from the vector PDFs and refitted. |
| Run the 16K-GPU job | `t-run` | Mesh rank mapper, memory per GPU, pipeline schedule simulator (animated, step list), 54-day interruption replay (a widget). |
| The paper's tables, rebuilt | `t-tables` | Tables 2 (with intervals), Figure 17, 3 (recount), 4 (checked), 5 (checked), 6 and 7, 15, 21. |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from papers.md, and why.** This is a 92-page report that is part systems, part empirical and part recipe, so it gets two live tabs instead of one: "Refit the forecast" (the empirical ingredient: the scaling law that sized the model and the benchmark forecast) and "Run the 16K-GPU job" (the systems ingredient: 4D layout, pipeline schedule, failures). No toy model: the architecture is Llama 2's and the claims are about scale. No "Then and now" tab: the lineage before and after Llama 3 is on the Meta lab page, which this page links where it overlaps; "Why it matters" carries the short version. Capabilities and some results paragraphs sit in expandable details to keep the Reading tab near 26 minutes (the reading-time line reports the details separately).

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or an unexpanded macro, and fills the reading times.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v3 to `inputs/paper_v3.txt` and `inputs/table_*.txt` (v1 was also extracted to diff; the only content change is Table 4's DP 4 to 8 in the 128K row).
- `extract_figs.py` (`uv run --with pymupdf python extract_figs.py [source dir]`): downloads the arXiv e-print (not kept) and reads Figures 2, 3, 4 and 17 from the vector PDFs in `assets/`, calibrated on gridlines or axis ticks, into `inputs/figs.json`.
- `mk_tables.py`: tables from the HTML extracts into `tables.json`, strings as printed.
- `recompute.py`: parameter recount, FLOPs, the power-law refit and the budget that reproduces 16.55T, IsoFLOPs parabola refits, the two-stage ARC refits (sigmoid by Nelder-Mead), Table 4 and 5 checks, run schedule, model-card throughput, CI sizes, Table 7 token shares, Figure 17 separation. Writes `inputs/recompute.json`.
- `mk_paper.py`: card (with the verdict line and the Notion Takeaway verbatim), Further reading, `window.PAPER` (tables, recompute results, figure points).
- `check_page.mjs` (from the repo root: `node technical_knowledge_base/whats_new/papers/llama_3_herd/src/check_page.mjs [shots dir]`): every control in light 920 and dark 390, the pipeline animation (plays once in view) and the 54-day widget (never moves by itself) stepped, text at least 11 px, no NaN, no sideways scroll; mid-animation shots to `../.shots/x-*.png`.
- `check_stages.mjs` (since 2026-11-13, after InstructGPT's): splits two columns at 1400; both stages (Fig. 2 in both modes) and the pipeline animation at 1400 light, 920 light and 390 dark (play on view, one list item per step, last step, flows stop off screen); the 54-day widget never moves; reduced motion; 24 step-list numbers against `window.PAPER`.
- `mk_coverage.py`: `coverage.json`, every fact of `live.md` with where the page carries it, verified against the built HTML.
- `inputs/`: paper text and table extracts, `figs.json`, `recompute.json`, the Llama 3.1 model card and the 8B and 70B config.json files.
- `viz_ideas.md`: ideas built and rejected (rows `P-llama_3_herd.*` for the log).

## Parts

HTML: `00_top`, `01_css` (reference copy), `01b_css` (stacked bars, Table 2 shading), `02_split` (template, the split layout), `02_header`, `03_paper`, `04_fit`, `05_run`, `06_tables`, generated `_gen_card`, `_gen_more`.
JS: `10_js_common`, `_gen_data`, `11_js_ui` (`makeAnim` from Chinchilla with the 2026-11-06 motion rules and step lists, plus `auto:false` for a widget), `12_js_data` (table helpers, interval lookup), `13_js_read`, `15_js_hero` (the hero pipeline, static), `20_js_fit`, `21_js_run` (mesh, memory, pipeline simulator, replay), `22_js_tables`, `25_js_s3` (template, renderer v2), `31_js_sc_iso` (Fig. 1), `32_js_sc_post` (Fig. 2), `99_js_tabs` (the explainer-page template, storage key `l3-tab`; a `data-to` link opens the closed block holding its target). `05z_errbox.js.html` is the template's. `14_js_post` (the 2D post-training animation) was removed on 2026-11-13: Fig. 2 replaces it.

## What reproduces and what does not

- Reproduces independently: parameters 8.03B, 70.55B, 405.85B; 6ND = 3.80e25; IsoFLOPs minima within 0.25%; the power law (α 0.5368, A 0.2995 against the legend's 0.537, 0.299) and "402B on 16.55T" at 4.0e25 FLOPs; the drawn ARC sigmoid (floor 0.25 and ceiling 1 fixed, slope and midpoint refitted); the paper's printed CIs from its formula; Table 4 products; the pipeline bubble formula (simulation).
- Does not reproduce: the text's (0.53, 0.29) give 10.5T; at the stated 3.8e25 the refit gives 16.1T and 393B; Table 5's faulty-GPU 30.1% (148/419 is 35.3%) and hence "58.7% GPU"; Table 4's 41% MFU (40.4%); the API-Bank gap "0.6%" (Table 22 shows 0.3); Table 7's 846.1 average (847.1 from rows).

## Checks (3 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 384 actions, 0 problems. `mk_coverage.py`: 112 of 112 verified.

## Light pass, 2026-10-25 (teaching contract)

- **Top**: the core sentence, a hero figure (`15_js_hero.js`, `#l3hero`: the report as one six-stage pipeline, data, scaling-law sizing, the 16K-GPU job, the schedule, six post-training rounds, result; blue boxes are the report's contributions), You need (Distributed training, Pretraining section 3, Alignment) and New terms. The paper's own figures are not reused: arXiv lists the report under its non-exclusive distribution licence, not CC BY, so the hero is redrawn. No photo: the page is about a recipe, not a physical object the reader has not seen.
- **Owned elsewhere** (OWNERS.md): the 4D grid keeps where Llama 3 put each form and links Distributed training for what each splits and sends (and for the interleaved 1F1B bubble); GQA links Attention variants; RoPE base and scaling link Positional encodings; dedup links Deduplication; scaling laws link Pretraining; DPO links Alignment; the checkpoint argument links Fault tolerance at scale; power swings link Power, cooling and reliability; RoCE and Clos link Interconnects and scaling; whole-run MFU links Performance math.
- **Moved into closed `<details>`** (nothing deleted but fat): the scaling-law runs' hyperparameters; the cluster, storage and network paragraphs (one open sentence keeps the 1:7 point); numerics and NCCLX; the other pipeline-schedule changes; how preference data is collected; the step derivation and whole-run utilisation (the 34.6% stays open); the six small inconsistencies; a dated block "Later, as of 25 October 2026" (torchtitan, Llama 4). The Table 4 and Table 5 captions in Reading are shortened to the point and link the Tables tab checks. In the Tables tab, Table 2 and Figure 17 stay open; Tables 3, 4, 5, 6 and 7, 15 and 21 are closed blocks.
- **No autoplay**: `makeAnim` waits on step 1, also after a mode switch; `check_page.mjs` fails if `pt`, `pp` or `rl` draws a frame before play or on a mode switch, and opens every closed block before auditing a tab. Header: "Reading: 29 min, plus 11 in closed details." (`reading.json`, from audit_pages.mjs).
- **Length**: Reading core 6,834 words (30 min) plus 1,878 closed (8) before; 6,560 (29 min, including about 330 words of new top) plus 2,608 closed (11) after. Tables tab 1,543 open before; 589 open plus 970 closed after. Refit and Run tabs unchanged (2.5 and 4.7 min). The core stays long because the ledger is mostly core: the page owns a 92-page report whose argument runs through data, sizing, infrastructure, reliability, recipe, post-training and evidence, and the verdict rests on the open numbers. Generic mechanisms were already short here, so linking owners saved little.
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 409 units, core 284, depth 115, owned 6, volatile 2, fat 2 (old reading-time line, tab labels); `ledger.py check` problems 0.
- `mk_coverage.py`: reading-time and pipeline items updated for the new wording; 112 of 112. Saved extracts: em-dashes replaced with `--`; no author emails were present, and `extract_paper.py` now redacts any it meets.

Rechecked 2026-10-25: `checkpage.sh` 5 tabs, 228 KB, emdash 0, errbox 1, clipped 0, fail=0; `check_page.mjs` 384 actions, 0 problems.

2026-10-26 (final follow-up sweep): the Keeping it running paragraph adds the Table 5 grouping check (76.6% without the network rows, 85.0% with them, the 78% grouping unconfirmed; GPUs 268 of 419), absorbed from Meta: Llama and Meta Superintelligence Labs.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged). The paper tab: the core sentence, You need and New terms beside the hero; The herd beside Table 3 (with the recount); Data beside the pre-training mix bar; Scaling law beside Fig. 1 (stage); Keeping it running beside the Table 5 bars; Recipe beside the run chart; Post-training beside Fig. 2 (stage); Post-training data (now its own section, `s-pdata`) beside the preference and SFT mixes; Results beside the Table 2 frontier card. Full width (no visual, or tables only): Problem, 16K GPUs (the 4D cards and Table 4), Capabilities, Why it matters, Connections, How much to believe, Use it. Refit the forecast: each of the three steps is a split, its notes and caption on the left, controls and chart on the right. Run the 16K-GPU job: the mesh, memory, pipeline and 54-day cards are splits the same way. Tables and Further reading: tables only, full width, unchanged.
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged):
  - `31_js_sc_iso.js`, Fig. 1, the scaling law that sized the 405B: the 133 runs of Figure 2 (`PAPER.figs.fig2`, read from the vector PDF) over a floor of log tokens by log FLOPs, height the validation loss; step 1 close on 10^21 FLOPs (12 runs), step 2 its refitted parabola and minimum (54.6B tokens, loss 0.736; heights stretched 4 times around the minimum in steps 1 and 2, with local loss ticks, so the 0.02 valley is visible), step 3 all ten budgets, step 4 the curvature (0.092 down to 0.051 and 0.064), step 5 the curves lowered onto the floor where the minima lie on the refitted power law (`rc.fit`, flows along it), step 6 the law extrapolated 3.6 orders to 4.0e25 (16.55T, 402.8B), with 3.8e25 (16.1T, 393B) and the run (405B on 15.6T) marked. Every number in the step list is checked by `check_stages.mjs`.
  - `32_js_sc_post.js`, Fig. 2, one prompt through one round (replaces the 2D `makeAnim` animation of `14_js_post.js`): prompt, sampler plate, K = 20 responses as bars on a plinth scored by the reward model (illustrative, the same seeded draws as before, labelled so), the best kept, SFT with Table 7's mix as a column to scale, DPO with Table 6's mix, three runs averaged into one, the arc back to the sampler with six round markers. The PPO-based RLHF mode (its own list) shows the policy, one online response and the reward, reference and value plates resident at once. The counters strip (`ptCnt`) under the lists is the old animation's, updated per step.
- **Owned elsewhere, linked**: how a reward model learns from a ranking and one PPO step model by model (Alignment, sections 3 and 4, its stages `stg-rm` and `stg-rl`); 4D parallelism and the device meshes (Distributed training, Meta lab page); scaling laws in general (Pretraining). Not rebuilt.
- **Kept 2D**: the hero (a summary of six pieces of text, not one spatial structure), the Table 3, Table 4 and Table 2 cards (tables), the mix and Table 5 bars, the run schedule (curves on a log axis), the forecast reveal chart, the DPO calculator, the human-evaluation bars, every Refit chart (log axes, residuals, a sigmoid), the mesh strips, the memory bar, the pipeline Gantt (a timeline) and the 54-day timeline.
- **Motion**: `makeAnim` replaced by Chinchilla's (the RD.anim rules, `data-playing`, `ol.sx` lists) with one addition, `auto:false`. The pipeline schedule animation plays once in view; its old per-step captions are the list `sx-pp` (shared by the three modes; the mode-specific captions became a three-item list above it) and the sweep table moved to the left column. The 54-day replay follows the long-replay rule as a widget: it opens on the whole 54 days, never plays by itself, and keeps a live caption (`rlCap`, now prefixed with its days). `05z_errbox.js.html` and `99_js_tabs.js` are the templates (storage key `l3-tab`, the `data-to` link still opens its closed block). `check_page.mjs`: the never-autoplay assertions are inverted (the pipeline must play when scrolled into view and replay on a mode switch; the widget must not move), and it creates its shots folder.

## Length judgement (2026-11-13)
| | Before (audit 2026-11-13) | After |
|---|---|---|
| The paper, core | 28.7 min (6,607 words) | 31.7 min (7,283) |
| The paper, closed | 11.3 min | 11.3 min |
| Refit the forecast | 2.5 min | 2.5 min |
| Run the 16K-GPU job | 4.7 min | 5.3 min |
| The paper's tables, rebuilt | 2.6 plus 4.2 closed | unchanged |
| Further reading | 2.4 min | unchanged |
| Visuals in Reading (audit) | 3 | 4 |

The growth is the step lists: Fig. 1's six steps (about 330 words, new explanation of how the 133 runs become the 405B's size), Fig. 2's PPO list (six items, about 150 words, hidden until the mode is chosen but counted by the audit; before, these captions were drawn by script one at a time) and the pipeline list with its mode descriptions. Fig. 2's Llama 3 list absorbed the old five-item recipe list, so it adds little. Nothing was closed or cut. Header: "Reading: 32 min, plus 11 in closed details." (`reading.json`). Pages quoting the old 29 minutes need `check_times.py --fix` by the lead.

Ledger: 428 units (core 300, depth 117, owned 6, volatile 2, fat 3). 19 added (Fig. 1's six steps and its provenance, Fig. 2's contrast sentence, PPO list and step 8, the Alignment link, the pipeline modes and steps, the widget sentence). Keys re-pointed on units 43 (the mix sentence), 146 and 150 (the recipe list, now Fig. 2's steps), 156 (the animation sentence) and 302 (the Refit caption, moved left); unit 159 (the old "starts paused" note) is now fat. `ledger.py check`: problems 0. `mk_coverage.py`: the rejection-sampling key re-pointed to the step list's wording; 112 of 112.
