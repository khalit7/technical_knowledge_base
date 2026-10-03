"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header
 ('Reading time line "15 min read, +~5h 5m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read', 'of resources']),
 ('Authors/lab: Llama Team, AI @ Meta', R + ', headline card', ['Llama Team, AI @ Meta']),
 ('Date: July 2024 (paper 2024-07-23; arXiv v3 2024-11)', R + ', headline card (with v1 31 July and v3 23 November 2024 from the arXiv listing)', ['dated 23 July 2024', 'v3 23 November 2024']),
 ('Link arXiv 2407.21783 (~2h 30m, long technical report)', 'card and Further reading', ['https://arxiv.org/abs/2407.21783', '(2h 30m)']),
 ('Link Meta blog (~15 min)', 'Further reading, Best resources', ['https://ai.meta.com/blog/meta-llama-3-1/', 'Introducing Llama 3.1']),
 ('Link llama.meta.com (~10 min)', 'Further reading, Best resources', ['https://llama.meta.com/']),
 ('Link model repo meta-llama/llama-models (~20 min for the README and entry path)', 'card and Further reading', ['https://github.com/meta-llama/llama-models', 'about 20 minutes for the README and entry path']),
 # resources
 ('Oxen.ai arXiv Dive: How Meta Trained Llama 3.1 (~30 min): section-by-section, data and training pipeline', 'Further reading, Best resources', ['https://www.oxen.ai/blog/llama-3-1-herd-of-models', 'section-by-section walkthrough']),
 ('Raschka, New LLM Pre-training and Post-training Paradigms (~35 min): Llama 3.1 beside Qwen 2, Gemma 2, Apple AFM', 'Further reading; also quoted in Why it matters', ['https://magazine.sebastianraschka.com/p/new-llm-pre-training-and-post-training', 'Qwen 2, Gemma 2']),
 ("Arize: Breaking Down Meta's Llama 3 Herd of Models (~20 min)", 'Further reading, Best resources', ['https://arize.com/blog/breaking-down-meta-llama-3/', 'compact tour of pre-training, post-training and the key levers']),
 ('Rudrite interactive visual explainer (~25 min)', 'Further reading, Best resources', ['https://research.rudrite.com/llama-3', 'exhibits computed from the paper']),
 # problem
 ('Open-weight models trailed GPT-4-class closed models by a wide margin', R + ', Problem', ['trailed GPT-4-class closed models by a wide margin']),
 ('No open release documented how to build one: data curation, scaling-law methodology, infrastructure for 16K GPUs, post-training recipe', R + ', Problem', ['the data curation, how to size the model for a compute budget, the infrastructure that keeps 16,000 GPUs busy, and a post-training recipe that scales']),
 ('Three levers: data, scale, managing complexity (dense over MoE; SFT+RS+DPO over RL, for stability and simplicity)', R + ', Problem', ['Managing complexity.', 'to maximize training stability', 'tend to be less stable and harder to scale']),
 # method: architecture
 ('Herd of 8B / 70B / 405B dense Transformers', R + ', The herd', ['The herd is three sizes']),
 ('128K vocabulary: tiktoken 100K + 28K multilingual tokens', R + ', The herd', ['100K tokens from tiktoken plus 28K for non-English languages']),
 ('GQA with 8 KV heads', R + ', The herd', ['Grouped-query attention with 8 key-value heads']),
 ('RoPE theta 500,000', R + ', The herd', ['RoPE base frequency 500,000']),
 ('Intra-document attention masking', R + ', The herd', ['A document mask']),
 ('405B: 126 layers, d = 16384, 128 heads', R + ', The herd table; Tables tab Table 3', ['16,384', '126', '128']),
 ('405B trained on 15.6T tokens with 3.8e25 FLOPs', R + ', Problem, Scaling law, card', ['15.6T tokens', '3.8 × 10 25 FLOPs']),
 ('All released results are the Llama 3.1 versions', R + ', The herd', ['Every result in the paper is for the 3.1 models']),
 # data
 ('Custom HTML parser; markdown stripped as harmful', R + ', Data (seven stages)', ['custom HTML parser', 'Markdown markers are stripped']),
 ('Three-level dedup: URL, global MinHash document-level, ccNet line-level removing lines seen >6 times per 30M-doc bucket', R + ', Data', ['by URL (keep the newest version of each page)', 'global MinHash', 'more than 6 times in each bucket of 30M documents']),
 ('Heuristic filters: duplicated n-gram coverage, dirty-word counts, token-distribution KL outliers', R + ', Data', ['duplicated n-gram coverage ratio', '"dirty word" counts', 'Kullback-Leibler divergence']),
 ('Model-based quality: fasttext "would Wikipedia cite this", DistilRoberta trained on Llama 2 quality judgments', R + ', Data', ['would this be referenced by Wikipedia', 'DistilRoberta classifiers trained on Llama 2']),
 ('Separate domain pipelines for code and math pages', R + ', Data', ['Separate code and maths pipelines']),
 ('Final mix ~50% general, 25% math and reasoning, 17% code, 8% multilingual', R + ', Data mix bar', ['General knowledge', 'Maths and reasoning', 'Pre-training mix, by tokens']),
 ('176-language fasttext ID', R + ', Data', ['176 languages']),
 ('Mix chosen via knowledge classification plus scaling-law experiments on candidate mixes', R + ', Data', ['knowledge classifier', 'scaling-law experiments on candidate mixes']),
 ('Mix adjusted mid-run: more non-English, upsampled math, fresher web late, downsampled low-quality', R + ', Data', ['more non-English data, upsampled maths, more recent web data late on']),
 ('Annealing an 8B on GSM8k/MATH train sets lifts validation 24.0% / 6.4%; negligible at 405B', R + ', Data', ['24.0% and 6.4%', 'negligible']),
 ('Annealing as cheap dataset estimator: 30% new data, 70% default, 40B tokens on a half-trained 8B', R + ', Data', ['8B trained to 50%', '40B tokens with 30% weight on the new data and 70% on the default mix']),
 # scaling laws
 ('Two-stage downstream prediction: NLL vs FLOPs, then NLL to accuracy via sigmoid using Llama 2 models', R + ', Scaling law; Refit tab step 3', ['Relate the compute-optimal model', 'with a sigmoid, fitted on the scaling-law models plus the older, larger Llama 2 models']),
 ('IsoFLOPs 6e18 to 1e22 FLOPs', R + ', Scaling law; Refit tab step 1', ['budgets from 6 × 10 18 to 10 22 FLOPs']),
 ('N*(C) = A C^alpha with (alpha, A) = (0.53, 0.29)', R + ', Scaling law (corrected: N* is tokens, not parameters; the printed constants are rounded and give 10.5T)', ['(α, A ) = (0.53, 0.29)', 'is a number of tokens , not parameters', '10.5T']),
 ('Extrapolating to 3.8e25 suggests 402B params on 16.55T tokens, hence 405B', R + ', Scaling law (reproduces exactly at 4.0e25 with the refit; derived)', ['402B parameter model on 16.55T tokens', 'reproduces exactly at 4.0 × 10 25']),
 ('IsoFLOPs flatten near the optimum at high compute, so the size choice is robust', R + ', Scaling law; Refit tab curvature', ['become flatter around the minimum as the compute budget increases']),
 ('ARC-Challenge forecast extrapolated four orders of magnitude and only slightly underestimated', R + ', Scaling law (measured: 3.6 orders from 1e22; 95.8% predicted against 96.0%)', ['only slightly underestimates', '3.6 orders of magnitude', '95.8% against 96.0%']),
 # infrastructure
 ('Up to 16K H100s (700W, 80GB HBM3), Meta production clusters, Grand Teton, MAST', R + ', Training on 16K GPUs', ['up to 16K H100 GPUs (700 W, 80 GB HBM3)', 'Grand Teton', 'MAST']),
 ('Storage: Tectonic, 240PB SSD, 2 TB/s sustained, 7 TB/s peak, for bursty checkpoint writes', R + ', Training on 16K GPUs', ['240 PB on 7,500 SSD servers, 2 TB/s sustained and 7 TB/s peak']),
 ('Network: 400 Gbps RoCE (Arista 7800 + Minipack2), 3-layer Clos over 24K GPUs', R + ', Training on 16K GPUs', ['Arista 7800 and Minipack2', 'three-layer Clos network of 24K GPUs', '400 Gbps']),
 ('Full bisection within 3,072-GPU pods, 1:7 oversubscription at aggregation; topology-aware layout', R + ', Training on 16K GPUs; Run tab mesh', ['3,072 GPUs at full bisection bandwidth', '1:7 oversubscription', 'topology-aware']),
 ('Enhanced-ECMP with 16 flows per GPU pair; deep-buffer spine; no DCQCN', R + ', Training on 16K GPUs', ['16 flows between each GPU pair', 'Enhanced-ECMP', 'deep-buffer spine switches', 'without DCQCN']),
 ('NCCLX (NCCL fork)', R + ', Training on 16K GPUs', ["NCCLX", "fork of Nvidia's NCCL"]),
 ('8B/70B trained on InfiniBand clusters instead', R + ', Training on 16K GPUs', ['the smaller models used Nvidia Quantum2 InfiniBand']),
 ('4D parallelism [TP, CP, PP, DP] innermost to outermost by bandwidth need', R + ', 4D cards; Run tab mesh', ['[TP, CP, PP, DP]', 'ordered from the most to the least bandwidth-hungry']),
 ('TP = 8, PP = 16, FSDP as DP (optimizer state and gradients sharded, weights not resharded after forward)', R + ', 4D cards and Table 4', ['Tensor (TP = 8)', 'Pipeline (PP = 16)', 'Weights are not resharded after the forward pass']),
 ('Pipeline: tunable number of contiguous micro-batches (between DFS and BFS); one layer removed from first and last stages; interleaved; async p2p', R + ', engineering list; Run tab pipeline simulation', ['Meta made N a free knob between the two', 'removes one Transformer layer from the first and last stages', 'interleaved schedule', 'asynchronously']),
 ('8K-token pre-training without activation checkpointing', R + ', engineering list', ['8K-token pre-training without activation checkpointing']),
 ('Context parallelism (long-context only) all-gather over K/V, cheap because GQA keeps K/V small', R + ', 4D cards and engineering list', ['Context parallelism by all-gather', 'K and V are 1/16 the size of Q']),
 ('BF16 MFU 38-43% (430 TFLOPs/GPU at 8K GPUs, 380 at 131K sequence)', R + ', Table 4 mini; card; Tables tab check', ['38% to 43%', '430', '380']),
 ('FP32 gradient accumulation and reduce-scatter for stability', R + ', engineering list', ['gradients are accumulated over micro-batches in FP32 and reduce-scattered across data-parallel workers in FP32']),
 # reliability
 ('54-day snapshot: 466 interruptions, 419 unexpected', R + ', Keeping it running; card; Run tab replay', ['466 interruptions', '419 unexpected']),
 ('78% attributed to hardware', R + ', Keeping it running (with the count-based 76.6% to 85.0% bracket)', ['About 78% of the unexpected ones were confirmed or suspected hardware', 'bracketing the paper']),
 ('Faulty GPUs 30.1% and HBM3 17.2% the top causes (Table 5)', R + ', Table 5 bars (corrected: 148 of 419 is 35.3%, the printed 30.1% does not match its count)', ['Faulty GPU', 'GPU HBM3 Memory', '148 of 419 is 35.3%']),
 ('At least one interruption per day', R + ', Keeping it running', ['at least one interruption a day']),
 ('>90% effective training time; only 3 incidents needed manual intervention', R + ', Keeping it running; card', ['higher than 90% effective training time', 'only three incidents needed significant manual intervention']),
 ('Tooling: NCCL flight recorder for hangs; straggler detection', R + ', Keeping it running (tooling details)', ['NCCL flight recorder', 'Straggler detection']),
 ('1-2% diurnal throughput swing from midday temperatures', R + ', Keeping it running', ['throughput varied 1% to 2% with the time of day']),
 ('Synchronized GPU idle/busy swings datacenter power by tens of megawatts', R + ', Keeping it running', ['by tens of megawatts']),
 # recipe
 ('AdamW, peak LR 8e-5, 8K-step warmup, cosine to 8e-7 over 1.2M steps', R + ', The 405B recipe with chart', ['AdamW, peak learning rate 8 × 10 −5 , 8,000 warm-up steps, cosine decay to 8 × 10 −7 over 1,200,000 steps']),
 ('Batch ramp: 4M at seq 4096, 8M at seq 8192 after 252M tokens, 16M after 2.87T', R + ', The 405B recipe with chart', ['4M tokens of 4,096-token sequences', 'after 252M tokens', 'after 2.87T tokens']),
 ('Very stable, few loss spikes, no divergence interventions', R + ', The 405B recipe', ['few loss spikes and no interventions for divergence']),
 ('Long-context: six stages 8K to 128K, ~800B tokens; advance when short-context evals recover and NIAH solved', R + ', The 405B recipe', ['six stages over about 800B tokens', 'short-context evaluations have fully recovered']),
 ('Annealing: LR linearly to 0 over last 40M tokens at 128K, upsample top-quality data, Polyak averaging', R + ', The 405B recipe', ['over the final 40M tokens the learning rate falls linearly to 0 at 128K context', 'Polyak average']),
 # post-training
 ('Six rounds of RM + SFT + DPO', R + ', Post-training; animation', ['six times in all']),
 ('Reward model: Llama 2 recipe minus the margin term', R + ', Post-training', ["Llama 2's objective without its margin term"]),
 ('Annotators pick chosen vs rejected on pairs from different recipes, optionally edit: edited > chosen > rejected', R + ', Post-training', ['two responses from two different models', 'edited > chosen > rejected']),
 ('Rejection sampling: K = 10 to 30 samples from the best checkpoint, RM picks the winner', R + ', Post-training; animation', ['K = 10 to 30 responses', 'keep the one the reward model scores highest']),
 ('PagedAttention (vLLM) gives >2x RS throughput', R + ', Post-training', ['over 2× the throughput']),
 ('SFT on rejection-sampled + synthetic + curated data, LR 1e-5, 8.5-9K steps', R + ', Post-training', ['learning rate 10 −5 for 8.5K to 9K steps']),
 ('DPO on the latest preference batches only (near on-policy), LR 1e-5, beta 0.1', R + ', Post-training', ['on the latest preference batches only', 'β = 0.1']),
 ('DPO fixes: mask formatting/header tokens (tail repetition, abrupt termination); NLL on chosen with coefficient 0.2', R + ', Post-training; DPO predict question', ['tail repetition and abrupt termination', 'coefficient 0.2 on the chosen response']),
 ('Model averaging across RM/SFT/DPO variants', R + ', Post-training', ['Model averaging']),
 ('DPO beat PPO at less compute, notably on IFEval', R + ', Post-training', ['DPO required less compute for large-scale models and performed better, especially on instruction following benchmarks like IFEval']),
 ('Preference mix 82% general English, 7% coding, 5% multilingual, 6% reasoning/tools', R + ', data mixes (Table 6 at printed precision); Tables tab', ['81.99%', '6.93%', '5.19%', '5.89%']),
 ('SFT mix 52.7 general, 21.2 reasoning and tools, 14.9 code, 8.1 exam-like, 3.0 multilingual, 0.11 long context', R + ', data mixes (Table 7 at printed precision); Tables tab', ['52.66%', '21.19%', '14.89%', '8.14%', '3.01%', '0.11%']),
 ('QC: rule-based cleaning (emojis, "I apologize" tone)', R + ', quality-control passes', ['excessive emojis or exclamation marks', '"I apologize"']),
 ('Topic classification with a finetuned 8B', R + ', quality-control passes', ['Topic classification']),
 ('Quality scoring by RM OR Llama-as-judge; they disagree a lot; union wins', R + ', quality-control passes', ['The two disagree often; keeping examples that either marks as high quality gave the best recall']),
 ('Difficulty scoring (Instag + Llama)', R + ', quality-control passes', ['Instag']),
 ('Semantic dedup: RoBERTa clustering, keep by quality x difficulty', R + ', quality-control passes', ['cluster dialogs with RoBERTa, sort each cluster by quality × difficulty']),
 # capabilities
 ('Code expert: branched, continued on 1T tokens of >85% code, CodeLlama style', R + ', Capabilities: Code', ['1T tokens of over 85% code (CodeLlama-style)']),
 ('Multilingual expert: 90% multilingual continued pre-training', R + ', Capabilities: Multilingual', ['90% multilingual tokens']),
 ('2.7M synthetic code SFT examples with execution feedback (parser, linter, generated unit tests in containers); ~20% self-corrected', R + ', Capabilities: Code', ['2.7M synthetic SFT examples', 'parser, linter and model-written unit tests in containers', 'about 20% of solutions were wrong at first and self-corrected']),
 ('Cross-language translation; 1.2M backtranslation dialogs for documentation and explanation', R + ', Capabilities: Code', ['Translation', 'about 1.2M dialogs for explanation and documentation']),
 ('Math: stepwise reward models and MCTS to filter bad reasoning traces', R + ', Capabilities: Maths', ['outcome and stepwise reward models', 'Monte Carlo Tree Search']),
 ('Long context: 0.1% synthetic long-context SFT data keeps 128K working; short-context DPO does not hurt', R + ', Capabilities: Long context', ['0.1%', 'Short-only DPO did not hurt long context']),
 ('Tool use (Brave Search, Python interpreter, Wolfram Alpha) trained with message-level human preference annotation', R + ', Capabilities: Tool use', ['Brave Search, a Python interpreter and the Wolfram Alpha API', 'Human annotation is per message']),
 ('Factuality: "know what it knows", knowledge probing generates refusals for consistently wrong answers', R + ', Capabilities: Factuality', ['"Know what it knows"', 'generate a refusal to train on']),
 ('405B served with FP8 quantization on feedforward matmuls', R + ', Results: Inference; What it takes to use this', ['FP8 (released) quantises most feed-forward weights and activations']),
 # results
 ('405B Instruct: MMLU 87.3 (5-shot) / 88.6 (0-shot CoT), MMLU-Pro 73.3, IFEval 88.6, HumanEval 89.0, GSM8K 96.8, MATH 73.8, MGSM 91.6, ARC-C 96.9', R + ', Results headline and Table 2 with intervals', ['MMLU 87.3 (5-shot) and 88.6 (0-shot with chain of thought), MMLU-Pro 73.3, IFEval 88.6, HumanEval 89.0, GSM8K 96.8, MATH 73.8, ARC Challenge 96.9', 'MGSM 91.6']),
 ('At or near GPT-4 (0125), competitive with GPT-4o and Claude 3.5 Sonnet; behind on some coding and GPQA', R + ', Results; How much to believe (qualified with intervals and the human evaluation)', ['level with GPT-4 (0125)', 'behind them on GPQA']),
 ('8B and 70B best-in-class vs Gemma 2 9B, Mistral 7B, Mixtral 8x22B (70B: MMLU 86.0 CoT, HumanEval 80.5, GSM8K 95.1)', R + ', Results', ['MMLU 86.0 with CoT, HumanEval 80.5, GSM8K 95.1', 'Gemma 2 9B, Mistral 7B, Mixtral 8x22B']),
 ('Forecasting methodology validated across four orders of magnitude', R + ', Scaling law; Refit tab', ['quite accurate']),
 ('Released open weights (base + instruct, three sizes) plus Llama Guard 3; vision, video, speech adapters not released', R + ', Results; What it takes (Llama 3.2 vision release noted beyond the paper)', ['Llama Guard 3', 'not yet being broadly released', 'Llama 3.2 11B and 90B']),
 # why it matters
 ('First open-weights model credibly at GPT-4 level; most detailed public account of a frontier-scale run', R + ', Why it matters', ['first open-weights model credibly at GPT-4 level']),
 ('Reference data: failure taxonomy (78% hardware), MFU, 4D layout, annealing and batch-ramp schedules', R + ', Why it matters', ['the failure taxonomy of a 16K-GPU job, the MFU per configuration, the 4D layout, the batch and context schedules, the annealing recipe']),
 ('Cemented the open post-training recipe (iterative RS + SFT + DPO instead of PPO)', R + ', Why it matters (now sourced to Raschka)', ['the most popular preference tuning strategy at the moment']),
 ('Popularized annealing as quality boost and dataset evaluator; downstream-benchmark scaling-law forecasting', R + ', Why it matters', ['Annealing as a final quality step and as a cheap test']),
 ('"Managing complexity" defined one pole; DeepSeek-V3/R1 took the opposite side', R + ', Why it matters', ['defined one pole of the design space', 'DeepSeek-V3, five months later, took the other']),
 # connections
 ('Chinchilla: compute-optimal framework; 8B/70B overtrained', 'Connections; Further reading', ['3c65c17b0d0d8116b7ddffba5c599f3f', 'trained far past compute-optimal']),
 ('Scaling laws (2020): ancestor; Llama 3 adds NLL-to-accuracy stage', 'Connections; Further reading', ['3c65c17b0d0d81b08a1debb0c15cd252', 'NLL-to-accuracy stage']),
 ('DPO: the alignment algorithm scaled up with token masking and NLL', 'Connections; Further reading', ['3c65c17b0d0d818bb1d8cafd30e20f9e']),
 ('InstructGPT: PPO-based RLHF pipeline moved away from', 'Connections; Further reading; animation', ['3c65c17b0d0d8180b958d8299996a063']),
 ('vLLM PagedAttention: doubles RS throughput', 'Connections; Further reading', ['3c65c17b0d0d81bf8b90ca93fee19f5f']),
 ('RoFormer RoPE with theta 500K', 'Connections; Further reading', ['3c65c17b0d0d81cfa5e9f54459720098']),
 ('Megatron-LM and ZeRO: TP and FSDP building blocks', 'Connections; 4D cards; Further reading', ['3c65c17b0d0d8133ae92fbe90a1f308e', '3c65c17b0d0d81879a7ed90bca007699']),
 ('DeepSeek-V3: the counterpoint (MoE, FP8 training, RL-heavy post-training)', 'Connections; Why it matters; Further reading', ['3c65c17b0d0d815fb8dac9ba1e35ab81']),
 ('Topics: llm-training-and-post-training, data-curation-and-datasets, ml-infra-and-orchestration, llms, hardware', 'Connections; Further reading', ['3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d811fa5ecda8d365ab00f', '3c65c17b0d0d81b5925bfd1d8665dd4b', '3c65c17b0d0d812d9e00f6ec89965286', '3c65c17b0d0d8118beeefaed56da6f8e']),
 ('Database property Takeaway', 'stays in the database; also shown verbatim on the headline card', ["Meta's full playbook for a GPT-4-class open model"]),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
