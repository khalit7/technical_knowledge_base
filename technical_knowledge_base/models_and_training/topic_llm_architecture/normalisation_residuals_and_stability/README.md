# Normalisation, residuals and stability: pre-norm, RMSNorm, QK-norm, initialisation, loss spikes

Notion: https://app.notion.com/p/3fd5c17b0d0d8163b50dc5e9d9240e89

Child page of Topic: llm-architecture. One interactive HTML file (`index.html`), built from `src/` (see `src/README.md`).

Tabs (rebuilt 2026-10-23 to the teaching contract): Reading (the idea in one sentence and a hero block diagram; the residual
stream; norm placement with the four-placement stepper, the learning-rate sweep and gradient by block absorbed from the root's
Block lab, DeepSeek-V4's mHC; LayerNorm against RMSNorm; attention-logit growth and QK-norm, soft-capping, qk-clip; z-loss;
residual init; massive activations; loss-spike forensics; production choices; depth, code, mistakes and interview rehearsal in
closed blocks), Stability explorer (learning rate x placement x QK-norm over recorded runs), Further reading.

Evidence: tiny-GPT runs on the topic's running example (Apple M1 Pro, MPS, same batches and seed), CPU inspection of
the checkpoints, transformers v5.20.1 code quoted by line, published results labelled.
