#!/bin/sh
# run_ohs.sh NAME : OpenHands SDK 1.53.0 in a container (LocalWorkspace inside it), model via logging proxy
H=$(cd "$(dirname "$0")" && pwd); N=$1
$H/prep.sh $N; T0=$(date +%s)
python3 $H/to.py 1200 docker run --rm --name hoth-ohs-$N -v $H/runs/$N/work:/work -v $H/runs/$N:/out -v $H/docker/ohs/run_ohs.py:/run_ohs.py:ro \
  -e BASE=http://host.docker.internal:8190/v1 -e MAXIT=${MAXIT:-40} hoth-ohs:1.53.0 python /run_ohs.py > $H/runs/$N/stdout.txt 2>&1
echo "exit $? seconds $(( $(date +%s) - T0 ))" > $H/runs/$N/exit.txt
cd $H/runs/$N/work; python3 tests/test_core.py > ../final_tests.txt 2>&1; echo "tests_exit $?" >> ../exit.txt
git status --short > ../status.txt; git diff > ../diff.txt; cat ../exit.txt
