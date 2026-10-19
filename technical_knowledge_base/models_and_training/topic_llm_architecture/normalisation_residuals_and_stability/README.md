# Normalisation, residuals and stability: pre-norm, RMSNorm, QK-norm, initialisation, loss spikes

Notion: https://app.notion.com/p/3fd5c17b0d0d8163b50dc5e9d9240e89

Child page of Topic: llm-architecture. One interactive HTML file (`index.html`), built from `src/` (see `src/README.md`).

Tabs: Reading (why a deep transformer trains and what stops it: norm placement including sandwich, output norm,
DeepNorm and DeepSeek-V4's hyper-connections; LayerNorm against RMSNorm; attention-logit growth and QK-norm,
soft-capping, qk-clip; z-loss; residual init; massive activations; loss-spike forensics; production choices from
code; mistakes; interview), Stability explorer (learning rate x placement x QK-norm over recorded runs), Residual
stream (one sequence through four placements before and after training), Further reading.

Evidence: tiny-GPT runs on the topic's running example (Apple M1 Pro, MPS, same batches and seed), CPU inspection of
the checkpoints, transformers v5.20.1 code quoted by line, published results labelled.
