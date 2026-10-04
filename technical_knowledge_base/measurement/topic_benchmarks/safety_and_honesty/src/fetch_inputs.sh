#!/bin/sh
# Download XSTest (paul-rottger/xstest, main) into inputs/raw/xstest/ (gitignored; about 5 MB).
# Prompts are CC BY 4.0; completions carry the licences of Meta, Mistral and OpenAI, so only labels and short excerpts are extracted into the page.
cd "$(dirname "$0")"
B=https://raw.githubusercontent.com/paul-rottger/xstest/main
for f in readme.md LICENSE xstest_prompts.csv evaluation/classify_completions_strmatch.py; do mkdir -p inputs/raw/xstest/$(dirname $f); curl -sS -m 60 $B/$f -o inputs/raw/xstest/$f; done
for m in gpt4 llama2new llama2orig mistralguard mistralinstruct; do
  mkdir -p inputs/raw/xstest/model_completions inputs/raw/xstest/evaluation/automated_evaluation_labels
  curl -sS -m 60 $B/model_completions/xstest_v2_completions_$m.csv -o inputs/raw/xstest/model_completions/xstest_v2_completions_$m.csv
  for g in streval gpteval; do curl -sS -m 60 $B/evaluation/automated_evaluation_labels/xstest_v2_completions_${m}_$g.csv -o inputs/raw/xstest/evaluation/automated_evaluation_labels/xstest_v2_completions_${m}_$g.csv; done
done
