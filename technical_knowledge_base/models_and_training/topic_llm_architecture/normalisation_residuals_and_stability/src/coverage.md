# Coverage

New page (2026-10-19): no old Notion page to carry. The root's Reading section 7 ("Normalisation, residuals and
stability") is the root-depth summary; every claim in it is covered here in depth:
- post-norm vs pre-norm and warmup (section 2, with the Block lab's runs and Xiong et al.);
- RMSNorm (section 3, measured: quality, speed, and how little the mean matters in a trained model);
- QK-norm and its users (section 4, with code from Qwen3, OLMo 2, Llama 4, Gemma);
- norms after the sublayer, OLMo 2 and Gemma 3 (section 2, measured);
- loss spikes, gradient norm, largest attention logit, per-layer residual norms (sections 4 and 8);
- massive activations (section 7, with the Inside lab's SmolLM2 numbers).
Suggested corrections for the root's section 7 are in the report (Gemma 4 uses a plain gain; MiniMax-M1 is DeepNorm;
DeepSeek-V4 adds mHC; clipping did not fix logit growth here).
