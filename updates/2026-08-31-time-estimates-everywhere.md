# 2026-08-31: time estimates everywhere, and the explanation pass

Khalid's feedback after using the KB in anger produced two binding convention changes and a rewrite pass across the whole tree. Both rules are now in the operating guide's writing conventions, with the estimate format, the estimating basis and a worked before/after example, plus decisions-log entries.

## The two rules

**1. Time estimates on everything.** Every page opens with `⏱ N min read · +Xh Ym resources`. Every recommended link carries a bracketed estimate immediately after it. Every link to another KB page carries that page's rolled-up subtree numbers. The two numbers are never merged: the first is what you can read now, the second is what the page points you at. Basis: prose at 200 words per minute, a standard 8-12 page paper at 45 min, a survey or 30+ page report at 90 min or more, video and courses at runtime, books at roughly 1.5 min per page, docs and repos priced as the entry path only and marked as such, `~` prefix for judgement calls.

**2. Explain, do not name-drop.** Every entity a synthesis names gets a clause on what it is and a clause on what is distinctive or how it works. Acronyms are expanded and explained on first use per page, not merely expanded. The test: a reader who has never heard the name should be able to say what the thing does and why it exists. Condensation happens by cutting entities, never by reducing them to bare labels.

## Scope of this pass

**Full rewrite (explanation pass plus estimates):** the whole `Topic: llms` tree, 17 pages, which is the folder Khalid named. Every topic root page, 23 of them.

**Estimates only:** every child page beneath those roots, plus all 40 paper summary pages and the Papers index. The deeper explanation pass on non-llms child pages is still owed and is recorded as outstanding below.

## The totals now on the root page

**31h 52m of written pages, +1,432h of recommended resources** across 23 topic subtrees. The resource figure exists so the KB can be chosen from, not finished.

The largest subtrees by written length: Papers 6h 52m, protocols 2h 52m, llms 2h 45m, programming-languages 1h 58m. By resource cost: programming-languages +283h (five zero-to-expert ladders, a multi-year curriculum rather than a queue), Papers +~130h, protocols +103h, swe-and-system-design +100h.

## What actually changed in the llms tree

This was the substantive complaint, so it got the deepest work. Previously the family pages listed architecture acronyms without explaining them. Now:

- **DeepSeek**: MLA explained as a low-rank latent KV cache with its projection cost and decoupled RoPE, DSA's lightning indexer, aux-loss-free balancing set against the auxiliary-loss asymmetry it removes, MTP as both denser supervision and a free draft model, GRPO as PPO with the critic deleted.
- **Moonshot Kimi**: Muon as spectrum flattening via Newton-Schulz versus AdamW's per-coordinate second moments, and why it needed qk-clip; KDA's per-channel gated delta rule and the exact-recall cost of the linear/full hybrid; the INT4 QAT arithmetic taking 5.6 TB to 1.4 TB.
- **Qwen**: linear attention, the delta rule, Gated DeltaNet, the 3:1 hybrid, QSA's micro-block selection granularity and why block selection is hardware-friendly where token-level selection is not.
- **MiniMax**: the full attention arc, linear attention as reassociating Q(K^T V) into a fixed state, lightning attention as the IO-aware tiled implementation, and the reversal for reasoning workloads as evidence about exact recall.
- **MoE deep dive**: the router pipeline and why the gate weight being the router's only gradient path is what causes routing collapse; capacity factors; dropless block-sparse training; expert parallelism's two all-to-alls; and the per-expert batch collapse (`B·k/N`) that makes MoE inference hard.
- **Reasoning models**: what test-time compute buys and does not, sequential versus parallel spending and the verifier ceiling, SFT on distilled traces versus RLVR, GRPO against PPO in detail, and a new section on where the scaling stops paying.
- **Ai2 OLMo**: "fully open" made concrete as an itemised list of what is released that others withhold, each paired with the research it unlocks.
- **Other notable providers**: previously the worst page in the KB, a list of names with labels. Every provider now has a real characterisation and its trade-off.
- **llms root**: new section `What each family actually is`, explaining every lab's actual distinguishing bet, with the old one-line table retained beneath it as a quick index.

## Also fixed on topic roots

Every root got its bare lists expanded. Notable: the benchmarks root now says what each benchmark measures, how it is scored, and its known weakness or contamination risk, rather than listing names; the evaluation root gained substantive judge-calibration material (Cohen's kappa versus raw agreement, the 75-85% inter-annotator ceiling, TPR/FPR correction of judge-derived rates); the inference root's bare technique list became ten explained paragraphs; the protocols root expanded roughly twenty acronyms including the three-way ACP name collision; the hardware root's ASIC list now states each accelerator's architectural idea and its price.

## Outstanding, deliberately

- **Child pages outside the llms tree have estimates but not the explanation pass.** Named as weakest and next in line: `claude-code.md` (extension-layer table compressed to labels), `openai-and-google-harnesses.md` (the "distinctive bet" row), `hf-and-training-frameworks.md` (the "Also in the space" list), `cutlass-and-libraries.md` (the CCCL row), `speech-and-audio` ("Leaders 2026"), `multimodal-llms` ("Landscape Aug 2026").
- **Rolled-up numbers cannot sit on Notion's auto-generated child-page blocks**, which are not editable text. They live instead in each root's deep-dive list or table, and on the KB root's new `The map, with cost` index. Anyone maintaining this should update those, not hunt for a way to annotate the blocks.
- **Two judgement calls worth Khalid's ruling.** First, open-ended curricula: the GPU MODE lecture series is roughly 70h of video and would have dominated the cuda root, so it is priced as an entry-path index with the 70h figure stated inside the bracket. Second, reference works: the protocols resource total is roughly 30h of primary sources (HPBN, Bulletproof TLS, RFC 9110, OIDC Core) counted as full reads; if those should count as reference rather than reading, protocols drops by about 30h.
- **Shared resources are double-counted across subtrees.** Spinning Up, the Ultra-Scale Playbook and the RLHF Book each appear in several topics and are counted in each, so the 1,432h total is an upper bound, not a distinct-items figure.
- **Estimate maintenance is now part of every edit.** The operating guide requires that adding or removing material updates that page's estimate and every ancestor's rolled-up number in the same session. The weekly run must do this for every page it touches, or the numbers rot.
- **Repo sync not run** in this session; it will pick all of this up at the next sync from Notion.
