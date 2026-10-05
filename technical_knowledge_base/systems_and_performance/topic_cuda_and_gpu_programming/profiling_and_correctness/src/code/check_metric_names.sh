#!/bin/sh
# Inside kb-gpu-lab:1: is each metric name the page cites known to Nsight Compute 2026.3.1 for
# GA100 (A100), GH100 (H100), GB100 (B200) and GB202 (RTX 5090)? Writes out/ncu/metric_names_checked.txt.
O=/work/out/ncu/metric_names_checked.txt
ncu --list-chips > /tmp/chips.txt 2>&1
echo "# ncu $(ncu --version | tail -1)" > $O
echo "# chips: $(tr '\n' ' ' < /tmp/chips.txt)" >> $O
for c in ga100 gh100 gb100 gb202; do ncu --query-metrics --chip $c > /tmp/q_$c.txt 2>&1; done
printf "%-58s %s\n" metric "ga100 gh100 gb100 gb202" >> $O
while read m; do
  line=$(printf "%-58s" $m)
  for c in ga100 gh100 gb100 gb202; do if grep -q "^$m " /tmp/q_$c.txt; then line="$line yes  "; else line="$line no   "; fi; done
  echo "$line" >> $O
done < /work/inputs/cited_metrics.txt
