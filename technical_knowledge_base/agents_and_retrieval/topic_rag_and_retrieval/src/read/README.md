# Reading and Further reading tabs (`t-read`, `t-more`) of Topic: rag-and-retrieval

Parts: `../parts/20_read.html` (opens the tab, scoped CSS, section nav), `20_read_a.html` to `20_read_j.html` (sections 0 to 10, mistakes, interview questions, footer), `20_read_z.html` (closes the tab); JS `22_js_rd_data.js` (generated, do not edit), `23_js_rd_s0.js` (where 188 answers go, predict-then-reveal), `24_js_rd_s234.js` (BM25 calculator, models across datasets, memory bill), `25_js_rd_s56.js` (hybrid and rerank chart, lever calculator), `26_js_rd_s78.js` (pipeline against agent loop, latency two ways); `39_tab_more.html` (Further reading). Ids carry the `rd-` prefix; CSS is scoped under `#t-read`. The animation controller is the shared `21_js_rd_common.js`.

Nothing on this tab is measured by this tab. Every measured number comes from the recorded results of the other tabs (`../pipe/out`, `../vec/out`, `../agent/out`), the child pages (`../../<child>/src/facts.json`, `src/out`, `src/data`), the running example's `../data/README.md` and the shared notes the setup keeps outside the repo. `make_data.py` reads them into `22_js_rd_data.js` and asserts the totals the prose quotes (186 / 178 / 96 of 188 with the reranker, 171 / 90 without).

## Rebuild and check
```sh
python3 make_data.py && sh ../build.sh
RAG_SCRATCH=<the shared rag setup folder> python3 check_numbers.py   # embedded data, prose numbers, provenance, privacy
node check_tab.mjs ../../index.html <screenshot folder>              # every control at 390 px dark and 920 px light
sh html_utils/checkpage.sh <root page folder>                         # from the repo root
```

## Notes
- `old/`: the old root and its four old children, saved verbatim from read-only Notion fetches on 2026-10-14. `coverage.md`: every claim of the old root with a verdict, and the claims of the old children that the root touches (the children own their full coverage).
- Shape: the brief's eleven sections (0 one screen to 10 child pages), then mistakes and interview questions. Departure from the root method (Part A of `html_utils/methods/topic_pages.md`): the Reading tab is about 45 minutes rather than 15 to 20, because Khalid asked to be taught this topic from zero (every term defined, one running example, the cost and the check for each idea); the depth still lives on the children and the four lab tabs, each section ending with a link.
- Section 7 quotes the Agentic lab's deterministic `hops.json`; its generator results were still being produced when this tab was written.
- `viz_ideas.md`: visuals built and rejected.
