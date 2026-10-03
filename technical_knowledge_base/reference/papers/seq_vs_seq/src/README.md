# Seq vs Seq (Ettin): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81139cffea35080afe2b, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built on the paper-page method (`html_utils/methods/papers.md`) from the Attention Is All You Need reference folder, with the BERT page's shared parts.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (verdict line), then Problem, Idea (the four-objective animation `ox`), The suite (Table 1 with the parameter recount), Recipe (phase chart, ModernBERT differences, the 1B caveat), Cross-objective (MNTP, the LLM2Vec budget correction, predict question), Evaluation, Results 1 (each side against its peers), Results 2 (Figure 1 rebuilt, predict question on the size ratio, the Table 8 swap, Table 5), Gender bias (Figure 2 rebuilt), How much of this to believe, What it takes to use this, Why it matters, Connections. |
| Train the pairs (toy) | `t-run` | The live ingredient: a toy Ettin suite (three sizes, encoder and decoder per size trained identically, cross-objective training both ways at three budgets); generation animated two ways (`gx`); the toy Figure 1; the gap against the adaptation budget; a prompt composer; training curves; an in-browser test; how far to trust the toy. |
| The paper's tables, rebuilt | `t-tables` | A checks list, then Tables 3, 4, 9, 8 (with the SciQ/SIQA toggle), 5, 6, 7, 10, 2, 1 and 11 (recount), 12, all sortable. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md

- **No "Then and now" tab**: a 2025 result paper; its follow-ups (mmBERT, the concurrent MLM study) are a paragraph in Why it matters.
- **The live ingredient is a suite, not one model.** The BERT page already trains a bidirectional encoder against a left-to-right twin, so this page builds what is specific to Ettin: pairs trained identically at three sizes, conversion in both directions, and an encoder generating by filling masks. It also runs two budgets the paper could not afford (4 and 10 times its 2.5%).
- **Retrieval is left out of the toy** (a toy retriever would measure word overlap); the paper's retrieval numbers are on the Reading tab.
- **The Reading tab is long** (about 21 minutes against the old page's 8), because the page owns every detail of the paper and carries the evidence section with its corrections.

## Files

- `build.sh`: runs `recompute.py`, `mk_paper.py`, `mk_results.py`, assembles `parts/`, expands the link macros, fails on an unexpanded macro or an em-dash.
- `save_live.py` copied the Notion fetch verbatim into `live.md`. `extract_paper.py` turned the arXiv HTML (v2 and v1) into `inputs/paper_v*.txt` and `inputs/table_*.txt`; `mk_tables.py` turns those into `tables.json` (values as printed, no retyping).
- `decode_figs.py` (with `svgparse.py`, copied from the InstructGPT page) decodes the three figure SVGs in `inputs/figs/` into `inputs/figs.json`.
- `recompute.py`: parameter recount from `inputs/hf_configs.json`, table sums and averages, the Table 8/Table 4 column check, Figure 1 against Table 9, gaps and size ratios, noise bounds, Figure 2 counts, LLM2Vec's budget (`inputs/llm2vec_extract.txt`), the compute line. Writes `inputs/recompute.json`.
- `paper.json`: metadata, headline numbers, verdict, resources, connected KB pages; `mk_paper.py`: card, Further reading, `window.PAPER`.
- Toy suite: `grammar.py` (the toy world; `parts/21_js_lang.js` mirrors it), `train.py` (`pretrain`, `cross`, `evalgen`, `finetune`, `export`), `run_all.sh` (the whole pipeline, in order, in the background), `check_forward.py` (JS against PyTorch on the shipped weights), `overlap.py` (test prompts against the training stream), `mk_results.py` (`model/*.json` into `parts/_gen_results.js`). `model/` keeps the small size's float checkpoints (`s_*.pt`, which `export` reads), the shipped quantised ones (`ship_*_q.pt`, which `check_forward.py` loads) and every JSON result and log (about 700 KB). The middle and large checkpoints (4.3 MB) are left out; `run_all.sh` regenerates them. `build.sh` needs only the JSON files.
- `check_page.mjs` (from the repo root with node): every control in light 920 and dark 390, both animations stepped, text at least 11 px, no NaN or errors, no sideways scroll. `mk_coverage.py`: writes and verifies `coverage.json` against `live.md`.

## The toy, as built (measured; numbers from `model/*.json`)

- Three sizes (19k, 63k, 146k parameters; d 32/48/64, 2/3/4 layers), 8,000 steps of batch 128 each, encoder and decoder from identical initial weights and the same document stream. Cross-objective at 2.5% of pretraining for every size, plus 10% and 25% for the middle size only (the shared machine was heavily loaded; the whole pipeline took about 3 hours of wall time at 2 threads, above the brief's 40 minutes of CPU).
- Data efficiency: the held-out lookup probe passes 90% for the decoders by steps 1,500 / 500 / 500 and for the encoders never (small) / 4,000 / 4,000.
- Classification (2,048 labels, 3 fine-tuning seeds): encoders 51.3% (small, never learned the lookup) / 99.6% / 81.4% (seeds spread 70% to 89%); decoders at chance at every size, also with mean pooling, five times the steps and learning rates 1e-4 and 3e-4 (`model/cls_check.json`). Encoders-from-decoders at 2.5%: 68.6% / 90.4% / 98.5%; decoders-from-encoders at chance. Two departures from the paper: MNTP lifts the decoder far more than in the paper, and at the large size it beats the native encoder.
- Generation and choose saturate (98.5% to 100%) for every model that learned the lookup; the toy does not test the paper's generative gap.
- Shipped: the four small models (82 KB), because the middle ones would take the page to 470 KB. JS against PyTorch: identical greedy generations on 200 prompts, probabilities within 1e-6 (`model/check_forward.json`). Quantisation changes exact-match generation by at most 0.7 points.
- Test prompts: 14.1% have a fact list that also occurred in pretraining (two-fact lists repeat in a stream of a million documents); the lookup has to be done in context either way.
- A first design (facts written "ann has the red cup" and "ann has red cup") was abandoned before any result was used: the lookup emerged at unpredictable points or not at all, so which model "won" depended on luck; its log is `model/run1_abandoned.log`. Writing facts as "ann red cup" makes the lookup a one-token induction both objectives learn.
- `check_page.mjs` launches headless Chrome in 'shell' mode: in the new headless mode this tall page stopped producing animation frames on 3 October 2026 (the BERT page did too), which hung every check.
