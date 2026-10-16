# Storage lab (tab `t-io`, parts `34_*`)

Where data and checkpoints live, taught from zero and measured with the running example (`../data/`). Built 2026-10-16.

## Files
| file | what |
|---|---|
| `ckpt_anatomy.py` | opens train.py's checkpoint: where the 1,386,049 bytes go (`out/anatomy.json`) |
| `ckpt_io.py`, `s3_io.py`, `run_tiers.sh` | the same checkpoint (1.39 MB, 38.6 MB, 304 MB) written and read on six targets: Mac SSD native (F_FULLFSYNC), container layer, Docker volume, host folder shared into the VM, S3 store from a container, S3 store from the Mac; 5 repeats |
| `dist_ckpt.py`, `run_dist.sh`, `run_dist_slow.sh` | 4 ranks (gloo, 1 thread each): five write layouts (DDP rank 0, DDP every rank, FSDP2 gather to rank 0, FSDP2 DCP, DDP DCP), 60-step training with no / sync / async checkpoints, reshard 4 to 2 and 3 ranks. Native on the Mac (25.3M params) and in one container (3.2M params) on the slow host folder and on a Docker volume |
| `errors.py` | real restore failures: truncated file, missing DCP shard, wrong shape; one-process DCP load (`out/errors.json`) |
| `data_read.py`, `run_data.sh` | 64 MiB of token ids as 16 x 4 MiB or 16,384 x 4 KiB files, on a Docker volume and the S3 store; prefetch on/off |
| `summarise.py`, `make_data_js.py` | raw records (`out/raw/`) to `out/io_data.json` to `../parts/34_js_io_0data.js` |
| `recompute.py`, `check_data.py`, `check_ui.mjs` | calculator and prose numbers; page embeds the data exactly; every control at 390 dark and 920 light |
| `out/async_pg.json` | the async_save-on-the-training-group hang and crash (real error) |
| `inputs/aws_prices_us_east_1.json` | S3 and FSx prices and performance figures, sourced and dated |

Rebuild the data: run the three `run_*.sh` (see their headers), then `python3 summarise.py <raw dir> && python3 make_data_js.py && sh ../build.sh`.

## Environment and departures
- S3-compatible store: **SeaweedFS 4.48** (`chrislusf/seaweedfs:latest`, digest sha256:4e61d15fd35994cb1e43e1e553dff106794841fd9a99ade2fc8c8bfce4d7872d, created 2026-09-28), one container `io-s3`, 1 GB cap. MinIO was the brief's choice, but on 2026-10-16 `docker pull minio/minio` gave "pull access denied ... may require 'docker login'" and `quay.io/minio/minio` gave "unauthorized" (repository archived). At a 512 MB cap SeaweedFS was OOM-killed (exit 137, OOMKilled=true) during the 304 MB multipart upload; rerun at 1 GB. A first data run failed with "No writable volumes" (`-volume.max=16` exhausted by the checkpoint collection); recreated with 64.
- boto3 inside `mi-train:1`: its pure-Python packages copied from the host venv and mounted read-only (no new download).
- No cluster was used (no Slurm, kind or Ray lock taken); the clusters' own checkpoint writes come from the setup's recorded runs in `../data/runs/`.
- All containers, the network `io-net` and volumes `io-vol`, `io-s3data` were removed when done; the SeaweedFS image was removed too.

## Facts verified (2026-10-16)
- torch 2.14.1 `async_save` stages to CPU memory by default then saves in a separate thread (`state_dict_saver.py` docstring lines 233-234); DCP dedup assigns each replicated tensor to the smallest plan (`_dedup_save_plans.py` lines 20-21, 43-48), called from `default_planner.py` line 137. DCP's `CheckpointException` derives from BaseException (an `except Exception` does not catch it).
- Llama 3 &sect;3.3.1: Tectonic, 240 PB, 7,500 SSD servers, 2 TB/s sustained, 7 TB/s peak; "Checkpointing saves each GPU's model state, ranging from 1 MB to 4 GB per GPU".
- PyTorch blog (Nov 2024): 7B checkpoint downtime 148.8 s to 6.3 s with async DCP; separate process group advised.
- AWS: S3 Standard $0.023/GB-month (first 50 TB), PUT $0.005/1,000, GET $0.0004/1,000, Express One Zone $0.11/GB-month (price list published 2026-10-15); S3 small requests "tens of milliseconds" median; FSx for Lustre 125-1,000 MB/s per TiB, $0.145/GB-month persistent SSD 125, metadata IOPS table. DGX B200: 2 TB RAM, 8 x 3.84 TB NVMe RAID 0 cache, 2 x BlueField-3 (up to 400 Gb/s per port). Micron 9550: 14 GB/s read, 10 GB/s write (vendor).
