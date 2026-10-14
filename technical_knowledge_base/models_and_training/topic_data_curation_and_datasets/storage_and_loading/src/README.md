# Storage and loading at scale: source

Child page 9 of Topic: data-curation-and-datasets (prefix `sl`). `sh src/build.sh` writes `../index.html`.

## Layout
- `parts/`: `01_head.html` (shared CSS from the parent), `02_css.html` (this page's CSS), `10_header.html`, Reading `20_read_a.html` to `20_read_f.html`,
  tabs `30_tab_fmt.html` (Format comparer), `32_tab_pack.html` (Packing lab), `34_tab_shuf.html` (Shuffle and resume), `36_tab_calc.html` (Throughput calculator),
  `39_tab_more.html` (Further reading); JS `21_js_rd_common.js` (parent's helpers), `22_js_data.js` (generated), `23_js_sl_rd.js`, `24_js_sl_meg.js`, `31_js_sl_fmt.js`,
  `33_js_sl_pack.js`, `35_js_sl_shuf.js`, `37_js_sl_calc.js`, `99_js_tabs.js` (storage key `sl-tab`).
- `recompute.py`: builds `data/sl_data.json` from `data/raw/` and asserts the numbers the prose quotes.
- `data/raw/`: the run outputs (small, per-document arrays dropped by `scripts/collect_raw.py`).
- `scripts/`: every measurement, run outside the repo with a page venv (pyarrow 26.0.0, zstandard 0.25.0, tokenizers 0.22.2, webdataset 1.0.2,
  mosaicml-streaming 0.13.0, pylance 13.0.0, torch 2.14.1 CPU, torchdata 0.11.0, datasets 5.0.1), `nice -n 15`, 4 threads:
  - `formats.py <parquet> <N> <qwen3 tokenizer.json> <gpt2 tokenizer.json> <workdir> <out> [--time]`: sizes of 30 variants (reproduces the root Tool map's 7 sizes byte for byte, asserted), Megatron .bin/.idx written to the source layout, rough read and random-access timings.
  - `tok_lens.py`: Qwen3 lengths of 50,000 documents and rough tokenizer throughput.
  - `packing.py`: pad, truncate, concatenate, best-fit decreasing at L = 1,024 to 8,192 (2,000 and 50,000 documents).
  - `shuffle.py`: 11 Nemotron-CC partitions as shards, read back by datasets streaming shuffles, a 4-worker DataLoader, MosaicML Streaming's shuffle functions and a global permutation.
  - `resume.py`: stop-and-resume with naive restarts, a Megatron-style index, torchdata StatefulDataLoader, datasets `state_dict()` and MosaicML Streaming; the IterableDataset worker trap.
  - `loader_speed.py`: rough memmap and DataLoader throughput.
  - `megatron_demo.py`: Megatron's three indices on 12 real documents (port of gpt_dataset.py and helpers.cpp at 80781ab), nanoGPT random offsets, the uint16 wrap.
  - `collect_raw.py`: copies outputs into `data/raw/`.
- `check_page.mjs`: from the repo root, `node .../storage_and_loading/src/check_page.mjs`: clicks every control at 390 dark and 920 light, checks embedded data, JS-against-Python for packing and shuffle metrics, and 37 prose numbers.
- `viz_ideas.md`, `coverage.md`.

Input data: the topic's running example (FineWeb CC-MAIN-2024-30 random 50k sample, first 2,000 and 50,000 rows; Nemotron-CC head samples), Qwen3-0.6B and GPT-2 tokenizers; the FineWeb `000_00000.parquet` footer read by HTTP range (revision 9bb295dd).

Shape: the child-page method (Reading organised by the subject's own logic, one tab per standalone lab, Further reading). No GPU runs: everything here is CPU work.
