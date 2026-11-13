# LoRA: Low-Rank Adaptation of Large Language Models: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81018f15edd19fa5c28a, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built on the paper method (`.claude/skills/explainer-page/page-kinds/paper.md`) from the Attention Is All You Need reference folder's pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict (from `paper.json`), then Problem, Idea (Eq. 3; the LoRA-against-adapter animation; a GPT-3 parameter calculator behind a predict question), Method (§4.2's savings and limitation), Merging (checked live on the toy's adapters), Results (Figure 2 redrawn from Table 15 behind a predict question), Inside ΔW (§7; Table 7 bars behind a predict question), How much of this to believe, What it takes to use this, Why it matters (beyond the paper), Connections. |
| Train a LoRA | `t-run` | The live ingredient: a toy Transformer block pretrained to count, adapted in the browser to "teacher" tasks whose true weight update is known. In-browser trainer (any matrices, rank, α/r or α/√r, learning rate, full fine-tuning), merge check, spectra and φ against the true edit; the offline sweep (rank, budget, scaling; three seeds); Figures 3 and 4 and Table 7 on the toy; full fine-tuning's update spectra; how far to trust the toy. |
| The paper's tables, rebuilt | `t-tables` | Every number checked (21 claims with verdicts), the parameter recount, Tables 1 to 6, 15, 16 and 18, and the inconsistencies between the paper's own tables. |
| Then and now | `t-then` | A step animation from the 2021 recipe to 2025 (PEFT, QLoRA, S-LoRA and vLLM/SGLang, rsLoRA, DoRA, Apple's adapters, LoRA Without Regret and Tinker), and a changed/survived table. |
| Further reading | `t-more` | Generated from `paper.json`. |

Why this shape. LoRA is a "training recipe" paper in the method's table, so the live ingredient is the update rule run live; it is a real small model rather than a 2-D toy because the paper's claims are about which matrices and what rank, and those need a model with several matrices. The toy's tasks are teachers (the base with a known low-rank edit) so the "true update" exists and can be compared with what LoRA learns, which the paper itself could not do. Then and now is included because LoRA's recipe became a standard and was revised (layers, scale, base precision, serving). Departures from papers.md: the tables tab leads with "every number checked" and a recount, because the paper's parameter counts are where it does not reproduce; Figure 2 is in the Reading tab's predict reveal (from Table 15's printed values, which the paper says are Figure 2's points) rather than the tables tab.

## The toy (Train a LoRA)

- Model (`train.py`, `parts/22_js_lora.js`): 16 symbols plus a sink token; input `[x0, BOS, x1..x10]`; one block read at position 0: embeddings + learned positions, two-head attention (Wq, Wk, Wv, Wo, 32 × 32, no biases), residual, ReLU MLP (W1 128 × 32, W2 32 × 128, with biases), residual, linear head to 11 classes. 13,739 parameters. Weights are out × in (h = W x), the paper's convention.
- Pretraining: count of x0 among x1..x10, counts uniform 0..10; AdamW 3e-3, batch 256, 6,000 steps, label smoothing 0.1 (without it the base was so confident that adaptation losses started in the hundreds). Then 8-bit per-tensor quantisation; the dequantised weights are the base everywhere (100.0% float, 99.5% quantised on 4,000 held-out sequences).
- Tasks (`teacher()` in train.py): the base with ΔW* = c U Vᵀ on one matrix (U, V random orthonormal), c calibrated once so the base agrees with the teacher on 75%: v1 (Wv, rank 1), v4 (Wv, rank 4), v32 (Wv, dense), mlp4 (W1, rank 4). Training target: the teacher's output distribution (soft cross-entropy); accuracy: agreement with the teacher's argmax, overall, on "changed" sequences (teacher differs from base) and on unchanged ones.
- LoRA as the paper: W0 frozen, A Gaussian (std 1/√k), B zero, scale α/r with α = 8 fixed (or α/√r); Adam, 50 warmup steps then linear decay; batch 64 of fresh sequences.
- Sweep (`train.py sweep`, resumable, about 55 minutes on 2 threads): 124 configurations; each "tuned" configuration tries 3 learning rates with seed 0, picks one on a separate validation set, and reruns seeds 1 and 2 there; the α/r against α/√r comparison runs 3 seeds at one rate (0.01). Every run is a line of `model/runs.jsonl`; `train.py export` aggregates them into `parts/20_model_data.js` with the base weights (12-bit codes of the 8-bit values), the teachers (24-bit), kept adapters (12-bit), full fine-tuning spectra, overlap and the engine check.
- The first task design (relabelled symbols, an exact rank-k update of Wq) was abandoned before any result was used: low-rank LoRA could not find the update while full fine-tuning could, which looked like an optimisation barrier from sharp pretrained attention rather than a rank limit. Its runs are in `model/abandoned_swap_tasks.log`.

Commands (from `src/`; torch is never added to pyproject.toml):
```
OMP_NUM_THREADS=2 uv run --with torch --with numpy python train.py pre       # 30 s
OMP_NUM_THREADS=2 uv run --with torch --with numpy python train.py sweep     # run in the background
OMP_NUM_THREADS=2 uv run --with torch --with numpy python train.py export
node check_engine.mjs && uv run --with torch --with numpy python check_engine.py   # JS engine against PyTorch
```

## Files

- `build.sh`, `mk_paper.py`, `parts/00_top`, `01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`: copied from the reference folder (mk_paper adds the verdict line); `11_js_ui` carries `makeAnim` with the 2026-11-06 motion rules and step lists (copied from the DeepSeek-V3 page). `99_js_tabs.js`: the skill template (storage key `lora-tab`) plus opening a closed block just after a `data-to` target. `02_split.html`, `25_js_s3.js` (renderer v2), `05z_errbox.js.html`: skill templates, unchanged. `14_js_hero.js`: the hero. `reading.json`: the measured reading time the header prints. `label_ledger.py`: labels `ledger.json`.
- `paper.json` (card, resources, connections); `tables.json` (written by `mk_tables.py` from `inputs/table_*.txt`, which `extract_paper.py` cut from the arXiv HTML v2); `recompute.py` (every derived number and the claim checks, writes `inputs/recompute.json`).
- `parts/03_paper.html` + `13_js_read.js` (animation, calculator, merge check, Figure 2, Table 7); `04_run.html` + `23_js_run.js` (trainer and toy charts); `22_js_lora.js` (the engine: data, forward with split or merged LoRA, backward, Adam, Jacobi SVD, φ, amplification; also run by node); `05_tables.html` + `24_js_tables.js`; `06_then.html` + `27_js_then.js` (was `25_js_then.js`, renamed for the renderer); `31_js_sc_lora.js` (Fig. 2) and `32_js_sc_sub.js` (Fig. 4), the 3D scenes; `20_model_data.js` (generated).
- `check_engine.mjs` / `check_engine.py`: the browser engine replayed in PyTorch float64 (`model/check_engine.json`). `check_page.mjs`: every control at 1400 and 920 light and 390 dark, a real 300-step training run of LoRA and of full fine-tuning, both 2D animations stepped, every animation and stage playing once in view. `check_stages.mjs`: the 2026-11-06 layout and motion checks and the step lists' numbers against the data (below). `mk_coverage.py` writes `coverage.json` against `live.md` (saved by `save_live.py` from the session transcript).
- `inputs/`: the paper text and tables, `hf_configs.json` (model shapes for the recount), `later_extracts.txt` (every beyond-the-paper quote: QLoRA, rsLoRA, DoRA, S-LoRA, LoRA Without Regret, Apple, Tinker, PEFT, vLLM, SGLang, loralib, fairseq, the repository README).
- `model/`: base and teacher checkpoints, logs, `runs.jsonl`, `pretrain_report.json`, `check_engine.json`.
- `viz_ideas.md`: the visualisations chosen and rejected, with scores and the new idea rows.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, 304,889 bytes (data 110 KB: base weights 28 KB, sweep summary 39 KB, adapters 33 KB, teachers 13 KB). `node .../src/check_page.mjs`: 286 actions, 0 problems, including a real 300-step LoRA run and full fine-tuning run in both themes and widths. `check_engine.py`: PASS (forward logits within 6.3e-13, three training traces within 2.6e-14 in loss and 1.6e-14 in weights, teacher labels 200/200, SVD within 4.4e-15). `mk_coverage.py`: 49 of 49 items verified. The Reading tab is about 19 minutes (the old page was 9): the paper page owns every detail, the evidence section is long, and nothing was folded away.

CPU: pretraining 30 s; the sweep about 55 minutes on 2 threads in all (it was restarted twice: once stopped for an unknown reason, once by the background time limit; it resumes from `runs.jsonl`), above the brief's 40 minutes because each configuration's learning rate is tuned.

## The 2026-10-24 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence and a hero: the paper's Figure 1 redrawn with GPT-3's numbers (frozen 12,288 × 12,288 W0, 151M numbers; A and B at r = 4, 98,304 numbers, 0.065%), static (`14_js_hero.js`). The paper is not CC BY (arXiv non-exclusive licence), so no figure is embedded; it is redrawn. No photo would teach more. Then "You need" (nothing beyond attention matrices and Adam; the PEFT page for LoRA as practised) and the new terms (r, A and B, alpha, adapter layer, prefix tuning, phi).
- **Visuals inline**: Figure 2 (rebuilt from Table 15) and Table 7's bars no longer hide inside predict reveals; each sits in its own card right after its predict question ("answer the question above before you look"). The GPT-3 adapter calculator left the 4.7M reveal and sits in Method, beside the savings it computes. The Train a LoRA tab stays a tab: it is a lab with several sections that the Merging, Inside and verdict sections all use.
- **No autoplay**: `11_js_ui.js` replaced by the patched copy, so the LoRA-against-adapter animation and the Then and now card wait on their first step; `90_js_tabs.js` replaced by the template `99_js_tabs.js`. `check_page.mjs` now fails if `mx` or `tn` moves before a click, and opens every closed block.
- **Owned elsewhere, linked with a sentence kept**: QLoRA's mechanics (NF4, double quantisation, paged optimisers), the fine-tuning memory calculator, DoRA in full and why 1/r makes the learning rate rank-independent (Parameter-efficient fine-tuning); how servers batch many adapters (LLM serving in production). The paper's own claims, numbers and evidence stay here.
- **Closed**: the released code's different initialisation; LoRA plus prefix tuning (Appendix E); the results setup and baselines; the low-data result (Table 16 also stays charted in the tables tab); in the tables tab, the full Table 15 and the inconsistencies table (a one-line summary stays open).
- **Volatile**: vLLM and SGLang support, Apple's on-device adapters and Tinker moved to one dated closed block, "Where LoRA runs now (checked 2 October 2026)".
- Header: "Reading: 21 min, plus 1 in closed details.", read by `build.sh` from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 19.6 min (4,512 words) | 20.6 min (4,746) |
| The paper, closed | 0 | 1.2 min (283) |
| Train a LoRA | 5.3 min, plus 1.5 closed | unchanged |
| The paper's tables, rebuilt | 11.2 min | 9.8 min, plus 1.6 closed (tables drawn by script count) |
| Then and now; Further reading | 1.3; 1.9 min | unchanged |
| Visuals drawn in Reading (audit) | 1 | 4 |

Why about 21 minutes is right: the minute added is the core sentence, the hero, the new terms and the captions of the visuals that came out of the reveals; what went out (Why it matters cut to what later work showed against this paper, setup and appendix detail closed) roughly paid for it. Everything still open is the paper's argument in its order (problem, idea, method and savings, merging, results, inside the update, how much to believe, using it, what followed); the evidence section is long because the paper page owns the judgement of its numbers.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
229 units: core 202, depth 17, owned 5, volatile 2, fat 3. 216 drafted by `ledger.py init`; 13 added (core sentence, hero, new terms, four owner links, six script-drawn tables and lists). `ledger.py check`: problems 0.

## Checks (24 October 2026)
`checkpage.sh`: tabs 5, 314 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 0 problems (including no movement before a click and every closed block opened). `mk_coverage.py`: 49 of 49 (the reading-time, rsLoRA and DoRA keys updated). The engine (`22_js_lora.js`) is unchanged, so `check_engine` was not rerun.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

Briefs `rebuild-page.md` and `layout-rollout.md`. Ownership: this page owns the paper (its method, numbers, evidence and the toy); LoRA as practised (rank, target modules, memory, QLoRA, DoRA, multi-LoRA serving) is the PEFT page's, whose Fig. 2 already draws LoRA on a real SmolLM2 matrix in 3D. So nothing here rebuilds that figure: the stages show what only this page has, a LoRA trained against a known true update.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| The paper | core sentence, You need, New terms | split | Fig. 1, the hero, 2D static (the paper's Figure 1 with GPT-3's numbers) | no |
| The paper | Problem | full width | none | no |
| The paper | Idea, Eq. 3 | split | **3D** `stg-lora` (Fig. 2) | yes, 5 |
| The paper | Idea, LoRA against an adapter | split | Fig. 3, 2D `makeAnim`, two modes | yes, 7 and 6 |
| The paper | Idea, predict (4.7M) | full width | predict widget | no |
| The paper | Method | split | GPT-3 adapter calculator (2D widget) | no |
| The paper | Merging | full width | none (Fig. 2's last step shows it; the live check is a sentence) | no |
| The paper | Results | intro and predict full width, then split | Figure 2 rebuilt (2D chart) | no |
| The paper | Inside the update, Which matrices, What rank | full width | none | no |
| The paper | Inside the update, phi | split | **3D** `stg-sub` (Fig. 4) | yes, 6 |
| The paper | Inside the update, Table 7 | predict full width, then split | Table 7 bars (2D, log scale) | no |
| The paper | Believe?, Use it, Why it matters, Connections | full width | none | no |
| Train a LoRA | intro and the toy, beside the trainer | split | trainer (lab: controls, loss chart, counters) | no |
| Train a LoRA | sweep | split, then the two small charts full width | 2D charts | no |
| Train a LoRA | Inside ΔW | split | phi heatmap and Table 7 bars on the toy (2D tool) | no |
| Train a LoRA | full fine-tuning spectra | split | 2D log chart | no |
| Train a LoRA | How far to trust the toy | full width | none | no |
| The paper's tables, rebuilt | all | full width | tables and 2D charts | no |
| Then and now | intro and steps beside the card | split, then the table full width | 2D `makeAnim` (recipe card) | yes, 8 |
| Further reading | | unchanged | | |

**Fig. 2, Equation 3 on a real matrix** (`31_js_sc_lora.js`): the toy's frozen `Wv` (32 x 32, the 8-bit base) as a glass plate with one signed bar per weight; `x` enters along the columns from the front and `h` leaves along the rows at the side, as h = Wx reads. A (4 x 32) and B (32 x 4) to scale, laid out as an outer product around the update's square; the parameter counts (1,024 frozen, 256 trained) as two columns in step 2. Step 3 grows the real trained adapter (task v4, seed 1, r = 4 on Wq and Wv, `LORA_DATA.adapters.v4['1']['4']`, alpha/r = 2) with gradient flows into A and B only; step 4 puts the task's true edit (`LORA_DATA.teachers.v4`, rank 4) behind it, both updates coloured by sign so their patterns can be compared (singular values 1.51, 1.39, 1.30, 1.01 against 1.53 x 4, cosine 0.81, 99.3% of changed sequences, mean of three seeds from the sweep summary); step 5 slides the update into W0. Every number is computed in the browser from the page's data by the engine (`LORA.svd`, `LORA.deltaW`) and exposed as `window.LORA_SC`.

**Fig. 4, phi on the toy** (`32_js_sc_sub.js`): step 1 the 16 singular values of the learned update at r = 16 against the edit's four; steps 2 to 5 one plate each, phi(i, j) of Equation 4 as bar height and colour depth: r = 4 against r = 16 (Figure 3's question), seed 1 against seed 2 (Figure 4's), learned against the true edit (what the paper could not measure), two random Gaussian matrices (the floor, about 0.5 at (16, 16) because the toy's space has only 32 dimensions); step 6 all four. Computed with the same functions and adapters as the Train a LoRA tab's heatmap (`LORA.rightSV`, `LORA.subspaceSim`, random seed 77), exposed as `window.LORA_SUB`.

**Kept 2D, and why**: the hero (a schematic of Figure 1 at GPT-3 scale, where A and B are 0.065% of the square and a perspective view would lose them; Fig. 2 does the same in 3D at the toy's scale), Fig. 3 (a dataflow drawn to scale at d = 1,024: the point is a 4-number strip against 1,024 and the order of products, which reads flat; given a step list and autoplay instead), the calculator (a widget), Figure 2 and Table 7 (numbers on axes, Table 7 on a log scale), every chart and tool of Train a LoRA and the tables tab, and Then and now (a recipe card that changes line by line). No photo or figure is embedded: the paper is not CC BY (as before).

**Motion and lists**: `makeAnim` now plays once half in view, pauses off screen, stops for good on any control or at its last step, never moves under reduced motion, and marks its step list; the per-step caption boxes (`#mxStep`/`#mxCap`, `#tnStep`/`#tnCap`) are gone, their text is the step lists (`#sx-mx-lora`, `#sx-mx-adp`, `#sx-tn`), the only place it lives (13_js_read.js counts the steps from the lists; 27_js_then.js keeps only the per-step data the card draws). The predict questions stay where they were; Figure 2's chart sits beside the Results bullets, after its question.

**CSS added** (in `01_css.html`, before the kb-look block ends): an equation in the left column wraps; a segmented control that wraps keeps round buttons (it stretched in the narrower columns).

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 20.6 min (4,746 words) | 26.0 min (5,978) |
| The paper, closed | 1.2 min (283) | unchanged |
| Train a LoRA | 5.3 min, plus 1.5 closed | unchanged |
| The paper's tables, rebuilt | 9.8 min, plus 1.6 closed | unchanged |
| Then and now | 1.3 min | 2.3 min (537) |
| Visuals counted in Reading (audit) | 4 | 6 |

The growth is the step lists: Fig. 3's thirteen captions and Then and now's eight were drawn by script and invisible to the audit (about 600 words that a reader always read), and the two new stages add about 800 words of steps and their two short introductions that each state the toy's own numbers. Nothing was cut; the paper's argument is unchanged in order. Why about 26 minutes is right: as before the page owns every number of the paper and its evidence, and the two stages now show, on a model with a known answer, the two claims the paper could only argue on GPT-3 (a low-rank BA finds the update; the top directions are shared across ranks and seeds). Header: "Reading: 26 min, plus 1 in closed details." (`reading.json`).

**Ledger**: 241 units (core 214, depth 17, fat 3, owned 5, volatile 2); 12 added for the step lists (Fig. 2's five steps, Fig. 4's five measurement steps, Fig. 3's and Then and now's lists); keys re-pointed on units 192 and 194 (Then and now's intro, whose old keys ran into the removed caption controls). `ledger.py check`: problems 0.

