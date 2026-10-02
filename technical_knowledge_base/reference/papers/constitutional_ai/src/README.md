# Constitutional AI: Harmlessness from AI Feedback: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d815a9b31e9443961c700, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md` and the Attention Is All You Need reference folder.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with verdict, then Problem, Idea (the CAI and HH RLHF pipelines as one before/after animation with label counters), Stage 1 (the wifi example, data, findings, a predict question revealing how much each released revision rewrites), Stage 2 (the multiple-choice format, CoT and clamping, a predict question with a live soft/hard/clamped label demo), Results (with a predict question on the refusal count, and the Appendix D median check), How much of this to believe, What it takes to use this, Why it matters (beyond the paper), Connections. |
| Replay the critiques | `t-run` | The live ingredient: 18 of the 66 released critique-revision chains stepped through principle by principle, with word diffs, and the four models' median answers to the same prompt. |
| Count the refusals | `t-count` | A visible refusal classifier over all 4,488 released answers, bars per model, a 66 × 17 grid per model, the audit list, and the Appendix D median table. |
| The constitution and the numbers | `t-const` | Both lists of 16 principles verbatim with draw counts, the paper's counts recomputed, one real HHH evaluation item. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Live ingredient is a measured replay of the paper's own released traces**, not a toy model: CAI is a method on top of a 52B model that nobody outside can run, but its repository releases the critique chains and 17 samples per prompt from four models, so the page replays them verbatim and measures them (refusal counts, boilerplate counts, revision churn, the median check). Two tabs, because replaying and counting are different reader tasks.
- **No "tables, rebuilt" tab.** The paper has no tables and prints no Elo values in text; its results are plots, and the method forbids reading curves. The constitution and the paper's counts take that tab's place.
- **No "Then and now" tab.** The later history is a list of descendants, not a morph of one design; it sits in Why it matters.
- **Reading length** is about 18 minutes by the build's count (old page 9). The count includes the three predict-then-reveal panels and the card; the page owns details the old page summarised (data counts, the evaluation instruction confound, Appendix B, the discussion), and the evidence section is new.

## Files

- `build.sh`: as in the reference folder (macros `{{text|ax:...}}`, `{{text|n:...}}`, `{{text|tab:...}}`, `[[anchor|label]]`, `@@CARD@@`), with this page's part lists. Runs `recompute.py` and `mk_paper.py`.
- `paper.json` (card, verdict, resources, connections; `authors_full` lists all 51 authors in Further reading), `mk_paper.py` (copied from the LoRA page: card with verdict; no `tables.json` needed; Further reading).
- `fetch_repo.sh <cache>` downloads the supplementary repository (about 4.6 MB, kept out of the repo); `mk_data.py <cache>` measures it and writes `inputs/repo_stats.json` (every number the page quotes about the release), `inputs/repo_extract.json` (what the page embeds) and `parts/_gen_cai.js` (`window.CAI`). The refusal classifier and boilerplate regexes are at its top.
- `recompute.py`: every derived count (SL sequences and steps, PM and RL totals, Elo and binomial standard errors, logit of the clamp bounds) into `inputs/recompute.json`.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt` (with anchor markers). `save_live.py <transcript>`: the Notion fetch, verbatim, to `live.md`.
- `inputs/later_work_abstracts.txt` (arXiv abstracts of the later papers cited) and `inputs/later_work_notes.txt` (quoted lines from the Anthropic, Hugging Face and GitHub pages, and the hh-rlhf count).
- `mk_coverage.py`: `coverage.json`, every fact of `live.md` with where the page carries it, verified against the built page.
- `check_page.mjs` (run from the repo root with node): every control in light 920 and dark 390, both animations stepped end to end, the grid clicked, the default refusal count asserted (HH RLHF 386), text at least 11 px, no NaN, errors or sideways scroll; screenshots `../.shots/x-*.png`.

## Parts

HTML: `00_top`, `01_css` (LoRA page's CSS plus chat bubbles, diff marks, principle lists), `02_header`, `03_paper`, `04_run`, `05_count`, `06_const`, generated `_gen_card`, `_gen_more`.
JS: `10_js_common`, `_gen_data`, `_gen_cai`, `11_js_ui` (shared: `fit`, `makeAnim`, predict widget, `legend`), `13_js_read` (pipeline animation, revision chart, label demo, refusal reveal), `23_js_run` (chain replay with LCS diff, model cards), `24_js_count`, `26_js_const`, `90_js_tabs`.

## What reproduces

- Independently: the three evaluation set sizes (438, 254, 287); 16 + 16 principles; 182,831 = 42,496 + 140,335; 438 = 221 + 217; Appendix D prints the median (9th of 17) sample for 16 of 16 prompts for both models; RL-CAI is never a canned refusal in the release (0 of 2,244), HH RLHF is in 386 of 1,122; principle draws consistent with uniform (χ² 15.15, 15 dof, p 0.44).
- Not checkable: every Elo and PM-score result (plots only, no numbers, no models released).
