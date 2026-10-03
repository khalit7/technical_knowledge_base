# Coverage: old Notion page (src/live.md, fetched 2026-10-03) to the HTML

Where every fact, number, link and named example of the old page now lives. "Reading" sections: In one screen (grid), Axis 1 to 4, Machinery, How we got here, Common mistakes, Choosing a path. "More" is the Further reading tab. Data tabs (owned by other parts of the build): Open recipes compared (t-recipes), Price list (t-price), Scaling calculator (t-scale).

Corrections are marked **C**; each is shown on the page in a "Correction" box with its source.

## Header, video, intro, taxonomy

| Old page | Now |
|---|---|
| Video block and its note (made 22 Sep 2026; misses DSec, MiMo-V2.6 RL cost, frozen router) | Stays in Notion under the embed (not touched). One line at the foot of More repeats the note. |
| "9 min read · +18h 35m resources" | Replaced by the new page's own reading time (reported to Khalid; the header line is the orchestrator's). |
| Intro paragraph (lifecycle: pretraining, machinery, components, post-training, reward hacking, inference) | Reading, In one screen (lead paragraph) and Machinery (components, inference end). |
| Mermaid taxonomy (PRE: data, objective, scaling laws, tokenizer, positional encoding; MACH: DP/TP/PP/EP/CP, ZeRO, FSDP2, bf16/fp8, SLURM, torchtitan, checkpointing; CPT, mid-training anneal and long context; SFT to preference opt to RLVR, PEFT dotted, reward hacking; compression; sampling and decoding) | Replaced by the interactive stage by axis grid (rows: the stages; groups: building the base, post-training, making it cheaper) plus Machinery. Every node is covered: tokenizer and positional encoding in Machinery "Components fixed before training"; pruning in the Distillation cell is not repeated (child page owns it). |

## Map of the space: pretraining

| Fact | Now |
|---|---|
| Pretraining well understood in the open; Chinchilla allocation and over-training; multi-stage data, anneal, long-context; open recipes OLMo 2/3, K2 Horizon, SmolLM3, nanoGPT speedrun and Muon, link to Pretraining | Grid (pretraining row), Axis 2, Common mistakes (20 tokens per parameter); open recipes on t-recipes; More (Pretraining card lists OLMo, K2 Horizon, SmolLM3, speedrun, Muon). |
| Chinchilla says nothing about token quality; Dwarkesh decomposition puts more of the gain on data; allocation intact, "one token = another" removed | Axis 2 first bullet, with the published 12.0x and 3.7x, the derived 3.24, the additivity finding. **C**: post dated 8 Sep (authors Dwarkesh Patel and Jerry Han); the small-model claim marked unconfirmed. Link to Topic: data-curation-and-datasets kept. Dwarkesh link and 25 min in More. |
| Magic: >10x more compute-efficient recipe, vendor-reported, playbook for small labs | Axis 2 first bullet (labelled reported, with "matching DeepSeek V4 Pro Base with about 50x fewer FLOPs" from the checked post). **C**: dated 8 Sep. Link and 25 min in More. |

## Map of the space: distributed training

| Fact | Now |
|---|---|
| FSDP2 and HSDP, TP in node, PP across nodes, EP for MoE, CP for 128k | Machinery, "Splitting the work" table. |
| Link to Distributed Training | Machinery table header context, More. |
| Ultra-Scale Playbook, 4000+ runs, canonical reference | Machinery (Clusters bullet) and More (Best starting resources, about 8h). |
| MoE memory-bottleneck paper: four bottlenecks bounded by scheduling not approximation (dispatch, vocabulary projection, checkpointing, optimiser state) | Machinery paragraph, with the paper page's measured numbers (86.6%, 79.5 to 10.6 GiB, 4.4%, 1M context, 120B to 667B, 16 to 64 H200s, 8 to 32x vs a weak FSDP2 baseline). |
| "against a fixed pair of consumer cards"; "recorded from the abstract, no numbers" | **C** box in Machinery: H200 nodes with 2 TB host RAM; two operators are scheduled offload; builds on ZeRO-3 and Megatron vocab sharding. |

