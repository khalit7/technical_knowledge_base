# CLIP (Learning Transferable Visual Models From Natural Language Supervision): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d8194a85dfc5f3bf3f799, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built with `.claude/skills/explainer-page/page-kinds/paper.md`; the reusable pieces come from `../../attention_is_all_you_need_transformer/src/` by way of `../../vit/src/`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict; Problem, Idea, Data (WIT), Objective (predict question with the toy Figure 2 runs, the write-the-caption against pick-the-pair animation, Figure 3 transcribed and linked to a live eight-pair batch with a temperature slider), Encoders and training, Zero-shot (supervised head against zero-shot classifier animation, Table 1), Prompts (with the toy's honest result), How good (Figure 5 recomputed, predict question on Figure 7, Figures 8 and 9), Linear probes, Robustness (predict question on Figure 13, the toy robustness test), Humans, overlap and bias (details), Limitations, Why it matters, Connections, How much of this to believe, What it takes to use this. |
| Run a tiny CLIP | `t-run` | The trained toy CLIP in the browser: classify any image against any classes written in words (seven class sets, four prompt modes, a word-shuffle test), a fresh-image test, text search, the few-shot probe chart, every run's curves, the honesty notes. |
| The paper's tables, rebuilt | `t-tables` | Table 1; any two of Tables 10 and 11's 75 rows dataset by dataset; Figure 8 recomputed per CLIP model; Figure 10's averages; Table 16 with the ObjectNet reconciliation; Tables 2, 8, 12, 13, 14, 17; Tables 18 to 20 with the text-encoder recount; a "does not reproduce or does not agree" box. |
| Then and now | `t-then` | The recipe card changed one paper at a time (ALIGN, LiT, CoCa, OpenCLIP, SigLIP, DataComp, MetaCLIP, DFN, SigLIP 2) with each reported zero-shot ImageNet number, and SigLIP's sigmoid loss in one paragraph (its animation moved to its owner, Vision encoders, on 2026-10-25). |
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

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence and a hero: the paper's Figure 1 redrawn as two static panels (training: a 4 × 4 grid of image-caption similarities with the true pairs on the diagonal; test: class names written as sentences, compared with a new image), `14_js_hero.js`. The paper is under arXiv's non-exclusive licence, not CC BY, so it is redrawn, not embedded; the bar lengths are labelled illustrative. Then "You need" (ViT, softmax cross-entropy; the owners of InfoNCE and of CLIP-style encoders today) and the new terms.
- **Visuals inline**: Figure 7 (examples per class), Figure 13 (ResNet-101 against zero-shot CLIP under shift) and the toy's Figure 2 curves left their predict reveals; each sits in a card right after its question ("answer the question above before you look"). The Run a tiny CLIP tab stays a tab: a lab used by the Objective, Prompts, How good and Robustness sections.
- **No autoplay**: `11_js_ui.js` replaced by the patched copy (as on DDPM and LoRA), so the objective, zero-shot and Then and now animations wait on their first step; `90_js_tabs.js` replaced by the template `99_js_tabs.js` (storage key `clip-tab`). `check_page.mjs` now fails if `ob`, `zs` or `tn` moves before a click, and opens every closed block.
- **Owned elsewhere, linked with a sentence kept**: InfoNCE and its temperature (Contrastive and self-supervised learning); batch size and temperature in CLIP-style training, zero-shot classification with today's encoders, data curation (LAION, DataComp, MetaCLIP, DFN), minimal-pair failures and the softmax-against-sigmoid comparison (Vision encoders). **Removed**: the Then and now softmax-against-sigmoid animation, which drew SigLIP's loss (not this paper's) and duplicated the owner's visual; its numbers (t = 10, b = −10, single pass, saturating at about 32k) stay in a paragraph that links the owner.
- **Closed**: earlier work on learning from text; the paper's naming of the family; WIT's query construction; the encoders in detail with the text-encoder recount and the scaling rule; zero-shot as the paper defines it; prompts in full (the core keeps +1.3%, +3.5%, almost 5 points); why linear probes and the protocol; all 27 datasets with Figures 11 and 12; the seven shifts and relative robustness; the successors' sources; the paper's small inconsistencies.
- **Volatile**: the old page's unconfirmed usage claims (frontier lineage, "default open vision tower", vector databases) moved into one dated closed block.
- Header: "Reading: 25 min, plus 12 in closed details.", read by `build.sh` from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 25.3 min (5,819 words) | 24.5 min (5,636) |
| The paper, closed | 7.0 min (1,621) | 12.0 min (2,759) |
| Run a tiny CLIP | 4.5 min | unchanged |
| The paper's tables, rebuilt | 8.1 min | unchanged |
| Then and now | 2.3 min | 1.9 min |
| Visuals drawn in Reading (audit) | 5 | 9 |

Why about 25 minutes is right: the audit counts the pseudocode and every predict reveal as core, so the prose itself is nearer 21 minutes. The added top (core sentence, hero, terms, about 1.5 minutes) was paid for by closing about 5 minutes of provenance and detail. What stays open is the paper's argument in its order, and each section carries a result with its number: the objective and its efficiency claim, zero-shot transfer and Table 1, prompts, Figures 5 to 9, linear probes, robustness, limitations, and the evidence section, which this page owns. The paper is 48 pages; cutting further would drop results, not repetition.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
320 units: core 210, depth 96, owned 7, volatile 2, fat 5. 310 drafted by `ledger.py init`; 10 added (core sentence, hero, new terms, six owner links, the script-drawn tables). `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 5, 299 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 778 actions, 0 problems (including no movement before a click and every closed block opened). `mk_coverage.py`: 88 of 88 (the reading-time and Problem keys updated). The model and its JS are unchanged, so `check_forward.py` was not rerun.
