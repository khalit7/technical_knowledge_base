# BERT: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81e5ad9bd09cbf18ad7c, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built on the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`) from the Attention Is All You Need reference folder.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (with the verdict line), the idea in one sentence, new terms, then At a glance (the 3D hero, Figure 1), Problem, Idea (the 3D leak stage in three modes, a predict question run on the toy models), Model and input (sizes recounted, Figure 2 as a 3D stage with the toy's vectors), Masked LM (masking demo and tally), Next sentence prediction (3D stage through [CLS]), Pretraining setup, Fine-tuning (predict: the left-to-right tagger on right-cue names), Results (with the results chart), Ablations (predict: NSP or direction; Figure 5 decoded), How much of this to believe (ending in the verdict), Why it matters, Connections. |
| Run a toy BERT | `t-run` | The live ingredient: a trained toy BERT and its left-to-right twin in plain JS; build a sentence, hide a word, tag names, see attention; fine-tuning accuracy by labelled-set size, toy Figure 5, training curves, an in-browser test, and how far to trust the toy. |
| The paper's tables, rebuilt | `t-tables` | Tables 1 to 8 sortable with derived deltas, parameters recounted, Figure 5's decoded points. |
| Then and now | `t-then` | BERT-Base to ModernBERT-base, one sourced change at a time (2D stepper with its step list on the left), recounted at every step (lands on 149M); what changed and what survived. |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from papers.md.** "What it takes to use this" is skipped: the method is standard and Then and now covers what a builder uses today. The toy model is an encoder, not the reference's encoder-decoder, and its task (a made-up English where eight names are a person or a place depending on a cue before or after them) was designed before training so that right-side context would separate the two directions; the NSP ablation was not tuned to reproduce. Because the fine-tuning seeds all share one pretrained model, the NSP ablation was repeated with a second pretraining seed (`train.py seed2`, `model/seed2.json`) before the page says anything about it. Reading time after the 2026-10-24 rebuild: see Length judgement below.

## Files

- `build.sh`: runs `recompute.py`, `mk_paper.py`, `mk_results.py`, assembles `parts/`, expands the link macros, fails on an unexpanded macro or an em-dash.
- `paper.json`: metadata, headline numbers, verdict, resources, connected KB papers and topics. `mk_paper.py`: card, Further reading and `window.PAPER`. `tables.json`: Tables 1 to 8 as printed, plus Figure 5's SVG coordinates.
- `recompute.py`: every derived number (GLUE averages, gains, parameter recounts from `inputs/hf_configs.json`, pretraining arithmetic, Table 5 effects, Figure 5 decoded, binomial standard errors of the Table 1, 5 and 8 gaps from `inputs/glue_sizes.json`). Writes `inputs/recompute.json`.
- `grammar.py`: the toy language (copied in `parts/21_js_lang.js`). `train.py`: `pretrain` (bert, nonsp, ltr; checkpoints in `model/`), `finetune` (the sweep: 5 variants, 2 tasks, 4 labelled-set sizes, 3 seeds, learning rate picked on dev; toy Figure 5), `seed2` (bert and nonsp pretrained again with seed 8 and fine-tuned at 128 and 512 labels on both tasks), `export` (6-bit weights into `parts/20_model_data.js`, quantised accuracy in `model/report.json`). Run with `uv run --with torch --with numpy python train.py <cmd>` in the background; 2 threads.
- `check_forward.py`: the JS forward pass against PyTorch on the shipped weights (`model/check_forward.json`). `overlap.py`: test-set overlap with pretraining and labels (`model/overlap.json`). `mk_results.py`: fine-tuning and seed2 results into `parts/_gen_results.js`.
- `save_live.py` copied the Notion fetch verbatim into `live.md`; `extract_paper.py` turned the arXiv HTML v2 into `inputs/paper_v2.txt` and `inputs/table_*.txt`; `inputs/later_extracts.txt` holds the quoted lines from RoBERTa, ModernBERT and Ettin.
- `check_page.mjs` (from the repo root with node): every control in light 920 and dark 390, the Then and now stepper playing on view and stepped, text at least 11 px, no NaN or errors, no sideways scroll. `check_stages.mjs`: the 2026-11-06 layout and motion checks (below).
- Layout and motion parts: `02_split.html`, `25_js_s3.js` (renderer v2), `99_js_tabs.js` (storage key `bert-tab`) and `05z_errbox.js.html` are the skill's templates, unchanged; `11_js_ui.js`'s `makeAnim` is the paper pages' autoplaying controller (as on Agora). Scenes: `31_js_sc_hero.js`, `32_js_sc_mlm.js`, `33_js_sc_emb.js`, `34_js_sc_nsp.js`; `12_js_hero.js` now holds only the Results chart. `mk_coverage.py`: writes and verifies `coverage.json` against `live.md`.

