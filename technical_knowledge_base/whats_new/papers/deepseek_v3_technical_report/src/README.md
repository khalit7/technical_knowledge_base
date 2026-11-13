# DeepSeek-V3 Technical Report: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d815fb8dac9ba1e35ab81, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built on the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`) with the FlashAttention folder's copies of the shared pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict; the core sentence and hero (seven co-designed pieces with their numbers, adding up to the bill); You need and new terms; Problem; Architecture (MLA, DeepSeekMoE, parameter breakdown recounted from config.json); Balancing (the bias rule, Table 5's evidence, predict: a batch-wise auxiliary loss, then §4.5.3's validation losses as bars); MTP (Table 4's evidence, predict: 1.8× with a live acceptance-rate calculator); Infrastructure (layout, DualPipe with Table 2, the all-to-all route diagram, closed: memory, serving, hardware wishlist); FP8 (framework; scaling with the predict and the scaling animation; promoted accumulation with the accumulation animation and the "what reproduces" box; closed: the formats, error against K, storage and communication; Appendix B's evidence); Pre-training; The bill (Table 1 with a price slider, predict: how much of Llama 3.1 405B's 11× is work, the hours-against-work bars, the utilisation chart; closed: what the $5.576M leaves out, units, wall clock); Post-training; Results; How much of this to believe; What it takes to use this; Why it matters (closed and dated: what came after); Connections. |
| The paper's tables, rebuilt | `t-tables` | Tables 4 and 5 as gains per benchmark at both scales; Tables 3 to 9 sortable with deltas against any column, best values marked and win/tie/loss counts (Table 3 with its caption's 0.3 tie rule); every recomputable number in the text checked (30 claims, 3 where text and tables disagree). |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from papers.md, and why.**
- *Live ingredient.* V3 is several kinds of paper at once (architecture, systems, training recipe, a cost claim). A toy MoE would teach little that the DeepSeek lab page and Topic: llm-landscape do not already animate (MLA, bias balancing, DualPipe, EPLB), so as briefed the page links to those and runs what is specific to this report: FP8 numerics (the training-recipe kind: the rule run live on a small problem, old against new) and the cost claim (the empirical kind: recomputed from the paper's numbers and checked against an outside yardstick). No model is trained, so there are no weights.
- *No live tabs since 2026-10-25.* The FP8 lab and the cost check each test one claim of one section, so both now sit in the Reading flow beside the claim (see the light pass below).
- *No Then and now tab.* What followed (open-source week kernels, Transformer Engine's block-scaling recipe, MXFP8, V3's successors) is short and sourced in "Why it matters" and "What it takes to use this"; the lineage already lives on the DeepSeek lab page.
- *Reading length.* See the length judgement below.

## What reproduces and what does not

- Table 1, the 180K hours per trillion tokens, 3.7 days, under two months, 671B and 37B (recounted from config.json: 671.03B, 37.55B; with the MTP module 684.49B against the README's 685B), the 3.2× bandwidth ratio and the 13-expert bound, the serving GPU counts: all reproduce independently (`recompute.py`, the checks table).
- The GPU hours are plausible: at 6 × active parameters × tokens V3 used 34.3% of the dense BF16 peak and Llama 3.1 405B 34.5% (40.7% for V3 with attention and the MTP module, 20.3% of the FP8 peak). Derived, not printed; agrees with planetbanatt's estimate.
- Text against tables: Arena-Hard "over 86%" against 85.5 printed; "about 10%" above Qwen2.5 72B on AIME and CNMO is 15.9 and 27.3 points; AlpacaEval's "20%" is 19.5 points.
- FP8: the simulator reproduces the mechanisms (outliers push ordinary values under E4M3's range with per-tensor scaling; 1×128 tiles confine it; 128×128 blocks fail on token outliers, Appendix B.2's hypothesis; promotion every 128 elements cuts accumulation error by one to two orders of magnitude). It does not reproduce the "nearly 2%" at K = 4,096 exactly: the two readings of §3.5.2 give 0.28% and 6.8% for uniform inputs. The paper gives neither distribution nor metric.
- The JavaScript simulator agrees with `fp8_sim.py` exactly on 283 numbers (`check_fp8.mjs`), and the page recomputes the error-against-K chart live and shows it matches 24 of 24 points.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an unexpanded macro or an em-dash.
- `paper.json`, `mk_paper.py` (card, Further reading, `window.PAPER`; `where_label` extended to lettered appendices, A2.SS1 to Appendix B.1).
- `mk_tables.py`: `tables.json` from `inputs/table_*.txt`.
- `recompute.py`: parameters from `inputs/hf_config.json`, the bill, FLOPs and utilisation, MTP arithmetic, communication arithmetic, win counts, the text checks; writes `inputs/recompute.json`.
- `fp8_sim.py`: the reference FP8 simulator (exact doubles, no transcendental functions, so JS and Python agree bit for bit); writes `inputs/fp8_sim.json` (about 25 s). `check_fp8.mjs` (node, from `src/`) runs `parts/12_js_fp8core.js` against it and writes `inputs/check_fp8.json`.
- `save_live.py` copied the Notion fetch into `live.md`; `extract_paper.py` turned the arXiv HTML v2 and v1 into `inputs/paper_v2.txt`, `inputs/paper_v1.txt`, `inputs/table_*.txt` and `inputs/anchors_v2.txt`; `save_extracts.py` wrote `inputs/external_extracts.txt` (README, planetbanatt, Llama 3.1 model card and paper, NVIDIA H100, Transformer Engine, DeepGEMM).
- `check_page.mjs` (from the repo root with node): every control in light 920 and dark 390, the accumulation animation stepped through every mode and option (and playing once scrolled into view), the scaling widget never moving by itself, text at least 11 px, no NaN or errors, no sideways scroll. `check_stages.mjs` (since 2026-11-12, after DDPM's): both 3D stages and the accumulation animation at 1400 light, 920 light and 390 dark, play on view, step lists, reduced motion, and the numbers in the stages' step lists against what the scenes compute. `shoot.mjs` screenshots one element for review.
- `mk_coverage.py`: writes and verifies `coverage.json` against `live.md` (77 items).
- `ledger.json` (knowledge ledger) and `label_ledger.py` (labels it against the built page); `reading.json` holds the header's minutes, measured with `html_utils/audit_pages.mjs`.

## Parts

HTML: `00_top`, `01_css` (FlashAttention's copy plus table styles and two colours for zero and subnormal), `02_split` (template, unchanged; since 2026-11-12), `02_header`, `03a_paper_top` (core, hero, Problem to MTP), `03b_paper_sys` (Infrastructure with the all-to-all stage, FP8 with the scaling stage, the scaling widget and the accumulation animation), `03c_paper_run` (Pre-training, The bill with the cost tools, Post-training, Results), `03d_paper_end` (evidence to Connections), `06_tables`, generated `_gen_card`, `_gen_more`. JS: `10_js_common`, `_gen_data`, `11_js_ui` (Chinchilla's copy since 2026-11-12: `makeAnim` with the 2026-11-06 motion rules and step lists), `12_js_fp8core` (simulator, no DOM), `13_js_read`, `14_js_fp8tab` (the scaling widget, the accumulation animation, the error-against-K chart), `15_js_cost` (the bill tools), `16_js_tables`, `14b_js_hero` (the hero, static), `25_js_s3` (renderer v2, template, unchanged), `31_js_sc_a2a` (Fig. 1), `32_js_sc_fp8` (Fig. 2), `99_js_tabs` (the skill template, storage key `v3-tab`; a `data-to` link opens the closed block that holds its target). `05z_errbox.js.html` is the template's. `03_paper.html`, `04_fp8.html` and `05_cost.html` were removed on 2026-10-25: their content is in `03a` to `03d`.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence and a hero (`14b_js_hero.js`, static): the seven pieces of the report in two rows, "do less arithmetic per token" (DeepSeekMoE 37B of 671B, bias balancing, MLA's 576 cached numbers, MTP's 1.8×) and "keep 2,048 H800s busy" (FP8 within 0.25%, DualPipe, the all-to-all kernels on 20 SMs), adding up to 2.788M GPU hours, with the Llama ratio derived on the page. The paper is under arXiv's non-exclusive licence, so no figure is embedded. Then "You need" (Mixture of experts, Attention variants, Quantization and Precision, Distributed Training, the DeepSeek lab page) and the new terms; the old "what this page builds" box is folded into it.
- **Lab tabs moved into the Reading flow**: Quantise and accumulate explained one section's mechanism, so the scaling animation now sits under "fine-grained scaling" and the accumulation animation under "promoted accumulation", each after its prediction prompt; the error-against-K chart is in a closed block under the box that states its result. Check the bill tested one section's claim, so Table 1 with the price slider and the utilisation chart sit in The bill; cost per unit, wall clock and the exclusions list are closed. The card's run link and every old tab link now point into Reading.
- **New visual**: the all-to-all route (one IB crossing per remote node, NVLink fan-out), the one mechanism of the page that had no picture.
- **Visuals inline**: §4.5.3's balancing losses and the Llama hours-against-work bars left the predict reveals; each sits in a card right after its question.
- **No autoplay**: `makeAnim` patched as on FlashAttention (waits on its first frame; mode switches pause); `90_js_tabs.js` replaced by the template. `check_page.mjs` fails if either animation draws a frame before a click, opens every closed block, and creates `.shots/` itself.
- **Owned elsewhere, a sentence kept and linked**: why MLA needs a decoupled RoPE key (Attention variants); routing collapse and the auxiliary-loss cure (Mixture of experts); parallel MTP heads against V3's sequential module (Families and objectives); how drafting and verification work (Speculative decoding); GRPO's group baseline (RL for LLMs); 6ND and MFU (Performance math); the FP8 formats bit by bit (Quantization and Precision); YaRN (Positional Encodings); serving across nodes (Distributed and disaggregated serving).
- **Closed**: MLA's query compression and absorption, the MTP module's equations, the memory savings, serving, the hardware wishlist, the FP8 formats, error against K, storage and communication, the hyper-parameters, the tokenizer fix, the bill's exclusions, units and wall clock, SFT settings.
- **Volatile**: serving stacks at release, Transformer Engine's block-scaling recipe, DeepGEMM's 1,550 TFLOPS, the open-source week repositories, MXFP8 and the lineage since V3 moved to one dated closed block, "What came after, and where to run it (dated: checked 3 October 2026)".
- **No real image**: no openly licensed photo of an 8-GPU HGX or H800 node exists on Commons; the CC BY 3.0 H100 PCIe photos there do not show the node layout the Infrastructure claim is about, so none is used.
- Header: "Reading: 29 min, plus 6 in closed details." from `reading.json`. The author email in `inputs/paper_v1.txt` and `paper_v2.txt` redacted; `extract_paper.py` now redacts emails.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 25.5 min (5,859 words) | 29.0 min (6,659) |
| The paper, closed | 0 | 6.5 min (1,490) |
| Quantise and accumulate | 4.6 min (1,048) | folded into The paper |
| Check the bill | 3.8 min (868) | folded into The paper |
| The paper's tables, rebuilt; Further reading | 5.4; 2.1 min | 5.4; 2.3 min |
| Visuals drawn in Reading (audit) | 1 | 10 |

Why about 29 minutes is right: The paper plus the two lab tabs was 33.9 minutes of open text; it is now 29.0 in one flow, with the top (core sentence, hero caption, You need, new terms, about 2 minutes) paid for by closing serving, the wishlist, storage formats, hyper-parameters, equations and the bill's bookkeeping. What stays open is the report's argument (problem, the seven pieces with V3's numbers, the evidence for each), the visual that tests each claim beside it, and the evidence section the paper page owns. Shorter would mean closing the FP8 animations or the bill arithmetic, which are the page's strongest evidence for its verdict.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
329 units: core 263, depth 45, owned 8, volatile 5, fat 8. 319 drafted by `ledger.py init` from the page as committed before the pass; 10 added (core sentence, hero, V2 inheritance note, new terms, all-to-all diagram, two prediction prompts, three owner links). Fat: links and intros of the two removed tabs, an animation-manners line, two sentence fragments. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 3, 190 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 308 actions, 0 problems (no frame before a click). `check_fp8.mjs`: 283 numbers compared, 0 mismatches. `mk_coverage.py`: 77 of 77.

2026-10-26 (final follow-up sweep): Further reading notes (paper.json) no longer name the merged Check the bill tab; they point at the Reading tab's bill section.

## The 2026-11-12 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`): Reading has nine splits: the core sentence beside the hero; Architecture beside the parameter chart; Balancing beside the validation-loss bars; the all-to-all kernels beside Fig. 1 (stage); fine-grained scaling beside Fig. 2 (stage); the scaling widget's paragraph beside the widget; promoted accumulation beside its animation; the bill beside Table 1 recomputed with the price slider; utilisation beside the Llama ratio bars and the MFU chart. Full width: Problem, MTP (its calculator is inside a predict reveal), Infrastructure's layout and DualPipe (Table 2 is a table), the FP8 framework, "3 and 4" and the evidence, Pre-training, Post-training, Results, How much to believe, Using it, Why it matters, Connections. Tables tab: the two ablations beside their chart; Every table and the checks stay full width. Further reading unchanged.
- **Two 3D stages** (renderer v2, `25_js_s3.js` unchanged):
  - `31_js_sc_a2a.js`, Fig. 1, replacing the static 2D route diagram: the expert-parallel group as 8 nodes of 8 GPUs (64-way EP over 8 nodes, 4 routed experts per GPU, derived); node-limited routing applied live (each node scored by the sum of its two best affinities, the 4 best nodes kept, the top 8 experts among them); IB arcs once per remote node with flows; NVLink fan-out arcs with flows; the combine streams back. The layout and the rule are the paper's; the token's 256 affinities are illustrative (seeded random sigmoids, seed 17, chosen so that the token's own node is kept), labelled so on the page. Step 1 starts close on node 1 (`view`). Counts in the step list (nodes 1, 5, 6, 8; 2, 3, 1, 2 experts; 3 IB sends against 6; 7 NVLink forwards) are checked against the scene by `check_stages.mjs`.
  - `32_js_sc_fp8.js`, Fig. 2: the page's FP8 simulator (`FP8.scalingRun`, the same code `check_fp8.mjs` checks against `fp8_sim.py`) on the widget's 32 × 512 matrix. The matrix is a glass plate whose grid is the granularity; each group's scale stands on it as a bar (height log10 of the group's largest magnitude); purple ridges are the outliers; after rounding each 1×128 strip is tinted by its share of zeros and subnormals. Seven steps: channel outliers; one scale per tensor; its rounding (8,190 zeros); 1×128 tiles; their rounding (1,146 zeros); token outliers with tiles (1 zero); 128×128 blocks on token outliers (7,574 zeros against 8,505 per tensor), the Appendix B.2 hypothesis. Numbers in the step list are checked against the simulator by `check_stages.mjs`. Each of V3's matmuls and the formats of its inputs are not rebuilt: the step list links Quantization and Precision's Fig. 10.
- **Kept 2D**: the hero (a summary of seven pieces and the bill, not a spatial structure), the parameter bar, the balancing bars, the MTP calculator, the scaling widget (a heatmap of 16,384 values reads best flat; now a widget the reader drives, with a view switch, no autoplay and no step list, opening on the per-tensor outcome), the accumulation animation (a register strip and an error curve over K), the error-against-K log chart, Table 1 and Table 2, the Llama ratio bars, the MFU chart, the ablation chart and every table. DualPipe stays a table with a link to the DeepSeek lab page, which owns its simulation.
- **Motion**: `11_js_ui.js` from Chinchilla (makeAnim with the RD.anim rules, `data-playing`, `ol.sx` lists); the accumulation animation's caption carousel became the step list `sx-ax` (both modes share it); the scaling animation's captions became Fig. 2's step list and the widget's controls. `check_page.mjs` now asserts the accumulation animation plays when scrolled into view (it used to forbid it) and that the widget never moves by itself.
- **Owner links kept**: MoE routing and balancing (Mixture of experts), FP8 formats and per-matmul recipes (Quantization and Precision, Fig. 10 linked from Fig. 2), DualPipe and EPLB (DeepSeek lab page). This page owns the dispatch route (OWNERS.md), so Fig. 1 is built here.

## Length judgement (2026-11-12)
| | Before | After |
|---|---|---|
| The paper, core | 29.0 min (6,659 words) | 32.4 min (7,450) |
| The paper, closed | 6.5 min (1,490) | 6.5 min (1,490) |
| The paper's tables, rebuilt | 5.4 min (1,233) | 5.4 min (1,250) |
| Further reading | 2.3 min | 2.3 min |
| Visuals in Reading (audit) | 10 | 11 |

The growth is the three step lists (20 items, about 900 words): the explanation the two animations used to draw by script in a caption box, where the audit could not count it, plus the new all-to-all routing walk-through. The widget's paragraph was cut to what the widget adds over Fig. 2. Nothing was closed or cut otherwise; the argument, the evidence and the checks stay open as the 2026-10-25 judgement set them. Header: "Reading: 32 min, plus 6 in closed details." (`reading.json`). Pages quoting the old 29 minutes need `check_times.py --fix` by the lead.

Ledger: 349 units (core 283, depth 45, owned 8, volatile 5, fat 8). 20 added (the stages' and the animation's step lists and the two figure notes); unit 324 (the all-to-all diagram) rewritten for the stage; units 33, 241, 242, 243 and 245 re-keyed for reworded sentences; unit 59 (owned by Families and objectives) re-keyed to the owner's current wording ("their parallel heads; ours is the sequential"). `ledger.py check` problems 0.
