# CLIP (Learning Transferable Visual Models From Natural Language Supervision): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d8194a85dfc5f3bf3f799, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built with `html_utils/methods/papers.md`; the reusable pieces come from `../../attention_is_all_you_need_transformer/src/` by way of `../../vit/src/`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict; Problem, Idea, Data (WIT), Objective (predict question with the toy Figure 2 runs, the write-the-caption against pick-the-pair animation, Figure 3 transcribed and linked to a live eight-pair batch with a temperature slider), Encoders and training, Zero-shot (supervised head against zero-shot classifier animation, Table 1), Prompts (with the toy's honest result), How good (Figure 5 recomputed, predict question on Figure 7, Figures 8 and 9), Linear probes, Robustness (predict question on Figure 13, the toy robustness test), Humans, overlap and bias (details), Limitations, Why it matters, Connections, How much of this to believe, What it takes to use this. |
| Run a tiny CLIP | `t-run` | The trained toy CLIP in the browser: classify any image against any classes written in words (seven class sets, four prompt modes, a word-shuffle test), a fresh-image test, text search, the few-shot probe chart, every run's curves, the honesty notes. |
| The paper's tables, rebuilt | `t-tables` | Table 1; any two of Tables 10 and 11's 75 rows dataset by dataset; Figure 8 recomputed per CLIP model; Figure 10's averages; Table 16 with the ObjectNet reconciliation; Tables 2, 8, 12, 13, 14, 17; Tables 18 to 20 with the text-encoder recount; a "does not reproduce or does not agree" box. |
| Then and now | `t-then` | The recipe card changed one paper at a time (ALIGN, LiT, CoCa, OpenCLIP, SigLIP, DataComp, MetaCLIP, DFN, SigLIP 2) with each reported zero-shot ImageNet number, and softmax against sigmoid on one toy batch. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Both "What it takes to use this" and "Then and now".** CLIP is a 2021 classic whose recipe became standard, but people still adopt its checkpoints and the open re-implementation, so both apply.
- **The live ingredient is a training-objective toy, not only an architecture toy.** The paper's argument is about the objective (Figure 2) and what zero-shot transfer buys, so the toy trains four objectives with one image encoder, plus a supervised baseline and a photos-only CLIP for the robustness question; the shipped model is the Transformer-text CLIP. One seed per run; the page says so.
- **Two results do not reproduce, and are shown as such**: Figure 2's 4× (bag-of-words prediction is about as efficient as contrastive here) and prompt engineering's gains (none in the toy). The task was not retuned to make them appear.
- **Reading tab about 22 minutes, plus 7 in closed details**, against the old page's 11. The paper is 48 pages and the page owns all of it; secondary material (training details, per-task wins, Appendix E, few-shot robustness, humans, overlap, bias) is folded into closed `<details>` blocks, whose reading time the header reports separately (a change to `build.sh`).
- **No bias charts.** Tables 3 to 7 are quoted in a details block; see `viz_ideas.md` P-clip.17.

## Files

- `build.sh` (from the reference; HTML and JS lists edited; closed `<details>` counted apart in the reading time; checks every `ax:` link and margin label against `inputs/anchors.txt`). Runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, `mk_runs.py`.
- `save_live.py`: copies the Notion fetch verbatim from the agent transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `inputs/table_*.txt` and `inputs/anchors.txt`. `inputs/figure_labels.json`: values printed as labels on Figures 2, 4, 5, 7, 9 and 13 and Figure 3's pseudocode, transcribed from the arXiv HTML figure files (no curve read).
- `mk_tables.py`: parses Tables 1, 2, 8 to 14, 16 to 20 into `tables.json`. `recompute.py`: Figure 5 from Tables 10 and 11, Figure 8's correlation, Figures 10 and 11's counts and margins, Figure 7's mean and median, Figure 2's ratios, Figure 9's range, Table 1 ratios, Table 2 gains, Table 16 changes and the ObjectNet reconciliation, the text-encoder parameter count, GPU-days, 405 years; writes `inputs/recompute.json`.
- `paper.json`, `mk_paper.py` (from the reference, plus an override map for anchors the arXiv HTML numbers out of step: `S7.T4` is Table 3, `A1.F22` is Table 11; appendix letters to F).
- Toy model: `parts/21_js_gen.js` is the toy web's generator (images and captions), used by the page and, through `gen_data.js` (node), to write the training data, so the page draws exactly the training distribution. `train.py` (the six runs, `export`, `probe`), `check_forward.py` (JS against PyTorch: PASS), `overlap.py` (test against training), `mk_runs.py` (logs to `parts/_gen_runs.js`). `model/runs/*.json` are the logs, `model/clip_q.pt` the shipped quantised weights, `model/report.json`, `model/probe.json`, `model/check_forward.json`, `model/overlap.json`. Checkpoints in `model/ck/` are not needed by the page.
  - `node gen_data.js $DATA 120000`, then `DATA=$DATA uv run --with torch --with numpy python train.py sweep` (about 30 minutes in all on a shared laptop CPU, 2 threads; torch is never added to pyproject.toml), `... train.py export`, `... train.py probe`, `... check_forward.py`, `DATA=$DATA uv run --with numpy python overlap.py`.
- `check_page.mjs` (from the reference, adapted: the class sets and prompts, the word-shuffle and unknown-word checks, search, the fresh-image test, the four animations). `mk_coverage.py` writes `coverage.json`.
- `inputs/`: `paper_v1.txt`, `table_*.txt`, `anchors.txt`, `figure_labels.json`, `later_abstracts.txt` (arXiv API abstracts of 22 later papers), `modern_extracts.txt` (quoted lines from LLaVA, the Stable Diffusion README, the OpenCLIP README, ALIGN, Fang et al., CapPa, SigLIP, the CLIP model card and licence), `recompute.json`.
- `viz_ideas.md`: the visualisations chosen and rejected, ids P-clip.k.

## Toy results (one seed each, 1.2 million images at batch 256; 5,000 test scenes as photos and as drawings, 36 classes)

| Run | Photos | Drawings |
|---|---|---|
| CLIP, Transformer text (shipped; 41,761 parameters) | 84.5% | 76.7% |
| Contrastive, bag-of-words text | 90.2% | 88.7% |
| Predict the bag of words | 88.6% | 87.3% |
| Captioning Transformer (CLIP-AR) | 56.4% | 56.4% |
| Supervised, photo labels only | 99.6% | 4.3% |
| CLIP trained on photos only | 97.6% | 8.8% |
| Linear probe on the shipped model, all photo labels | 85.3% | 55.5% |

Zero-shot with "a photo of a {class}", float weights (the shipped 6-bit model: 84.0% and 75.2%). Images to 50% validation accuracy (log-interpolated from the logs, as the page does): captioning 772k, bag-of-words prediction 183k, bag-of-words contrastive 189k, Transformer contrastive 430k. So captioning to bag of words is 4.2× (the paper: 3×) and bag-of-words prediction to contrastive 0.97× (the paper: 4×). Robustness: the diverse web, not zero-shot inference or language, is what keeps drawings accurate, as Fang et al. (2022) found at scale.

## Checks (2 October 2026)

See the agent's report; `sh html_utils/checkpage.sh <folder>` and `node .../src/check_page.mjs` are the two checks, `check_forward.py` the model check, `mk_coverage.py` the coverage check (88 of 88 items verified).
