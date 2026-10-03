#!/bin/sh
# Save short verbatim extracts of what the authors released (code README, jit/ README, model card, dataset card,
# dataset README) into inputs/release_extracts.txt. Run from src/. Fetched 3 October 2026 (repo commit ababa06, 27 Aug 2026).
set -e
O=inputs/release_extracts.txt
G=https://raw.githubusercontent.com/bingreeky/JIT/ababa06c2f54d799fd9fbc356e5368f61a452260
{
echo "# Release extracts, fetched $(date -u +%Y-%m-%d) by fetch_release.sh"
echo; echo "## $G/README.md (selected lines)"
curl -sL $G/README.md | grep -nE "eleven included designs|Evaluate the JIT checkpoint|logprob|rollouts 3|Supported benchmarks|Hugging Face|LICENSE" 
echo; echo "## $G/jit/README.md (selected lines)"
curl -sL $G/jit/README.md | grep -nE "rollouts 3|1.0 is the default|logprob|judge|max-repairs|merely scores|all 11 seed|13k tokens|ckpt70|checkpoint-70"
echo; echo "## $G/scripts/eval/config.py (lines 1-12)"
curl -sL $G/scripts/eval/config.py | sed -n 1,12p
echo; echo "## $G/dataset/README.md (benchmark table)"
curl -sL $G/dataset/README.md | grep -E "^\| \`"
echo; echo "## $G/LICENSE (first 3 lines and the data note)"
curl -sL $G/LICENSE | sed -n 1,3p; curl -sL $G/LICENSE | grep -A3 "NOTE"
echo; echo "## https://huggingface.co/JIT-Agent/jit-27b (model card, selected lines)"
curl -sL https://huggingface.co/JIT-Agent/jit-27b/raw/main/README.md | grep -nE "license|base_model|initial research release|distillation|Parameters|context|three candidate|description references"
echo; echo "## https://huggingface.co/datasets/JIT-Agent/jit-meta-harness (dataset card, selected lines)"
curl -sL https://huggingface.co/datasets/JIT-Agent/jit-meta-harness/raw/main/README.md | grep -nE "subset of the training data|Training examples|Unique task|Harnesses per"
} > $O
wc -l $O
