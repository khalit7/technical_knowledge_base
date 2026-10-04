# Quick Start

## Command Line Evaluation
```bash
# Simple evaluation
unitxt-evaluate \
    --tasks "card=cards.mmlu_pro.engineering" \
    --model cross_provider \
    --model_args "model_name=llama-3-1-8b-instruct" \
    --limit 10

# Multi-task evaluation
unitxt-evaluate \
    --tasks "card=cards.text2sql.bird+card=cards.mmlu_pro.engineering" \
    --model cross_provider \
    --model_args "model_name=llama-3-1-8b-instruct,max_tokens=256" \
    --split test \
    --limit 10 \
    --output_path ./results/evaluate_cli \
    --log_samples \
    --apply_chat_template

# Benchmark evaluation
unitxt-evaluate \
    --tasks "benchmarks.tool_calling" \
