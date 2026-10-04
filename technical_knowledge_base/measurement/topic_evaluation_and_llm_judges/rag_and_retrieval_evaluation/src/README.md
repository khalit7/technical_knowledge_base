# Source of RAG and retrieval evaluation

`sh build.sh` writes `../index.html` from `parts/` and `inputs/page_data.json`.

## Shape
Child-page method (Part B of `html_utils/methods/topic_pages.md`): Reading organised by the subject's own logic (one screen, the two halves with the before/after animation, retrieval metrics, a real run, generation metrics, frameworks, judging faithfulness, detection benchmarks, long context, building a test set, agentic RAG, mistakes), two standalone tabs (Score a real retrieval run, Hallucination spans) and Further reading.

## Data (all real, all small extracts in `inputs/`)
| Script | What it does | Inputs (scratch, not committed) |
|---|---|---|
| `beir_run.py` | BM25 (Lucene-style flat, two parameter sets), rank_bm25, all-MiniLM-L6-v2 dense, RRF hybrid on BEIR SciFact, NFCorpus, FiQA-2018; scored with trec_eval definitions | BEIR zips from public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/ |
| `ragtruth_stats.py` | RAGTruth counts by task and model, span types, implicit_true | github.com/ParticleMedia/RAGTruth `dataset/` |
| `ragtruth_marco.py` | joins RAGTruth QA questions to MS MARCO v1.1 by text, matches the three passages (word-set Jaccard >= 0.5), reads `is_selected`; outcome crosstab | MS MARCO v1.1 parquet (train, validation, test) from huggingface.co/datasets/microsoft/ms_marco |
| `gen_case.py` | the retrieval-failure case: SciFact claim 54, top 3 under BM25 and under the hybrid, answered by Qwen2.5-1.5B-Instruct (greedy) | the runs above |
| `mk_data.py` | builds `inputs/page_data.json` and the small JSON extracts | all of the above |
| `recompute.py` | checks the page's JS metrics against the full runs, the published numbers, the worked example, RAGTruth against the paper, and every number quoted in prose | `inputs/` only |
| `mk_coverage.py` | writes `coverage.json` | |
| `save_live.py` | copied the Notion fetches verbatim into `live.md` (old "RAG evaluation" page) and `live_rag_topic.md` | session transcript |

Reproduction (independent): dense nDCG@10 and R@100 equal MTEB's published all-MiniLM-L6-v2 results to the fourth decimal on all three sets; Lucene-style BM25 lands within 0.004 of Anserini's flat regressions (`inputs/published/`).

## Human readings, stated on the page
- End-to-end correctness of the six "carry on cast" answers against MS MARCO's reference answer (in `parts/24_js_anim.js`, `E2E`).
- The verdicts on the two Qwen answers for SciFact claim 54 (`parts/24_js_a54.js`).
- Deaths of four of the six actors since the passage: Wikipedia, read 2026-10-04.

## Corrections found
- RAGTruth arXiv v2 Table 3 prints 48 hallucinated QA responses for GPT-4-0613; the release has 42 (spans 51 match). Shown in a box on the spans tab.
- BEIR's BM25 baseline is Anserini with title and text as separate fields (not Elasticsearch); our numbers are compared with Anserini's flat regression instead.
- RAGAS response relevancy zeroes noncommittal answers in code, not in its docs.