## Map of the space: post-training

| Fact | Now |
|---|---|
| Standard flow SFT, preference optimisation (PPO or DPO, which skips RM and RL loop), RLVR with GRPO | Grid rows SFT, Preference optimisation, RLVR; Axis 1 intro; Axis 3 PPO/GRPO/DPO animation. Link to Alignment kept everywhere. |
| Reward hacking definition, central failure mode, KL penalties, reward ensembles, hidden test splits; link | Axis 4 table and the KL-leash animation; Reward Hacking linked. |
| Cognition SWE-2: Kimi K3 2.8T, FrontierCode 1.1 Main 50.0 vs 50.9, 64% lower cost (claimed), effort levels in one RL run with slope-matched penalties, cheaper than caller budget or router, turns not tokens (58% fewer turns, 81% less than SWE-1.7), TB 2.1 92.8 vs TB 4 27.3, about 30 points behind, no weights or API | Axis 1 last bullet (all numbers; TB 4 rivals' 55.8 and 57.9 added from the check); grid RLVR cell. **C**: dated 10 Sep; also rolling out on Devin Web and Fusion. Dropped: the comparison with Anthropic's budget and OpenAI's router (Topic: llms owns those controls) and TB 2.1 92.8 (version-skew point kept by citing TB 4). Link and 15 min in More. |
| NeoHorse-1: router over model pool, three-stage curriculum, structural validation, six-dimensional evaluation, subscene labelling, teachers under progressive difficulty, evaluation feedback to mixture, 4B 58.94 to 64.87, 9B 65.60 to 69.04, 4B closes most of gap, scaling past 9B not shown | Axis 2 "Production traffic" bullet (89% derived; on-policy distillation; loop ran once). **C**: ten benchmarks not 11. Paper page and arXiv (45 min) linked. |
| AI Research Preference Models: frozen LMs, pairwise knockout, inference-only and agentic variants, 0.684 to 0.729, about 15 h vs 24 (1.5 to 1.6x), WinoGrande 94.1, SVAMP 95.7, hold loosely, LLM-judge biases, idea worth more | Axis 3 "Fewer GPU hours" bullet (0.711 added, 15 candidates); **C** box: on arXiv since 14 Aug; WinoGrande is the agentic variant's, SVAMP the inference-only one's. Exact hours (14.88, 15.50) and the benchmark bests stay in the 7 Sep tech news issue (linked) to keep Reading short. Links arXiv (45 min) and MarkTechPost (10 min) in More. |
| ToolGrad: verified API chain first, then question; 99.8% across 16,000 APIs; Gemma 3 12B on 500 examples matched Gemini 2.5 Pro on unseen APIs; inversion transfers, also for eval sets | Axis 2 bullet with the checked BFCL figures (83.1 vs 83.2) and the arXiv link; grid Distillation data cell; data animation 2026 step. Link and 12 min in More. |
| DSec: four isolation levels (FnCall, container, microVM, full VM), on-demand images from 3FS, overcommit tuning, co-designed with RL so rollouts survive preemptible training; 160 nodes, 3M a day, 380K concurrent, 5,000/s; misbehaviour as sandbox property; the ratio makes agentic RL affordable; isolation per task; dated 19 Sep, surfaced 23 to 26 Sep | Axis 3 "Sandboxes" bullet (scale marked self-reported, 31 per node per second derived); Axis 4 paragraph (sandbox as defence); grid RLVR cost cell. Dropped as detail owned by the paper page: 3FS image loading and overcommit tuning, the TechNode/Bloomberg/Hacker News discovery note. |

## Efficiency

| Fact | Now |
|---|---|
| PEFT: freeze base, LoRA, QLoRA NF4 base with bf16 adapters; link | Grid PEFT row; Machinery bytes-per-parameter calculator; More. |
| Precision: bf16 to fp8 mainstream; NVFP4 and MXFP4 arriving for training | Machinery "Precision" bullet (with NVFP4 pretraining link from the child page); grid Quantization row. |
| Distillation: off-policy or on-policy; main reason the 1 to 8B tier is capable | Grid Distillation row (both statements). |

## Worked examples with a budget attached

All priced runs are charted on the Price list tab (t-price), which owns their figures and scopes; Reading quotes them only where an axis needs them.

| Fact | Now |
|---|---|
| Mercor + SkyRL: Qwen3.5-397B-A17B, 1,928 tasks, +70% APEX-Agents Pass@1, token accounting, async RL, environment robustness, harness design; read with Terminal-Universe in Papers; cross-listed to Topic: rl | Axis 3 "harness" bullet with the checked 16.11% to 27.29% (+69.4%); data animation; grid RLVR data cell; Terminal-Universe and Topic: rl linked (More). Link and 25 min in More. |
| Thomson Reuters: $40M, three months, 200B of 19T with DatologyAI, DPO against open constitution, GSPO for compaction and caching, 35B open-weights sibling "alongside"; reported, not audited; the two share a parameter count by coincidence; together they price post-train vs mid-train | Axis 2 (selection 1.05% derived), grid mid-training rows, Choosing a path, Price list. **C**: the 35B sibling (Qwen3.6-35B) will be released, academic and non-commercial. The "share a parameter count" remark dropped (trivia). DPO and GSPO named in the Axis 3 correction box on scope. |
| Postgres planner: 420 trajectories from GPT-6 Astra, LoRA about 21M, consumer GPUs, anchored GRPO, 13.6k queries, 113 held-out, vLLM on rented dual-H100, 4B beats hand-tuned production system for hundreds of dollars; specialisation beats scale | Axis 3 "cheap end" bullet (21.2M, 13,646, 113, 1.81x, $1,200), grid SFT rows, data animation, Choosing a path. **C** box: 400 trajectories, $1,200 total, best of up to 15 candidates, single rollout 1.41x with 2 regressions, untrained model valid on 14 of 113. Dropped: vLLM on dual-H100 nodes (detail in the write-up). Link to Topic: databases not repeated (the write-up is linked; Topic: databases is the old page's cross-reference only). |
| Periodic Neon: mid-training plus RL on lab data beats GPT-6 Astra and Fable 5.1 at lower cost, surpasses frontier on FrontierXRD, deployed for superconductors and magnets; operational data gives a Pareto frontier; common ingredient: existing verifier | Axis 2 "Operational records" bullet (55.3% from 2.7% on 134 samples, 1,300 H200s from the check). **C**: dated 15 Sep. "Superconductors and magnets" dropped (deployment detail). Link and 10 min in More. |
| MiMo-V2.6: final RL under six days, 7,000 environments, $2.62M, 1.02T/42B Pro, MIT, weights on HF; rare disclosure; $40M / about 15; environments are the expensive part; short stage means environment supply limits iteration; frozen MoE router; layered reward-hacking defences; framework and environments released | Axis 3 2026 bullet (Flash about $850,000 added), Axis 4 table RLVR row (frozen router, quoted defence), grid RLVR, Choosing a path. **C** box in Axis 3: $40M / $2.62M = 15.3 is more than an order of magnitude, and the two scopes differ. Model card link added; ComputingForGeeks (10 min) and alphaXiv (20 min) links in More. |
| DAPO: ByteDance and Tsinghua, 50 on AIME 2024 from Qwen2.5-32B, all released; runnable baseline | How we got here, 2025. **C**: released March 2025, not a 2026 result. GitHub (25 min) and arXiv links. |

## Self-improving and automated-research loops

Decision: no separate section. Each finding is placed on the axis it informs (the root compares stages, and these loops change who makes the data, who spends the compute, and how training narrows): data made by the model (Axis 2: NeoHorse-1, ToolGrad, distillation), experiments chosen by a model (Axis 3: research preference models, Dream-RSI), loops that narrow (Axis 4: Dream-RSI, Agora), and the measured AI-builds-AI series as the 2026 entry of How we got here.

| Fact | Now |
|---|---|
| Anthropic "When AI builds itself": over 80% of merged code by Claude (May 2026); 8x more code per quarter than 2021 to 2025; 4x self-estimated survey | How we got here 2026 (80%). 8x and 4x dropped from Reading; they stay, checked, in the 21 Sep tech news issue (linked). |
| Task horizon series (Opus 3 four minutes, Sonnet 3.7 90 minutes, Opus 4.6 twelve hours, weeks projected for 2027) | Dropped from this page: a capability-horizon series belongs to the tech news issue and Topic: llms, not to training stages; linked via the 21 Sep issue (which also notes METR's 60 minutes for Sonnet 3.7). |
| Research capability: 3x to 52x, 76% (+50 points), 64% vs 51% | 64% vs 51% kept in How we got here; 52x and 76% left to the linked issue. **C**: "beat", not "matched". |
| 26% of research led by Claude, 30,000+ agents, 90% of work, oversight framework | 26% and 30,000 kept. **C**: 30,000 agents are on the most-used internal platform; the 90% is share of work at or above "AI collaborates" (not staff time; removed from the text). |
| CI workload 25x in six months, tests 10x "to keep pace" | 25x kept. **C**: tests growth was a cause, not a response. |
| Human oversight load-bearing; Z.ai drew the same line; loop closes on execution, not goal selection | How we got here 2026, with Z.ai's 13 days and its own link. |
| Report dated Sep 2026 | **C**: first published early June 2026; 18 Sep updated one chart. |
| Dream-RSI: replay simulator over explored space, off-policy "dreaming", three domains; valid only inside covered region | Axis 3 bullet (550 to 317 calls) and Axis 4 paragraph (narrowing); paper page linked. |
| Agora needed one human intervention mid-run to restore diversity | Axis 4 paragraph (1,703 contributions, 3.39 to 1.899 bpb, 165 verifications). **C**: several author interventions (server three times, a prompt, a record, three sessions); verifications described precisely. |
| "Selection-side instance is RPM" | Axis 3 bullet. |

## Deep dives table, key papers, best resources

| Old page | Now |
|---|---|
| 12 child pages with what each covers | More, "Pages under this one", with each page's own reading time; linked from the grid detail, every axis's "Go deeper" note and Machinery. |
| Key papers: Kaplan, Chinchilla, T5 (with its negative results), ZeRO, Megatron-LM, LoRA, QLoRA, InstructGPT, DPO, DeepSeekMath, Constitutional AI, RoFormer (relative distance, no extra parameters), Switch Transformers (parameters without FLOPs), FlashAttention (SRAM tiling, linear memory), OLMo 2, Llama 3 | More, "Key papers", each with its paper-page reading time and the old one-line description; T5's negatives in How we got here 2019 (corrected "8 times larger"); added DeepSeek-R1, DeepSeek-V3 and the 2026 paper pages. |
| Best resources: Ultra-Scale Playbook (~8h), RLHF Book (~6h), Karpathy tokenizer (2h 15m), OLMo 2 report (~30 min) | More, "Best starting resources", unchanged. |
| Trailing `<page>` tags (12 child pages) | Stay in Notion as child pages (not touched by the HTML). |

## Added (not on the old page), each sourced

InstructGPT data counts and compute shares (13k / 33k / 31k; 60 and 4.9 PF-days of 3,640), LIMA 1,000, Constitutional AI 182,831 and 135,296, R1's 147K H800 hours ($294K), R1 SFT-vs-RL figures, DeepSeek-V3's 2.788M hours and FP8 gap, Llama 3 tokens, FLOPs, MFU and 419 interruptions, OLMo 2 mid-training share and spike scores, ZeRO 16 bytes per parameter, QLoRA memory, LoRA GPT-3 figures, Gao et al.'s functional form, Yue et al., Ibrahim et al., Thinking Machines (LoRA, on-policy distillation), llama.cpp Q4_K_M, Anthropic's emergent-misalignment study.
