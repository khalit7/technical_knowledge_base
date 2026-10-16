# Source of "Quality classifiers and data selection" (prefix qc)

Child page of Topic: data-curation-and-datasets. Built 2026-10-14/15 on an Apple M1 Pro, CPU only (4 threads, `nice -n 15`,
shared machine). `sh build.sh` writes `../index.html` from `parts/`, embedding `data/qc_data.json` as `window.QC` and filling
`@@key@@` in the prose from `data/facts.json` (both written by `scripts/qc_make_data.py`; an unfilled key means its run is pending).

## Layout
| Path | What |
|---|---|
| `parts/` | `01_head`, `10_header`, Reading `20_read_b` to `20_read_l` (sections 0 to 13, mistakes, interview), tabs `31` Classifier replay, `32` Threshold explorer, `33` Bias browser, `39` Further reading; JS parts `21` (shared helpers, copied from the root; `RD.anim` takes `o.tab`), `22`/`23` Reading, `31`/`32`/`33` tabs, `99` tab wiring (storage key `qc-tab`) |
| `scripts/` | every run, below |
| `labels/` | `labels_qc.jsonl`: 200 run0 documents drawn uniformly at random (seed 1, excluding the root's 100), labelled by the agent that built this page (Claude) from the first 1,000 characters: keep y/u/n, WebOrganizer topic and format, region guess, generated-like flag, one-line note. `sample_ids.json`, `explain_docs.json` (16 documents for token-level views) |
| `data/` | `qc_data.json`, `facts.json`, `out/` (small JSON results of every run) |
| `viz_ideas.md`, `coverage.md` | visual ideas built and rejected; claims checked |

## Environment
```sh
export DC_SCRATCH=<the shared dc setup folder> HF_HOME=$DC_SCRATCH/hf OMP_NUM_THREADS=4 MKL_NUM_THREADS=4
PY="nice -n 15 $DC_SCRATCH/venv/bin/python -B"     # run from scripts/
```
Reuses the root's `src/data/load.py` (running example) and `src/qual/q_common.py` (published scorers). Downloads are recorded
with revision, size and sha256 in `$DC_SCRATCH/SETUP.md` under "qc downloads"; raw files were deleted after use (disk).

## Runs, in order
| Step | Command | Writes | Time (rough, loaded machine) |
|---|---|---|---|
| 1 | `qc_ftexplain.py check <dclm.bin> 2617` | verifies the hand rebuild of fastText (max diff 1.4e-5) | 1 min |
| 2 | `qc_perturb.py edu 300` | `out/perturb.json` typography, case, bullets edits | 2 min |
| 3 | `qc_dialect.py dclm edu` | `out/dialect.json` pass rate by domain, spelling swaps | 3 min |
| 4 | `qc_sample.py`, then hand labelling | `labels/` | |
| 5 | `qc_refsets.py` | `$DC_SCRATCH/qc/ref/*.txt` reference and negative sets | 20 min |
| 6 | `qc_model_all.py dclm`, then `qc_model_all.py <kind> <n>` for oh_eli5 50000, wiki 50000, owt2 50000, gpt3 50000, oh_eli5 200000 | scores, `out/vocab_*.json`, explanations; each model deleted after use | 15 to 30 min each |
| 7 | `qc_train_ref.py gpt3`, `qc_score_ft.py gpt3_lr`, `qc_score_ft.py edu_ft` | GPT-3-style classifier and the root's fastText scores | 15 min |
| 8 | `qc_encoders.py nemo_mixtral` / `nemo_nemotron` (run0, nemo, fw2k), `qc_nemotron.py` | Nemotron-CC graders, ensemble rebuild `out/nemotron.json` | 40 min |
| 9 | `qc_encoders.py wo_topic run0`, `wo_format run0` | WebOrganizer topic and format of run0 | 20 min |
| 10 | `qc_ppl.py run0` | Pythia-160M perplexity of run0 | 20 min |
| 11 | `qc_dsir.py` | DSIR log weights toward three targets, `out/dsir.json` | 30 min |
| 12 | `qc_pairs.py fetch 60` (download lock), `qc_pairs.py score` | Nemotron-CC rewrites paired with their source pages | network-bound |
| 13 | `qc_make_data.py`, `sh ../build.sh` | the page | 2 min |
| 14 | `node check_page.mjs` | every control at 390 px dark and 920 px light | 2 min |
GPU queue (`scripts/run_pending.sh`): job 1 (encoders on 50,000 FineWeb rows) dropped 2026-10-15; job 2 (Qwen3-1.7B perplexity on 2,000 FineWeb rows, `qc_qwen_ppl.py`, float16 + float32 chunked log-softmax) run 2026-10-16 on mps in 836 s, with the FineWeb-Edu classifier rescored on the same rows.

**Scratch wipe (2026-10-15 reboot).** `$DC_SCRATCH/qc` was lost, so `qc_make_data.py` can no longer be rerun as a whole; `data/qc_data.json` and `data/facts.json` hold every recorded value. `scripts/qc_refresh_pending.py` adds the job 2 results and the root's new Qwen3-0.6B and 50,000-row numbers without touching recorded values (one fact, the reading of the 12 lowest-perplexity rows, was written by hand into facts.json).

## Departures from DCLM's recipe (said on the page)
OpenWebText (Skylion007/openwebtext) for OpenWebText2 (absent from pile-uncopyrighted); Project Gutenberg chunks from the Pile
for RedPajama books; sentence-transformers/eli5 (no vote scores) for DCLM's vote-filtered ELI5; real RefinedWeb for DCLM's
RefinedWeb reproduction; 50k + 50k training sets for the reference-set comparison (DCLM: 200k + 200k, rebuilt once at full size);
hyperparameters read from DCLM's model file (lr 0.05) rather than its training script's default (0.1).

## Privacy
Excerpts only from run0 `final/` (PII-scrubbed), at most 220 to 600 characters; hosts reduced to their top-level domain in the
bias browser; pages about a private individual are never excerpted. Labels hold WARC record ids and short notes, no text.
