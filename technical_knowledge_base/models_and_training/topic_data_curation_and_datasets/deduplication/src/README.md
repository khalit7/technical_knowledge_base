# Source of the deduplication child page (prefix dp)

Build: `sh build.sh` (runs `build_data.py`, which merges `data/out/*.json` and four root Dedup lab outputs into
`data/dp_data.json`, embedded as `window.DP`). Check: from the repo root,
`sh html_utils/checkpage.sh <this page folder>` and `node <this folder>/src/check_page.mjs [shot dir]` (every control at
390 dark and 920 light, embedded data equals the file, JS reproduces datasketch's (b, r) rule and the published
S-curve points, prose numbers equal data).

## Measurements (run order; shared env, CPU only, `nice -n 15`, 4 threads)

```sh
export DC_SCRATCH=<the shared dc setup folder> HF_HOME=$DC_SCRATCH/hf OMP_NUM_THREADS=4 HF_HUB_OFFLINE=1
PY="nice -n 15 $DC_SCRATCH/venv/bin/python -I -B"
# needs the root lab's dd_pairs.py and dd_semantic.py outputs (pairs.npz, shingles.pkl, emb.npy) in $DC_SCRATCH/dedup/
$PY scripts/dp_mh.py          # 1,024-hash signatures (seed 2), estimator spread, equality masks for the Band designer
$PY scripts/dp_mh_seeds.py    # 24 real pairs x 2,000 hash families: estimate histograms, candidate rate vs S-curve
$PY scripts/dp_mhdemo.py      # the three pairs of the MinHash animation (datatrove's own signer, checked)
$PY scripts/dp_uf.py          # datatrove's bucket + union-find steps replayed; equals run0's remove file
$PY scripts/dp_ufscale.py     # union-find memory per node (dict) and scipy connected components timing (rough)
$PY scripts/dp_simhash.py     # 64-bit SimHash on the same shingles, Hamming for all 3.6M pairs
$PY scripts/dp_sa.py tokens scope corpora   # suffix arrays: tokens vs bytes, scope growth, four corpora (Google tool)
$PY scripts/dp_sem.py         # SemDeDup with three encoders, D4 prototype pruning vs quality scores
$PY scripts/dp_compare.py     # every combination of exact / fuzzy / semantic / suffix array on the 2,692 documents
$PY scripts/snippet_exact.py; $PY scripts/snippet_minhash.py   # the code shown in the Reading tab, with its output
```

GPU run: `scripts/run_pending.sh d4-fwedu50k` (SemDeDup and D4 on 50,000 FineWeb-Edu rows), run 2026-10-15 on MPS in
float32 (2,037 s of embedding); its output `data/out/dp_d4_fw50k.json` is embedded and replaces the pending box.

## Shape

Child-page method (html_utils/methods/topic_pages.md Part B). The root's Dedup lab already ran every method once
(overlap table, 14-document before/after, S-curve sliders over 112-bit masks, suffix-array toy, Bloom toy, cost
calculator); this page does not rebuild those and goes deeper: variance, the (b, r) rule, union-find replayed,
SimHash, tokens vs bytes, scope growth, encoder sensitivity, D4, combinations in sequence, published evidence and costs.

## Sources

Research notes with table numbers and URLs (read 2026-10-15) were collected in the session scratch; every number on
the page links its paper or names its file and line at a pinned version. Published tables quoted: Lee et al. Tables
2-5, 12, 13; Kandpal et al. Table 1; Pythia Tables 7-8; Muennighoff et al. Table 14; DCLM Tables 4, 17-23; FineWeb
Section 3.4 and Appendix E; Nemotron-CC Table 4; SemDeDup Table A12; D4 Table 1; DeepSeek LLM Table 1; SlimPajama-DC
Table 2.

## Privacy

Only hostnames and the text of three boilerplate pairs (forum software, a shop template, a network banner) reach the
page; text passes through the running example's PII formatter. `dp_common.save` refuses outputs containing local paths.
