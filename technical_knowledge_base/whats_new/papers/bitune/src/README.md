# Bitune: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3ce5c17b0d0d8173af14ed0caa19d6db, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the reference folder's shared pieces (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `90_js_tabs`, `mk_paper.py` with the verdict line, `check_page.mjs`, `mk_coverage.py` with this paper's own item list).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; the core sentence and the hero (the paper's Figure 1), You need and new terms; Problem (mask explorer on the paper's own template, predict question on what the answer token sees); Idea (prefill animation: one causal pass against Bitune's two passes and mix, live on the toy); Method (Eqs. 1 to 8, α(θ) explorer, which weights are separate, training, ":" moved, fp32 mixing, multi-turn); Experiments; Results (gains with noise); Ablations (predict question; Table 5 beside the toy); Cost (predict question, cost calculator, prefix caching and adapter merging); The toy (predict question); How much to believe; What it takes; Why it matters; Connections. |
| Run Bitune | `t-run` | The live ingredient: a 41,472-parameter causal decoder pretrained on a toy world, instruction-tuned with LoRA, LoRA at twice the rank, Naive Bidir., No Mixing, Only Causal, Shared Weights, an anti-causal second pass, Bitune and a question-first control, 3 seeds each; shipped seed-0 models (6-bit) run in the browser: ask, attention maps of every pass, learned α, results, curves, in-browser test. |
| The paper's tables, rebuilt | `t-tables` | Table explorer (12 tables, seed spreads and differences in standard errors), Table 1 gains with error bars, checks on the text, Figures 2 and 3 decoded from vector SVG, cost tables (with v1's dropped inference table), the A.13 GSM8K samples graded. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **No "Then and now" tab.** Bitune is a 2024 method that has not become a standard; the prefix-LM history and the encoder-repurposing line it belongs to fit in "Why it matters".
- **Live ingredient: a trained toy (the architecture row), although Bitune is a method on top of a model.** The method is a change to how a pretrained decoder reads its prompt, so it can only be shown by running one; there are no traces to replay. The toy is built to have something for the mechanism to act on: the pretrained model knows each fact only when the club comes first, and the instruction template puts the club last. The page says so (the toy shows the mechanism, not the real-world size). A first design (pretraining on facts only) failed for a reason unrelated to the paper: no method, not even full-rank LoRA, learned to copy a name out of the list. It was replaced before any result was used; its logs are in `model/design1/` (LoRA-page lesson).
- **The toy's learning rate protocol copies the paper's**: tuned for LoRA alone (1e-3, 3e-3, 1e-2), reused for every method.
- **Tables tab renamed and widened** to "tables and figures": Figures 2 and 3 are vector SVGs and decoding them gave two facts the paper does not state (α starts at 0.5; the default run ends at α ≈ 0.32, and the axis label "%" is wrong).

## Files

