"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised). The list below is this paper's own,
written from src/live.md.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header and links
 ('Reading-time line "12 min read, +~3h 45m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read', 'of resources']),
 ('Authors/lab: Qwen Team (Alibaba)', R + ', headline card', ['Qwen Team (An Yang', 'Alibaba (Qwen Team)']),
 ('Date: May 2025 (arXiv v1 2025-05-14; models released 2025-04-29)', R + ', headline card', ['arXiv v1 14 May 2025', 'models released 29 April 2025']),
 ('Link arXiv 2505.09388 (~1h 30m, technical report)', 'card and Further reading', ['https://arxiv.org/abs/2505.09388', '(1h 30m)']),
 ('Link blog "Qwen3: Think Deeper, Act Faster" (~15 min)', 'Further reading; cited in Pre-training', ['https://qwenlm.github.io/blog/qwen3/', 'Qwen3: Think Deeper, Act Faster']),
 ('Link GitHub (repo, ~20 min for the README and entry path)', 'card and Further reading', ['https://github.com/QwenLM/Qwen3', 'about 20 minutes for the README and entry path']),
 ('Link HF collection (~10 min)', 'Further reading', ['https://huggingface.co/Qwen', '(10 min)']),
 ('Added to KB: 2026-08-24', 'breadcrumb line', ['added to the knowledge base 2026-08-24']),
 # resources
 ('Raschka, Understanding and Implementing Qwen3 From Scratch (~35 min): dense architecture in plain PyTorch; fastest way to internalize a Qwen3 block', 'Further reading', ['https://magazine.sebastianraschka.com/p/qwen3-from-scratch', 'the fastest way to internalise exactly what a Qwen3 block contains']),
 ('Raschka, The Big LLM Architecture Comparison (~40 min): Qwen3 vs DeepSeek-V3, Llama, Gemma; no-shared-expert MoE', 'Further reading', ['https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison', 'good on the no-shared-expert MoE choice']),
 ('Lambert, Qwen 3: The new open standard (~15 min): why the size ladder plus Apache 2.0 made Qwen3 the default', 'Further reading; Why it matters', ['https://www.interconnects.ai/p/qwen-3-the-new-open-standard', 'made Qwen3 the default open family']),
 ('Official release post (~15 min): hybrid thinking, 119-language jump, agentic focus', 'Further reading', ['hybrid thinking, the 119-language jump and the agentic focus']),
 # problem
 ('Open ecosystem split into chat models (Qwen2.5-Instruct, GPT-4o class) and reasoners (QwQ-32B, R1 class); users route between models, no control over reasoning tokens', R + ', Problem', ['Chat models such as Qwen2.5-Instruct', 'reasoning models such as QwQ-32B and DeepSeek-R1', 'no control over how many reasoning tokens to pay for']),
 ('Small open models expensive: per-size reasoning-RL pipeline does not amortize', R + ', Problem', ['running a full reasoning-RL pipeline for every size does not amortise']),
 ('Targets three gaps: one model both modes under a budget; ladder trained cheaply from flagship teachers; multilingual 29 to 119', R + ', Problem', ['One model, two modes, a budget.', 'A ladder of sizes built cheaply.', "From Qwen2.5's 29 languages and dialects to 119"]),
 # family and architecture
 ('Six dense (0.6B-32B) and two MoE (30B-A3B; 235B-A22B, 235B total / 22B activated), all Apache 2.0', R + ', Family', ['six dense (0.6B, 1.7B, 4B, 8B, 14B, 32B) and two mixture-of-experts', '235B parameters in total with 22B active']),
 ('Dense architecture Qwen2.5-like: GQA, SwiGLU, RoPE, pre-norm RMSNorm', R + ', Family', ['grouped-query attention, SwiGLU, rotary position embeddings, RMSNorm before each sub-layer']),
 ('QKV-bias removed, QK-Norm added for training stability', R + ', Family', ['the QKV bias of Qwen2 is removed and QK-Norm is added', 'to ensure stable training']),
 ('MoE: 128 fine-grained experts, 8 activated, no shared experts (unlike Qwen2.5-MoE), global-batch load-balancing loss for specialization', R + ', Family (global-batch animation linked on the lab page)', ['128 fine-grained experts with 8 active per token', 'unlike Qwen2.5-MoE, no shared expert', 'to encourage expert specialization']),
 ('BBPE tokenizer, 151,669 vocab', R + ', Family', ["byte-level BPE with 151,669 tokens"]),
 ('Context 32K for 0.6B/1.7B, 128K for the rest', R + ', Family (with the model cards: 32,768 natively, 131,072 with YaRN)', ['Table 1 gives 32K for 0.6B and 1.7B and 128K for the rest']),
 # pre-training
 ('36T tokens, doubled over Qwen2.5', R + ', Pre-training; card', ['36T against 18T']),
 ('Qwen2.5-VL OCRs PDF-like documents, Qwen2.5 refines (trillions of extra tokens)', R + ', Pre-training', ['A fine-tuned Qwen2.5-VL recognises the text, Qwen2.5 refines it']),
 ('Qwen2.5-Math and Qwen2.5-Coder synthesize textbook/QA/code data', R + ', Pre-training', ['Qwen2.5, Qwen2.5-Math and Qwen2.5-Coder write textbooks, question-answer pairs, instructions and code']),
 ('Multilingual annotation system labels 30T+ tokens by educational value, field, domain, safety', R + ', Pre-training', ['labels over 30T tokens by educational value, field, domain and safety']),
 ('Mixture optimized at instance level (not source/domain) via ablations on small proxy models', R + ', Pre-training', ['per instance, not per source or domain', 'small proxy models']),
 ('S1 general ~30T at 4K, 119 languages', R + ', Pre-training stages', ['over 30T tokens at 4,096-token sequences, all 119 languages']),
 ('S2 reasoning ~5T higher-quality, STEM/code/synthetic up-weighted, accelerated LR decay', R + ', Pre-training stages', ['about 5T higher-quality tokens', 'learning-rate decay']),
 ('S3 long context: hundreds of billions at 32K, 75% of samples 16-32K', R + ', Pre-training stages', ['hundreds of billions of tokens at 32,768', '75% of the long-context text is 16,384 to 32,768 tokens long']),
 ('RoPE base 10K to 1M via ABF; YaRN and Dual Chunk Attention give 4x extrapolation at inference', R + ', Pre-training stages', ['The RoPE base rises from 10,000 to 1,000,000 (ABF)', 'YaRN and Dual Chunk Attention', 'a four-fold increase in sequence length capacity']),
 ('Optimal LR/batch size per model and stage from in-house scaling laws', R + ', Pre-training', ['in-house scaling laws set the learning-rate schedule and batch size for each model and stage']),
 # post-training stage 1
 ('Four post-training stages for the flagships (235B-A22B and 32B)', R + ', Post-training; animation', ['The two flagships, Qwen3-235B-A22B and Qwen3-32B, go through four stages']),
 ('Cold start: verifiable math/code/logic/STEM queries, two-phase filter', R + ', Stage 1', ['math, code, logical reasoning and general STEM problems', 'filtered twice']),
 ('Query filter: drop non-verifiable queries and ones Qwen2.5-72B answers without CoT (prevents superficial guessing)', R + ', Stage 1', ['not easily verifiable', 'chain-of-thought, "to prevent the model from relying on superficial guessing"']),
 ('QwQ-32B generates candidates; filter wrong answers, repetition, guesswork, think/summary inconsistency, language mixing, eval contamination', R + ', Stage 1', ['QwQ-32B generates', 'repeat themselves substantially', 'think one thing and summarise another', 'mix languages', 'too similar to validation items']),
 ('Deliberately minimal SFT: instill format without capping RL headroom', R + ', Stage 1', ['as few samples and steps as possible', 'so as not to cap what RL can add later']),
 # stage 2
 ('Reasoning RL: 3,995 held-out query-verifier pairs, learnable-but-hard, domain-diverse', R + ', Stage 2', ['3,995 in all', 'learnable for the cold-start model, as hard as possible']),
 ('GRPO with large batches, many rollouts, off-policy reuse, entropy control', R + ', Stage 2', ['The algorithm is GRPO', 'many rollouts per query and off-policy reuse', 'entropy']),
 ('235B-A22B AIME24 70.1 to 85.1 over 170 RL steps, no hyperparameter intervention', R + ', Stage 2; animation', ['from 70.1 to 85.1 on AIME\'24 in 170 RL steps', 'without any manual intervention on hyperparameters']),
 # stage 3
 ('Fusion: continual SFT on thinking data (rejection-sampled from stage-2 model on stage-1 queries) plus curated non-thinking data', R + ', Stage 3', ['generated by the stage-2 model itself, by rejection sampling on stage-1 queries', 'Non-thinking data']),
 ('Chat template adds /think and /no_think flags in user/system turns', R + ', Stage 3; animation', ['/think or /no_think in the user or system message']),
 ('Non-thinking samples keep an empty think block; deployers force non-thinking by pre-filling an empty block', R + ', Stage 3; animation', ['keeps an empty think block', 'force non-thinking by pre-filling the empty block']),
 ('Multi-turn data interleaves flags randomly; model obeys the last one', R + ', Stage 3', ['the response follows the last flag seen']),
 ('Thinking budget: at a user-set threshold a stop-thinking instruction is inserted, model answers from partial reasoning', R + ', Thinking budget; animation; toy tab', ['Considering the limited time by the user, I have to give the solution based on the thinking directly now', 'writes its answer from the reasoning so far']),
 ('Budget ability emerges from fusion rather than explicit training', R + ', Thinking budget (quoted, then tested on the toy)', ['This ability is not explicitly trained but emerges naturally as a result of applying Thinking Mode Fusion']),
 # stage 4
 ('General RL: reward system over 20+ tasks', R + ', Stage 4', ['A reward system over more than 20 tasks']),
 ('Instruction and format following, including /think switching and <think> token discipline', R + ', Stage 4', ['switching modes on /think and /no_think', 'where they belong']),
 ('Preference alignment; agent/tool use with real multi-turn environment execution feedback; RAG hallucination control', R + ', Stage 4', ['Preference alignment', 'complete multi-turn rollouts against real environments', 'curb hallucination']),
 ('Three reward types: rule-based verifiers, Qwen2.5-72B-as-judge with reference answers, reference-free reward model on human preference data', R + ', Stage 4', ['rule-based', 'Qwen2.5-72B-Instruct scores the response against it', 'a reward model trained on human preference data']),
 # distillation
 ('Strong-to-weak distillation for 0.6B-14B dense and 30B-A3B', R + ', Distillation', ['The five small dense models (0.6B, 1.7B, 4B, 8B, 14B) and Qwen3-30B-A3B']),
 ('Off-policy distillation on teacher outputs in both modes', R + ', Distillation; animation', ["Fine-tune the student on the teachers' responses in both /think and /no_think modes"]),
 ('On-policy distillation: student samples, minimizes KL to teacher logits (Qwen3-32B or 235B-A22B)', R + ', Distillation (formula); toy tab', ['The student samples its own responses', 'Qwen3-32B or Qwen3-235B-A22B']),
 ('Replaces 4-stage pipeline per small model at ~1/10 the GPU hours and beats RL', R + ', Distillation; How much to believe (the 1/10 against four stages is not itemised)', ['1/10 of "the four-stage training method"']),
 ('8B: on-policy distillation AIME24 74.4 (pass@64 93.3) in 1,800 GPU hours vs RL 67.6 (pass@64 90.0, unchanged) in 17,920', R + ', Distillation; Tables tab Table 21', ['74.4', '1,800', '67.6', '17,920', '90.0 to 93.3']),
 ('Distillation expands the exploration frontier where RL only sharpens pass@1', R + ', Distillation (with the one-question caveat)', ['the exploration space']),
 # results
 ('235B-A22B-Base beats DeepSeek-V3-Base on 14/15 with ~1/3 total and 2/3 activated parameters', R + ', Base results; Tables tab checks', ['beats DeepSeek-V3-Base on 14 of 15 benchmarks', 'about a third of its total and two thirds of its active parameters']),
 ('Beats Llama-4-Maverick at half its size', R + ', Base results (corrected: 1.7 times, "about twice" in the text)', ['1.7 times its size']),
 ('Dense ladder shifts a tier: Qwen3-1.7B/4B/8B/14B/32B-Base match Qwen2.5-3B/7B/14B/32B/72B-Base', R + ', Base results; tier chart', ['tier shift', '1.7B to 3B, 4B to 7B, 8B to 14B, 14B to 32B, 32B to 72B']),
 ('MoE bases match dense bases with 1/5 the activated parameters', R + ', Base results', ['the MoE bases match the dense ones with a fifth of the active parameters']),
 ('Flagship thinking: AIME24 85.7, AIME25 81.5, LiveCodeBench v5 70.7, CodeForces 2056 (98.2 percentile, above o1 and R1), BFCL v3 70.8', R + ', Results', ["AIME'24 85.7, AIME'25 81.5, LiveCodeBench v5 70.7, CodeForces 2,056 (98.2nd percentile", 'BFCL v3 70.8']),
 ('Competitive with o1, DeepSeek-R1, Gemini 2.5 Pro at 1/3 of R1 total parameters', R + ', Results (Gemini leads 15 of 23: "competitive" is generous)', ['35% of its total parameters', 'Gemini 2.5 Pro is ahead of it on 15 of 23']),
 ('Non-thinking mode beats GPT-4o-1120 and DeepSeek-V3 on most benchmarks', R + ', Results', ['ahead of GPT-4o-2024-11-20 on 18 of 23 and of DeepSeek-V3 on most']),
 ('Thinking budget: performance scales smoothly and monotonically with allocated thinking tokens (1K to 32K) on AIME, LiveCodeBench and GPQA', R + ', Thinking budget; Figure 2 rebuilt (monotonic but flat at first)', ['budgets of 1K to 32K thinking tokens', 'flat at first, steep between 2K and 16K']),
 ('Budgeted test-time compute validated as a user-facing dial', R + ', Thinking budget', ['what makes the dial safe to turn down']),
 ('Qwen3-4B roughly matches Qwen2.5-72B-Instruct-era quality on many tasks', R + ', Results predict question (corrected: a blog claim, true only with thinking on)', ['even a tiny model like Qwen3-4B can rival the performance of Qwen2.5-72B-Instruct', 'Only with thinking on']),
 ('Qwen3-8B/14B/30B-A3B beat DeepSeek-R1-Distill-Qwen-14B/32B', R + ', Results', ['Qwen3-8B beats DeepSeek-R1-Distill-Qwen-32B on 19 of 23']),
 ('Qwen3-1.7B beats R1-Distill-Llama-8B', R + ', Results (corrected: 18 of 22, loses AIME\'24, GPQA, LiveCodeBench)', ['Qwen3-1.7B beats R1-Distill-Llama-8B on 18 of 22']),
 ('Stage-3/4 ablations: gains in instruction following, agent stability, mode switching (ThinkFollow 88.7 to 98.9) at small cost in peak math/code', R + ', Stage effects chart', ['ThinkFollow 88.7 to 98.9', "thinking-mode AIME'24 falls 2.4 points"]),
 # why it matters
 ('Cemented Qwen as default open family to fine-tune: Apache 2.0 ladder 0.6B-235B, one tokenizer, one template, one behavior contract', R + ', Why it matters', ['the default open family to fine-tune', 'one tokenizer, one template and one behaviour contract']),
 ('Small models punch above their size via inherited flagship post-training', R + ', Why it matters', ['punch far above their size']),
 ('Most 2025 open fine-tunes, RL baselines, distillation studies build on these checkpoints; Khalid has fine-tuned this family professionally', R + ', Why it matters', ['RL research baselines and distillation studies build on these checkpoints', 'Khalid has fine-tuned professionally']),
 ('Three durable ideas: budgeted thinking dial; minimal cold start then GRPO with filtered verifiable data; on-policy logit distillation as 10x cheaper, strictly better substitute for per-model RL', R + ', Why it matters (softened: "strictly better" rests on one comparison)', ['budgeted thinking as a first-class inference dial', 'the minimal cold start followed by GRPO', 'on-policy logit distillation as a far cheaper substitute']),
 ('Hybrid thinking did not survive: July 2025 2507 refresh split Instruct and Thinking (235B-A22B, 30B-A3B, 4B), 256K context', R + ', Why it matters; What it takes', ['The hybrid did not survive at the top.', '235B-A22B, 30B-A3B and 4B models into Instruct and Thinking', '256K context']),
 ('Team concluded fusion taxed peak quality: instructive negative result about capability interference', R + ', Why it matters (corrected: the announcement says "best quality possible", with no numbers; Table 22 prices it)', ['we decided to stop using hybrid thinking mode', 'capability interference']),
 ('Family expanded: Qwen3-Coder (480B-A35B), Qwen3-Next-80B-A3B (hybrid gated/linear attention, ultra-sparse MoE), Qwen3-VL, Qwen3-Omni, closed Qwen3-Max; most actively iterated open line through 2025', R + ', Why it matters', ['Qwen3-Coder (480B-A35B)', 'Qwen3-Next-80B-A3B', 'Qwen3-Omni', 'most actively iterated open line through 2025']),
 # connections
 ('DeepSeek-R1: reasoning-RL paradigm; distilled models are baselines; RL vs distillation answered for distillation', 'Connections; Further reading', ['3c65c17b0d0d813faca4f7a51eaa0c65', 'in favour of distillation']),
 ('DeepSeekMath: GRPO', 'Connections; Stage 2; Further reading', ['3c65c17b0d0d817f9fc5cb9a9fbcbee5']),
 ('DeepSeek-V3: rival MoE flagship overtaken with a third of parameters via more tokens, not exotica (no MLA, no shared experts, no MTP)', 'Connections; Further reading', ['3c65c17b0d0d815fb8dac9ba1e35ab81', 'no MLA, no shared experts, no multi-token prediction']),
 ('Switch Transformer and Mixtral: MoE lineage behind 128-expert, 8-active design', 'Connections; Further reading', ['3c65c17b0d0d81a8b541c9babbf40c94', '3c65c17b0d0d81eba72af0ac91ddc6b3']),
 ('RoFormer: RoPE extended via ABF plus YaRN and DCA', 'Connections; Further reading', ['3c65c17b0d0d81cfa5e9f54459720098', 'ABF base scaling plus YaRN and Dual Chunk Attention']),
 ('Llama 3: competing open-family report; Llama-4 comparisons mark the open-weight lead moving east', 'Connections; Further reading', ['3c65c17b0d0d81aca58ccb9d720b474e', 'the open-weight lead moving east']),
 ('Topics: llms, llm-training-and-post-training, rl, data-curation-and-datasets', 'Connections; Further reading', ['3c65c17b0d0d812d9e00f6ec89965286', '3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d8195a6c6c11ad093c16e', '3c65c17b0d0d811fa5ecda8d365ab00f']),
 ('Database property Takeaway', 'stays in the database; also shown verbatim on the headline card', ['fusing thinking and non-thinking modes with a token-budget dial']),
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
