# Dedup lab (tab `t-dedup`, parts `32_*`, ids and classes prefixed `dd-`)

Every deduplication method a pretraining pipeline uses, run on the running example (run0 of the root's
`src/data/`: one CC-MAIN-2024-30 WARC through a FineWeb-style datatrove pipeline), measured on 2026-10-14 on an
Apple M1 Pro, CPU only. Built to be reused by the `deduplication` child page: every script reads run0 through
`../data/load.py` and writes small results to `out/`.

## Run order

```sh
export DC_SCRATCH=<the shared dc setup folder> HF_HOME=$DC_SCRATCH/hf OMP_NUM_THREADS=4
PY="nice -n 15 $DC_SCRATCH/venv/bin/python -I -B"
$PY dd_pairs.py        # all 3,622,086 pairs of the 2,692 filtered documents: true Jaccard, MinHash equality masks
$PY dd_scurve.py       # S-curve against measured pairs, clusters (reproduces run0's 75 removals), out/dd_pairs.json
$PY dd_bighash.py      # 286 and 9,000 hash settings (Dolma 3 web, RefinedWeb's two readings)
$PY dd_exact.py        # exact document, normalised, URL and line dedup on extracted / filtered / final
OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES $PY dd_sentdedup.py   # C4 three-sentence spans (datatrove SentenceDedup)
$PY dd_suffix.py       # suffix arrays (Google deduplicate-text-datasets, built in $DC_SCRATCH/src) at L = 50..1000 bytes
$PY dd_bloom.py        # Dolma toolkit paragraph dedup at 6 Bloom filter sizes, 3 runs each, plus the min_words finding
$PY dd_semantic.py     # SemDeDup rule on CPU with the arctic-embed-m encoder (about 7 minutes)
$PY dd_fineweb.py      # attribution against FineWeb's kept documents; MinHash join with 50k random FineWeb rows
$PY dd_fwshard.py get sign join   # the same join against a whole FineWeb shard (971,981 rows; downloads 2 GB)
PYTHONPATH=<folder with the surt package> $DC_SCRATCH/venv/bin/python -B dd_cdx.py index|fetch|compare   # same URLs in 4 older crawls
$PY dd_compare.py      # per-document join of all methods, labelled pairs (labels_boundary.json)
$PY dd_pagedata.py     # writes ../parts/32_js_dd_0data.js
sh ../build.sh && python3 check_numbers.py && node check_tab.mjs ../../index.html <screenshot dir>
```

`dd_label_view.py` printed the seeded sample that `labels_boundary.json` labels (by hand). `run_pending.sh` holds the
GPU run (semantic dedup on 50k FineWeb rows with two encoders, `dd_semantic_fw50k.py`).

## Shape

One tab, sections in teaching order (glance, exact, MinHash, clusters, suffix arrays, Bloom, semantic, scope across
files and crawls, cost, source, check yourself). The Reading tab owns the MinHash basics and the published S-curve
(FineWeb's 56/77/92/98.8%, RefinedWeb's 76/99.4%); this tab does not redraw it but moves to measured pairs.

## Privacy

Only hostnames reach the page, plus excerpts of the 14 showcase documents and boilerplate lines and spans chosen by
rule (lines on 5 or more hosts; spans from the PII-scrubbed final stage matching boilerplate keywords), all passed
through datatrove's PIIFormatter. `dd_common.save` refuses any output containing a local path.