- `save_live.py` (Notion fetch from the session transcript into `live.md`), `extract_paper.py` (arXiv HTML v1 and v2 to `inputs/paper_v*.txt` and `inputs/anchors_v*.txt`), `extract_tables.py` (every table, cell by cell, to `inputs/tables_raw.json`), `mk_tables.py` (to `tables.json`), `svgparse.py` (copied from the InstructGPT page) and `decode_figs.py` (Figures 2 and 3 to `inputs/figs.json`).
- `recompute.py`: every derived number (averages, gains against each baseline, the text's claims, standard errors, ablation gaps, cost ratios, Eq. 8 slopes, the graded GSM8K samples) to `inputs/recompute.json`.
- Toy: `train.py` (`pretrain`, `lr`, `finetune`, `export`), `check_forward.py` (the JS forward pass in node against PyTorch on identical 6-bit weights), `overlap.py` (test prompts in the training streams, prompt-space size), `mk_toydata.py` (`parts/_gen_toy.js`). `model/` (544 KB) holds the pretrained weights, the seed-0 adapters of the five shipped methods (what `export` needs), `results.json` (every seed of every method), logs, `check_forward.json`, `overlap.json`, the pilot log and the failed first design's logs. The other seeds' adapters are not kept (rerun `finetune` after removing their keys from `results.json`); `export` regenerates the float64 dequantised `q_*.pt` that `check_forward.py` loads (git-ignored, 2 MB).
  - `uv run --with torch --with numpy python train.py pretrain` (about 4 minutes), `... train.py lr`, `... train.py finetune` (about 25 minutes for 27 runs on 2 threads), `... train.py export`, `... check_forward.py`, `... overlap.py`; then `sh build.sh`.
- `paper.json`, `tables.json`, `mk_paper.py` (card, Further reading, `parts/_gen_data.js`).
- `inputs/`: paper text v1 and v2, anchors, raw tables, `figs.json`, `gsm8k_samples.json` (A.13 graded), `acl_meta.txt`, `repo_README.md`, `repo_code_extract.txt` (`passes.py` and `PassScale`; the repository has no licence, so only these short extracts are kept as evidence), `repo_api.json`, `later_extracts.txt` (abstracts of LLM2Vec, NV-Embed, Encoder-Decoder Gemma, echo embeddings, UniLM, T5).
- Parts: `03_paper`, `04_run`, `05_tables`, `13_js_read` (mask, α, cost, small charts), `20_model_data` (generated weights), `22_js_model` (forward pass), `23_js_run`, `24_js_tables`, `26_js_pf` (the prefill animation).
- `check_page.mjs` (node, from the repo root): every control in both themes and widths, the animation stepped, the in-browser test run; since 2026-10-25 it also fails if the prefill animation moves before a click, and opens every closed block. `label_ledger.py`: labels `ledger.json` (see below). `reading.json`: the header's reading time, measured with `html_utils/audit_pages.mjs` and written by hand. `mk_coverage.py`: `coverage.json`.

## Checks

See the bottom of this file after the last build.

Checks (3 October 2026): `checkpage.sh` fail=0, emdash 0, errbox 1, clipped 0, 4 tabs, 307,872 bytes (just over the 300 KB guide of the time (retired 2026-10-17): 122 KB of it is the five shipped 6-bit toy models). `check_page.mjs`: 308 actions, 0 problems (every control in light 920 and dark 390, the prefill animation stepped in both modes, the in-browser test run for Bitune and LoRA). `check_forward.py`: PASS, 200 of 200 identical answers per shipped model, logits within 6.3e-14, mixed K/V within 1.8e-14, attention within 4.2e-15 (float64 on identical dequantised weights). `mk_coverage.py`: 36 of 36. Every arXiv anchor the page links exists in the v2 HTML. Reading time of The paper tab: 19 minutes (the old page read in about 4; the paper page owns every detail, the evidence judgement and the toy).

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence (two prefills, the bidirectional one with its own adapter, mixed per block, causal generation; +0.1 to +4.0 over LoRA on five 2B to 8B models for about 3 times the finetuning time) and the hero, the paper's own Figure 1 (CC BY 4.0, `img/bitune_fig1_overview.webp`, credited in `img/CREDITS.md`) with a caption saying what to notice; then "You need" (masks and the prefix LM, the KV cache, LoRA, each with its owner) and the new terms. The byline moved into a closed block.
- **Owned elsewhere, linked with this paper's sentence kept**: masks, encoder families and the prefix LM (Families and objectives); why a KV cache exists (The transformer from zero); LoRA and adapter merging (PEFT); prefix caching (Batching, KV cache and scheduling in depth).
- **Closed**: §2's two phases in full; the BERT and embedding-model evidence for the weakness; the five-step list of the method (the hero carries it); implementation details (which weights are separate, training, the moved ":", fp32 mixing, multi-turn); the training recipe; the prefix-LM lineage; two minor evidence points (slips in the text, the showcased GSM8K sample).
- **Volatile**: the repository's state and the absence of documented frontier use moved into one dated closed block, "Since the paper (sources read 3 October 2026)".
- **No autoplay**: `makeAnim` in `11_js_ui.js` no longer starts when scrolled into view or when the mode changes; `90_js_tabs.js` replaced by the template `99_js_tabs.js` (storage key `bitune-tab`, keeps `data-to` scrolling). The page has no `21_js_rd_common.js`; its own controller was fixed by hand.
- **Takeaway softened** (`paper.json`, hence `_gen_card.html`, and the Takeaway line in `live.md`): "the causal mask is required by generation, not by prompt processing" became "needed for generation but not, in principle, for reading a prompt that is already complete" (Naive Bidir. shows the pretrained model does depend on it); the gains are scoped to five 2B to 8B models on a 5-task zero-shot average, largest on the smallest model; live.md's "consistent gains" and "roughly double prompt-processing compute" now give the range and the measured 9.3x prefill time. The Notion property itself is unchanged (Khalid's).
- **Privacy**: author email addresses in `inputs/paper_v1.txt` and `inputs/paper_v2.txt` replaced with "[email removed]"; one em-dash in `paper_v2.txt` replaced with "--".
- Header: "Reading: 20 min, plus 4 in closed details."

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 21.0 min (4,821 words) | 19.6 min (4,513) |
| The paper, closed | 0 | 4.0 min (920) |
| Run Bitune | 4.1 min | unchanged |
| The paper's tables, rebuilt | 6.9 min | unchanged |
| Further reading | 1.9 min | unchanged |

Why about 20 minutes is right: the paper is short, but this page owns its whole argument plus an unusually strong evidence section (seed spreads, standard errors, the parameter-matched baseline, the cost outside Table 4's case) and a toy that shows when the mechanism should matter. The added top (about 2 minutes) was paid for by closing background the owner pages teach, implementation detail and the lineage. Cutting further would drop results, the ablation gaps or the cost caveat, not repetition.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
232 units: core 192, depth 32, owned 4, volatile 2, fat 2. 224 drafted by `ledger.py init` from the page before the pass; 8 added (core sentence, hero, terms, the two-weights sentence, four owner links). Fat: the "This is a known weakness" wind-up and the old animation-manners line. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 4, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 310 actions, 0 problems (including no movement before a click and every closed block opened). `mk_coverage.py`: 36 of 36 (three keys updated for the rewording and the softened takeaway). Page 315,611 bytes (122 KB of it the toy's weights).
