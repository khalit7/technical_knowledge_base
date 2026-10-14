# Quality lab (tab `t-qual`, parts `33_*`, ids and classes prefixed `q-`)

Model-based quality filtering measured on the running example (see `../data/README.md`), 2026-10-14,
Apple M1 Pro, CPU only (4 threads at most, `nice -n 15`, shared machine). Built to be reused by the child
page "Quality classifiers and data selection": every scorer takes texts and returns floats, with the exact
preprocessing each published pipeline uses.

## Environment
```sh
export DC_SCRATCH=<the shared dc setup folder> HF_HOME=$DC_SCRATCH/hf OMP_NUM_THREADS=4
PY="nice -n 15 $DC_SCRATCH/venv/bin/python -B"            # run from this folder
KPY="nice -n 15 $DC_SCRATCH/q/venv_kenlm/bin/python -B"   # kenlm + sentencepiece (CCNet only)
```
The kenlm venv: `uv venv -p 3.12 $DC_SCRATCH/q/venv_kenlm; uv pip install -p $DC_SCRATCH/q/venv_kenlm/bin/python sentencepiece numpy "kenlm @ https://github.com/kpu/kenlm/archive/master.zip"`.
Downloads (CCNet's English LM, cc_net clone, annotation score column, four arXiv papers) are recorded with
sha256 in `$DC_SCRATCH/SETUP.md` under "Quality lab downloads".

## Order of runs
| Step | Command | What it writes | Time (rough) |
|---|---|---|---|
| 1 | `$PY q_check_models.py` | `out/q_check_models.json`: DCLM fastText reproduces DCLM-baseline's `fasttext_score` (max diff 2e-5 with DCLM's newline handling, mean 0.07 with datatrove's default); FineWeb-Edu classifier reproduces the 159 stored scores (max diff 0.024); DCLM-baseline's lowest score = the cut-off | 1 min |
| 2 | `$PY q_score.py run0`, `nemo`, `annot`, `fw`, `ftall` | `$DC_SCRATCH/q/*.jsonl` scores | 7, 3, 3, 3 min; ftall 15 min |
| 3 | `$PY q_sample.py` | stratified sample (20 per stratum, seed 0) to label: `out/q_sample_ids.json` | seconds |
| 4 | (by hand) | `labels.jsonl`: keep y/n/u, format, generated-like flag, one-line reason; labeller: the agent (Claude) | |
| 5 | `$PY q_train_ft.py` | our fastText on the Llama 3 annotations, config search, learning curve: `out/q_ft.json`, model in `$DC_SCRATCH/q/ft/` | 15 min |
| 6 | `$KPY q_ccnet.py` | CCNet perplexity with cc_net's own English models and normaliser: `out/q_ccnet.json` | 3 min |
| 7 | `$PY q_ppl.py --set run0 --limit 8` | Qwen3-0.6B perplexity smoke test: `out/q_ppl_smoke.json` (full run pending) | 1 min |
| 8 | `$PY q_make_data.py` | `../parts/33_js_q_0data.js` (embedded data) and `out/q_summary.json` (every number in the prose) | 1 min |
| 9 | `node check_q.mjs` | page check: every control at 390 px dark and 920 px light, no errors, NaN or sideways scroll; prose numbers equal `out/q_summary.json` | 1 min |

Pending GPU runs: `run_pending.sh` (Qwen3-0.6B perplexity on all 2,617 documents, about 10 min on mps;
FineWeb-Edu classifier on 50,000 FineWeb rows, about 15 min on mps). Then rerun step 8.

## Privacy
Only `run0/final` (PII-scrubbed) text is excerpted on the page: 300 characters, host name only, 4 excerpts
about private individuals withheld (`WITHHOLD` in `q_make_data.py`). `labels.jsonl` holds WARC record ids,
no text. `metadata.file_path` (an absolute local path) is dropped by `q_common.safe_meta`.

## Departures from the brief
- The FineWeb-Edu classifier's train/test split cannot be rebuilt (the card's hold-out size implies a
  dataset about 1,250 rows larger than the one published now), so the published model is compared on
  annotation rows it mostly trained on; with a frozen encoder and a 769-parameter head this barely matters,
  and the page says so.
- KenLM's CCNet model was downloaded after the disk budget was raised, so perplexity filtering is measured
  with CCNet's own model on CPU; the small-LM variant stays a pending GPU run.
