#!/bin/sh
# run_aider.sh NAME EDITFORMAT
H=$(cd "$(dirname "$0")" && pwd); N=$1; F=$2
$H/prep.sh $N nolog; cd $H/runs/$N/work
T0=$(date +%s)
HOME=$H/home OPENAI_API_BASE=http://127.0.0.1:8193/v1 OPENAI_API_KEY=local python3 $H/to.py 900 $H/env/aider/bin/aider \
  --model openai/haiku --edit-format $F --yes-always --no-stream \
  --no-show-model-warnings --no-check-update --no-analytics --no-gitignore --no-fancy-input --no-pretty \
  --test-cmd "python3 tests/test_core.py" --auto-test \
  --message "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests." > ../stdout.txt 2>&1
echo "exit $? seconds $(( $(date +%s) - T0 ))" > ../exit.txt
python3 tests/test_core.py > ../final_tests.txt 2>&1; echo "tests_exit $?" >> ../exit.txt
git log --oneline > ../gitlog.txt; git diff HEAD~0 --stat > /dev/null; git diff $(git rev-list --max-parents=0 HEAD) -- . > ../diff.txt
cat ../exit.txt