## The toy, measured

- NSP ablation over two pretraining seeds (`model/seed2.json`): BERT beats No NSP in all 8 comparisons (2 seeds, 2 tasks, 128 and 512 labels), by 1.8 to 12.1 points, and BERT's own tagging accuracy at 128 labels moves from 95.5% to 91.8% between seeds. The gain comes from the toy's data (an IsNext pair shares one name in one role, so NSP teaches the PER/LOC label), and the page says it says nothing about NSP on real text.
- 18,668 parameters per pretrained model (L=2, H=24, A=4, feed-forward 96), 20,000 steps of batch 128, about 8 minutes each on 2 threads.
- JS against PyTorch: same argmax on 200/200 inputs per model; logits within 1e-5, attention within 6e-7.
- Quantisation (6-bit matrices, float16 vectors) changes held-out masked-word accuracy from 66.1% to 66.3% and the tagger from 94.4% to 94.3%.
- The grammar has 10,740 distinct sentences and pretraining saw all of them as unlabelled text; 6.45% of the test sentences are in the 128 labelled ones. Half of every cue list is held out of the labels, which is what the "held out" test subsets measure.

## The 2026-10-24 rebuild (teaching contract, light pass for papers)

- **Top**: the core idea in one sentence under the headline card (which already carried the verdict), then a new hero figure (`12_js_hero.js`): one encoder pretrained with the masked LM and NSP, then copied and fine-tuned per task with one output layer, after the paper's Figure 1 (redrawn; the arXiv paper is not CC BY, so no image of the original). A short "New terms" line.
- **A visual beside every core claim**: Results had none; it now has a static chart of the previous best against BERT-Large on the five headline benchmarks (numbers from §4.1 and Tables 2, 3, 4, 7, as the prose quotes them). The other visuals (leak animation, Figure 2 with real vectors, masking widget, Figure 5 decoded, the predict reveals) are unchanged.
- **No autoplay**: `11_js_ui.js` is the reference folder's fixed copy (the Transformer page, same date): `makeAnim` no longer starts on scroll or on a mode switch and opens each step fully drawn; `placeLabels` keeps fallback labels inside the chart. `check_page.mjs` fails if `sx` or `thx` draws a frame in 1.5 s on screen before any click.
- **Closed blocks** (depth, not lost): how the parameters were recounted; Whole Word Masking; earlier sentence objectives; how many tokens the run really saw; the four differences from GPT with numbers (one sentence stays open); every task's output layer and settings (the SQuAD formula stays open); fine-tuning hyperparameters (A.3); why not ELMo-style concatenation; model size against earlier work; the arithmetic behind "what holds up"; three smaller evidence points; the encoder lineage as of 2 October 2026 (ModernBERT, Ettin), with a one-paragraph open summary that links the owners (embedding models, rerankers, families and objectives). Run tab: the training-log chart and "How far to trust the toy".
- **Moved, not cut**: ModernBERT's "noticeable overhead" quote on NSP now sits in the evidence section's NSP bullet, beside RoBERTa's finding (with "training on blocks of text from single documents").
- **Owners linked**: MLM against other objectives at Families and objectives; descendants (ELECTRA and others) at Families and objectives; BEiT and MAE at Contrastive and self-supervised learning.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| The paper, core | 5,134 words, 22.3 min | 4,479 words, 19.5 min |
| The paper, closed details | 0 | 1,270 words, 5.5 min |
| Run a toy BERT | 1,581 core | 1,195 core + 392 closed |
| Tables, Then and now | 999, 477 | 999, 468 |
| Visuals drawn in The paper (audit count) | 3 | 5 (plus the predict reveals' charts) |

Why about 19 minutes is right: this page owns every detail of the paper and its evidence section, which the paper method requires and which carries the page's main finding (NSP did not hold up). What remains open is the argument in the paper's order: problem, the leak and the masked LM, the input, both pretraining tasks, the recipe, fine-tuning, results, the ablations that carry the claim, and the judged evidence. Provenance, recounts, appendix settings and dated follow-up work are closed.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
254 units: core 217, depth 30, owned 2 (descendants at Families and objectives, key "ELECTRA"; BEiT and MAE at Contrastive and self-supervised learning, key "BEiT"), fat 5 (the old reading-time crumb, tab names, section nav, a subheading replaced by its summary line, a motion-manners sentence). 247 drafted by `ledger.py init`, 7 added by hand for the new top, chart, owner links and the dated block. Keys were proposed by a script (a 4 to 7 word window of each unit found in the built page) and checked by hand where the prose changed.

## Checks (2026-10-24)
`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, 281 KB. `check_page.mjs`: 390 actions, 0 problems (with the no-autoplay check). `mk_coverage.py`: 56 of 56 (the reading-time needle now looks for "Reading: "). `ledger.py check`: problems 0. Model, weights and `check_forward.py` untouched.

## The 2026-11-12 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`): every section with a visual is text left, visual right (sticky); sections without one stay full width. The paper: At a glance (stage), Idea (stage; Problem stays full width before it), Model and input (stage), Masked LM (the masking widget right), Next sentence (stage), Results (the dumbbell chart right), and inside Ablations the Training steps paragraph beside decoded Figure 5. Pretraining setup, Fine-tuning, How much to believe, Why it matters and Connections have no visual and stay full width. Run a toy BERT: Build a sentence (controls and sentence left, the fill-in and tagger outputs right), What fine-tuning reaches (prose and the reading left, controls, chart and table right), Figure 5 at toy scale (chart right); the attention heatmap, the training logs, the browser test and the trust notes stay full width. Then and now: the stepper right, its generated step list left; the table full width. Tables and Further reading: full width.
- **Four 3D stages** (template `25_js_s3.js`, renderer v2, unchanged; one scene file each), all driven by the shipped toy weights through `BM` at load time:
  - `31_js_sc_hero.js`, Fig. 1: the pair "the big dog barked at the farmer" / "the dog barked again" with dog masked; the toy BERT's masked-LM top three at [MASK] and its NSP probability; flows for the masked position's layer-2 attention (heads averaged) and [CLS]'s; then two copies of the encoder slide back in depth and each gets one output layer (drawn, not run). It replaces the static SVG hero.
  - `32_js_sc_mlm.js`, Fig. 2, three modes with three step lists: the masked LM (toy BERT on the masked sentence), left to right (toy LTR), both ways with nothing hidden (toy BERT's weights on the unmasked sentence, labelled as such: no such model is trained). Line width and dot density are the real layer 1 and layer 2 weights, heads averaged; the last step shows the real top-four predictions. It replaces the 2D `sx` animation; its counters and captions became the step lists (live numbers in `mlP`, `ltP`, `ltTop`).
  - `33_js_sc_emb.js`, Fig. 3: the toy's token, segment and position tables as glass plates feeding shelves of 24 signed bars per token, and their sum, for "[CLS] austin smiled [SEP] i met austin [SEP]"; one scale set by the three parts. It replaces the 2D colour-strip Figure 2 (same vectors).
  - `34_js_sc_nsp.js`, Fig. 4: the same sentence A with its real next sentence and with "florence flooded today"; [CLS]'s layer-2 attention as flows, C, the pooler as a glass plate, the two-way softmax (live numbers in `nsP1`, `nsP2`).
- **Kept 2D**: the Results dumbbell, decoded Figure 5, the predict reveals' bars, the masking widget, every Run-tab widget (the attention heatmap reads best flat and is driven by the sentence builder), the Tables tab and the Then and now stepper (a block diagram with counters, nothing spatial).
- **Motion**: `makeAnim` (`11_js_ui.js`) is Agora's copy of the `RD.anim` rules: plays once half in view, pauses off screen, stops for good on any control or at the end, never under reduced motion, marks `data-playing`, binds an `ol.sx` list. `90_js_tabs.js` was replaced by the template `99_js_tabs.js`. `check_page.mjs` now asserts that the stepper plays on view instead of forbidding it. The template `21_js_rd_common.js` was not added: nothing on the page uses `RD.anim`.
- **Prose**: the old hero caption, the leak animation's caption and counters, and the Figure 2 caption were folded into the step lists. Nothing was cut.

## Length judgement (2026-11-12)
| | Before (audit 2026-11-12, pre-pass) | After |
|---|---|---|
| The paper, core | 4,479 words, 19.5 min | 5,410 words, 23.5 min |
| The paper, closed | 1,270 words, 5.5 min | 1,270, unchanged |
| Run a toy BERT | 1,195 core + 392 closed | unchanged |
| Tables; Then and now; Further reading | 999; 468; 399 | 999; 786; 399 |
| Visuals in The paper (audit) | 5 | 6 |

The growth is the step lists that explain the four stages and the stepper: the audit counts every mode's list, including the two hidden lists of the leak stage (about 250 words), so a single pass reads about 22 minutes. The header says 24 min (from `reading.json`, the audit's count). No knowledge was cut.

Ledger: 258 units (core 221, depth 30, owned 2, fat 5); 4 added for the stages, 4 rekeyed (24, 27, 29, 52) where a caption became a step; `ledger.py check` problems 0.

## Checks (12 November 2026)
`checkpage.sh`: tabs 5, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 396 actions, 0 problems. `check_stages.mjs`: 21 stages and animations (three widths; the leak stage in all three modes), 0 problems. `mk_coverage.py`: 56 of 56. `ledger.py check`: problems 0. Model, weights and `check_forward.py` untouched (not rerun).
