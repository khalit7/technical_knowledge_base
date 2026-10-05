# Peak memory and time: streaming line by line (k3_count_tokens.mjs) against reading the whole file (k4_whole.mjs),
# on the root's generator at 200,000 lines (38,792,775 bytes). /usr/bin/time -l reports the peak resident set size.
python3 "$ROSETTA/gen_chat.py" --lines 200000 --seed 7 > "$WORK/chat200k.jsonl"
echo "input: $(wc -c < "$WORK/chat200k.jsonl" | tr -d ' ') bytes; load average $(sysctl -n vm.loadavg | tr -d '{}' | xargs)"
for f in k3_count_tokens k4_whole; do
  for run in 1 2 3; do
    /usr/bin/time -l node "$CODE/$f.mjs" "$WORK/chat200k.jsonl" 2> "$WORK/time.txt" > "$WORK/out.txt"
    echo "$f run $run: $(awk '/real/{print $1" s"}' "$WORK/time.txt"), peak RSS $(awk '/maximum resident set size/{printf "%.0f MB", $1/1048576}' "$WORK/time.txt")"
  done
done
echo "k3 output on the big file:"; node "$CODE/k3_count_tokens.mjs" "$WORK/chat200k.jsonl"
