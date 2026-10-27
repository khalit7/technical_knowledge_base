#!/bin/sh
# Download the released RocketEval data this page reads (about 120 MB; nothing of it is committed) into a cache dir.
# usage: sh fetch_data.sh /tmp/rocketeval_cache ; then python3 mk_data.py /tmp/rocketeval_cache
set -e
C="${1:-/tmp/rocketeval_cache}"; mkdir -p "$C"; cd "$C"
B=https://huggingface.co/datasets/Joinn/RocketEval/resolve/main
G=https://raw.githubusercontent.com/Joinn99/RocketEval-ICLR/main
curl -sL $G/config/rankings/wildbench_test.json -o wildbench_test.json
curl -sL $G/config/rankings/wildbench_train.json -o wildbench_train.json
for m in $(python3 -c "import json;[print(t['name']) for f in ('wildbench_test.json','wildbench_train.json') for t in json.load(open(f))]"); do
  [ -s "score_$m.json" ] || curl -sL "$B/wildbench/score/gpt-4o/$m.json" -o "score_$m.json"
done
for f in wildbench/checklist/checklist.jsonl wildbench/query.jsonl wildbench/response/Meta-Llama-3-8B-Instruct.jsonl \
         wildbench/judgment/Llama-3-8B-Instruct/gpt-4-turbo-2024-04-09.jsonl \
         wildbench/judgment/Qwen2.5-0.5B-Instruct/Meta-Llama-3-8B-Instruct.jsonl \
         wildbench/judgment/Qwen2.5-3B-Instruct/Meta-Llama-3-8B-Instruct.jsonl; do
  o=$(echo $f | tr '/' '_'); [ -s "$o" ] || curl -sL "$B/$f" -o "$o"
done
for j in Qwen2.5-0.5B-Instruct Qwen2.5-3B-Instruct; do for m in gpt-4 claude-v1 vicuna-13b-v1.2; do
  [ -s "mt_j_${j}_$m.jsonl" ] || curl -sL "$B/mt-bench/judgment/$j/$m.jsonl" -o "mt_j_${j}_$m.jsonl"; done; done
# MT-Bench human judgments (lmsys), read with pandas through uv (not a project dependency)
[ -s mt_human.csv ] || { curl -sL https://huggingface.co/datasets/lmsys/mt_bench_human_judgments/resolve/main/data/human-00000-of-00001-25f4910818759289.parquet -o mt_human.parquet
  uv run --no-project --with pandas --with pyarrow python -c "import pandas as pd;pd.read_parquet('mt_human.parquet')[['question_id','model_a','model_b','winner','judge','turn']].to_csv('mt_human.csv',index=False)"; }
[ -s gpt4_single.jsonl ] || curl -sL https://huggingface.co/spaces/lmsys/mt-bench/resolve/main/data/mt_bench/model_judgment/gpt-4_single.jsonl -o gpt4_single.jsonl
echo "fetched into $C"
