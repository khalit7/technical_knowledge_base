# ViT (An Image is Worth 16x16 Words): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d811fa231cfcde6c1954d, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built with `.claude/skills/explainer-page/page-kinds/paper.md`; the reusable pieces come from `../../attention_is_all_you_need_transformer/src/`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict, the idea in one sentence, the hero (`14_js_hero.js`), You need and New terms, then Problem (patch-size predict question with a live explorer), Idea, Method (Eq. 1 to 4, the ViT against ResNet animation on one toy image), Inductive bias, Position embeddings (the toy model's learned similarity tiles, the no-position predict question), Training (summary open, setup closed), Results (Table 2, with the results chart), Data scale (Table 5 predict question and chart, the toy data-scale experiment), Performance against compute (Figure 5 from Table 6, moved here from the tables tab), Inside the model (the toy attention-distance chart), Self-supervision, Why it matters, Connections, How much of this to believe. |
| Run a ViT | `t-run` | The trained toy ViT in the browser: random, composed or hand-drawn images, live prediction, attention rollout and every head's map (from the class token or a clicked patch), a test on fresh images, training curves of every run, the honesty checks. |
| The paper's tables, rebuilt | `t-tables` | Table 1 recount, Table 2 with gaps in points and in standard deviations, Table 5 explorer, Tables 7 and 8 (Table 6 is drawn in The paper), and a "does not reproduce or does not agree" box. |
| Then and now | `t-then` | The 2020 token sequence changed one sourced step at a time (DeiT, MAE, CLIP and SigLIP, registers, NaViT, Qwen2-VL's 2D-RoPE, DiT), plus what survived and what changed. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **No "What it takes to use this"**: the method is the standard vision backbone; "Then and now" covers what changed instead (as papers.md says for classics).
- **The toy reproduces the paper's data-scale experiment, not only the architecture.** The paper's real claim is about data, so the live ingredient trains the ViT and a ResNet of the same size and cost on 500 to 64,000 images with the paper's §4.3 protocol (same hyperparameters for every size, early stopping). One seed per point to stay near the CPU budget on a shared machine; the page says so.
- **Two models shipped, not three.** The no-position-embedding ablation was trained, but it is reported by its measured accuracy only, to keep the page under 300 KB.
- **Reading tab about 20 minutes** against the old Notion page's 8: the page owns every detail of the paper plus the evidence section; see the length judgement below.

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
JS: `10_js_common`, `_gen_data`, `_gen_runs`, `11_js_ui` (reference: `fit`, `makeAnim`, predict widget, `legend`), `20_model_data` (generated weights), `21_js_gen` (generator), `22_js_vit` (forward pass, rollout, attention distance, position similarity), `12_js_vitui` (image, heat map, bars, line chart helpers), `14_js_hero` (hero and results chart), `13_js_read`, `23_js_run`, `24_js_tables`, `25_js_then`, `90_js_tabs`.

## Toy results (seed 0, 5,000 held-out images)

| Training images | 500 | 2,000 | 8,000 | 64,000 |
|---|---|---|---|---|
| ViT (53,221 parameters, 3.12M multiply-adds) | 75.8% | 90.1% | 97.3% | 98.7% |
| ResNet, BiT-style (56,005, 3.40M) | 85.2% | 97.9% | 99.9% | 100.0% |

ViT without position embeddings, 64,000 images: 99.2%. The direction of §4.3 reproduces (the ResNet's advantage shrinks from 9.4 to 1.3 points as data grows); the crossover does not, and the learned position embeddings show almost no grid (grid score 0.09; their norm barely moved from initialisation, `model/pos_check.json`). The page says both. Training: 40 minutes of wall clock in all, one run slowed to 19 minutes by other agents' load.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 280 KB. `node .../src/check_page.mjs`: 314 actions, 0 problems (both themes and widths, every control, both animations stepped, the fresh-image test). `check_forward.py`: PASS (300/300 same answers per model, logits within 2.2e-5, attention within 6e-7). `mk_coverage.py`: 65 of 65 items verified. `node .../src/shot_frames.mjs` writes paused mid-animation frames to `../.shots/f-*.png`.

## The 2026-10-24 rebuild (teaching contract, light pass for papers)

- **Top**: the core idea in one sentence under the headline card (which already carried the verdict); a new hero (`14_js_hero.js`), the paper's Figure 1 redrawn on this page's toy image with patches cropped from it and the toy model's real prediction, with ViT-B/16's shapes in the caption (the arXiv licence is non-exclusive, not CC BY, so no copy of the original figure; no photo either: nothing physical to show); "You need" (the Transformer from zero) and "New terms".
- **A visual beside every core claim**: Results had none; it now has a chart of ViT-H/14 and ViT-L/16 minus BiT-L on the seven Table 2 benchmarks plus the compute bars, drawn from `PAPER.tables.t2`. Table 6 / Figure 5 moved from the tables tab into Performance against compute (same code, now drawn when The paper opens); the tables tab links to it.
- **No autoplay**: `11_js_ui.js` is the reference folder's fixed copy (the Transformer page): `makeAnim` no longer starts on scroll or on a mode switch. `check_page.mjs` fails if `vx` or `tn` draws a frame in 1.5 s on screen before any click. The page keeps its own `90_js_tabs.js` (it has no autoplay and no storage key) instead of the templates' `99_js_tabs.js`, and its own `makeAnim` instead of `RD.anim`.
- **Closed blocks** (depth, not lost): the full training setup (an open one-sentence summary stays); the appendix note on which head is replaced; VTAB by group and ObjectNet; which dimension to scale and TPU speed; how the compute saving and exaFLOPs column are computed; other masked-prediction targets; the paper's small inconsistencies; the follow-up details as checked on 2 October 2026 (ALIGN, Qwen-VL, InternVL, DINOv2, SD3, Sora, Flux, ViViT, AST). Run tab: how the toy was built and the honesty checks.
- **Owners linked**: Why it matters now gives one or two sentences per line of work and links Vision encoders (towers, position-table resizing), Contrastive and self-supervised learning (BEiT, MAE, DINO) and Latent diffusion and diffusion transformers (DiT); the MSA line links Attention variants.
- Header: "Reading: N min, plus M in closed details." from `reading.json` (the rendered-DOM count of `html_utils/audit_pages.mjs`); `build.sh` counts closed `<details>` apart when it is absent.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| The paper, core | 4,611 words, 20.0 min | 4,714 words, 20.5 min |
| The paper, closed details | 0 | 609 words, 2.6 min |
| Run a ViT | 618 core | 321 core + 300 closed |
| Tables, Then and now, Further reading | 843, 235, 399 | 705, 235, 399 |
| Visuals in The paper (audit count) | 4 | 7 |

Why about 20 minutes is right: the paper page owns every detail of the paper and its evidence section, and the light pass keeps the structure. The new top (core sentence, hero, terms, about 1.3 minutes) and the results chart caption replaced what the folds removed (about 2.6 minutes of setup, appendix and dated follow-up detail). What stays open is the argument in the paper's order: problem, idea, Eq. 1 to 4, inductive bias, positions, results, the data-scale experiment that is the real contribution, compute, what the model learns, and the judged evidence.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
247 units: core 214, depth 25, owned 4 (position-table resizing at Vision encoders, key "bicubically"; BEiT and MAE at Contrastive and self-supervised learning, "beit 2021, mae 2021"; DiT conditioning at Latent diffusion and DiTs, "adaln-zero conditioning"; MHA at Attention variants), fat 4 (the old reading-time crumb, the tab names, the old reduced-motion sentence, a bullet heading replaced). 237 drafted by `ledger.py init`, 10 added by hand for the new top, charts, the dated block and the owner links. Keys were proposed by a script (a 4 to 6 word window of each unit found in the built page; depth when found only inside closed blocks) and checked by hand where the prose changed.

## Checks (2026-10-24)
`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, 292 KB. `check_page.mjs`: 314 actions, 0 problems (with the no-autoplay check). `mk_coverage.py`: 65 of 65 (needles updated for the reading-time line, ALIGN and the fine-tuning trick wording). `ledger.py check`: problems 0. Model, weights and `check_forward.py` untouched.
