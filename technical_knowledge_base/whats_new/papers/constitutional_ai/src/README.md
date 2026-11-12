# Constitutional AI: Harmlessness from AI Feedback: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d815a9b31e9443961c700, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md` and the Attention Is All You Need reference folder.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with verdict, the core sentence and the paper's Figure 1 as hero, "You need" and new terms, then Problem, Idea (the CAI and HH RLHF pipelines as one 3D stage with a mode toggle, a step list per pipeline and label counters), Stage 1 (the wifi example, data, findings, a predict question revealing how much each released revision rewrites), Stage 2 (the multiple-choice format, CoT and clamping, a predict question with a live soft/hard/clamped label demo), Results (with a predict question on the refusal count, and the Appendix D median check), How much of this to believe, What it takes to use this, Why it matters (beyond the paper), Connections. |
| Replay the critiques | `t-run` | The live ingredient: 18 of the 66 released critique-revision chains stepped through principle by principle (a nine-item step list on the left, rebuilt per prompt, with each revision's measured new words), with word diffs, and the four models' median answers to the same prompt. |
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

HTML: `00_top`, `01_css` (LoRA page's CSS plus chat bubbles, diff marks, principle lists), `02_split` (the explainer-page template, unchanged), `02_header`, `03_paper`, `04_run`, `05_count`, `06_const`, generated `_gen_card`, `_gen_more`.
JS: `10_js_common`, `_gen_data`, `_gen_cai`, `11_js_ui` (shared: `fit`, `makeAnim` with the 2026-11-06 motion rules, copied from the Chinchilla page, predict widget, `legend`), `13_js_read` (revision chart, label demo, refusal bars), `23_js_run` (chain replay with LCS diff and its generated step list, model cards), `24_js_count`, `26_js_const`, `25_js_s3` (the template, renderer v2, unchanged), `31_js_sc_pip` (the pipeline scene), `99_js_tabs` (the template, storage key `cai-tab`; a `data-to` link opens the closed block that holds its target).

## What reproduces

- Independently: the three evaluation set sizes (438, 254, 287); 16 + 16 principles; 182,831 = 42,496 + 140,335; 438 = 221 + 217; Appendix D prints the median (9th of 17) sample for 16 of 16 prompts for both models; RL-CAI is never a canned refusal in the release (0 of 2,244), HH RLHF is in 386 of 1,122; principle draws consistent with uniform (χ² 15.15, 15 dof, p 0.44).
- Not checkable: every Elo and PM-score result (plots only, no numbers, no models released).

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence; the paper's own Figure 1 as the hero (the paper is CC BY 4.0, so it is embedded with credit, `img/`, `img/CREDITS.md`), captioned with what to notice; "You need" (RLHF, linked to its owner and to InstructGPT) and the new terms.
- **Visuals inline**: the revision-churn chart, the soft/hard/clamped label demo and the refusal bars were hidden behind their predict questions; each now sits in its own card right after the question ("answer the question above before you look"), and the reveal keeps one sentence with the answer. The paper's Figure 2 (the frontier) is shown as its own image beside the frontier claim; values are still not read off it. The two lab tabs stay tabs: Replay the critiques serves Stage 1 and Results, Count the refusals serves Results and the evidence section.
- **No autoplay**: `makeAnim` in `11_js_ui.js` patched as on CLIP (waits on step 1; mode switches pause); the prompt select in `23_js_run.js` no longer leaves a half-drawn step; `90_js_tabs.js` replaced by the template `99_js_tabs.js` (storage key `cai-tab`). `check_page.mjs` now fails if `pip` or `crx` moves before a click, and opens every closed block.
- **Owned elsewhere, linked with this paper's sentence kept**: RLAIF in general and the Bradley-Terry preference loss (Alignment: SFT, RLHF, DPO Family, RLVR); Elo from pairwise votes (Human preference and arenas); LLM judges and reward models as judges (LLM-as-judge); refusals with over-refusals (Safety and honesty benchmarks); reward over-optimisation (Reward hacking).
- **Closed**: the four motivations and the name; data and training in full; Figures 6 and 7 with Appendix A; the RL prompt count; footnotes 8 and 9 (data provenance; the core keeps the evasion cause); Appendix B; the §6 discussion; What it takes to use this (one open sentence plus the list).
- **Volatile**: Claude's constitutions (2023, January 2026), Collective CAI, specific against general principles, Constitutional Classifiers, the Model Spec and deliberative alignment moved into one dated closed block ("sources fetched 2 October 2026"). Why it matters keeps the durable points: RLAIF first at scale (with Lee et al. 2023), refusal design, self-critique and LLM judges.
- Header: "Reading: 18 min, plus 4 in closed details.", read by `build.sh` from `reading.json` (measured with `html_utils/audit_pages.mjs`).

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 17.9 min (4,119 words) | 18.0 min (4,135) |
| The paper, closed | 0 | 3.9 min (895) |
| Replay the critiques | 3.8 min | 4.2 min (969; the first step now draws in full) |
| Count the refusals | 3.3 min + 7.9 closed | unchanged |
| The constitution and the numbers | 8.4 min | unchanged |
| Visuals drawn in Reading (audit) | 1 | 6 |

Why about 18 minutes is right: the added top (core sentence, hero and its caption, new terms, owner links, about 1.5 minutes) and the Figure 2 caption were paid for by closing about 4 minutes of provenance, appendix and dated material. What stays open is the paper's argument in its order with its numbers: the problem and its evasiveness, the two stages with the paper's own example and prompt format, the label-type result, every result bullet, the Appendix D median check, and the evidence section, which this page owns and which the released samples make checkable. The predict questions and the card count as core. Cutting further would drop results, not repetition.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
229 units: core 185, depth 27, owned 6, volatile 9, fat 2. 219 drafted by `ledger.py init`; 10 added (core sentence, hero, new terms, Figure 2, six owner links). Fat: the old reading-time line and the old animation-manners line. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 5, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 0 problems (including no movement before a click and every closed block opened; default refusal count HH RLHF 386). `mk_coverage.py`: 52 of 52 (the reading-time item's keys updated).

## The 2026-11-12 layout rollout (split layout, renderer v2 stage, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged). Reading: the top (core sentence, You need, New terms) beside the paper's Figure 1; Idea beside the 3D stage (stage first in the DOM); Stage 1 as two splits (the recipe beside the paper's wifi example as a card; What the authors found and its predict question beside the revision-churn chart); Stage 2 as two splits (the recipe beside the multiple-choice prompt format as a card; the CoT paragraph and its predict question beside the label demo); Results as two splits (the result bullets beside Figure 2; the refusal question, the Appendix D median check and the closed blocks beside the refusal bars). Problem, How much to believe, What it takes, Why it matters and Connections have no visual and stay full width. Replay the critiques: the replay card (sticky on wide screens) beside the intro, prompt select and step list; the four model cards stay full width. Count the refusals: the intro beside the controls and bars, the grid's legend beside the grid; the audit list and Appendix D table stay full width. The constitution and the numbers and Further reading: lists and tables, full width. Sections split across two grids get a second section id (`s-sl2`, `s-rl2`, `s-res2`) so no section spans two columns.
- **One 3D stage** (`31_js_sc_pip.js`, template `25_js_s3.js`), replacing the 2D before/after animation `#pip`: stage 1 along the back lane (the helpful RLHF model with the people who labelled its helpfulness, the red-team prompt stack, the harmful answer, four revision cards, SL-CAI), stage 2 along the front lane (two answers, the feedback model, the soft label as two bars on a plinth, the preference model with the people who gave helpfulness labels, RL-CAI), and between them the constitution as two stacks of 16 principle cards, one card flying out per critique (principles 1, 4, 8, 7: the released grocery-store chain, `CAI.x.chains[57]`) and one per comparison. Flows carry prompts, answers, revisions, samples and labels; their dot counts follow the page's counts (731,324 revisions against 270,592 helpfulness samples; 182,831 AI harmlessness against 135,296 human helpfulness labels; HH RLHF's 44,849 from the released harmless-base split). The HH RLHF toggle swaps the step list (`sx-pip-rlhf`) and replays the same scene with people in the judge's place, a dashed footprint where the critique step was and a ghost where SL-CAI was. The camera moves in close for each step and pulls back to the front lane for PM and RL. The soft label's 0.7 and 0.3 are illustrative and labelled so; the counters (`#pipCnt`) are the old animation's, updated per step.
- **Kept 2D**: the revision-churn bars, the soft/hard/clamped label demo (curves the reader drives), the refusal bars, the paper's Figures 1 and 2 (images; values are not read off), the critique replay (text with word diffs), the count tab's bars and 66 x 17 grid, every table.
- **Motion**: `makeAnim` (11_js_ui.js) is Chinchilla's (plays once half in view, pauses off screen, stops for good on any control or at the end, never under reduced motion, `data-playing`, an `ol.sx` per mode). The critique replay's caption carousel (`crxStep`, `crxCap`) became its step list, rebuilt per prompt by `23_js_run.js`; changing the prompt resets it to step 1 without replaying. `05z_errbox.js.html` and `99_js_tabs.js` are the templates. `check_page.mjs` now asserts that the stage and the replay play when scrolled into view instead of forbidding it; `check_stages.mjs` (after Chinchilla's, plus the stage's mode toggle) checks the stage in both modes and the replay at 1400 light, 920 light and 390 dark and under reduced motion.

## Length judgement (2026-11-12)
| | Before | After |
|---|---|---|
| The paper, core | 18.1 min (4,156 words) | 20.3 min (4,679) |
| The paper, closed | 3.9 min (895) | 3.9 min (895) |
| Replay the critiques | 4.2 min (969) | 4.8 min (1,105; the step list) |
| Count the refusals; The constitution; Further reading | 3.3 + 7.9 closed; 8.4; 2.5 | 3.3 + 7.9 closed (762 open words, up 9); 8.4; 2.5 |
| Visuals in Reading (audit) | 6 | 6 (the 2D pipeline animation became the 3D stage) |

The growth is the two step lists that now explain the stage (about 500 words, most of it the old animation's captions moved into static text); nothing was cut. Header: "Reading: 20 min, plus 4 in closed details." Pages that quote the old 18 minutes need `check_times.py --fix` by the lead.

Ledger: 243 units (core 199, depth 27, owned 6, volatile 9, fat 2); 14 added for the stage's two step lists; keys of units 27, 29, 32, 35 (Idea and Stage 1 wording), 166, 168 (Replay) and 178 (Count) re-pointed to the reworded sentences; `ledger.py check` problems 0.

## Checks (12 November 2026)
`checkpage.sh`: tabs 5, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 0 problems. `check_stages.mjs`: 0 problems. `verify_layout.mjs`: problems 0. `mk_coverage.py`: 52 of 52. `ledger.py check`: problems 0.
