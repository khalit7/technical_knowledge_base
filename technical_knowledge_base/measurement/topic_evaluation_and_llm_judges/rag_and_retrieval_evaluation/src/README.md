# Source of RAG and retrieval evaluation

`sh build.sh` writes `../index.html` from `parts/` and `inputs/page_data.json`.

## Shape (rebuilt 2026-10-24 to the teaching contract)
Child-page method (`.claude/skills/explainer-page/page-kinds/topic-child.md`) under `teaching/teaching-contract.md`. Page prefix `rre`, storage key `rre-tab`.

| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (styles, nav, the idea in one sentence, hero, you need, new terms, one-screen table closed; split the halves: animation, outcome bars, triage), `20_read_b` (the retrieval half: recall curve, real run), `20_read_c` (faithfulness: stepper, checkers, what it is not, how judges fail, detector tables closed), `20_read_d` (answer relevance, context precision with the calculator, context recall; citations), `20_read_e` (framework table, agreement with people), `20_read_f` (eval set, comparing two systems, agentic RAG). JS: `21_js_rd_common.js` (the skill template, never autoplays), `21_js_rd_extra.js` (tab hooks, `RD.fig`, `RD.lines`), `21z_js_runcore.js`, `22_js_calc.js`, `23_js_xtab.js`, `24_js_a54.js`, `24_js_anim.js`, `25_js_curve.js`, `25_js_real.js`, `26_js_faith.js`, `26_js_figs.js` (hero, triage, citations, agreement), `28_js_paired.js` | core plus closed depth |
| Score a real retrieval run `t-run` | `31_tab_run.html`, `31_js_run.js` | a tool: five systems, three sets, any k, per-query browser |
| Hallucination spans `t-spans` | `32_tab_spans.html`, `32_js_spans.js` | a dataset view: eight RAGTruth questions, six answers each, the whole release recomputed, the Table 3 correction |
| Further reading `t-more` | `39_tab_more.html` | |

### What changed and why
- **Top**: the core idea in one sentence and a new static hero (`26_js_figs.js`): the five objects (question, passage labels, retrieved passages, answer, reference) and the metric that compares each pair, upper arcs the retrieval half, lower arcs the generation half; a two-column list at phone width. "You need" points at Evaluation metrics section 6 for the ranked-list definitions; new terms; the old "In one screen" table is a closed block.
- **Owned elsewhere, linked**: ranked-list metric definitions and the nDCG gains (Evaluation metrics, section 6; the formula block was removed); A = r x p x g on the running example (The retrieval pipeline, section 9; the stale "67.5%" and "200-question example" were dropped); ANN recall (Vector indexes); Lost in the Middle and HELMET (Long-context and multimodal benchmarks); Self-Route's measured trade-off (Agentic retrieval); judge biases and calibration (LLM-as-judge); tests and sample size (Eval statistics).
- **New visuals, each beside its claim**: recall@k curves k = 1 to 100 with prompt and reranker depths marked (`25_js_curve.js`, computed from the stored ranks); a faithfulness stepper on two real RAGTruth answers (Mistral's contradiction, Llama-2-13B's true but unsourced claim) showing claims, verdicts and each instrument's rule (`26_js_faith.js`); an ALCE citation diagram; an agreement-with-people figure (RAGChecker correlations against the 70.09 human ceiling; TREC nugget tau for runs against topics); a triage chain for a wrong answer (replaces the "Bucket every failure" list); a paired per-query comparison with bootstrap intervals (`28_js_paired.js`, data from `paired.py`).
- **New section, "Comparing two RAG systems fairly"**, which the page owns: the paired comparison shows that BM25's 0.676 against the dense model's 0.645 on SciFact is 68 wins against 70 losses, interval -0.067 to +0.005, not established; rules for pooled labels, equal budgets, pinned judges, both halves; long context against RAG as the same comparison.
- **Moved**: the rank-list calculator from "Retrieval metrics" into the context-precision section, reframed as "padding is invisible to context precision"; RAGTruth's detector F1 table from the spans tab into a closed block in the faithfulness section; the detection-benchmark table into a closed dated block; the five systems' exact settings into a closed block.
- **No autoplay**: `21_js_rd_common.js` is the template (the old copy started the animation on first view); a mode switch no longer plays. `check_page.mjs` scrolls both step cards into view with motion allowed and confirms they stay on step 0.
- **Deleted as fat**: the ten "Common mistakes" (each restated a core section; "unpinned judges" moved into the faithfulness section), wind-ups, pointers to the old structure, the link to the earlier RAG evaluation page (no longer in `pages.json`).

### Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 24.2 min | 22.3 min |
| Reading, closed details | 0.9 min | 4.5 min |
| Score a real retrieval run | 3.2 min | 3.2 min |
| Hallucination spans | 4.9 min | 4.5 min |
| Visuals counted by the audit in Reading (svg, canvas, img) | 0 | 6 (plus the HTML animation, outcome bars, calculator and stepper, before and after) |

Why 22 minutes is right: the page now carries everything the contract asks of the owner of RAG evaluation, including a section it lacked (comparing two systems fairly) and the visuals it lacked (the hero, the faithfulness stepper, the curve, the paired comparison, citations, agreement, triage), while handing the metric definitions, the A = r x p x g measurement, ANN recall and long-context results to their owners. About a fifth of the core words are captions of the visuals. What was long and optional (benchmark and detector tables, system settings, the worked example's arithmetic, agreement details) is closed.

### Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
275 units: core 211, depth 30, fat 26, owned 7, volatile 1. 259 drafted by `ledger.py init` from the old page; 16 added by hand (script-rendered content: animation readings, outcome bars, run tables, the spans whole-set table; and the new paired, curve, stepper and citation units). Fat units carry a `note`.

## Data (all real, all small extracts in `inputs/`)
| Script | What it does | Inputs (scratch, not committed) |
|---|---|---|
| `beir_run.py` | BM25 (Lucene-style flat, two parameter sets), rank_bm25, all-MiniLM-L6-v2 dense, RRF hybrid on BEIR SciFact, NFCorpus, FiQA-2018; scored with trec_eval definitions | BEIR zips from public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/ |
| `ragtruth_stats.py` | RAGTruth counts by task and model, span types, implicit_true | github.com/ParticleMedia/RAGTruth `dataset/` |
| `ragtruth_marco.py` | joins RAGTruth QA questions to MS MARCO v1.1 by text, matches the three passages (word-set Jaccard >= 0.5), reads `is_selected`; outcome crosstab | MS MARCO v1.1 parquet (train, validation, test) from huggingface.co/datasets/microsoft/ms_marco |
| `gen_case.py` | the retrieval-failure case: SciFact claim 54, top 3 under BM25 and under the hybrid, answered by Qwen2.5-1.5B-Instruct (greedy) | the runs above |
| `mk_data.py` | builds `inputs/page_data.json` and the small JSON extracts | all of the above |
| `paired.py` | per-query nDCG@10 differences between pairs of systems, paired bootstrap 95% intervals (10,000 resamples, seed 0) and recall@k curves, into `inputs/paired.json` (embedded as `window.PAIRED`); seconds | `inputs/page_data.json` |
| `recompute.py` | checks the page's JS metrics against the full runs, the published numbers, the worked example, RAGTruth against the paper, every number quoted in prose, and `paired.json` with its caption numbers | `inputs/` only |
| `check_page.mjs` | every control at 390 dark and 920 light, the calculator and paired figure against the recorded numbers, the curves against `paired.py`, no autoplay; element screenshots to `../.shots/` | the built page |
| `mk_coverage.py` | wrote `coverage.json` (the 2026-10 migration's coverage of the old Notion page; superseded by `ledger.json`) | |
| `save_live.py` | copied the Notion fetches verbatim into `live.md` (old "RAG evaluation" page) and `live_rag_topic.md` | session transcript |

Reproduction (independent): dense nDCG@10 and R@100 equal MTEB's published all-MiniLM-L6-v2 results to the fourth decimal on all three sets; Lucene-style BM25 lands within 0.004 of Anserini's flat regressions (`inputs/published/`).

## Human readings, stated on the page
- The claim split and verdicts in the faithfulness stepper (`parts/26_js_faith.js`): ours, made as a RAGAS-style judge is prompted to; they agree with RAGTruth's spans. The scores are each tool's documented rule applied to them, not runs of the tools.
- End-to-end correctness of the six "carry on cast" answers against MS MARCO's reference answer (in `parts/24_js_anim.js`, `E2E`).
- The verdicts on the two Qwen answers for SciFact claim 54 (`parts/24_js_a54.js`).
- Deaths of four of the six actors since the passage: Wikipedia, read 2026-10-04; Kenneth Williams's death in 1988 (stepper caption): Wikipedia.

## Corrections found
- RAGTruth arXiv v2 Table 3 prints 48 hallucinated QA responses for GPT-4-0613; the release has 42 (spans 51 match). Shown in a box on the spans tab.
- BEIR's BM25 baseline is Anserini with title and text as separate fields (not Elasticsearch); our numbers are compared with Anserini's flat regression instead.
- RAGAS response relevancy zeroes noncommittal answers in code, not in its docs.
