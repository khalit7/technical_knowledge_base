#!/bin/sh
# Every timed run of this page, under the shared bench lock (the caller acquires and releases it).
cd "$(dirname "$0")"
echo "load before: $(uptime | sed 's/.*load averages*: //')"
PORT=29539 sh run.sh 2 coll_time.py > "$DPT_SCRATCH/ct2.log" 2>&1; grep -h '^wrote' "$DPT_SCRATCH/ct2.log"
PORT=29539 sh run.sh 4 coll_time.py > "$DPT_SCRATCH/ct4.log" 2>&1; grep -h '^wrote' "$DPT_SCRATCH/ct4.log"
for m in 4 8; do for s in GPipe 1F1B Interleaved1F1B LoopedBFS InterleavedZeroBubble ZBVZeroBubble DualPipeV; do
  PORT=29538 sh run.sh 2 pp_sched.py --schedule $s --mb $m --repeats 5 --layers 8 --d 512 > "$DPT_SCRATCH/ppt.log" 2>&1
  grep -h '^wrote' "$DPT_SCRATCH/ppt.log" || echo "FAILED $s $m"
done; done
for s in GPipe 1F1B; do PORT=29538 sh run.sh 4 pp_sched.py --schedule $s --mb 8 --repeats 5 --layers 8 --d 512 > "$DPT_SCRATCH/ppt.log" 2>&1; grep -h '^wrote' "$DPT_SCRATCH/ppt.log" || echo "FAILED $s w4"; done
echo "load after: $(uptime | sed 's/.*load averages*: //')"
