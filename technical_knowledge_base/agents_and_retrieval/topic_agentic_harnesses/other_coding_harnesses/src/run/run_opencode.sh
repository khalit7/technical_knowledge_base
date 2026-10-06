#!/bin/sh
# run_opencode.sh NAME [extra opencode args]: opencode 1.18.34 in a container (it has no OS sandbox of its own)
H=$(cd "$(dirname "$0")" && pwd); N=$1; shift
$H/prep.sh $N; T0=$(date +%s)
python3 $H/to.py 900 docker run --rm --name hoth-oc-$N -v $H/runs/$N/work:/work -v $H/docker/opencode/cfg:/cfg:ro \
  -e OPENCODE_CONFIG=/cfg/opencode.json hoth-opencode:1.18.34 \
  opencode run --format json --print-logs "$@" "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests." \
  > $H/runs/$N/events.jsonl 2> $H/runs/$N/stderr.txt
echo "exit $? seconds $(( $(date +%s) - T0 ))" > $H/runs/$N/exit.txt
cd $H/runs/$N/work; python3 tests/test_core.py > ../final_tests.txt 2>&1; echo "tests_exit $?" >> ../exit.txt
git status --short > ../status.txt; git diff > ../diff.txt; cat ../exit.txt
