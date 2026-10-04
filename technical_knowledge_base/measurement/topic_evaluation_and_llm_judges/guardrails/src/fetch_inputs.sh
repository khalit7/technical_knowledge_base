#!/bin/sh
# Download the released XSTest data used by the Pipeline lab into the gitignored inputs/raw/xstest/ (about 2 MB).
# Prompts are CC BY 4.0 (Rottger et al., NAACL 2024); completions carry the licences of their model owners, so only labels
# and 100-character excerpts of answers to safe prompts or full refusals are copied into the page.
cd "$(dirname "$0")"
B=https://raw.githubusercontent.com/paul-rottger/xstest/main
mkdir -p inputs/raw/xstest/model_completions
curl -sS -m 60 $B/xstest_prompts.csv -o inputs/raw/xstest/xstest_prompts.csv
for m in mistralinstruct mistralguard; do curl -sS -m 60 $B/model_completions/xstest_v2_completions_$m.csv -o inputs/raw/xstest/model_completions/xstest_v2_completions_$m.csv; done
# deepset/prompt-injections test split (Apache 2.0) is saved as inputs/deepset_test.json; nvidia/Nemotron-PII test rows 0-199 (CC BY 4.0) as inputs/nemotron_pii_test200.json.
