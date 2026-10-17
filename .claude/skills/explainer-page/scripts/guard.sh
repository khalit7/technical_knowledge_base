#!/bin/sh
# Resource guard for the Mac (written 2026-10-16, after a kernel panic under sustained overload on 2026-10-15).
# usage: sh .claude/skills/explainer-page/scripts/guard.sh
# Prints OK or HIGH plus the numbers. Run it before any heavy step (training, compile, container start,
# model load, generation, big download, browser check). If HIGH, do light work (writing, reading) and check again in a few minutes.
# HIGH when: 1-min load > 10, or swap used > 8192 MB while memory free < 35% (old swapped pages linger after big jobs,
# so swap alone is not a signal), or system memory free < 20%. macOS only (sysctl, memory_pressure).
load=$(sysctl -n vm.loadavg | awk '{print int($2)}')
swap=$(sysctl -n vm.swapusage | awk '{for(i=1;i<=NF;i++) if($i=="used") {v=$(i+2); sub("M","",v); print int(v)}}')
free=$(memory_pressure 2>/dev/null | awk -F': ' '/free percentage/{gsub("%","",$2); print int($2)}')
state=OK
[ "${load:-0}" -gt 10 ] && state=HIGH
[ "${swap:-0}" -gt 8192 ] && [ "${free:-100}" -lt 35 ] && state=HIGH
[ "${free:-100}" -lt 20 ] && state=HIGH
echo "$state load=$load swapMB=$swap memfree=${free}%"
