Source: https://huggingface.co/JetBrains-Research/budget-internalization-qwen3.5-4b-8k-grpo-franktiger-s300 (README.md, fetched 23 November 2026)

---
license: apache-2.0
base_model: Qwen/Qwen3.5-4B
base_model_relation: finetune
library_name: transformers
pipeline_tag: image-text-to-text
datasets:
- agentica-org/DeepScaleR-Preview-Dataset
tags:
- budget-internalization
- reasoning
- math
- grpo
- reinforcement-learning
- token-budget
---

# Qwen3.5-4B · 8k-token budget · grpo · `franktiger`

RL-finetuned [Qwen/Qwen3.5-4B](https://huggingface.co/Qwen/Qwen3.5-4B) trained for math reasoning under a
**8,192-token generation budget**. Released with the paper *Budget Internalization: Fixed-Budget RLVR Trades Test-Time Scaling for In-Budget Accuracy*.

Run ID (petname): **`franktiger`** · checkpoint step **300**

## Training

| | |
|---|---|
| Base model | [Qwen/Qwen3.5-4B](https://huggingface.co/Qwen/Qwen3.5-4B) |
| Algorithm | GRPO (leave-one-out baseline, group reward normalization, token-level loss). Responses that hit the budget are truncated and scored as-is. |
| Generation budget (`max_new_tokens`) | 8,192 |
| Data | DeepScaleR (math), 3 epochs max |
| Batch | 32 prompts × 8 rollouts per step |
| Optimizer | Adam, cosine LR schedule, peak LR 5e-7, 10 warmup steps |
| Steps | 300 |
| Reward | binary answer correctness (`\boxed{}` extraction) |
| Weights dtype | BF16 |

Training prompt (user turn, rendered with the base model's chat template):

```
Think step-by-step to solve the following problem. Output your answer inside of \\boxed{} tags.:
{problem}

Let's think step-by-step
```

## Citation

TODO

## License

Inherits the license of the base model (Qwen/Qwen3.5-4B).
