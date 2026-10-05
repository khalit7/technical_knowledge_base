# Start-up time: run an almost empty script, 30 times each after 3 warm-ups (hyperfine). Load average printed first.
echo 'console.log("hi")' > "$WORK/hi.mjs"; cd "$WORK"
echo "load average before: $(sysctl -n vm.loadavg | tr -d '{}' | xargs)"
hyperfine -N --runs 30 --warmup 3 --export-json "$WORK/startup.json" \
  -n "node 22.22.2" "$NODE22 hi.mjs" -n "node 24.21.0" "$NODE24 hi.mjs" -n "node 26.10.0" "$NODE26 hi.mjs" \
  -n "bun 1.4.2" "bun hi.mjs" -n "deno 2.9.7" "deno run hi.mjs" -n "python 3.14.8 (reference)" "$PY -c pass" >/dev/null 2>&1
python3 - "$WORK/startup.json" <<'PY'
import json, sys
for r in json.load(open(sys.argv[1]))["results"]:
    print(f'{r["command"]:28} median {r["median"]*1000:6.1f} ms   min {r["min"]*1000:6.1f} ms')
PY
echo "load average after: $(sysctl -n vm.loadavg | tr -d '{}' | xargs)"
