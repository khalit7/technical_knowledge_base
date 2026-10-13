# Source of the Extending PyTorch page

Build: `sh src/build.sh` (writes `../index.html`). Data: `python3 src/build_data.py` turns `inputs/*.json` into `parts/22_ext_data.js`; `python3 src/check_data.py` checks the page embeds exactly that data and that every number in the prose is in it (or in its short list of sourced constants).

## Parts
- `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js`: copied from the root (title and storage key `pt-ext-tab` changed). `10_header.html`: title and tab bar.
- Reading: `20_read_a.html` (style), `20_read_b` (nav, section 0), `c` (1 custom ops), `d` (2 under compile, the two traps), `e` (3 C++), `f` (4 Metal, Triton, Helion), `g` (5 subclasses), `h` (6 to 9), `i` (mistakes, interview), `z` (close). JS: `23_ext_rd.js` (fills `data-v`/`data-q`, tables, predict widgets), `24_ext_rd_anim.js` (two before/after animations).
- Tabs: `31_*` Which extension point? (decision tree), `32_*` Custom-op lab, `33_*` Subclass tracer, `39_tab_more.html`.

## Experiments (`exp/`, shared venv python, torch 2.14.1; set `EXT_SCRATCH` to a scratch folder and put the venv's bin on PATH for ninja)
| Script | Writes | What |
|---|---|---|
| `gelu_ext.cpp`, `cpp_ext.py` | | the C++ GELU (TORCH_LIBRARY `extc` + pybind functions), built with `load_inline` |
| `custom_ops.py` (and `--cpp-fresh`) | `custom_ops.json`, `custom_ops_cpp_fresh.json` | ten registrations: eager grads, dynamo.explain, compile fullgraph, opcheck per test |
| `cache_trap.py` | `cache_trap.json` | four processes sharing one compile cache (the AOTAutograd cache trap) |
| `op_extras.py` | `op_extras.json` | schema inference, Inductor wrapper code, data-dependent fake, CPU+MPS (Metal) op, duplicate TORCH_LIBRARY abort |
| `graphs.py` | `graphs.json` | per-graph op lists for the Dynamo animation; torch.export with/without the op |
| `subclasses.py`, `subclasses_int8.py` | `subclasses.json` | __torch_function__ vs __torch_dispatch__ traces; the Int8Weight subclass eager/compiled/AOT graph |
| `real_subclasses.py` | `real_subclasses.json` | DTensor (1-rank gloo, port 29550), NF4, torchao Int8, Float8 flattened; FakeTensorMode, FlopCounterMode |
| `helion_k.py`, `helion_ref.py` | `helion.json` | Helion 1.4.0 metal backend on MPS (PYTHONPATH to the unpacked wheel, not installed), ref mode on CPU |
| `quotes.py` | `quotes.json` | source lines at torch v2.14.1, torchao v0.18.0, helion v1.4.0 |
| `timing.py` | `timing.json` | the only timed runs (bench lock, load avg 2.6 to 3.7): per call, step, int8 forward, cold build |

Every script uses a private Inductor cache (`common.py`): a warm shared cache can hide registration changes (see `cache_trap.py`).

## Departures from the child-page method
No old page, so no `live.md`/`coverage.json`; corrections to claims in the old root notes are in `coverage.md`. The "compare everything" pattern became a lab (ten variants side by side) and a chooser, since the subject is choices among mechanisms rather than a dataset.
