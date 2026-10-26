# src/ja: the recorded examples behind this page

Copied with `cp -R` from the language page's `src/ja/` on 2026-10-26 and trimmed to this page (the language page's copy is unchanged). Part key `ja` is kept for provenance; the page's own classes and globals use the prefix `el`.

- `code/`: `i1` to `i9` (callbacks, promises, ordering, the to-scale trace, combinators, abort, unhandled rejections, `forEach`, the limiter), `j1_sse.mjs` (a local SSE server and both parsers), `j2_async_gen.mjs`, and `loop/` (the stepper's six programs).
- `outputs/`: their recorded runs (Node 24.21.0, Apple M1 Pro, 2026-10-05). Cleaning, as on the language page: paths to `code/` shortened to the file name, Node's internal stack frames dropped, a non-zero exit shown as `[exit code N]`. `node_versions_diff.txt` is the language page's cross-version check over its wider set (38 examples, 6 loop programs, 22 drills: no differences on Node 22.22.2 and 26.10.0).
- `tpl/`: the page's Reading parts and scripts. `gen.py` expands the markers (`[[run:]]`, `[[code:]]`, `[[out:]]`, `[[predict:]]`, `[[outc:]]` added here for an output in the core with its code in a closed block, `[[json:]]`) and writes `../parts/20_read_*.html` and `22..25_js_el_*.js`. Never edit those parts by hand: edit `tpl/`, run `python3 gen.py`, then `sh ../build.sh`.
- `run_all.sh`: reruns everything (trimmed from the language page's; the toolchains live outside the repo, see `versions.txt`, which is the language page's record of the whole toolchain).
- `coverage.json`: the old Notion page "JavaScript: zero to expert" claims this page carries (10 of the language page's 46; 1 corrected: an unawaited rejected promise crashes Node since 15, it does not disappear).

Order after a rerun: `sh run_all.sh && python3 gen.py && sh ../build.sh && node ../check_controls.mjs`.
