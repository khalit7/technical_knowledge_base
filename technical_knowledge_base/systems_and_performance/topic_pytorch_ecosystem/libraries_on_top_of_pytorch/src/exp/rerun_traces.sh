#!/bin/sh
# Re-run every call trace. Usage: sh rerun_traces.sh <scratch pt folder>  (venv, overlays, torchtitan clone inside it)
S=$1; export LIB_SCRATCH=$S/lib/run; cd "$(dirname "$0")"
$S/venv/bin/python calls_trace.py single > $S/lib/run/single.log 2>&1; echo single $?
for m in acc_ddp pl_ddp pl_fsdp2 hf_ddp ds_z0 ds_z1 ds_z2 ds_z3 ds_z3_noclip ds_z0_noclip; do sh run_dist.sh $S/venv/bin $S/lib/ovl_ds $m 29561 > $S/lib/run/$m.log 2>&1; echo "$m $?"; done
I=$(cd ../inputs && pwd)
TT_TRACE=$I/calls_titan_fsdp.json sh titan/run_titan.sh $S/venv/bin $S/src/torchtitan $S/lib/ovl_tt 2 29566 titan_cpu_fsdp --dump_folder $S/lib/titan/o_fsdp > $S/lib/titan/titan_cpu_fsdp.log 2>&1; echo titan_fsdp $?
TT_CHECK=$S/lib/titan/check.json TT_TRACE=$I/calls_titan_1p.json sh titan/run_titan.sh $S/venv/bin $S/src/torchtitan $S/lib/ovl_tt 1 29564 titan_cpu --dump_folder $S/lib/titan/o1 > $S/lib/titan/titan_cpu.log 2>&1; echo titan_1p $?
python3 titan/summarize.py $S/lib/titan > /dev/null; echo summarized
