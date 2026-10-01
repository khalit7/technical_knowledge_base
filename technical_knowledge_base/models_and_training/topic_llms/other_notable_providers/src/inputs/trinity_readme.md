---
license: other
language:
- en
- es
- fr
- de
- it
- pt
- ru
- ar
- hi
- ko
- zh
library_name: transformers
base_model:
- arcee-ai/Trinity-Large-Base
arxiv:
- 2602.17004
license_link: LICENSE
license_name: openmdw-1.1
---
<!-- markdownlint-disable first-line-h1 -->
<!-- markdownlint-disable html -->
<!-- markdownlint-disable no-duplicate-header -->

<div align="center">
  <picture>
    <img
      src="https://cdn-uploads.huggingface.co/production/uploads/6435718aaaef013d1aec3b8b/i-v1KyAMOW_mgVGeic9WJ.png"
      alt="Arcee Trinity Large"
      style="max-width: 100%; height: auto;"
    >
  </picture>
</div>
<hr>

# Trinity-Large-Preview

## Introduction

Trinity-Large-Preview is a 398B-parameter sparse Mixture-of-Experts (MoE) model with approximately 13B active parameters per token. It is the largest model in Arcee AI's Trinity family, trained on more than 17 trillion tokens and delivering frontier-level performance with strong long-context comprehension.
Trinity-Large-Preview is a lightly post-trained model based on Trinity-Large-Base.

Try it at [chat.arcee.ai](http://chat.arcee.ai/)

More details on the training of Trinity Large are available in the [technical report](https://github.com/arcee-ai/trinity-large-tech-report/).


## Model Variants

The Trinity Large family consists of three checkpoints from the same training run:

- **Trinity-Large-Preview** (this release): Lightly post-trained, chat-ready model undergoing active RL
- **[Trinity-Large-Thinking](https://huggingface.co/arcee-ai/Trinity-Large-Thinking)**: Reasoning-optimized, agentic post-training with extended chain-of-thought
- **[Trinity-Large-TrueBase](https://huggingface.co/arcee-ai/Trinity-Large-TrueBase)**: 10T-token pre-anneal pretraining checkpoint
- **[Trinity-Large-Base](https://huggingface.co/arcee-ai/Trinity-Large-Base)**: Full 17T-token pretrained foundation model with mid-training anneals

## Architecture

Trinity-Large-Preview uses a sparse MoE configuration designed to maximize efficiency while maintaining large-scale capacity.

| Hyperparameter | Value |
|:---|:---:|
| Total parameters | ~398B |
| Active parameters per token | ~13B |
| Experts | 256 (1 shared) |
| Active experts | 4 |
| Routing strategy | 4-of-256 (1.56% sparsity) |
| Dense layers | 6 |
| Pretraining context length | 8,192 |
| Context length after extension | 512k |
| Architecture | Sparse MoE (AfmoeForCausalLM) |

## Benchmarks

| Benchmark | Llama 4 Maverick | Trinity-Large Preview |
|-----------|------------------|----------------------|
| MMLU | 85.5 | 87.2 |
| MMLU-Pro | 80.5 | 75.2 |
| GPQA-Diamond | 69.8 | 63.3 |
| AIME 2025 | 19.3 | 24.0 |

## Training Configuration

### Pretraining

- Training tokens: 17 trillion
- Data partner: [Datology](https://www.datologyai.com/)

<div align="center">
  <picture>
      <img src="https://cdn-uploads.huggingface.co/production/uploads/6435718aaaef013d1aec3b8b/sSVjGNHfrJKmQ6w8I18ek.png" style="background-color:ghostwhite;padding:5px;" width="17%" alt="Powered by Datology">
  </picture>
</div>

## Posttraining
- This checkpoint was instruction tuned on 20B tokens.

### Infrastructure

- Hardware: 2,048 NVIDIA B300 GPUs
- Parallelism: HSDP + Expert Parallelism
- Compute partner: [Prime Intellect](https://www.primeintellect.ai/)


<div align="center">
  <picture>
      <img src="https://cdn-avatars.huggingface.co/v1/production/uploads/61e020e4a343274bb132e138/H2mcdPRWtl4iKLd-OYYBc.jpeg" style="background-color:ghostwhite;padding:5px;" width="17%" alt="Powered by Prime Intellect">
  </picture>
</div>

## Usage

### Running our model

- [Transformers](https://huggingface.co/arcee-ai/Trinity-Large-Preview#transformers)
- [VLLM](https://huggingface.co/arcee-ai/Trinity-Large-Preview#vllm)
- [llama.cpp](https://huggingface.co/arcee-ai/Trinity-Large-Preview#llamacpp)
- [LM Studio](https://huggingface.co/arcee-ai/Trinity-Large-Preview#lm-studio)
- [API](https://huggingface.co/arcee-ai/Trinity-Large-Preview#api)


### Transformers

Use the `main` transformers branch or pass `trust_remote_code=True` with a released version.

```python
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

model_id = "arcee-ai/Trinity-Large-Preview"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype=torch.bfloat16,
    device_map="auto",
    trust_remote_code=True
)

messages = [
    {"role": "user", "content": "Who are you?"},
]

input_ids = tokenizer.apply_chat_template(
    messages,
    add_generation_prompt=True,
    return_tensors="pt"
).to(model.device)

outputs = model.generate(
    input_ids,
    max_new_tokens=256,
    do_sample=True,
    temperature=0.8,
    top_k=50,
    top_p=0.8
)

response = tokenizer.decode(outputs[0], skip_special_tokens=True)
print(response)
```

### VLLM

Supported in VLLM release 0.11.1+

```bash
vllm serve arcee-ai/Trinity-Large-Preview \
  --dtype bfloat16 \
  --enable-auto-tool-choice \
  --tool-call-parser hermes
```

### llama.cpp

Supported in llama.cpp release b7061+

```bash
llama-server -hf arcee-ai/Trinity-Large-Preview-GGUF:q4_k_m
```

### LM Studio

Supported in the latest LM Studio runtime. Search for `arcee-ai/Trinity-Large-Preview-GGUF` in Model Search.

### API

Available on OpenRouter:

```bash
curl -X POST "https://openrouter.ai/v1/chat/completions" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "arcee-ai/trinity-large-preview",
    "messages": [
      {
        "role": "user",
        "content": "What are some fun things to do in New York?"
      }
    ]
  }'
```


## License

Trinity-Large-Preview is released under the OpenMDW License, version 1.1 (OpenMDW-1.1).


## Citation

If you use this model, please cite:

```bibtex
@misc{singh2026arceetrinity,
  title        = {Arcee Trinity Large Technical Report},
  author       = {Varun Singh and Lucas Krauss and Sami Jaghouar and Matej Sirovatka and Charles Goddard and Fares Obied and Jack Min Ong and Jannik Straube and Fern and Aria Harley and Conner Stewart and Colin Kealty and Maziyar Panahi and Simon Kirsten and Anushka Deshpande and Anneketh Vij and Arthur Bresnu and Pranav Veldurthi and Raghav Ravishankar and Hardik Bishnoi and DatologyAI Team and Arcee AI Team and Prime Intellect Team and Mark McQuade and Johannes Hagemann and Lucas Atkins},
  year         = {2026},
  eprint       = {2602.17004},
  archivePrefix= {arXiv},
  primaryClass = {cs.LG},
  doi          = {10.48550/arXiv.2602.17004},
  url          = {https://arxiv.org/abs/2602.17004}
}