# Source of "torch.compile from the user's side"

Child 2 of Topic: pytorch-ecosystem (Notion 3c65c17b0d0d8123a232d75bd7339ecb; the old page "torch.compile: Dynamo, AOTAutograd, Inductor", retitled). Goes one level below the root's Reading section 5 and its Compile lab tab, on the same running example, which it imports from `../../src/model/` and never copies. The old page's text is `../../src/read/old/torch_compile.md`; every claim is accounted for in `coverage.md`.

## Rebuild

With the shared venv's python (torch 2.14.1) as `PY`, from `exp/`, each with its own empty `TORCHINDUCTOR_CACHE_DIR` in a scratch directory (never the default one, never inside the repo):

```sh
PY walk.py            # Dynamo's step() wrapped on the MLP, plus the eager ATen calls -> ../inputs/walk.json
PY fixer.py           # 9 break lines x fixes in Block.forward -> fixer.json
PY nested.py          # nested_graph_breaks on 4 small programs -> nested.json
PY dynamic.py         # 5 dynamic-shape strategies, unbacked symbols, recompile limit -> dynamic.json
sh pgo.sh PY <scratch>                                   # profile-guided dynamism across processes -> pgo.jsonl
PY aot.py             # partitioners on one block and the whole model (real Inductor path) -> aot.json
PY inductor.py        # scheduler nodes, fusion log, kernels, knobs -> inductor.json
docker run ... kb-gpu-lab-cs7:1 python triton_gen.py    # Triton for the same block, generated only (see its docstring) -> triton.json
PY ca.py              # compiled autograd -> ca.json
MASTER_ADDR=127.0.0.1 torchrun --nproc_per_node 2 --master_addr 127.0.0.1 --master_port 29521 ddp_compile.py   # -> ddp_compile.json
PY export.py <scratch>                                   # torch.export, draft_export, save, AOTInductor -> export.json
TORCH_TRACE=<dir> PY trace_run.py; tlparse <dir>/* -o <out> --no-browser; PY tlparse_extract.py <out>    # -> tlparse.json
cd <scratch>; PY exp/minify.py; PY torch_compile_debug/run_*/minifier/minifier_launcher.py > mini.log; PY exp/minify_extract.py <scratch> <seconds>   # -> minify.json
# timed, under the shared bench lock (lock.sh acquire bench tcp):
sh time_compile.sh PY <scratch> <lock.sh>                # fresh processes, cold/warm/mega and whole/regional/nested -> time_compile.jsonl
PY time_steady.py                                        # steady-state step times -> time_steady.json
cd .. && python3 build_data.py && sh build.sh && python3 check_data.py && node check_page.mjs ../index.html <shots dir>
```

Only `time_compile.jsonl` and `time_steady.json` are timings (bench lock, load average stored per run, 3 runs or 5 x 20 steps, medians and ranges). Everything else is deterministic, except the guard-latency line Dynamo prints (it varied between runs, said on the page) and AOTInductor's package size (a few KB between builds).

## Files

- `exp/common.py`: imports the running example; `logs()` captures torch's logging artifacts without TORCH_LOGS; `clean()` strips machine paths; `save()` refuses to write anything with a private string.
- `inputs/*.json`: the recorded outputs above (all small; no binaries).
- `build_data.py` writes `parts/22_tcp_data.js` (window.TCP); `check_data.py` checks the page embeds the current data, every prose number is a recorded value (or a listed constant with its reason) and nothing private or em dash is present; `check_page.mjs` clicks every control at 390 dark and 920 light.
- `parts/`: `20_read*.html` Reading (sections 0 to 13, mistakes, interview), `23_tcp_util.js` helpers, `24` the Dynamo walk animation and guard tree, `25` all Reading tables and bars, `26` the fusion animation and code viewer, `29` predict wiring; tabs `31` Graph-break fixer, `32` Compile time and caches, `33` Partitioner explorer, `39` Further reading.
- `viz_ideas.md`, `coverage.md`.

## Shape

Follows the child-page method (Part B): Reading in the subject's own order (the pipeline stage by stage, then the features around it, then export, debugging, transfer to GPUs, mistakes, interview), then three labs the brief asked for. Departure: no "in production now" section of its own; production use (torchtitan's per-block fullgraph compile, DDPOptimizer) is read from source inside the sections it belongs to.
