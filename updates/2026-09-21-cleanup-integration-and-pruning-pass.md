# 2026-09-21: cleanup, integration and pruning pass

Not a research pass. No new external material was gathered, and the research window is unchanged: that is recorded separately in [2026-09-21: weekly update](2026-09-21.md) of the same date. This entry records a cleanup of content debt that had accumulated across the tree, plus the first authorised deletion in this knowledge base.

### Deletion authority

Khalid authorised deletion explicitly for this run, suspending the never-delete rule in Maintain technical knowledge base for this pass only. The authority was limited: superseded pages once nothing links to them and the merge claim is verified, deferral notes once the deferred action is done, duplicate coverage once merged, editorial scaffolding once acted on, empty mentions, and dated sections once fully integrated. Nothing Khalid wrote himself was touched, nothing was removed for being merely old, and this history is append-only as before. **The suspension does not carry forward.** A proposed permanent wording is at the end of this entry.

### The debt this pass was clearing

Topic and deep-dive pages are supposed to describe the current state of knowledge, with change history living here. In practice several months of weekly runs had appended dated release notes to the foot of topic pages instead of folding them into the body, left notes addressed to a future editor, and in three cases claimed a fold had happened when it had not. This pass integrated that material, executed the deferred actions, and removed what the integrations made redundant.

### Three claims that were false

Worth recording on their own, because each was an assertion that work had been done, and each survived review by looking plausible.

1. The superseded duplicate Caching page said every unique passage had been merged into the canonical page on 2026-08-31. It had not. An invalidation section, the eviction mechanics, the five write and read strategies with their failure modes, the prefix-caching mechanism, the semantic-cache evaluation process and about ten resources existed only on the duplicate.
2. [Topic: inference-and-serving](../topics/inference-and-serving/summary.md) said DFlash2 had been folded into the speculative-decoding section of [Inference techniques: what actually makes serving fast](../topics/inference-and-serving/inference-techniques.md). It had not; that section listed five drafting families and DFlash2 was not among them.
3. [Topic: agentic-harnesses](../topics/agentic-harnesses/summary.md) said the Claude Code 2.1.271 to 2.1.278 material had been folded into [Claude Code: deep dive](../topics/agentic-harnesses/claude-code.md). None of it was there.
In all three cases the fold was performed for real, verified by re-fetch, and only then was the claim removed or the source trimmed. The practical rule this leaves behind: a sentence saying material was folded elsewhere is a claim to check, not a fact to trust.

### Models and training

**[update] **[Topic: llms](../topics/llms/summary.md)**.** The heaviest debt in the tree. Both deferral notes cleared by doing the work: a Tencent Hunyuan Hy4 node added to the open-weight frontier group of the taxonomy with a matching families-table row, and an IFM K2 Horizon node added to the open research group with its own row. GLM-5.3-Flash was covered twice and is now one treatment carrying both what shipped and the architecture that explains the price. The state-of-play section was rewritten to September 2026 and now resolves the contradiction an editorial note used to flag, that Meta left the open frontier but not the frontier; the Meta families-table row says the same. Ten appended release blocks were folded into the body: GPT-6 Astra's recurrent depth now carries the Recurrent Looped Transformer specification, the DeepSeek family paragraph carries V4.1-Flash and its encoder-decoder reversal, the Zhipu paragraph carries Atria Dawn as a lab specialising someone else's open base, the Google paragraph carries the Gemini 3.8 Live reason-and-speak design, the Alibaba paragraph carries the Qwen-Image-2.1 research-only licence as the first qualification to its Apache 2.0 position, and the closing pattern paragraph carries Step 5 Preview and Bonsai 2 27B as the two current ends of the efficiency competition. A new section, Not a model family: orchestrators and structured-decision models, holds Sakana Fugu and Jev. The Related papers heading no longer names a folder and its eleven bullets are native mentions.

