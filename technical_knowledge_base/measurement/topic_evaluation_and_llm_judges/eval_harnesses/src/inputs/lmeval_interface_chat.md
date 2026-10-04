
| Argument | Short | Description |
|----------|-------|-------------|
| `--model` | `-M` | Model type/provider name (default: `hf`). See [supported models](https://github.com/EleutherAI/lm-evaluation-harness#model-apis-and-inference-servers). |
| `--model_args` | `-a` | Model constructor arguments as `key=val key2=val2` or `key=val,key2=val2`. For HuggingFace models, see [`HFLM`](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/lm_eval/models/huggingface.py) for available arguments. |
| `--tasks` | `-t` | Space or comma-separated list of task names or groups. Use `lm-eval ls tasks` to see available tasks. |
| `--apply_chat_template` | | Apply chat template to prompts. Use without argument for default template, or specify template name. |
| `--limit` | `-L` | Limit examples per task. Integer for count, float (0.0-1.0) for percentage. **For testing only.** |
| `--use_cache` | `-c` | Path prefix for SQLite cache of model responses (e.g., `/path/to/cache_`). |

### Evaluation Settings

| Argument | Short | Description |
|----------|-------|-------------|
| `--num_fewshot` | `-f` | Number of few-shot examples in context. |
| `--batch_size` | `-b` | Batch size: integer, `auto`, or `auto:N` to auto-tune N times (default: 1). |
| `--max_batch_size` | | Maximum batch size when using `--batch_size auto`. |
| `--device` | | Device to use: `cuda`, `cuda:0`, `cpu`, `mps` (default: `cuda`). |
| `--gen_kwargs` | | Generation arguments as `key=val key2=val2`. Values parsed with `ast.literal_eval`. Example: `temperature=0.8 'stop=["\n\n"]'` |

### Data and Output

| Argument | Short | Description |
|----------|-------|-------------|
| `--output_path` | `-o` | Output directory or JSON file for results. Required with `--log_samples`. |
| `--log_samples` | `-s` | Save all model inputs/outputs for post-hoc analysis. |
| `--samples` | `-E` | JSON mapping task names to sample indices, e.g., `'{"task1": [0,1,2]}'`. Incompatible with `--limit`. |

### Caching and Performance

| Argument | Description |
|----------|-------------|
| `--cache_requests` | Cache preprocessed prompts: `true`, `refresh`, or `delete`. Cached files stored in `lm_eval/cache/.cache` or path set by `LM_HARNESS_CACHE_PATH` env var. |
| `--check_integrity` | Run task test suite validation before evaluation. |

### Prompt Formatting

| Argument | Description |
|----------|-------------|
| `--system_instruction` | Custom system instruction prepended to prompts. |
| `--fewshot_as_multiturn` | Format few-shot examples as multi-turn conversation. Auto-enabled with `--apply_chat_template`. Set to `false` to disable. |

### Task Management

| Argument | Description |
|----------|-------------|
