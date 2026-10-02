# BERT: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81e5ad9bd09cbf18ad7c, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built on the paper-page method (`html_utils/methods/papers.md`) from the Attention Is All You Need reference folder.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (with the verdict line), then Problem, Idea (the leak animation in three modes, a predict question run on the toy models), Model and input (sizes recounted, Figure 2 redrawn with the toy's vectors), Masked LM (masking demo and tally), Next sentence prediction, Pretraining setup, Fine-tuning (predict: the left-to-right tagger on right-cue names), Results, Ablations (predict: NSP or direction; Figure 5 decoded), How much of this to believe (ending in the verdict), Why it matters, Connections. |
| Run a toy BERT | `t-run` | The live ingredient: a trained toy BERT and its left-to-right twin in plain JS; build a sentence, hide a word, tag names, see attention; fine-tuning accuracy by labelled-set size, toy Figure 5, training curves, an in-browser test, and how far to trust the toy. |
| The paper's tables, rebuilt | `t-tables` | Tables 1 to 8 sortable with derived deltas, parameters recounted, Figure 5's decoded points. |
| Then and now | `t-then` | BERT-Base to ModernBERT-base, one sourced change at a time, recounted at every step (lands on 149M); what changed and what survived. |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from papers.md.** "What it takes to use this" is skipped: the method is standard and Then and now covers what a builder uses today. The toy model is an encoder, not the reference's encoder-decoder, and its task (a made-up English where eight names are a person or a place depending on a cue before or after them) was designed before training so that right-side context would separate the two directions; the NSP ablation was not tuned to reproduce. Because the fine-tuning seeds all share one pretrained model, the NSP ablation was repeated with a second pretraining seed (`train.py seed2`, `model/seed2.json`) before the page says anything about it. The Reading tab is 22 minutes against the old page's 9, because the paper page owns every detail of the paper and now carries the evidence section; the training details could fold into a details block if Khalid prefers shorter.

## Files

- `build.sh`: runs `recompute.py`, `mk_paper.py`, `mk_results.py`, assembles `parts/`, expands the link macros, fails on an unexpanded macro or an em-dash.
- `paper.json`: metadata, headline numbers, verdict, resources, connected KB papers and topics. `mk_paper.py`: card, Further reading and `window.PAPER`. `tables.json`: Tables 1 to 8 as printed, plus Figure 5's SVG coordinates.
- `recompute.py`: every derived number (GLUE averages, gains, parameter recounts from `inputs/hf_configs.json`, pretraining arithmetic, Table 5 effects, Figure 5 decoded, binomial standard errors of the Table 1, 5 and 8 gaps from `inputs/glue_sizes.json`). Writes `inputs/recompute.json`.
- `grammar.py`: the toy language (copied in `parts/21_js_lang.js`). `train.py`: `pretrain` (bert, nonsp, ltr; checkpoints in `model/`), `finetune` (the sweep: 5 variants, 2 tasks, 4 labelled-set sizes, 3 seeds, learning rate picked on dev; toy Figure 5), `seed2` (bert and nonsp pretrained again with seed 8 and fine-tuned at 128 and 512 labels on both tasks), `export` (6-bit weights into `parts/20_model_data.js`, quantised accuracy in `model/report.json`). Run with `uv run --with torch --with numpy python train.py <cmd>` in the background; 2 threads.
- `check_forward.py`: the JS forward pass against PyTorch on the shipped weights (`model/check_forward.json`). `overlap.py`: test-set overlap with pretraining and labels (`model/overlap.json`). `mk_results.py`: fine-tuning and seed2 results into `parts/_gen_results.js`.
- `save_live.py` copied the Notion fetch verbatim into `live.md`; `extract_paper.py` turned the arXiv HTML v2 into `inputs/paper_v2.txt` and `inputs/table_*.txt`; `inputs/later_extracts.txt` holds the quoted lines from RoBERTa, ModernBERT and Ettin.
- `check_page.mjs` (from the repo root with node): every control in light 920 and dark 390, animations stepped, text at least 11 px, no NaN or errors, no sideways scroll. `mk_coverage.py`: writes and verifies `coverage.json` against `live.md`.

## The toy, measured

- NSP ablation over two pretraining seeds (`model/seed2.json`): BERT beats No NSP in all 8 comparisons (2 seeds, 2 tasks, 128 and 512 labels), by 1.8 to 12.1 points, and BERT's own tagging accuracy at 128 labels moves from 95.5% to 91.8% between seeds. The gain comes from the toy's data (an IsNext pair shares one name in one role, so NSP teaches the PER/LOC label), and the page says it says nothing about NSP on real text.
- 18,668 parameters per pretrained model (L=2, H=24, A=4, feed-forward 96), 20,000 steps of batch 128, about 8 minutes each on 2 threads.
- JS against PyTorch: same argmax on 200/200 inputs per model; logits within 1e-5, attention within 6e-7.
- Quantisation (6-bit matrices, float16 vectors) changes held-out masked-word accuracy from 66.1% to 66.3% and the tagger from 94.4% to 94.3%.
- The grammar has 10,740 distinct sentences and pretraining saw all of them as unlabelled text; 6.45% of the test sentences are in the 128 labelled ones. Half of every cue list is held out of the labels, which is what the "held out" test subsets measure.
