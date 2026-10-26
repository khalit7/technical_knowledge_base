# pb: free-threading, subinterpreters and the wheel survey

Copied from the Python language page's `src/pb/` on 2026-10-26 and trimmed to this page. `bash run_all.sh` reruns every measurement and transcript (needs `env.sh`'s scratch toolchain and network for PyPI), regenerates `../parts/22_js_cg_0pb.js` with `build_data.py`, rebuilds and runs `check_embed.py` (the page embeds exactly `out/`).

| Folder | What it records |
|---|---|
| `ft/` | free-threading scaling, per-block traces and lost updates (`ft_bench.py`, workload `tokwork.py`); `cext/`: two tiny C extensions showing the GIL turned back on |
| `interp/` | threads vs processes vs subinterpreters; the sys.path mistake; NumPy refusing to load in a subinterpreter |
| `pack/` | PyPI wheel-tag survey of 25 compiled packages (`wheels.py`); the orjson free-threaded build failure |

`versions.txt` lists every tool of the original Part 2 run (some were used only by material now on the sibling pages). `coverage.json`: the old Notion page's claims on these subjects.
