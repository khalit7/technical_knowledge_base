# Python page, Part 1 "In depth" (part key `pa`)

Python as it really works, for someone who already writes it. Tabs (part bar "1 In depth"): **Reading** (`t-pa-read`, 14 sections, about 45 minutes), **Event loop** (`t-pa-loop`), **Data model** (`t-pa-dm`), **Predict the output** (`t-pa-drill`). Further reading is the last Reading section, so the part stays self-contained; a page-wide Further reading can link it.

## How it is built

- `code/*.py`: every example shown on the page. `run_all.sh` runs each one and writes `outputs/` (text and JSON); paths to this folder are shortened to the file name and the scratchpad's stdlib path to `<stdlib>/`. `versions.txt` records interpreters, tools, machine and load average of the last run.
- `tpl/*.html`, `tpl/*.js`: the part sources. `gen.py` expands markers (`[[run:NAME]]`, `[[code:NAME@a-b]]`, `[[out:FILE|label]]`, `[[predict:NAME]]`, `[[json:KEY]]`) with the real code (coloured with the stdlib tokenizer) and the recorded outputs, and writes `../parts/30_tab_pa_read_*.html`, `31..33_tab_pa_*.html` and `34..38_js_pa_*.js`. Never edit those generated parts by hand: edit `tpl/` and re-run `python3 gen.py`, then `sh ../build.sh`.
- `check_numbers.py`: after a re-run of `run_all.sh`, lists any measured number quoted in the prose that no longer matches the outputs (timings move with load).
- `check_ui.mjs` (from the page folder: `node src/pa/check_ui.mjs`): clicks every control of the four tabs at 390 dark and 920 light, steps every animation to its end, and checks that each displayed output equals its file in `outputs/`, that the drills and the event-loop trace equal their JSON, with no errors, NaN, undefined or sideways scroll.

Order: `sh run_all.sh && python3 check_numbers.py && python3 gen.py && sh ../build.sh && node check_ui.mjs`.

## Toolchain (all in the session scratchpad, never system-wide)

CPython 3.14.8 (uv-managed, venv `pl/pa/venv` with numpy 2.5.3, mypy 2.4.0, ty 0.0.84, py-spy 0.4.2, scalene 2.3.0), CPython 3.13.16 and 3.14.8 free-threaded for the two comparison runs. See `versions.txt`. Machine: Apple M1 Pro, macOS 27.0.1, in normal use (load average 6 to 11 while measuring; each timing output prints its own).

## Departures from the method

- Several agents build this one Notion page, so this part has no Further reading tab of its own (section 14 instead) and uses its own section nav (`#pa-nav`) and render hooks (`TAB_RENDER['t-pa-*']`), because the shared `RD.onResize` and `#rd-nav` code assumes a single `t-read` tab.
- Size: this part is about 230 KB of the page, most of it real code and recorded outputs (the full scripts behind the Event loop and Data model tabs are shown under them). Accepted, not cut.
- py-spy could not be demonstrated (macOS requires root; the refusal is shown as real output). Scalene ran instead.
