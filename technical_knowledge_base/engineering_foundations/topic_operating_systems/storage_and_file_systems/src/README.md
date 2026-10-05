# Source of the storage and file systems page

`sh build.sh` writes `../index.html` from `parts/` (same assembly as the root page's build). `python3 check_embed.py` (after the build) confirms the page embeds exactly what `gen_data.py` derives from `raw/`, that the numbers written in the prose agree with that data, and that no private path or token is in the page or `src/`. `python3 recompute.py` recomputes every derived number (readahead windows from the v5.10 rules against the measurement, Little's law, ratios, extent arithmetic) into `recompute.txt`. `node src/check_ui.mjs <outdir>` (from the repo root) clicks every control at 390 dark and 920 light; its last output is `check_ui.txt`, including the Crash lab's per-protocol summary.

## Measurements
`sh run_all.sh` re-runs everything (about 12 minutes) on Docker Desktop's Linux VM with the shared image `kb-os-lab:1` (no image of its own was needed: fio, strace, gcc, e2fsprogs and PyTorch are in it). Containers are named `os-stor-*`, never privileged, one at a time; files go to `/data`, an anonymous volume (ext4 on the VM disk, no overlayfs) removed with the container. `--cap-add SYS_PTRACE` only for strace; `--ulimit memlock=-1:-1` only for the second io_uring run; `--pid host` was used once, by hand, to list the VM's own processes (the fstrim service) and is not part of `run_all.sh`.

| Script (`exp/`) | Raw (`raw/`) | What |
|---|---|---|
| `env.sh` | `env.txt` | ext4 mount options, jbd2 statistics, block queue settings, writeback sysctls and computed dirty thresholds |
| `synccost.c`, `direct.c` via `c_all.sh` | `synccost.txt` | 1,000 records of 4 KiB with write only, fsync, fdatasync, O_DSYNC, sync_file_range, append and overwrite, ext4 and tmpfs; O_DIRECT alignment |
| `readahead.py` | `readahead.txt` | a cold file read 4 KiB at a time, io.stat after every read: the readahead windows |
| `meta.py` | `meta.txt` | 40 MiB as 10,240 small files or one file: create, stat, list, read warm and cold, delete |
| `fsimage.sh` | `fsimage.txt` | an ext4 file system built in a file and read with debugfs (inode, extents, links, journal) |
| `fio.sh`, `uring.sh` via `run_uring.sh` | `fio.txt`, `uring.txt` | queue depth, direct and buffered, fdatasync; io_uring failing at the 64 KiB memlock limit, then running |
| `writeback.py` via `run_wb.sh` | `wb_*.txt` | dirty, writeback and device bytes every 100 ms: 16 MiB, 256 MiB, 256 MiB plus fsync, 1.5 GiB, and four "primed" runs |
| `ckpt_time.py` | `ckpt_time.txt` | a 256 MiB state saved by torch.save three ways, dcp.save three ways, dcp.async_save |
| `ckpt_small.py`, `fold_strace.py` via `ckpt_trace.sh` | `ckpt_trace.txt` | the running job's checkpoint under strace: naive, safe, DCP; the Crash lab's call sequences |

`inputs/sources.txt`: every kernel, PyTorch and torchtitan source line the page cites, with file, line and tag.

## Parts
`01_head.html`, `21_js_rd_common.js`, `29_js_drill.js`, `99_js_tabs.js` are copied from the sibling virtual memory page (which copied the root's). Reading: `20_read.html` (CSS, nav), `20_read_a` to `20_read_l`. JS: `22_js_data.js` (generated), `23_js_rd_charts.js` (numbers, stack, bars, writeback timeline, glossary), `24_js_rd_ra.js` (readahead animation, before/after), `25_js_rd_fsync.js` (fsync, fdatasync, sync_file_range stepper), `31_js_crash.js` (Crash lab model). Tabs: `31_tab_crash.html`, `39_tab_more.html`.

## Departures from the child-page method
No `live.md` or `coverage.json`: the page is new, with no old text. Measurements replace the "real data" of the training pages. A real crash cannot be produced in this VM (no power cut, no dm-flakey without privileges), so the Crash lab is a model with its rules stated and sourced, not a crash test; NVMe hardware, network and parallel file systems, object stores, FUSE and GPUDirect Storage are taught from their documentation and tagged "not run here".

## Findings worth passing on
- On this VM, when dirty data reaches the device varied from about 2 to 32 s for the same 16 MiB; in fresh containers it left at the flusher's next 5 s wake-up. Explained (likely, not traced) by the per-writeback-domain share in `wb_over_bg_thresh`. This also explains the root's Debug lab "fsync" case, where 256 MiB was clean 5 s later.
- torch.distributed.checkpoint 2.14.1 deletes `.metadata` before renaming the new one in and never fsyncs a directory; saving into the same directory twice has crash windows (see Crash lab). One directory per step avoids them.
