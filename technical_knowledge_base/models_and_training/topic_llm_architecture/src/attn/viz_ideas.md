# Attention lab: visuals built and rejected (2026-10-18)

Central question of the tab: what must each token leave behind, and what does that cost in memory, decode reads and quality?
Scores 0 to 2 on the skill's eight criteria (criteria 2 and 3 count double), minus build cost.

## Built
| Visual | Type | Score | Why |
|---|---|---|---|
| Same 16 tokens through MHA (top) and GQA-4/GQA-2/MQA/MLA/sliding window (bottom), cache drawn to scale, query heads coloured by the KV head they read | 1 before/after on the same input | 14 | The brief's main animation; area is memory, the grouping is visible, eviction is visible for the window. MLA's internals are not repeated: linked to the DeepSeek explainer. |
| Held-out loss against KV bytes per token, seed-1 repeats as hollow dots | measured scatter | 12 | The only place quality and cache size meet on one axis; the seed spread keeps a reader from over-reading small gaps. |
| Loss curves, held-out and training, same batches | measured lines | 7 | Shows the gaps are stable through training, not an end-of-run accident. |
| Published tables (GQA Table 1, DeepSeek-V2 Tables 8 and 9, StreamingLLM Table 10, NSA Table 4) rendered from `inputs/published.json` | tables | 9 | Real-scale evidence the toy cannot give; vendor and authors' runs labelled. |
| Decode step time and effective bandwidth against context, one layer at Llama 3.1 8B's shape, five variants including GQA via repeat_kv | measured lines | 13 | Tests the memory-bound claim directly; the repeat_kv line is a real implementation trap. |
| Whole tiny-GPT decode step against context | table | 5 | Shows where the cache stops mattering (overheads dominate at 6M parameters). |
| One trained model served with a sliding cache, with and without the first token kept, against a model trained with the window | before/after bars (type 1 in table form) | 13 | StreamingLLM's finding reproduced at toy scale on our own model; cheap, CPU. |
| First-token attention mass by layer for each trained variant | heat table | 7 | The mechanism behind the bars above; the Inside tab owns sinks in SmolLM2. |
| KV-cache sizing calculator: model, context, batch, formats, GPU; memory bar drawn to scale; "what if" attention swap table | type 8 calculator | 14 | Answers the design interview question with real configs; reuses CC.normalise and CC.cache so numbers agree with the Config calculator and the Architecture map (bf16, windows credited). |
| Every model's attention from its config, sortable by KV per token, click to load | type 9 explorer | 10 | "Real models' kv_heads read from src/data/configs" from the brief. |

## Rejected
| Visual | Why rejected |
|---|---|
| MLA step-by-step (compress, decoupled RoPE, absorb) | Exists on the DeepSeek page (Khalid's favourite); linked instead. |
| Context slider where attention FLOPs overtake weight FLOPs | The Config calculator's context section owns it; linked from section 1. |
| Attention-map viewer of the trained variants | Inside a real model owns attention maps; this tab shows only the first-token mass that the sliding-cache result needs. |
| A layer strip of Gemma 3 and gpt-oss local/global patterns | The Architecture map and the gallery child draw layer strips; the table in section 8 gives the pattern and the credited cache. |
| Whole-model decode timings of the tiny GPT as the speed evidence | Overhead-dominated at this size (shown in a small table as the reason); the one-layer benchmark at a real shape carries the argument. |
| NSA or DSA reimplemented on the tiny GPT | Needs custom kernels to show any speed; at 256 tokens there is nothing to skip. Published numbers, labelled, instead. |
| Sink preset (learned sink logit) trained here | Would duplicate the Inside tab's sink work; the first-token mass table and StreamingLLM's own learned-sink rows (Table 10) cover it. |
