Lighteval offers the following entry points for model evaluation:

- `lighteval eval`: Evaluation models using [inspect-ai](https://inspect.aisi.org.uk/) as a backend (prefered).
- `lighteval accelerate`: Evaluate models on CPU or one or more GPUs using [🤗
  Accelerate](https://github.com/huggingface/accelerate)
- `lighteval nanotron`: Evaluate models in distributed settings using [⚡️
  Nanotron](https://github.com/huggingface/nanotron)
- `lighteval vllm`: Evaluate models on one or more GPUs using [🚀
  VLLM](https://github.com/vllm-project/vllm)
- `lighteval sglang`: Evaluate models using [SGLang](https://github.com/sgl-project/sglang) as backend
- `lighteval endpoint`: Evaluate models using various endpoints as backend
  - `lighteval endpoint inference-endpoint`: Evaluate models using Hugging Face's [Inference Endpoints API](https://huggingface.co/inference-endpoints/dedicated)
  - `lighteval endpoint tgi`: Evaluate models using [🔗 Text Generation Inference](https://huggingface.co/docs/text-generation-inference/en/index) running locally
