# Storage and loading at scale: source

Child page 9 of Topic: data-curation-and-datasets (prefix `sl`). `sh src/build.sh` writes `../index.html`.

## Layout (rebuilt 2026-10-24 to the teaching contract)
- `parts/`: `01_head.html` (shared CSS from the parent), `02_css.html` (this page's CSS, plus the top-of-page and depth-block styles), `10_header.html`
  (tabs: Reading, Format comparer, Further reading), Reading `20_read_a.html` (the idea in one screen, sections 1 and 2) to `20_read_g.html` (section 13, closed
  design questions, closes the tab), `30_tab_fmt.html` (Format comparer), `39_tab_more.html` (Further reading); JS `21_js_rd_common.js` (the skill template:
  never autoplays), `22_js_data.js` (generated), `23_js_sl_rd.js` (tables, predicts, FineWeb footer), `24_js_sl_meg.js` (Megatron and nanoGPT stepper),
  `25_js_sl_vis.js` (hero, tar and MDS layout, sharding diagram, prefetch before/after), `31_js_sl_fmt.js` (Format comparer, drawn when its tab opens),
  `33_js_sl_pack.js` (packing, section 6), `35_js_sl_shuf.js` (shuffle visualiser, section 8, and resume panel, section 11), `37_js_sl_calc.js`
  (throughput calculator, section 12), `99_js_tabs.js` (the skill template, storage key `sl-tab`).
- `recompute.py`: builds `data/sl_data.json` from `data/raw/` and asserts the numbers the prose quotes (and that the prefetch model lands within 1.3% of both measured S3 totals).
- `data/raw/`: the run outputs (small, per-document arrays dropped by `scripts/collect_raw.py`), plus `prefetch_storage_lab.json`, copied unchanged on 2026-10-24 from the Storage and data movement page's data (its Storage lab's prefetch run; provenance inside the file).
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
- `check_page.mjs`: from the repo root, `node .../storage_and_loading/src/check_page.mjs`: clicks every control at 390 dark and 920 light, checks no animation moves on its own, embedded data, JS-against-Python for packing and shuffle metrics, and 38 prose numbers; saves element screenshots to `../.shots/`.
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check <page>`).
- `viz_ideas.md`, `coverage.md` (the original build's corrections to the root).

Input data: the topic's running example (FineWeb CC-MAIN-2024-30 random 50k sample, first 2,000 and 50,000 rows; Nemotron-CC head samples), Qwen3-0.6B and GPT-2 tokenizers; the FineWeb `000_00000.parquet` footer read by HTTP range (revision 9bb295dd).

Shape: the child-page method, rebuilt to the teaching contract. No GPU runs: everything here is CPU work; the rebuild made no new runs.

## The 2026-10-24 rebuild: what changed and why
- **Top of page**: the core idea in one sentence (keep documents and tokens; make the order a pure function of seed and samples consumed), a new hero figure
  (bytes per token of every stored form to scale, then the computed order and the checkpoint loop), "You need", eight new terms. The old six-ideas
  table and the label legend moved into a closed reference block.
- **Labs moved inline** beside the claims they prove: the Packing lab into section 6 (placement stepper, attention per window, the 2,000-document table,
  length histogram; the 50,000-document table closed), Shuffle and resume into sections 8 (visualiser) and 11 (resume panel), the Throughput calculator
  into section 12. Only the Format comparer stays a tab: it spans sections 2 to 5 and every format at once.
- **New visuals** for mechanisms that had none: one tar member to scale against an MDS shard and its index (section 4); index-based against shard-based
  sharding over 2 ranks x 4 workers (section 7); prefetch before/after (section 10), absorbed from Storage and data movement's closed block ("keeps the next
  shards in flight") with its measured data, plus a one-parameter model of a slower store, labelled illustrative, that lands near the measured totals.
- **Merged**: "Tokenizing at scale" into section 5 (sections renumbered 1 to 13). **Linked instead of taught**: S3 request rates and Llama 3's Tectonic numbers
  (owned by Storage and data movement), profiler traces of a data-bound step (Making training fast), Megatron blending (Data mixing).
- **New fact, checked in the library**: `split_dataset_by_node` assigns whole shards only when `num_shards` is a multiple of the world size, otherwise
  every node reads everything and keeps one example in world_size (datasets 5.0.1, `distributed.py` lines 21-23).
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; the packing, Megatron and shuffle steppers wait for the reader
  (checked under normal and reduced motion). Shuffle starts on its final, static frame.
- **Deleted as fat**: wind-ups, "The problem." lead-ins, the common-mistakes list (each mistake restated a section that now shows it; the two with new
  advice, accept-and-log for buffer loss and "fine for a toy" for random offsets, moved into their sections), interview answers that restated the core
  (three design questions kept, closed, in section 13), pointers to removed tabs.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `audit_pages.mjs`) | 6,803 words, 29.6 min | 6,616 words, 28.8 min |
| Reading, closed details | 880 words, 3.8 min | 1,110 words, 4.8 min |
| Other tabs, core | Format comparer 2.9, Packing lab 2.1, Shuffle and resume 2.1, Throughput calculator 1.3 (8.4 min) | Format comparer 2.9 min |
| Core of the subject (Reading plus lab tabs, without Further reading) | 38.0 min | 31.7 min |
| Visuals drawn in Reading | 2 | 13 |

Why about 29 minutes of core is right: the page teaches twelve distinct mechanisms (two lives, compression, columnar files, shard formats, token
files and their indices, packing and masks, sharding, shuffling, streaming, loaders and prefetch, resumption, the cost model), each with measured
numbers from the running example and a figure; Reading absorbed the three lab tabs' explanations (about 1,300 words) and still shrank. About a fifth
of the core words are figure captions, table rows and predict reveals written by script. What could not be cut without losing a ledger unit is the
per-section evidence (library versions, file and line, measured counts); provenance tables, the packing evidence in detail, the 50,000-document
table and design rehearsal are closed.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
346 units: core 258, depth 29, owned 2 (S3 request rates and Llama 3's Tectonic, at Storage and data movement), fat 57. 333 were drafted from the old page by
`ledger.py init`; 13 were added by hand: 8 for script-rendered tables and visuals, 1 absorbed (prefetch), 4 new (core idea and hero, the
split_dataset_by_node rule, the tar-member figure, the sharding diagram). Fat units carry a `note` saying why.

## Topic close (2026-10-24)
The root was rebuilt as a map; this page's Further reading now quotes the root as "31 min, plus 7" and siblings as their headers, and its ledger keys that quoted old times were re-keyed. The Parquet correction now says the root gives the cause; the root card has its time.
