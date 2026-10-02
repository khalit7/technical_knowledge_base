# ViT (An Image is Worth 16x16 Words): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d811fa231cfcde6c1954d, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built with `html_utils/methods/papers.md`; the reusable pieces come from `../../attention_is_all_you_need_transformer/src/`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict, then Problem (patch-size predict question with a live explorer), Idea, Method (Eq. 1 to 4, the ViT against ResNet animation on one toy image), Inductive bias, Position embeddings (the toy model's learned similarity tiles, the no-position predict question), Training, Results (Table 2), Data scale (Table 5 predict question and chart, the toy data-scale experiment), Performance against compute, Inside the model (the toy attention-distance chart), Self-supervision, Why it matters, Connections, How much of this to believe. |
| Run a ViT | `t-run` | The trained toy ViT in the browser: random, composed or hand-drawn images, live prediction, attention rollout and every head's map (from the class token or a clicked patch), a test on fresh images, training curves of every run, the honesty checks. |
| The paper's tables, rebuilt | `t-tables` | Table 1 recount, Table 2 with gaps in points and in standard deviations, Table 5 explorer, Table 6 against compute with the compute-saving recount, Tables 7 and 8, and a "does not reproduce or does not agree" box. |
| Then and now | `t-then` | The 2020 token sequence changed one sourced step at a time (DeiT, MAE, CLIP and SigLIP, registers, NaViT, Qwen2-VL's 2D-RoPE, DiT), plus what survived and what changed. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **No "What it takes to use this"**: the method is the standard vision backbone; "Then and now" covers what changed instead (as papers.md says for classics).
- **The toy reproduces the paper's data-scale experiment, not only the architecture.** The paper's real claim is about data, so the live ingredient trains the ViT and a ResNet of the same size and cost on 500 to 64,000 images with the paper's §4.3 protocol (same hyperparameters for every size, early stopping). One seed per point to stay near the CPU budget on a shared machine; the page says so.
- **Two models shipped, not three.** The no-position-embedding ablation was trained, but it is reported by its measured accuracy only, to keep the page under 300 KB.
- **Reading tab about 20 minutes** against the old page's 8: the page owns every detail of the paper plus the new evidence section. The Training list and the scaling-study details are already condensed; more could fold into details blocks if Khalid prefers.

## Files

- `build.sh` (from the reference; HTML and JS lists edited, plus a check that every `ax:` link and margin label names an anchor that exists in the arXiv HTML, from `inputs/anchors.txt`). Runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, `mk_runs.py`.
- `mk_tables.py`: parses `inputs/table_*.txt` into `tables.json` (no hand transcription). `recompute.py`: Table 1 recount, sequence lengths, Table 6 exaFLOPs by formula, Table 2 ratios and gaps in sd, the 2 to 4× compute saving read off Table 6, Table 5 against Tables 6 and 2, Large minus Base, the self-supervision arithmetic, Tables 7 and 8; writes `inputs/recompute.json`.
- `paper.json`, `mk_paper.py` (from the reference, plus the verdict line, a configurable run link and appendix anchor labels).
- Toy model: `parts/21_js_gen.js` is the image generator, used by the page and, through `gen_data.js` (node), to write the training data, so drawn images are exactly the training distribution. `train.py` (ViT per Eq. 1 to 4, BiT-style ResNet, sweep, export), `check_forward.py` (JS forward pass against PyTorch), `mk_runs.py` (logs to `parts/_gen_runs.js`). `model/runs/*.json` are the logs; `model/*_q.pt` the shipped quantised checkpoints; `model/report.json`, `model/check_forward.json`.
  - `node gen_data.js $DATA 64000`, then `DATA=$DATA uv run --with torch --with numpy python train.py sweep` (about 2.5 minutes per run on a laptop CPU when it is not shared; torch is never added to pyproject.toml), `... train.py export`, `... check_forward.py`.
- `check_page.mjs` (from the reference, adapted: canvas drawing, the patch query, the fresh-image test, the `vx` and `tn` animations). `mk_coverage.py` writes `coverage.json`.
- `inputs/`: `paper_v2.txt` and `table_*.txt` (extracted by `extract_paper.py` from the arXiv HTML v2), `anchors.txt`, `later_abstracts.txt` (arXiv API abstracts of the later papers cited), `modern_extracts.txt` (lines quoted from LLaVA, Qwen-VL, InternVL, Qwen2-VL, ALIGN, ViViT, AST), `recompute.json`.
- `viz_ideas.md`: the visualisations chosen and rejected, with ids P-vit.k.

## Parts

HTML: `00_top`, `01_css` (reference), `01b_css` (this page's additions), `02_header`, `03a/b/c_paper`, `04_run`, `05_tables`, `06_then`, generated `_gen_card`, `_gen_more`.
JS: `10_js_common`, `_gen_data`, `_gen_runs`, `11_js_ui` (reference: `fit`, `makeAnim`, predict widget, `legend`), `20_model_data` (generated weights), `21_js_gen` (generator), `22_js_vit` (forward pass, rollout, attention distance, position similarity), `12_js_vitui` (image, heat map, bars, line chart helpers), `13_js_read`, `23_js_run`, `24_js_tables`, `25_js_then`, `90_js_tabs`.

## Toy results (seed 0, 5,000 held-out images)

| Training images | 500 | 2,000 | 8,000 | 64,000 |
|---|---|---|---|---|
| ViT (53,221 parameters, 3.12M multiply-adds) | 75.8% | 90.1% | 97.3% | 98.7% |
| ResNet, BiT-style (56,005, 3.40M) | 85.2% | 97.9% | 99.9% | 100.0% |

ViT without position embeddings, 64,000 images: 99.2%. The direction of §4.3 reproduces (the ResNet's advantage shrinks from 9.4 to 1.3 points as data grows); the crossover does not, and the learned position embeddings show almost no grid (grid score 0.09; their norm barely moved from initialisation, `model/pos_check.json`). The page says both. Training: 40 minutes of wall clock in all, one run slowed to 19 minutes by other agents' load.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 280 KB. `node .../src/check_page.mjs`: 314 actions, 0 problems (both themes and widths, every control, both animations stepped, the fresh-image test). `check_forward.py`: PASS (300/300 same answers per model, logits within 2.2e-5, attention within 6e-7). `mk_coverage.py`: 65 of 65 items verified. `node .../src/shot_frames.mjs` writes paused mid-animation frames to `../.shots/f-*.png`.
