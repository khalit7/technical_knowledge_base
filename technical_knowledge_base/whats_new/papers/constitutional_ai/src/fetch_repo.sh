#!/bin/sh
# Download the paper's supplementary repository (prompts, principles, samples, evals; about 4.6 MB; the repository has no licence file)
# into a cache directory outside the repo, then run mk_data.py on it.
# usage: sh fetch_repo.sh <cache dir>
set -e
D=${1:?cache dir}
B=https://raw.githubusercontent.com/anthropics/ConstitutionalHarmlessnessPaper/main
for f in evals/438HHHEvaluations.jsonl evals/HarmfulVsEthical.jsonl evals/HarmfulnessClassification.jsonl \
  prompts/CritiqueRevisionFewShotPrompts.json prompts/CritiqueRevisionInstructions.json prompts/RLMadisonFewShotPrompts.json \
  prompts/RLMadisonInstructions.json prompts/RLMadisonPrecogFewShotPrompts.json; do
  mkdir -p "$D/$(dirname $f)"; curl -sfL "$B/$f" -o "$D/$f"; done
for s in INSTRUCTGPT LAMDA PALMS; do for m in HHRLHF HRLHF RLMADISON RLMADISON_COT SLMADISON; do
  mkdir -p "$D/samples"; curl -sfL "$B/samples/${s}_$m.jsonl" -o "$D/samples/${s}_$m.jsonl"; done; done
echo "fetched into $D"
