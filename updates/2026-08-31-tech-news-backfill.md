# 2026-08-31: tech news backfill (items the weekly run missed)

A review of the `2026-08-31: tech news` issue against the week's newsletter and aggregator coverage found 13 items that were in window and in scope but absent. All are now in the issue under **Backfill added 2026-08-31 (post-publication)**, and the technical ones are folded into their topic pages. The procedural fix is a binding named-source checklist in step 7 of the operating guide, plus a decisions-log entry.

## What mattered most

1. **vLLM v0.28.0** shipped and was missed, despite `inference-and-serving` being the third-priority topic in the weekly research order. This is the clearest signal that the failure was a source problem, not a judgement problem: no per-topic search in step 2 was pointed at the vLLM release feed.
2. **WikiSkill** (Google Research, Aug 29) is the fourth harness-scaling result of the fortnight and the one that directly targets the gap Prime Agent named. Missing it left the issue's harness-scaling story a paper short.
3. **Tencent Hy4 preview** (Aug 28), 770B-A49B open weights with 1M+ context, made it three open frontier releases in the week rather than two.
4. **OpenAI is ending Cursor's model access on Nov 12** after SpaceX acquired Cursor. Also reveals that the acquisition itself was never recorded in this KB.
5. **Anthropic's recursive-self-improvement report** landed the same week Tencent claimed Hy4 helped optimise its own training. Two independent data points on the same trend, both missed.

## Changes by page

### Tech news / `2026-08-31: tech news`

**[update]** New section `Backfill added 2026-08-31 (post-publication)` carrying all 13 items in the standard issue format, grouped as Models and releases, Research and papers, Industry, Compute and chips, Dev tooling and agents, Security, and Talk of the town, plus a note on the two sponsor slots that were correctly excluded.

### Topic: inference-and-serving

**[new]** `Added 2026-08-31 (news backfill): vLLM v0.28.0`. Kimi-K3 decode context parallel and fused FlashKDA kernels (1.5-3x kernel-level speedup on combined all-gathers); DeepSeek-V4 sparse MLA end to end for decode, MTP and DSpark with AMD Quark NVFP4; DFlash2 and DSpark confidence-scheduled verification land in the engine's speculative decoding, adaptive token budget worth about 60% better DSpark TTFT; Model Runner V2 with E/P/D disaggregation and weight offloading; tiered KV offload to disk. Flags the upgrade-relevant changes: `max_num_batched_tokens` default doubling to 16384, bitsandbytes moving out-of-tree, Transformers 5.15.0, `calculate_kv_scales` and `override_attention_dtype` removed. Plus DeepSeek-V4-Pro-0813-NVFP4 as the vendor-quantisation pattern. [Release notes](https://github.com/vllm-project/vllm/releases/tag/v0.28.0)

### Topic: agentic-harnesses

**[update]** Two entries added to the harness-scaling section. [WikiSkill](https://arxiv.org/abs/2608.27454): three-layer persistent wiki (Raw traces, never-resetting Wiki layer, Skill layer) with a Maintainer, a Proposer and a validation gate; Gemini-3.5-Flash 49.5% to 68.1% and Qwen-3.6-27B 39.4% to 63.3% averaged over five benchmarks, LiveMath 33.0% to 72.6%. The contrast drawn with Prime Agent is the useful part: WikiSkill moves skill curation out of the trajectory into separate roles, so it does not depend on the policy having been trained to curate. [ContextPilot](https://arxiv.org/abs/2608.28476): context management as a trained behaviour rather than a harness policy, via planning, long-term memory and soft offloading tools plus fine-grained RL on context and entropy variation; 14B checkpoint on Qwen3-14B.

### Topic: llms

**[new]** Tencent Hy4 preview: 770B-A49B MoE, 1M+ context, two reasoning levels, 1.56TB on the Hub, 2.99/4.00 in an internal 163-expert blind evaluation against GLM-5.3 at 2.92 and Kimi K3 at 2.94, and Tencent's claim that the model helped automate optimisation of its own training for a 31.8% throughput gain. Notes that the taxonomy and families table need a Tencent row at next revision. **[new]** GPT-6 "Astra" first outputs, recorded explicitly as an unconfirmed leak.

### Topic: hardware

**[new]** Vera Rubin's pitch as data orchestration rather than FLOPS, with the Vera CPU's claimed 3x on data-movement operations, and the consequence that single-accelerator roofline under-predicts at frontier scale. **[new]** The ~15GW 2027 energisation shortfall (transformer lead times of 48-60 months, interconnection backlogs) against ~66GW of projected US demand, attributed to its source and marked directional.

### Operating guide

**[update]** Step 7 gains a binding **named-source checklist**: a fixed list of newsletters, aggregators and release feeds the sweep must scan every week, alongside the existing homeless-release check. **[update]** New decisions-log entry dated 2026-08-31 recording this failure and its cause.

## Known gaps left open

- **No topic owns AI security.** Adaptive agentic worms, the Grok cryptographic context injection carried in the last issue, the Anthropic infostealer session-hijacking item, the Codex exfiltration claim, and the hundred-company joint statement are all in scope for the newsletter and have nowhere to be folded. Under the placement rule this is the case for a new topic, but topic creation needs Khalid's say-so, so it stays flagged rather than created.
- **Two items are unverified**: the Codex private chat thread exfiltration claim and "Base models stopped being the bottleneck". Both are in the issue with an explicit unverified marker and no invented detail, because the source links were not recoverable.
- **The SpaceX acquisition of Cursor** was never recorded in this KB; only its consequence (the OpenAI cutoff) is now on file.
- **Repo sync**: not run in this session. It will pick these edits up at the next sync from Notion.
