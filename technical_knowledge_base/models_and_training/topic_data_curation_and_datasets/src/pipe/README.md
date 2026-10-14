# Pipeline lab (tab `t-pipe`): scripts, data and labels

Built 2026-10-14. Everything measured on Apple M1 Pro (CPU), shared machine, `nice -n 15`, at most 4 threads.
Large intermediates live in `$DC_SCRATCH/data/pipe/` (outside the repo); this folder holds the scripts, the small
JSON the page embeds (`out/`), and the hand labels (`labels/`).

## Run order

```
export DC_SCRATCH=<shared dc folder> HF_HOME=$DC_SCRATCH/hf OMP_NUM_THREADS=4 OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
PY="nice -n 15 $DC_SCRATCH/venv/bin/python -I -B"
$PY pip_extract.py      # 1. the 20,280 URL-passed pages through trafilatura (run0), resiliparse (Dolma settings), WET
$PY pip_rules.py        # 2. every rule statistic on the 6,971 English documents; reproduces run0 6,971 of 6,971
$PY pip_funnel.py       # 3. lid.176 on each extraction, the run0 chain per extractor, chain variants
$PY pip_pii.py          # 4. what PIIFormatter caught and what simple detectors still find
$PY pip_struct.py       # 5. tables, code and maths survival per extractor
$PY pip_sample.py draw  # 6. labelling sample (seed 0); `show <group>` prints it; labels typed into make_labels.py
$PY make_labels.py; $PY make_url_labels.py
$PY pip_timing.py       # 7. rough timing, trafilatura against resiliparse, 500 pages, one core
$PY pip_derive.py       # 8. derived numbers (statuses, per-extractor, variants vs FineWeb, LID histogram, GPT-2 tokens)
$PY pip_data.py         # 9. writes ../parts/31_js_pip_0data.js and out/page_data.json
python3 make_for_reading.py   # values for the Reading tab's TODOs 2, 4, 5 -> out/for_reading.json
sh ../build.sh && python3 check_numbers.py && node check_tab.mjs ../../index.html <shots folder>
# widening (three more WARC files of the same segment): $DC_SCRATCH/data/pipe/wide/get.sh, then
$PY pip_wide.py run 00001 (and 00002, 00003); $PY pip_wide.py aggregate   -> out/wide.json
```

Shared helpers in `pip_common.py` (the two macOS workarounds for datatrove, loaders, the run0 chain as datatrove objects).

## Choices and departures

- The filter chain is datatrove 0.10.1's own classes with run0's arguments, so per-document results equal run0's
  (checked: 6,971 of 6,971 rule decisions recomputed, and the trafilatura path of `pip_funnel.py` keeps exactly 2,692).
- resiliparse is run directly (datatrove ships no resiliparse extractor) with the Dolma toolkit's settings
  (`dolma/warc/linearizers.py:34-47`, v1.2.1).
- Labels are by the agent that built the tab (one reader, first 360 to 700 characters), not by a human annotator:
  the page says so. 8 per rule: patterns, not rates.
- Excerpts on the page pass through datatrove's PIIFormatter, are cut to a few hundred characters, and come from
  organisations; `EXCLUDE` in `pip_data.py` lists pages never shown (personal pages, spam). URLs of adult pages are
  never written to the repo. Em-dashes in crawled text are written as `--` (house style), said on the page.
- Timings are rough (load average 9 to 24 during the runs); per-document counts are deterministic and transfer to a
  cluster exactly.
- Paper text read from arXiv HTML (FineWeb 2406.17557v2, RefinedWeb 2306.01116v1, Gopher 2112.11446v2, DCLM
  2406.11794v3), saved in the scratch folder. datatrove history: `language_filter.py` at tags v0.2.0 to v0.6.0 and
  `fineweb_quality_filter.py` at v0.2.0 from raw.githubusercontent.com; release dates from the GitHub releases API.
