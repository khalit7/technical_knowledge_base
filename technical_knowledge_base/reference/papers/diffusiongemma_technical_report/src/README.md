# DiffusionGemma Technical Report: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d818390bfd7969757211e, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict, then Problem, Idea (Eq. 12 as the whole speed argument, Table 1), Discrete diffusion (Eq. 1, a multinomial-against-masked corruption demo), Block by block (the causal-encoder, bidirectional-decoder inversion), The sampler (Algorithm 1 animated on the trained toy, with the masked twin and AR mode as before/after; a predict question run live), Training (SFT, SD·RL, predict on answer length), Speed (Figure 11 to scale with a TPF slider and what-ifs, predict on distinct experts, Figure 12's ratios with the extrapolated crossover), Results (quality dot plot with standard errors, speed against other systems, Section 9, Section 8, Section 10), Why it matters, How much to believe, What it takes to use this. |
| Run the toy | `t-run` | The toy with every sampler knob, three decoders on one problem, an in-browser test on 64 held-out problems, the offline speed-quality sweep, training curves, findings. |
| The paper's tables, rebuilt | `t-tables` | Table 3 (printed or as differences), Appendix E's Mercury 2 estimate, Table 4 with recomputed columns, 37 checks of the paper's numbers, Figure 11's labels, Tables 1, 2, 5, 6, 7. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from `html_utils/methods/papers.md`

- **No Then and now tab**: the report is two months old; its lineage (DDPM, BERT, T5, block diffusion) is linked instead.
- **No Connections section in the Reading tab**: the connections are the Further reading cards (same text as the old page's Connections list), to keep the Reading tab shorter.
- **The live ingredient is the paper's sampler, not its quality**: an architecture-and-recipe paper at 26B scale cannot be reproduced; the toy runs the mechanism the report actually specifies (Algorithm 1, block-AR with a shared-weights encoder and decoder, self-conditioning, Eq. 13's losses) and tests the claims that make sense at toy scale (adaptive steps on sequential against parallel tasks, Appendix G.2; revision under multinomial against masked noise; dual mode). SD·RL is not built, because the report gives no objective to implement.
- **The AR-against-diffusion pass-count animation is not rebuilt**: it is on the 2026-08-24 tech news page and linked.
- **A third verdict, "context", in the checks table**, for recomputed numbers that frame a claim without testing a printed value.
- **Reading length**: about 21 minutes against the old page's 13 (the page now owns every detail of the report, including the evidence judgement and the toy's results).

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, `mk_toydata.py`, assembles `parts/` (each JS part in its own `<script>`, tab wiring last, `#jsErr` box first), expands link macros, fails on an em-dash or unexpanded macro, fills in reading time and resources total.
- `paper.json` (card, resources, KB links), `tables.json` (written by `mk_tables.py`: Tables 3 and 4 parsed from `inputs/table_S7_T3.txt` and `table_S7_T4.txt`, the small tables and Figures 11 and 12's printed labels transcribed), `recompute.py` (37 checks, writes `inputs/recompute.json`).
- Toy: `train.py` (`train multinomial|masked`, `eval` writes `model/results.json`, `export` writes `parts/20_model_data.js` and `model/*_q.pt`), `check_forward.py` (JS forward pass against PyTorch, `model/check_forward.json`), `mk_toydata.py` (`parts/_gen_toydata.js`: results, logs, the Reading tab's demo problem picked by running the page's own JS in node, the findings text). `model/` keeps the float and quantised checkpoints, logs and JSON results; `model/old/` keeps the logs of the three abandoned first designs (a numeric rule table and learned absolute positions: the parallel task stayed at chance for 2,400 steps; then explicit rule-window tokens; then rotary positions, which learned both tasks within 1,200 steps; the 6,000-step run was stopped and retrained at 3,000 steps to save CPU on the shared machine).
  - `uv run --with torch --with numpy python train.py train multinomial` (about 13 minutes at 2 threads on a loaded machine), the same for `masked`, then `... train.py export`, `... train.py eval`, `... check_forward.py`, then `sh build.sh`.
- `check_page.mjs` (from the repo root with node): every control in light 920 and dark 390, both animations stepped, the in-browser test run; fails on text under 11 px, NaN/undefined, errors or sideways scroll.
- `mk_coverage.py`: `coverage.json`, every fact of `live.md` with where the HTML carries it, verified against the built page, plus the corrections to the old summary.
- `save_live.py` (Notion fetch copied from the session transcript into `live.md`), `extract_paper.py` (arXiv HTML v1 to `inputs/paper_v1.txt` and table extracts), `inputs/hf_model.json` (model card metadata, 3 October 2026), `inputs/vllm_blog.txt`.
- `viz_ideas.md`: ideas chosen and rejected with scores.
