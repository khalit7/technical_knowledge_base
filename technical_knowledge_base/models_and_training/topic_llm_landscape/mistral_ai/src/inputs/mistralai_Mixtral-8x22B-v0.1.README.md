---
library_name: vllm
language:
- fr
- it
- de
- es
- en
license: apache-2.0
tags:
- moe
- mistral-common
extra_gated_description: >-
  If you want to learn more about how we process your personal data, please read
  our <a href="https://mistral.ai/terms/">Privacy Policy</a>.
---
# Model Card for Mixtral-8x22B
The Mixtral-8x22B Large Language Model (LLM) is a pretrained generative Sparse Mixture of Experts.

For full details of this model please read our [release blog post](https://mistral.ai/news/mixtral-8x22b).

## Warning
This repo contains weights that are compatible with [vLLM](https://github.com/vllm-project/vllm) serving of the model as well as Hugging Face [transformers](https://github.com/huggingface/transformers) library. It is based on the original Mixtral [torrent release](https://twitter.com/MistralAI/status/1777869263778291896), but the file format and parameter names are different.

## Run the model


```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "mistralai/Mixtral-8x22B-v0.1"
tokenizer = AutoTokenizer.from_pretrained(model_id)

model = AutoModelForCausalLM.from_pretrained(model_id)

text = "Hello my name is"
inputs = tokenizer(text, return_tensors="pt")

outputs = model.generate(**inputs, max_new_tokens=20)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

By default, transformers will load the model in full precision. Therefore you might be interested to further reduce down the memory requirements to run the model through the optimizations we offer in HF ecosystem:

## Notice
Mixtral-8x22B is a pretrained base model and therefore does not have any moderation mechanisms.

# The Mistral AI Team
Albert Jiang, Alexandre Sablayrolles, Alexis Tacnet, Antoine Roux,
Arthur Mensch, Audrey Herblin-Stoop, Baptiste Bout, Baudouin de Monicault,
Blanche Savary, Bam4d, Caroline Feldman, Devendra Singh Chaplot,
Diego de las Casas, Eleonore Arcelin, Emma Bou Hanna, Etienne Metzger,
Gianna Lengyel, Guillaume Bour, Guillaume Lample, Harizo Rajaona,
Jean-Malo Delignon, Jia Li, Justus Murke, Louis Martin, Louis Ternon,
Lucile Saulnier, Lélio Renard Lavaud, Margaret Jennings, Marie Pellat,
Marie Torelli, Marie-Anne Lachaux, Nicolas Schuhl, Patrick von Platen,
Pierre Stock, Sandeep Subramanian, Sophia Yang, Szymon Antoniak, Teven Le Scao,
Thibaut Lavril, Timothée Lacroix, Théophile Gervet, Thomas Wang,
Valera Nemychnikova, William El Sayed, William Marshall