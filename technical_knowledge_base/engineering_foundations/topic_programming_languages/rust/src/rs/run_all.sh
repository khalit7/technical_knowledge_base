#!/bin/zsh
# Reproduce every output Part 3 displays, into out/. Toolchains: code/env.sh (session scratchpad, see versions.txt).
# Usage: zsh run_all.sh [cli|async|errs|svc|test|pkg|cross|bench|all]   (default all except bench; bench takes about 6 minutes)
set -u
HERE=${0:A:h}; cd $HERE
. code/env.sh
OUT=$HERE/out; mkdir -p $OUT
DATA=${HERE:h:h:h}/src/rosetta/data            # the root page's chat.jsonl
T=$CARGO_TARGET_DIR/release
PY=$P/py/cpython-3.14.8-macos-aarch64-none/bin/python3.14
# Hide machine paths in recordings.
clean() { sed -e "s#$CARGO_HOME#~/.cargo#g" -e "s#$CARGO_TARGET_DIR#target#g" -e "s#$HERE/##g" -e "s#$DATA/##g" -e "s#$P/rs/#pl/#g" -e "s#/Users/[a-z]*/#~/#g" -e 's/thread .main. ([0-9]*)/thread '\''main'\'' (N)/'; }
# run a shell line in a directory and record "$ cmd", its output and its exit code
rec() { local name=$1 dir=$2; shift 2; { print -r -- "\$ $*"; (cd $dir && eval "$@") 2>&1; print -r -- "[exit $?]"; } | clean > $OUT/$name.txt; }
what=${1:-all}

build() { (cd code/tok && cargo build --release --bins --examples 2> $OUT/build_examples.txt); clean < $OUT/build_examples.txt > $OUT/build_examples.tmp; mv $OUT/build_examples.tmp $OUT/build_examples.txt; }

if [[ $what == (all|cli|async|svc) ]]; then build; fi

if [[ $what == (all|cli) ]]; then
  export PATH=$T:$PATH
  rec cli_help $DATA "tokcount --help"
  rec cli_count_help $DATA "tokcount count --help"
  rec cli_count $DATA "tokcount count chat.jsonl"
  rec cli_missing $DATA "tokcount count"
  rec cli_bad_n $DATA "tokcount count -n 0 chat.jsonl"
  rec cli_typo $DATA "tokcount cnt chat.jsonl"
  rec cli_nofile $DATA "tokcount count nope.jsonl"
  rec cli_strict $DATA "tokcount count --strict chat.jsonl > /dev/null"
  rec cli_stdin_json $DATA "head -3 chat.jsonl | tokcount count -n 2 --json -"
  rec cli_text $DATA "tokcount text 'x86_64 and v2.1'"
  rec cli_version $DATA "tokcount --version"
  rec cli_pipe_naive $DATA "$T/examples/b1_naive_print | head -1; echo \"[left side exit \${pipestatus[1]}]\""
  rec cli_pipe_ok $DATA "tokcount count chat.jsonl | head -1; echo \"[left side exit \${pipestatus[1]}]\""
  # the same answer as the root page's reference output
  diff <(tokcount count $DATA/chat.jsonl) <(sed -e 1d -e "/^\[exit/d" ${HERE:h:h:h}/src/rosetta/outputs/python/count_tokens.txt) > /dev/null 2>&1 && echo same > $OUT/cli_matches_root.txt || echo DIFFERENT > $OUT/cli_matches_root.txt
fi

if [[ $what == (all|async) ]]; then
  grep -A8 "^warning: unused implementer" $OUT/build_examples.txt | head -9 > $OUT/a1_lazy_warning.txt
  $T/examples/a1_lazy > $OUT/a1_lazy.txt
  $T/examples/a1_poll > $OUT/a1_poll.txt
  $T/examples/a2_trace $OUT/a2_trace.json > $OUT/a2_trace.txt
  $T/examples/a3_cancel > $OUT/a3_cancel.txt
  $T/examples/a4_fanout > $OUT/a4_fanout.txt
  $T/examples/b3_panic 2>&1 | sed -E 's/\(([0-9]+)\) panicked/(N) panicked/' > $OUT/b3_panic.txt
  (cd code/cmp && $PY lazy.py) 2>&1 | clean > $OUT/cmp_lazy_py.txt
  (cd code/cmp && node lazy.mjs) > $OUT/cmp_lazy_js.txt
  (cd code/cmp && $PY cancel.py) > $OUT/cmp_cancel_py.txt
  (cd code/cmp && node trace.mjs $OUT/cmp_trace_js.json) > $OUT/cmp_trace_js.txt
  # the Python page's own asyncio programs (Part 1 there), re-run here so both sides share a machine and a day
  PA=${HERE:h:h:h}/python/src/pa/code
  $PY $PA/a2_trace.py $OUT/cmp_trace_py.json > $OUT/cmp_trace_py.txt
  $PY $PA/a3_fanout.py > $OUT/cmp_fanout_py.txt
fi

if [[ $what == (all|errs) ]]; then
  for f in code/errs/cases/*.rs; do
    n=${f:t:r}; cp $f code/errs/src/main.rs
    if [[ $n == *_fix ]]; then
      (cd code/errs && cargo run --quiet 2>&1) | clean > $OUT/errs_$n.txt
    else
      (cd code/errs && cargo build --quiet 2>&1) | clean > $OUT/errs_$n.txt
    fi
  done
  cp code/errs/cases/e1_async_main_fix.rs code/errs/src/main.rs
fi

if [[ $what == (all|svc) ]]; then
  S=$T/tokserve; B=http://127.0.0.1:3931
  cd $DATA; NO_COLOR=1 RUST_LOG=info,tower_http=debug $S --addr 127.0.0.1:3931 > $OUT/svc_log.raw 2>&1 & SP=$!
  sleep 0.5
  crec() { local n=$1; shift; { print -r -- "\$ curl $*"; eval "curl -s $*"; } 2>&1 | sed -E 's/^date: .*/date: (removed)/' | sed -e "s#$B#localhost:3000#g" | clean > $OUT/svc_$n.txt; }
  crec health -i $B/health
  crec count -i -X POST $B/count -H "'content-type: application/json'" -d "'{\"text\":\"x86_64 and v2.1\"}'"
  crec missing -i -X POST $B/count -H "'content-type: application/json'" -d "'{\"txt\":\"oops\"}'"
  crec ctype -i -X POST $B/count -d "'{\"text\":\"hi\"}'"
  crec empty -i -X POST $B/count -H "'content-type: application/json'" -d "'{\"text\":\"\"}'"
  crec log -X POST $B/count_log --data-binary @chat.jsonl
  crec timeout -i "'$B/slow?ms=1500'"
  crec toolarge -i -X POST $B/count_log --data-binary @$P/rs/chat20k.jsonl
  crec stats $B/stats
  kill -TERM $SP; wait $SP
  sed -E 's/^[0-9T:.-]+Z +//' $OUT/svc_log.raw | sed -e "s#127.0.0.1:3931#127.0.0.1:3000#g" | clean > $OUT/svc_log.txt; rm $OUT/svc_log.raw; cd $HERE
  # graceful shutdown: a request in flight when SIGTERM arrives still completes
  {
    NO_COLOR=1 RUST_LOG=info,tower_http=debug $S --addr 127.0.0.1:3932 --timeout-ms 5000 > $OUT/gs.raw 2>&1 & GP=$!
    sleep 0.5
    print "[client] GET /slow?ms=800 (in the background)"
    (curl -s -o /dev/null -w '[client] slow request: HTTP %{http_code} after %{time_total} s\n' "http://127.0.0.1:3932/slow?ms=800" > $OUT/gs_curl.tmp) &
    sleep 0.2; print "[shell] kill -TERM <tokserve>"; kill -TERM $GP; sleep 0.1
    curl -s -o /dev/null -m 1 http://127.0.0.1:3932/health && print "[client] new request accepted" || print "[client] new connection refused (curl exit $?)"
    wait $GP; print "[server] exited with code $?"; wait
    cat $OUT/gs_curl.tmp; rm $OUT/gs_curl.tmp
    print -r -- "--- server log ---"; sed -E 's/^[0-9T:.-]+Z +//' $OUT/gs.raw; rm $OUT/gs.raw
  } 2>&1 | sed -e "s/3932/3000/g" | clean > $OUT/svc_graceful.txt
  # flags and environment
  (cd $DATA && $S --help) | clean > $OUT/svc_help.txt
fi

if [[ $what == (all|test) ]]; then
  (cd code/tok && cargo test --release --lib --test service 2>&1) | grep -v -E "^ +(Compiling|Running|Finished|Doc-tests)" | clean > $OUT/test.txt
  (cd code/tok && cargo test --release --lib --test service 2>&1) | grep -E "Running|Doc-tests" | clean > $OUT/test_targets.txt
fi

if [[ $what == (all|pkg) ]]; then
  zsh pkg.sh > $OUT/pkg.json 2> $OUT/pkg.log
fi
if [[ $what == (all|pkg|pkgtxt) ]]; then
  python3 pkg_txt.py $OUT/pkg.json > $OUT/pkg_sizes.txt
fi

if [[ $what == (cross) ]]; then
  zsh cross.sh > $OUT/cross.txt 2>&1
fi

if [[ $what == (bench) ]]; then
  (cd bench && TOKSERVE=$T/tokserve UVICORN=$P/rs/pyenv/bin/uvicorn OHA=$P/rs/oha/bin/oha DATA=$DATA/chat.jsonl \
     python3 bench.py results/bench_$(date +%Y%m%d_%H%M).json 3)
fi
echo "run_all: $what done"