**[update] Model-family pages.** [Alibaba: Qwen](../topics/llms/qwen/overview.md) gained Qwen3.8-Flash-Next as the Qwen4 architecture preview with QSA explained, and the Qwen3.8-Max-0902 snapshot convention, which matters because a reproducible result now has to pin a snapshot id. [Anthropic: Claude family](../topics/llms/anthropic/overview.md) gained Fable 5.1 and Mythos 5.1 as one model in two safeguard configurations. [Meta: Llama and Meta Superintelligence Labs](../topics/llms/meta-llama/overview.md) gained Muse Spark 1.3, Muse Code and Muse Voice Transcribe, and its strategic read now separates the open frontier from the frontier. [Z.ai (Zhipu): GLM](../topics/llms/zhipu-glm/overview.md) gained the architecture and serving economics behind GLM-5.3-Flash, and its title was corrected: it contained an auto-linked markdown fragment. [Other notable providers](../topics/llms/other-providers/overview.md) gained Cohere North Small Translate, OpenBMB MiniCPM5-2B, inclusionAI Ling 3.0 Flash VL, Xiaomi MiMo and its live post-training dashboard, StepFun, Prism ML and Shanghai AI Laboratory.

**[update] **[Topic: llm-training-and-post-training](../topics/llm-training-and-post-training/summary.md)**.** Two trailing digest sections integrated: the Anthropic recursive-self-improvement measurements became a standing section on self-improving and automated-research loops, and the Postgres query-planner, Periodic Neon and ToolGrad recipes joined the worked-examples paragraph. Three reference defects fixed.

**[update] **[Topic: data-curation-and-datasets](../topics/data-curation-and-datasets/summary.md)**.** The Dwarkesh Patel decomposition, that data improvements delivered 3.24x more compute-efficiency gain than model improvements between 2019 and 2025 and that the two are largely independent, folded into the standing paragraph that already asserted the same thing qualitatively.

**[update] **[Topic: rl](../topics/rl/summary.md)**.** The Mercor and SkyRL 397B recipe was cross-listed from the training page but had never arrived; it is now present with its figures.

**[update] **[Topic: generative-and-multimodal](../topics/generative-and-multimodal/summary.md)**.** The root note saying items were filed there for want of a home is gone, and the items moved: Runway Solaris, World Labs Atlas and Runway GWM Worlds 2 to [Text Diffusion and World Models](../topics/generative-and-multimodal/text-diffusion-and-world-models.md), and Muse Voice Transcribe, GPT-Live-1, AuK, Suno v6, the Universal Music and ElevenLabs deal and Gemini 3.8 Live to [Speech and Audio Models](../topics/generative-and-multimodal/speech-and-audio.md). ChatGPT Images 2.5 and Qwen-Image-2.1 folded into the image modality bullet.

### Systems and performance

**[update] **[Topic: inference-and-serving](../topics/inference-and-serving/summary.md)**.** Both self-addressed fold instructions executed and removed. Technique-level detail went to [Inference techniques: what actually makes serving fast](../topics/inference-and-serving/inference-techniques.md), which gained DFlash2 as a sixth drafting family plus the adaptive speculative token budget and tiered KV offload reaching disk. Engine detail went to [vLLM](../topics/inference-and-serving/vllm.md), including a new upgrade-notes section carrying the breaking changes. Doubled DeepSeek V4.1-Flash coverage merged, the Cohere megakernel and Cerebras entries merged into one treatment of the batch-size-one regime, and five malformed headings repaired.

**[update] **[Topic: cuda-and-gpu-programming](../topics/cuda-and-gpu-programming/summary.md)**.** The CUDA Rust section and the Dream-RSI paragraph moved out of an appendix below the child-page list into the body. Duplicate ROCm 10.0 and Cohere megakernel blocks removed.

**[update] **[Topic: hardware](../topics/hardware/summary.md)**.** The Vera Rubin NVL72 digest became a standing section on rack-scale competition, and the weekly supply-and-grid paragraph became ordinary prose with its dates carried into the text.

**[update] **[Topic: databases](../topics/databases/summary.md)**.** The learned-query-plan appendix became a standing section.

**[update] **[Caching: types, policies, and semantic caching](../topics/databases/caching.md)**.** Received the material rescued from the duplicate, described under deletions below.

### Agents and retrieval

