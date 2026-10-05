#!/bin/bash
# ruff on one file with typical problems. Real runs.
HERE=$(cd "$(dirname "$0")" && pwd); . $HERE/../env.sh; . $HERE/../uvwalk/rec.sh
R=$WORK/ruffdemo; rm -rf $R; mkdir -p $R; cp $HERE/chatlog.py $R/; cd $R
export TRANSCRIPT=$WORK/ruff_raw.txt; : > $TRANSCRIPT
RUFF="uvx ruff@0.16.10"
rec "$RUFF check --output-format concise chatlog.py"
rec "$RUFF check --output-format concise --select E,F,I,UP,B,SIM --target-version py314 chatlog.py"
rec "$RUFF check --select E,F,I,UP,B,SIM --target-version py314 --fix --output-format concise chatlog.py"
note "the file after --fix"
cat chatlog.py >> $TRANSCRIPT; echo >> $TRANSCRIPT
rec "$RUFF format --diff chatlog.py"
rec "$RUFF format chatlog.py && $RUFF check --output-format concise --select E,F,I,UP,B,SIM --target-version py314 chatlog.py"
sed -e "s#$PL#~/pl#g" -e "s#$HOME#~#g" $TRANSCRIPT > $HERE/../out/ruff.txt
