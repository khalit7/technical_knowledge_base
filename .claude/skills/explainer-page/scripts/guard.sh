#!/bin/sh
# Resource guard. usage: sh .claude/skills/explainer-page/scripts/guard.sh
# Prints OK or HIGH plus the numbers. Run it before any heavy step (training, compile, container start,
# model load, generation, big download, browser check). If HIGH, do light work (writing, reading) and check again later.
# HIGH when: 1-min load above 75% of the cores, or available memory under 15%, or swap used over 4 GB while
# available memory is under 30% (old swapped pages linger, so swap alone is not a signal).
# GPUs (if nvidia-smi exists) are reported per GPU as used/total MiB and utilisation; they do not set HIGH,
# because a busy GPU is a reason to wait for the bench lock, not to stop CPU work.
if [ -r /proc/loadavg ]; then
  cores=$(nproc 2>/dev/null || echo 1)
  load=$(awk '{print int($1)}' /proc/loadavg)
  avail=$(awk '/^MemTotal/{t=$2} /^MemAvailable/{a=$2} END{print int(100*a/t)}' /proc/meminfo)
  swap=$(awk '/^SwapTotal/{t=$2} /^SwapFree/{f=$2} END{print int((t-f)/1024)}' /proc/meminfo)
else  # macOS
  cores=$(sysctl -n hw.ncpu)
  load=$(sysctl -n vm.loadavg | awk '{print int($2)}')
  avail=$(memory_pressure 2>/dev/null | awk -F': ' '/free percentage/{gsub("%","",$2); print int($2)}')
  swap=$(sysctl -n vm.swapusage | awk '{for(i=1;i<=NF;i++) if($i=="used") {v=$(i+2); sub("M","",v); print int(v)}}')
fi
state=OK
[ "${load:-0}" -gt $((cores * 3 / 4)) ] && state=HIGH
[ "${avail:-100}" -lt 15 ] && state=HIGH
[ "${swap:-0}" -gt 4096 ] && [ "${avail:-100}" -lt 30 ] && state=HIGH
gpu=""
command -v nvidia-smi >/dev/null 2>&1 && gpu=" gpu=$(nvidia-smi --query-gpu=index,memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits 2>/dev/null | awk -F', ' '{printf "%s%s:%s/%sMiB,%s%%", (NR>1?";":""), $1, $2, $3, $4}')"
echo "$state load=$load cores=$cores memavail=${avail}% swapMB=$swap$gpu"
