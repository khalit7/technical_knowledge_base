# Debug lab (tab t-debug) sources

- `run_all.sh`: reruns every case in containers named `os-dbg-<case>` (Docker, image `kb-os-dbg:1` from `Dockerfile.dbg`, which builds on the shared `kb-os-lab:1`), then redacts (`redact.py`) and rebuilds the tab data (`build_data.py` writes `../parts/33_js_dbg_0data.js`). `sh run_all.sh <case> ...` reruns single cases. Memory cases run one at a time.
- `exp/`: the scripts each container runs (`lib.sh` prints `### section` headers and `$ command` lines).
- `raw/`: the recordings, one per case run, first line the exact `docker run` flags, last line the exit code.
- `cases_a.py` .. `cases_d.py`: the text of each case (cause, fix, ML context, first check) and which raw sections it quotes.
- `sources/excerpts.txt`: source lines quoted (PyTorch v2.14.1, Linux v5.10), with links.
- `check_embed.py`: verifies the built page embeds the recordings verbatim and that nothing private is in them.
- `viz_ideas.md`: visuals built and rejected.

Recorded 2026-10-05 on Docker Desktop's Linux VM (kernel 5.10.104 arm64, 5 CPUs, about 10 GB), no privileged containers.
