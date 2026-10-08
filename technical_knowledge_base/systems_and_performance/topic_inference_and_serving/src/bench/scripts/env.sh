# sourced by run scripts
I=${INF_DIR:?set INF_DIR to the scratch folder holding models/ and ibench/}
G=$I/models/gguf; M=$I/models/mlx; R=$I/ibench/results
export HF_HOME=$I/hf
load(){ # one line: load averages, CPU idle, memory free pages percent, top other processes by CPU
  la=$(sysctl -n vm.loadavg | tr -d '{}' | awk '{print $1","$2","$3}')
  idle=$(top -l 2 -n 0 -s 1 | grep "CPU usage" | tail -1 | sed -E 's/.* ([0-9.]+)% idle.*/\1/')
  mem=$(memory_pressure 2>/dev/null | grep "free percentage" | awk '{print $5}')
  echo "{\"t\":\"$(date '+%Y-%m-%dT%H:%M:%S')\",\"loadavg\":[$la],\"cpu_idle_pct\":$idle,\"mem_free_pct\":\"$mem\"}"
}