**[update] **[Topic: agentic-harnesses](../topics/agentic-harnesses/summary.md)**.** The Muse Code deferral note cleared by adding it to the Terminal CLIs group of the taxonomy and the landscape list. Twelve dated blocks integrated across two passes, producing two new standing sections, What harnesses actually score and Running agents at scale: feedback, containment and verification, plus a sixth harness-scaling strategy covering the vendor-hosted loop. Four tab-and-lowercase fragments repaired into headings, an unbalanced bold span and a mangled link fixed, two sets of empty parentheses removed, and eight reference defects corrected.

**[update] **[Claude Code: deep dive](../topics/agentic-harnesses/claude-code.md)**.** A stray fragment became a proper section, Deployment and organisation controls, which now carries every Claude Code release from 2.1.257 to 2.1.278 grouped by what each change does for a deployer rather than by version. The extension-layers table records that `AGENTS.md` works as a full alternative to `CLAUDE.md` since 2.1.278.

**[update] **[Harness engineering: the transferable layer](../topics/agentic-harnesses/harness-engineering.md)**.** A cross-links list stranded mid-page by a later-appended section moved to the foot of the page.

**[update] **[Topic: protocols](../topics/protocols/summary.md)**.** Paper2Agent, Google Home MCP and the Muse Spark credential design folded into the agent-protocol, agent-to-instrument and auth bullets.

**[update] **[Topic: rag-and-retrieval](../topics/rag-and-retrieval/summary.md)**.** Astra for Law became a corpus-layer bullet carrying the retrieval-sensitivity rule, the twin of the harness rule on benchmarks. The Proactive Memory Agent result folded into the architecture bullet.

**[update] **[Topic: agentic-frameworks](../topics/agentic-frameworks/summary.md) and its four deep dives: acronyms expanded on first use, no structural debt found.

### Measurement

**[update] **[Topic: benchmarks](../topics/benchmarks/summary.md)**.** Three dated Added blocks integrated. The master table gained ten rows with version and status, the ARC-AGI-3 row became self-contained rather than pointing at a note below, and two new standing sections appeared: What a benchmark number conceals, and Benchmarks whose subject is the surrounding system. Five reference defects fixed.

**[update] **[Topic: evaluation-and-llm-judges](../topics/evaluation-and-llm-judges/summary.md)**.** Two deferral notes cleared. Its four deep dives gained acronym expansions, and the judge page gained the RocketEval checklist-grading treatment that a deferral note had promised.

### Engineering foundations

**[update] **[Topic: swe-and-system-design](../topics/swe-and-system-design/summary.md)**.** An empty mention hole in the header repaired, a folder-style path removed from the taxonomy diagram, and the references to the deleted duplicate cleared.

**[update] **[Topic: programming-languages](../topics/programming-languages/summary.md)**.** A markdown link wrapping a Notion URL converted to a mention.

**[new] **[Known gaps](../known-gaps.md)**.** One place recording what this knowledge base deliberately does not cover. Two open gaps, front-end proper and conventional application security, and four subjects resolved by decision with pointers to where each now lives. Added to [Tracker](../TRACKER.md).

### Deletions

Every deletion, with the one-line reason it was not needed.

