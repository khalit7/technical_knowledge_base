# RAG: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d816c889decc342a7ad39, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built on the paper-page method (`html_utils/methods/papers.md`) from the Attention Is All You Need reference folder, with the ZeRO page's newer `mk_paper.py` (verdict on the card).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (with the verdict), then Problem, Idea (Figure 1 redrawn with the toy's real retrieval), Retriever and generator, Two marginalisations (predict question, then the RAG-Token against RAG-Sequence animation on the trained toy), Training and decoding, Results (Table 1 bars, predict on the 11.8%), Index hot-swapping (predict, then the toy's 2016/2018 grid and a live country), How much of this to believe, What it takes to use this, Why it matters, Connections. |
| Ask a trained toy RAG | `t-run` | The live ingredient: question builder, model and index switches, k, editing the index; retrieved documents, document posterior map or hypothesis table; measured results for every variant and seed; what reproduces and what does not; how it was built; training curves. |
| The paper's tables, rebuilt | `t-tables` | Tables 1 to 7 (Table 1 with a noise test against a chosen baseline, Table 2 deltas, Table 4 sums, Table 6 learned-minus-frozen and learned-minus-BM25), every number in the text checked. |
| Then and now | `t-then` | One four-part pipeline morphing through RAG, FiD, RETRO, Atlas, REPLUG, In-Context RALM, Self-RAG and GraphRAG, each step quoted from its own paper; the same as a table. |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from papers.md.**
- The live ingredient is the architecture kind (a trained toy model), because RAG is a model: its claims (reading instead of remembering, hot-swapping, the two marginalisations) only show on a model that has learned to read. The toy's retriever is a bag of tokens with one learned weight per token plus syllable-pair features, not a dense encoder: a learned dense layer memorised the training entities (held-out recall at 5 fell to about 40%), and the toy world has no paraphrases for a dense encoder to exploit. Said on the page.
- The toy does not reproduce RAG-Token combining two documents, and the page says so in the Reading tab rather than in a box: it is a property of RAG-Token's objective (a document gets no gradient for a token it cannot explain), so the predict question's answer is "neither", with the paper's Figure 2 as the counter-evidence. Two answer formats were tried; the task was not tuned further until it worked (papers.md, honesty rules).
- The closed-book generator is trained and measured but not shipped (50 KB for a model that guesses), to keep the page under 300 KB.
- "What it takes to use this" is kept although the paper is a 2020 classic: the original trained RAG is still released and usable, and differs from the frozen pattern that took its name.
- Figure 3 is described, not redrawn (it prints no values).
- The Reading tab is 16 minutes against the old page's 9: the page owns every detail of the paper, and the evidence section, the toy's honest negative result and the predict reveals add about 1,200 words. Results were folded into one list to keep it there.

## The toy model

- `world.py`: the made-up encyclopedia (300 countries, 420 people, 150 authors; 1,020 documents in a 2018 and a 2016 edition, 120 presidents changed) and the questions, two phrasings each, with 60 countries and 40 authors held out: their facts are never a training answer.
- `train.py pre`: retriever pretraining (the DPR stand-in, contrastive over the whole index on training questions of the three single-document kinds) and generator pretraining (the BART stand-in: reconstruct every 2018 document with one name masked). `train.py rag <variant> <seed>`: RAG fine-tuning (negative marginal log-likelihood, Adam, k = 5, document encoder frozen). Variants: `tok`, `seq`, `closed`, `tok_frozen`, `seq_frozen`, `tok_bm25`, `seq_bm25`, `tok_scratch`; seeds 0 to 2 for `tok` and `seq`. `run_all.sh` trains them one after another (about 5 minutes each on 2 threads; `uv run --with torch --with numpy`, torch is never added to pyproject.toml). `train.py export` quantises the shipped models (6-bit, one base64 character per weight), re-measures them and writes `parts/20_model_data.js` with every variant's results.
- `check_forward.py`: the JavaScript forward pass (`parts/22_js_rag.js`) against PyTorch on the same 6-bit weights, all 488 held-out questions; writes `model/check_forward.json`, shown on the page after the next export.
- `model/`: per-run results (`*_s<seed>.json`), logs, `check_forward.json`, `report.json`.

## Other files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an unexpanded macro or an em-dash.
- `paper.json` (card, verdict, resources, connections, anchor labels: this paper's HTML numbers tables by figure environment, so `S4.T5` is Table 4), `mk_paper.py` (from the ZeRO folder, plus the `labels` override).
- `mk_tables.py` writes `tables.json` (Tables 1 to 7 transcribed, printed precision). `recompute.py` writes `inputs/recompute.json`: Table 1 margins and their standard errors, Table 2 deltas, Table 4 sums, Table 6 learned-minus-frozen and minus-BM25 cell by cell, hot-swap counts of 82, Appendix G parameter and index arithmetic.
- `save_live.py` copied the Notion fetch verbatim into `live.md`; `extract_paper.py` turned the arXiv HTML v4 into `inputs/paper_v4.txt` and `inputs/table_*.txt`; `inputs/later_extracts.txt` holds the abstracts of the later papers quoted in Then and now and Why it matters, plus three Atlas passages.
- `check_page.mjs` (from the repo root with node): every control in light 920 and dark 390, both animations stepped through every step and question, text at least 11 px, no NaN or errors, no sideways scroll. `mk_coverage.py`: writes and verifies `coverage.json` against `live.md`.

## Parts

HTML: `00_top`, `01_css` (reference CSS plus a few RAG lines at the end), `02_header`, `03_paper`, `04_run`, `05_tables`, `06_then`, generated `_gen_card`, `_gen_more`. JS: `10_js_common`, `_gen_data`, `11_js_ui` (reference, unchanged), `20_model_data` (generated weights and results), `21_js_world` (rebuilds the encyclopedia and questions), `22_js_rag` (retriever, generator, both marginalisations, decoding), `13_js_read` (Figure 1, Table 1 bars, toy numbers in the prose, hot-swap reveal), `14_js_anim` (the marginalisation animation; `window.__mx()` returns its answers), `15_js_run`, `16_js_tables`, `17_js_then`, `90_js_tabs`.
- The `.pt` checkpoints are not kept (the page ships its quantised weights; `train.py` regenerates them).
