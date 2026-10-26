# Sources and runs of "JavaScript and TypeScript: the essentials" (folder `ja`)

What this page shows from real runs: running a file (`a1_hello`), Node's standard library (`k1_fs`, `k2_process`, `k5_fetch`), the root's token counter streamed (`k3_count_tokens`) against reading the whole file (`k4_whole`, `m3_memory.sh`), worker threads (`k6_workers`), installs with npm, pnpm and Bun (`l1_npm.sh`, `l2_pnpm.sh`), three runtimes and their start-up (`m1_runtimes.sh`, `m2_startup.sh`), prototype pollution (`x2_pollution`) and `Date` against `Temporal` (`x1_temporal`). Everything else of the old Part 1 lives in the children's own `src/ja/` (the language page: values to V8, the 22 drills; the event-loop page: async, the stepper, SSE).

Section anchors other pages can link: `#je-top` (the idea and hero), `#je-s1` running JavaScript, `#je-s2` Node essentials (files, process, streaming, fetch, worker threads), `#je-s3` runtimes and packages (the one table), `#je-s4` traps, `#je-s5` the child pages.

## How it is built
- `code/`: the examples. `run_all.sh` runs each with Node 24.21.0 and writes `outputs/`. Cleaning applied: paths to `code/` shortened to the file name, the scratch work folder shown as `<work>`, the root's rosetta folder as `<rosetta>`, Node's internal stack frames dropped, a non-zero exit shown as `[exit code N]`. The root's `chat.jsonl` and generator are found by walking up to `topic_programming_languages`.
- `outputs/node_versions_diff.txt` is the 2026-10-05 check over the whole old Part 1 (no difference on Node 22.22.2 or 26.10.0); a rerun of the trimmed `run_all.sh` rewrites it for this page's three deterministic examples.
- `tpl/20_read_*.html`: the Reading sections. `gen.py` expands `[[run:]]`, `[[outc:]]` (output open, script in a closed block), `[[out:]]`, `[[code:]]` and `[[gen:startup|memory|heartbeat|install]]` (static bars drawn from the recorded outputs) and writes `../parts/20_read_*.html`. Never edit those parts by hand.
- `check_embed.py`: every embedded output equals its file, every output file is on the page, and the bar labels carry the recorded numbers.
- `coverage.json`: the old written page's claims that this page still carries or points to (trimmed 2026-10-26).

Order: `sh run_all.sh && python3 gen.py && sh ../build.sh && python3 check_embed.py`.

## Toolchain (in a scratch folder, never system-wide)
Node 24.21.0 and 26.10.0 (official darwin-arm64 tarballs), Node 22.22.2 (nvm), Deno 2.9.7, pnpm 12.9.1, bun 1.4.2, hyperfine 1.20.0; npm's cache and config (an empty npmrc), pnpm's store, Bun's and Deno's caches all point into the scratch folder. See `versions.txt`. Machine: Apple M1 Pro, macOS 27.0.1, in normal use; load averages are printed by the timing scripts.
