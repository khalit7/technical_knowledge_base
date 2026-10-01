# xAI / SpaceXAI: Grok — visualisation ideas (v3, 1 October 2026)

The question the page keeps returning to: **how does xAI turn capital into compute into shipped models, and what do its published numbers really say about where Grok stands?** Every visual below is scored against that.

Existing visuals on the live page: none (text only, one table). Outbound links on the live page: Wikipedia (Grok), x.ai/news, VentureBeat (Grok 4.6), CometAPI (Grok 4.6), MarkTechPost (Grok 4.7), and five Notion pages (Harness engineering, Reasoning models, OpenAI, Anthropic, Topic: hardware).

Scoring: 0 to 2 per question (parameter the reader moves; reproduces a stated figure (x2); computable from public data (x2); shows what a sentence cannot; corrects a misconception; measures the central question; absent from existing explainers; animation point (step-by-step, ideally against the method it replaced)); minus build cost (0 to 2).

## Ranked

| # | Idea | Score | Placement | Built |
|---|---|---|---|---|
| X1 | Colossus build speed: each cluster's GPUs, megawatts and days to bring online against the S-1's "about two years" industry benchmark for 100 MW | 1+4+4+1+2+2+2+0 −0 = **16** | Reading, compute section | yes |
| X2 | Grok-1 and Grok 2 from their configs: total, active, weight memory, KV cache; precision and context controls | 2+4+4+1+2+1+1+0 −1 = **14** | Reading, Grok-1 section | yes |
| X3 | Terminal-Bench 4.0 by reporter and harness (xAI 38.0%, AA in Grok Build 33%, Grok 4.6 20.3% / 18%, Opus 5.5 66.4%, Fable 5.1 55.8% Anthropic vs 57.9% in xAI's table) | 0+4+4+1+2+2+1+0 −0 = **14** | Reading, Grok 4.7 section | yes |
| X4 | Lineage tab: flagship, fast/coding, open weights, company and compute lanes; Grok 5's missed targets as hollow markers; resolves the naming conflict | 1+2+4+2+2+2+1+0 −1 = **13** | Own tab | yes |
| X5 | Cryptographic context injection, animated: plain injection vs encrypted payload vs encrypted with an egress gate | 1+0+4+2+2+1+2+2 −1 = **13** | Reading, alignment section | yes |
| X6 | Price and position tab: AA v4.3 index against cost per task or per-token price (log), Grok 4.6 to 4.7 arrow | 1+2+4+2+2+2+0+0 −1 = **12** | Own tab | yes |
| X7 | One longer chain vs parallel attempts (Heavy / Multi-Agent), animated on one token and time scale; 4 or 16 agents (xAI's setups) | 2+0+2+2+2+1+1+2 −1 = **11** | Reading, Heavy section | yes (token and time accounting only; the majority-vote accuracy calculator was dropped: no published curve, the same reason GDM's Deep Think width-vs-depth was rejected, and xAI's multi-agent mode reconciles by a leader, not by vote) |
| X8 | Index versions side by side (pre-v4.2 launch scale vs v4.3), never joined | 0+4+4+1+2+1+0+0 −0 = **12** | Reading, Grok 4.6 section | yes |
| X9 | Long-context price cliff at 200K prompt tokens (whole request re-priced) | 2+4+4+2+1+1+1+0 −0 = **15** | Reading, current models | yes (small) |
| X10 | xAI's Grok 4.7 launch table as a shaded table (vendor figures) | 0+0+4+1+1+1+0+0 = 7 | Reading, Grok 4.7 | yes, as a table only |

## Data, formulas and sources (recomputed in recompute.py)

- **X1** S-1 (SpaceX, filed 20 May 2026, https://www.sec.gov/Archives/edgar/data/1181412/000162828026036936/spaceexplorationtechnologi.htm): Colossus first cluster ~100,000 H100, ~130 MW, 122 days; Colossus II first cluster ~110,000 GB200, ~210 MW, 91 days; second cluster 110,000 GB300, 220 MW, 64 days; next phase ≥220,000 GB300, >400 MW; industry benchmark ~2 years for a 100 MW greenfield site. Derived MW per day = MW / days: 1.07, 2.31, 3.44 against 100/730 = 0.14. Reproduces the S-1's numbers by construction (they are its inputs). Corrects the live page's "roughly 200K H100s stood up in 122 days": 122 days was the first ~100K H100 cluster; xAI called it a 200,000-GPU cluster by Feb 2025 (https://x.ai/news/grok-3).
- **X2** Grok-1 run.py and model.py (https://github.com/xai-org/grok-1): d=6144, 64 layers, 48 q / 8 kv heads, head 128, 8 experts top-2, ffn_size = int(8·6144)·2//3 = 32,768 (gated, 3 matrices), vocab 131,072. Params = L·(2·d·nq·hd + 2·d·nkv·hd + E·3·d·f + d·E) + 2·V·d → 316.5B (untied head) / 315.7B (tied): **reproduces xAI's 314B within 1%, independently**. Active = same with 2 experts → 84.6B = 26.7%, against xAI's "25% of the weights active": **does not reproduce exactly**; 25% is 2 of 8 experts, ignoring the shared attention and embeddings. KV per token = 2·L·nkv·hd·bytes = 256 KiB at 16 bits; 2 GiB at 8,192 tokens; 12 GiB if all 48 heads were cached. Grok 2 config.json (https://huggingface.co/xai-org/grok-2/raw/main/config.json): d=8192, 64 layers, 64 q / 8 kv, 8 experts top-2 of 16,384 plus a residual dense FFN of 32,768 → 269.5B total, 114.9B active (derived; xAI publishes no Grok 2 count).
- **X3** xAI launch table (Wayback captures 21 to 29 Sep 2026 of https://x.ai/news/grok-4-7, all 38.0% at xHigh); AA (https://artificialanalysis.ai/articles/benchmarking-grok-4-7): Grok Build harness 18% → 33%, and +4.5 pp inside the Intelligence Index's standard harness; Anthropic (https://www.anthropic.com/claude-opus-5-5): Opus 5.5 66.4% (xhigh, ±2.6), Fable 5.1 55.8%, GPT-6 Astra 57.9% (as reported by OpenAI). xAI's table lists Fable 5.1 Max at 57.9%: contradicts Anthropic's 55.8%, shown side by side. Gap 66.4 − 38.0 = 28.4 → "28 points" reproduces the page by construction.
- **X4** Dates: S-1 (xAI Merger effective 2 Feb 2026; X Merger 28 Mar 2025); The Verge 6 May 2026 (first use of "SpaceXAI"); Business Insider 6 Jul 2026 (handle and logo); SiliconANGLE 12 Aug 2026 ("known as xAI until last month"); docs.x.ai release notes and the May 15 retirement guide; Wikipedia for model dates the docs do not carry; geotoolbox (Grok 5 targets).
- **X5** Adversa AI write-up (https://adversa.ai/blog/cryptographic-context-injection-grok-data-theft/, 20 Aug 2026) and The Hacker News (same day): steps, fields exfiltrated, PBKDF2 + AES-256-GCM, 40% of 20, 3 Jun report, 4 and 10 Aug follow-ups, tested on grok.com running Grok 4.5 Fast. Counters only count fields and steps; no invented rates.
- **X6** aa_snapshot.json (AA v4.3, methodology 4.3.2, read 1 Oct 2026): index, cost per index task, prices. Grok 4.7 $3.74 vs Grok 4.6 $1.86 per task at identical prices; AA: 81k vs 36k output tokens per task. Cost per task is AA's figure (by construction, not recomputed: the cached share of input is unknown; the snapshot's token totals imply about 77% cached if every token were billed at list price, a reconstruction only).
- **X7** docs.x.ai multi-agent page: 4 agents for low/medium, 16 for high/xhigh; all agents billed. Token counts per attempt are illustrative and labelled. Majority accuracy: P = ρ·p + (1 − ρ)·Σ_{k>N/2} C(N,k) p^k (1−p)^(N−k) (ties split), a deliberately simple mixture model of partly correlated errors, labelled illustrative.
- **X8** pre-v4.2: VentureBeat and SiliconANGLE, 12 Aug 2026 (Grok 4.6 61, tying GPT-5.6 Sol; Fable 5 62; Opus 5 and Fable 5 first and second); v4.3: aa_snapshot (Grok 4.6 44.3, GPT-5.6 Sol 47.0, Grok 4.7 46.4, Kimi K3 43.6).
- **X9** docs.x.ai models page: below 200k prompt tokens $2 / $0.50 / $6; at or above, $4 / $1 / $12 "for all tokens in the request". 199,999 prompt + 5,000 output = $0.43; 200,000 + 5,000 = $0.86.

## Inspiration

- DeepSeek MLA explainer (pages/deepseek/v3/parts/18_js_mlx.js) and Anthropic's cache session animation (pages/anthropic/v3/parts/12_js_sim.js): before/after on one input, captions, counters, play/step/scrub/speed, on-screen only, reduced motion starts paused.
- Adversa's own chain diagram (text), Johann Rehberger's exfiltration write-ups, Simon Willison's "lethal trifecta" framing (cited by Adversa).
- Anthropic and OpenAI Lineage tabs (lane timelines with cards).

## Rejected

- **Training compute over time (FLOPs per Grok)**: xAI publishes no FLOP counts; only "10x Grok 2" (Grok 3) and "an order of magnitude more" RL (Grok 4). Two ratios with no base.
- **RL compute against pretraining compute bar**: the equal-compute claim comes from a launch-stream chart, not text; xAI's text says only "at pretraining scale". Kept as a sentence, marked as reported.
- **Colossus GPU census from Musk's posts**: self-reported, x.com unreachable to verify; the S-1 figures are used instead.
- **SpaceX AI-segment financials (S-1 revenue, losses, capex)**: a business-ledger tab of the kind Khalid removed from DeepSeek; one sentence instead.
- **Grok 5 delay tracker as its own tab**: three missed targets; folded into Lineage as hollow markers.
- **Real-SWE bars**: eight single numbers, all harness-bound; one sentence plus a row in X3's context.
- **Musk's parameter counts (1.5T, 2.1T, 2.5T) as a chart**: unaudited statements; shown as text, labelled.

## What the methodology lacked for this page

- A rule for **corporate events whose names and legal dates differ**: "merged", "acquired", "renamed" and "first used the name" are four different dates. Rule used: the regulatory filing fixes the legal event (S-1: "xAI Merger", effective 2 Feb 2026, by which SpaceX "acquired xAI"); the company's own usage fixes the name (first seen 6 May, complete 6 July). Both phrasings ("merged", "acquired") are then right; "merged to form SpaceXAI in February" is not.
- A rule for **a vendor's table quoting a rival's score**: xAI's 57.9% for Fable 5.1 matches Anthropic's figure for GPT-6 Astra, not for Fable 5.1 (55.8%). Show the rival's own figure beside the vendor's copy.
- A rule for **a live page that differs from its archived copies**: a 1 October fetch of x.ai's Grok 4.7 post (through a summarising fetcher) read Terminal-Bench 37.6%; all 21 Wayback captures (21 to 29 September) show 38.0%. Use the archived raw HTML and mark the live reading unconfirmed.
- The Wayback CDX API over plain http (with `id_` raw captures) gets past Cloudflare-blocked lab sites; worth adding to the fetch tactics.

## Build notes (resumed run, 1 October 2026)

- Merger and name conflict resolved from the S-1 (acquired effective 2 Feb 2026, the "xAI Merger"), The Verge (6 May, first use), Business Insider (6 Jul, rebrand) and the xAI release notes / MarkTechPost (Grok 4.5 on 8 Jul, first release as SpaceXAI). Not a genuine disagreement: both descriptions agree once the four dates are separated; "to form SpaceXAI in February" is the only wrong part.
- Grok 3 and Grok 4 launch posts read from raw Wayback captures (gzip; decompress before extracting). Grok 3's "10x" is against "previous state-of-the-art models", not Grok 2 as Wikipedia reports Musk.
- Stale claims found: Grok 4.1 Fast and Grok Code Fast retired 15 May 2026; Fast variant is Cursor and Grok Build only; Grok 2 weights are under the Community License, not Apache 2.0; Adversa's 3 June date is the report, 20 Aug the disclosure.
- Anthropic's own Terminal-Bench table confirms xAI's 57.9% for Fable 5.1 is Anthropic's GPT-6 Astra figure (Fable 5.1: 55.8%).
- Grok 5's slipped targets could not be confirmed (no web search left; no primary source on disk); marked unconfirmed. The S-1 confirms Grok 5 in training at Colossus II.
