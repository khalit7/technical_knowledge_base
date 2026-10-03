Source of the interactive HTML on the Notion page "Sequence models: the pre-transformer lineage" (child of Topic: ml-fundamentals).

Build: `sh build.sh` runs `export_data.py` (writes `parts/21_js_data.js` from `inputs/` and `model/runs/`), then writes `../index.html` from `parts/` (parts listed explicitly: 01_head, 10_header, 20_read_a/b/c, 31_tab_vec, 39_tab_more; every *.js in its own script, 99_js_tabs.js last; links as {{text|url}}, n:<notion id> or #t-<tab>), and fills in the reading time and the best-resources total.

Tabs: Reading (in one screen; word vectors and the analogy test; RNNs and BPTT; the LSTM gate by gate with the animation; GRU; measured memory results; seq2seq; attention with the fixed-vector against attention animation and accuracy chart; WaveNet with the receptive-field animation; where the lineage ends; common mistakes), Word vectors (real GloVe: neighbours, analogies, the test, a projection), Further reading.

Shape: Part B of `html_utils/methods/topic_pages.md` (a child page owns its subject's depth). The Reading tab follows the lineage in order, each section ending at the failure the next model fixed, because that chain is the page's question. The parent root's lineage table and BPTT slider, the Attention paper page's RNN-against-self-attention animation and Mamba's gated-RNN slider are linked, not rebuilt (see `viz_ideas.md`). Size is about 368 KB, over the usual 300 KB, because the page ships 2,000 real GloVe vectors (133 KB as base64 int8) and two trained seq2seq models (about 40 KB); smaller vectors or a smaller vocabulary would have dropped analogy-test words.

Files:
- `live.md`: the old Notion text, verbatim (Notion copy dated 2026-09-22, fetched 2026-10-03). No child pages, databases or video. `mk_coverage.py` writes `coverage.json` (59 facts, all found in the built page; corrections noted).
- `glove_subset.py`: reads GloVe 6B 50d (gensim-data mirror `glove-wiki-gigaword-50`, 66 MB, kept in scratch, not committed) and `questions-words.txt`; runs the analogy test on all 400,000 words; writes `inputs/glove_subset.json` (2,000 words, int8), `inputs/glove_questions_subset.json`, `inputs/glove_eval.json`.
- `model/train_memory.py`: remember-the-first-symbol task, plain RNN, GRU, LSTM (8 units), training lengths 10/20/50/100 x learning rates 0.003/0.01/0.03 x 3 seeds; `runs/memory_results.json`, `memory_weights.json`. About 10 minutes on 2 CPU threads.
- `model/train_seq2seq.py`: copy task, GRU encoder-decoder with a fixed context vector, with the source reversed, and with Bahdanau attention, 2 seeds; int8 weights and PyTorch reference outputs in `runs/seq2seq_weights.json`. About 7 minutes.
- `recompute.py` -> `inputs/recompute.json`: every number the text states (34 checks, 0 failures), including the page's own analogy-test output against a numpy recomputation.
- `check_page.mjs` (node, needs html_utils/node_modules): every control in light 920 and dark 390 (1,496 actions), scanning for NaN, undefined, Infinity, null and errors; seq2seq forward pass against PyTorch; dumps the page's cell outputs to `model/runs/page_dump.json`; screenshots `x-*.png` in `../.shots/`.
- `check_cells.py`: the page's LSTM, GRU and RNN against PyTorch's on 16 sequences (max difference 7.5e-8).
- `viz_ideas.md`: candidates scored, chosen and rejected.

Checks (3 October 2026): `sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 3 tabs. `node src/check_page.mjs`: 1,496 actions, 0 problems, seq2seq forward OK. `check_cells.py`: 16 of 16 equal.