- **[deleted] SAFE TO DELETE: duplicate Caching (merged 2026-08-31).** A second caching page written by a parallel session in August. Deleted after its genuinely unique material was merged into [Caching: types, policies, and semantic caching](../topics/databases/caching.md), which now carries an invalidation section, a prefix and prompt caching section, nine added resources and enrichments to the strategies, eviction, failure-mode and semantic-caching sections. One block was deliberately not copied across: the PagedAttention, KV quantisation and GQA/MLA detail, which the canonical page scopes to [Inference techniques: what actually makes serving fast](../topics/inference-and-serving/inference-techniques.md) where it already exists. Both references on [Topic: swe-and-system-design](../topics/swe-and-system-design/summary.md) were removed first. **This is the only page deleted in this run.** The other page the run prompt expected to delete, a duplicate Topic: databases, does not exist in the workspace.
- **[deleted] Four deferral notes**, each after the deferred action was carried out: the Tencent Hunyuan and IFM K2 lines on the llms page, the Muse Code line on the harnesses page, and the filing note on the generative page. Two further deferral notes on the evaluation page were cleared the same way.
- **[deleted] Roughly thirty dated sections** across the topic pages, each only after a re-fetch confirmed every figure, name and source link in it was live in a standing section. Where a fact was only true as of a date, the date was carried into the body text.
- **[deleted] Doubled coverage**, merged first: GLM-5.3-Flash on the llms page, DeepSeek V4.1-Flash and the two low-batch serving answers on the inference page, ARC-AGI-3 on the benchmarks page, the MCP transport sentence on the real-time delivery page, REST in practice on the RPC page, Suno licensing on the speech page, and the ROCm and megakernel blocks on the CUDA page.
- **[deleted] Process notes that belong in this changelog rather than on a knowledge page.** The two empty-release-feed notes on the inference page, the newsletter-sourcing note on the data-curation page, the quantisation housekeeping note, the CUDA and hardware sweep notes, and the self-narration on the benchmarks page about a previous run's decision to record an aggregator's wording. That last decision was worth keeping, so it survives as a standing reading rule rather than as a story about a past run.
- **[deleted] Recency framing** with no fact in it: phrases like the most useful material this week, the harness requirement of the week, and Also in the window.

### Decisions taken

**Time-series foundation models get no topic page.** TimesFM-3 is folded into the taxonomy and modality map of [Topic: generative-and-multimodal](../topics/generative-and-multimodal/summary.md) as a named non-generative modality. The reasoning: a time-series foundation model is a sequence foundation model over a non-text modality, which is what the modality axis of that page already tracks, so the map is its correct home rather than a gap in the map; one model does not justify a topic; and this follows the 14 September precedent where Khalid ruled that a homeless category gets no topic page unless he asks for one. The open-gap wording is removed from that page, and the decision is visible on the page itself rather than only here.

**Orchestration as a product gets no topic page.** A learned orchestrator is sold in place of a model, so it belongs on both pages it touches rather than on a third. Named as a non-family category on [Topic: llms](../topics/llms/summary.md) and cross-filed on [Topic: agentic-harnesses](../topics/agentic-harnesses/summary.md).

Both decisions are recorded on [Known gaps](../known-gaps.md) so a future reader meets them where they would otherwise re-flag a gap.

### Kept despite uncertainty

- The superseded toggles on the llms, DeepSeek, Qwen, Ai2, Other notable providers and benchmarks pages. They are history, not error, and the rule for this run was that superseded is not the same as wrong.
- The Anthropic engineering-productivity measurements now sit on [Topic: llm-training-and-post-training](../topics/llm-training-and-post-training/summary.md). They are arguably better placed on the harnesses page, but splitting one treatment across two pages is worse than an imperfect home. Flagged rather than moved.
- ToolGrad sits beside NeoHorse-1 on the training page rather than on data-curation, for the same reason.
- Khalid's own provenance notes, including the seeded-from-his-notes lines on the guardrails and inference pages, were left untouched.
- Two pages edited by an interrupted agent earlier in the day, Rust: zero to expert and WebSocket protocol in depth, record no update line. Their bodies check clean, but the Rust page appears to be missing the other half of a change whose first half landed on its parent. Nothing was invented to fill it.

### Bookkeeping

The Technical KB row in Last updated had never carried a through date. It is now set to 2026-09-21, established from the newest research entry, with status Current. The row tracks research coverage, not cleanup, so this entry does not move it.

### Proposed permanent wording, for Khalid to accept or reject

The deletion authority above was for this run only, and the skill was not edited. If the posture should change permanently, the smallest useful version is a replacement for the never-delete rule in Maintain technical knowledge base:

> Do not hard-delete content as a matter of course. You may delete four things, and only after the replacement is verified live: a deferral note whose action you have just carried out, duplicate coverage you have just merged, a dated section whose every fact and link you have just integrated, and editorial scaffolding whose purpose you have just served. Never delete anything Khalid wrote, anything merely old, any Updates history, or anything you cannot justify in one sentence. Record every deletion in Updates marked [deleted]. Verify before you delete: a page claiming its content was merged elsewhere is a claim to check, not a fact to trust.

That last sentence is the one this run earned. Three separate pages asserted a fold that had never happened.
