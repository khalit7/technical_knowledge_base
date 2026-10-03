Source of the interactive HTML on the Notion page "Tokenizers" (child of Topic: llm-training-and-post-training).

Build: `sh build.sh` runs `export_data.py` (writes `parts/21_js_data.js` from `inputs/`), then writes `../index.html` from `parts/` (01_head, 10_header, 20_read_*.html for the Reading tab with 20_read_a first, 3x_tab_*.html, every *.js in its own script, 99_js_tabs.js last; links as {{text|url}}, n:<notion id> or #t-<tab>), and fills in the reading time and the best-resources total.

Tabs: Reading (in one screen, words/characters/bytes/subwords with the granularity bars, the algorithms, the three-algorithm trainer animation, encoding and pre-tokenizer digit rules, what 2026 models use, the language tax, failure modes on ten real tokenizers, special tokens, beyond subwords with BLT's patches, training your own, common mistakes), Same text, ten tokenizers, Vocabulary size, Further reading.

Shape: no method file covers deep-dive child pages; built from the brief. The page follows the old page's order (design space, algorithms, current models, practical notes) because that is the reader's path from "what is a token" to "what does my choice cost". The mechanism (training) gets the before/after animation inline; the two "across all X" questions (all languages, all models) get their own tabs.

Files:
- `live.md`: the old Notion text, verbatim (fetched 2026-10-03; Notion's copy dated 2026-09-20), copied from the session transcript by `save_live.py`. `mk_coverage.py` writes `coverage.json` (61 facts of live.md, where the page carries them, all found in the built page; 7 corrected).
- `tok_data.py` (uv, with tokenizers, tiktoken, huggingface_hub; needs FLORES-200 and Petrov et al.'s CSVs, see its header): token counts for 204 languages x 10 tokenizers (`inputs/flores_counts.json`), the Petrov check (`inputs/petrov_check.json`: 204/204 for five columns), example tokenizations and the GPT-4o table (`inputs/examples.json`, from `inputs/gpt4o_sentences.tsv`).
- `ref_algos.py` (uv) -> `inputs/ref_algos.json`: the library's BpeTrainer and the HF course's WordPiece and Unigram code on four corpora; `check_algos.mjs` (node) runs `parts/22_js_algos.js` against it: 36/36 identical.
- `vocab_data.py` (stdlib) -> `inputs/configs.json`: vocab_size, width, tying, parameters and repository dates from Hugging Face (Mistral Large 3's repository name 404'd and is left out). `overlap.py` (uv) -> `inputs/vocab_overlap.json`: entry counts and shared entries between tokenizer generations.
- `recompute.py` (stdlib) -> `inputs/recompute.json`: every derived number the text quotes, and a check that the built page carries each (24/24).
- `check_page.mjs` (node, from the page folder): every control in light 920 and dark 390, scanning for NaN, undefined, Infinity, null and errors, checks the trainer's step counts, the course's first WordPiece merge, the 18/20 GPT-4o line and the Gemma 3 270M calculator default; screenshots `el-*.png` in `.shots/`.
- `viz_ideas.md`: candidates scored, chosen and rejected.

Mirrors used where the official repository is gated: NousResearch (Llama 2, Llama 3), unsloth (Llama 3.2, Llama 4, Gemma 1 and 3). Not stored here: tokenizer files (Hugging Face cache), FLORES-200 (25 MB).

Checks (3 October 2026): `sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 4 tabs. `node src/check_page.mjs`: 658 actions, 0 problems. `node src/check_algos.mjs`: 36 match, 0 mismatch.
