# OpenAI: GPT family, visualisation ideas (v3)

Page: https://app.notion.com/p/3c65c17b0d0d814abf90d5b9e567d72f (child of Topic: llms). Read 1 October 2026. Every default below is recomputed in `recompute.py` (run it from this folder).

## The question the page keeps returning to

**Where is capability bought, and who pays for it?** Pretraining scale, post-training, inference compute billed per request (effort), a router, price tiers, state kept behind the API (the harness), and compute inside the network (recurrent depth). Every number on the page is either a price, a token count, or a score whose meaning depends on effort, harness or index version. A visual is worth building when it makes one of those purchases measurable.

What a reader must understand to follow the page:

1. That a request's cost is tokens times price, with hidden reasoning tokens billed as output, a 272K surcharge on the whole request, and cache writes and reads priced differently.
2. That per-token price and per-task cost differ, because cheaper tiers spend more tokens.
3. That the same weights score 62.7% or 99.9% depending on the harness, and that effort moves cost in the opposite direction from intuition on ARC-AGI-3.
4. That index scores only compare within one index version.
5. What gpt-oss is made of, and why it fits one 80 GB GPU.
6. The family's order in time: which bet came when, and where disclosure stopped.

The previous embed on the page (`pages/openai-gpt-family/visual.html`, tabs Read / Explore / Check) is replaced; its explorer cards are superseded by the Lineage tab.

## Sources read for ideas and data

- OpenAI API docs (markdown versions, `.md` suffix): model pages for gpt-6-astra, gpt-6.1-sol, gpt-6-sol, gpt-6-luna, gpt-5.6-sol/terra/luna; https://developers.openai.com/api/docs/pricing ; https://developers.openai.com/api/docs/guides/prompt-caching ; https://developers.openai.com/api/docs/guides/reasoning ; https://developers.openai.com/api/docs/guides/ultrafast-mode ; https://developers.openai.com/api/docs/guides/fast-mode
- ARC Prize, https://arcprize.org/blog/astra (full effort-by-harness table)
- gpt-oss model card, https://arxiv.org/abs/2508.10925 (PDF via pdftotext -layout: Table 1 parameter counts and checkpoint sizes), configs https://huggingface.co/openai/gpt-oss-120b/raw/main/config.json and gpt-oss-20b
- Raschka, From GPT-2 to gpt-oss, https://magazine.sebastianraschka.com/p/from-gpt-2-to-gpt-oss-analyzing-the (what has been drawn already: block diagrams, so the page does not redraw them)
- Artificial Analysis v4.2 article https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v4-2 ; Trending Topics https://www.trendingtopics.eu/gpt-6-artificial-analysis-update/ and https://www.trendingtopics.eu/gpt-6-artificial-analysis/ ; `pages/topic-llms/aa_snapshot.json` (v4.3, methodology v4.3.2, read 1 Oct)
- Real-SWE primary page https://withspecific.com/benchmarks/real-swe against the dev.to summary https://dev.to/shaam_ai/fable-51-vs-gpt-6-astra-vs-gemini-38-flash-on-real-swe-16k3 (they disagree; see below)
- Timeline: https://hidekazu-konishi.com/entry/openai_gpt_model_release_timeline.html (dated list of OpenAI posts), Wikipedia GPT-1 and GPT-6
- Recurrent depth provenance: TechCrunch https://techcrunch.com/2026/09/02/openais-new-reasoning-technique-alarms-ai-safety-experts/ , Fortune https://fortune.com/2026/09/03/reports-openais-astra-model-uses-a-new-more-efficient-ai-architecture-alarms-ai-safety-experts-who-worry-the-method-makes-models-harder-to-control/ ; the system card https://deploymentsafety.openai.com/gpt-6-astra does not mention the architecture.
- Product and safety reporting: VentureBeat (both GPT-6 articles, via WebFetch), SiliconANGLE, The Hacker News, The Decoder, CSO Online, CellCog tracker (copy of OpenAI's launch benchmark table), Eden AI, Simon Willison, OpenAI forum (GPT-Live-1).
- Not reachable: openai.com (403 to both curl and WebFetch), so OpenAI's own launch posts are cited through the API docs and the press that quotes them. Web search budget was exhausted; all research was by direct fetch.

## Candidates, scored

Scoring as in the Methodology (0 to 2 each; "reproduces" and "computable" count double; build cost subtracted). Columns: P = parameter the reader moves, R = reproduces a published figure (x2), C = computable from public data (x2), S = shows what a sentence cannot, M = corrects a misconception, Q = measures the central question, N = new (not on the page or in main explainers), B = build cost (subtracted).

| # | Idea | P | R | C | S | M | Q | N | B | Score | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **What a request costs**: formula calculator over every current model, cached prefix and reuses, service tier, the 272K cliff | 2 | 2x2 | 2x2 | 2 | 2 | 2 | 1 | 1 | 18 | Reading, at "What one request costs" |
| 2 | **Harness against effort on ARC-AGI-3**: 12 points (6 efforts × 2 harnesses), score and dollars | 1 | 2x2 | 2x2 | 2 | 2 | 2 | 2 | 1 | 18 | Reading, at "The headline number is a harness number" |
| 3 | **gpt-oss on one GPU**: parameter accounting from config.json, weights format, KV cache against context and batch, MXFP4 block | 2 | 2x2 | 2x2 | 2 | 1 | 1 | 1 | 2 | 15 | Own tab |
| 4 | **Lineage**: 2018 to 2026 on one axis, lanes by line, the bet each release made, disclosed size, 2026 zoom with the September events | 1 | 0 | 2x2 | 2 | 1 | 2 | 1 | 1 | 12, plus Khalid's stated preference for whole-subject axes | Own tab |
| 5 | **Per token is not per task**: AA cost per index task against index, OpenAI tiers highlighted; price ratio against task ratio against token ratio | 1 | 2x2 | 2x2 | 2 | 2 | 2 | 1 | 1 | 16 | Own tab (Cost per task) |
| 6 | **One index, four rulers**: Astra, Fable 5.1 and GPT-5.6 Sol on v4.1, v4.2, v4.3 (8 Sep) and v4.3.2 (1 Oct) as separate panels | 1 | 2x2 | 2x2 | 1 | 2 | 1 | 1 | 0 | 14 | Reading, at "Reading the Artificial Analysis numbers" |
| 7 | **What the next request sees**: Standard harness notes against Provider Adapter opaque state; `reasoning.context` current_turn against all_turns | 1 | 0 | 2x2 | 2 | 2 | 2 | 2 | 1 | 12 | Reading, beside #2 |
| 8 | **Attention sinks**: softmax over a few tokens with a learned sink logit | 2 | 0 | 2x2 | 2 | 1 | 0 | 1 | 0 | 10 | Reading, gpt-oss section (cheap, teaches a mechanism the text names) |
| 9 | **Effort matrix**: which effort each model accepts and its default | 1 | 0 | 2x2 | 1 | 2 | 1 | 1 | 0 | 10 | Reading, as a table (corrects the page: GPT-6.1 Sol rejects none) |
| 10 | Price ladder of every tier with 5.6 launch and cut prices | 1 | 1x2 | 2x2 | 1 | 1 | 1 | 0 | 1 | 9 | Rejected as a chart: price history is what Khalid removed on DeepSeek; the current prices live in calculator #1 and the cuts stay as text with their percentages |
| 11 | Router simulator (share of traffic sent to thinking against average cost) | 2 | 0 | 0 | 1 | 1 | 2 | 1 | 1 | 6 | Rejected: OpenAI publishes no routing shares or per-path costs; every input would be invented |
| 12 | Looped transformer calculator (unique layers × loops against parameters, compute, cache) | 2 | 0 | 1x2 | 1 | 1 | 1 | 1 | 1 | 7 | Rejected: OpenAI has published nothing about Astra's loop; the generic mechanism belongs to the reasoning-models page |
| 13 | Astra against Opus 5.5 dumbbell (TB 4.0, HLE, TB-Science, AutomationBench) | 0 | 1x2 | 2x2 | 0 | 0 | 0 | 0 | 0 | 6 | Rejected: four single numbers, nothing to move; a table carries them |
| 14 | METR time horizon for OpenAI models | 1 | 1x2 | 1x2 | 1 | 0 | 1 | 1 | 1 | 7 | Runner-up: not on the page, and the page's question is cost and harness, not task length |
| 15 | GPT-Live-1 cost per minute meter | 1 | 1x2 | 2x2 | 0 | 0 | 0 | 0 | 0 | 6 | Rejected: one price ($0.05 a minute, per second); backend model cost unknown |
| 16 | Astra for Law relative gain | 0 | 1x2 | 2x2 | 0 | 1 | 0 | 0 | 0 | 6 | Rejected: two numbers; the 40% relative is shown as a formula in the text |
| 17 | Safety incident timeline as its own tab | 0 | 0 | 2x2 | 1 | 0 | 1 | 1 | 0 | 6 | Folded into the Lineage 2026 zoom (same axis) |

## Data and formulas for the built views

### 1. What a request costs (Reading)

C = [ (I − H − W)·p_in + H·p_cached + W·p_write ]·m_in + O·p_out·m_out, divided by 10^6, times the service-tier factor. m_in = 2, m_out = 1.5 when I > 272,000 (whole request). Cached reads 10% of input on most GPT-5.6 and later models and 5% on GPT-6.1 Sol; cache writes 1.25× input; Batch and Flex 0.5×; Fast 2×; Ultrafast 6× (Astra only). Prices from https://developers.openai.com/api/docs/pricing (read 1 Oct 2026).

Defaults reproduce, **by construction** (they are the page's own worked examples, evaluated with OpenAI's published rule): Astra $0.75, GPT-6.1 Sol $0.15, GPT-6 Luna $0.0075 at 50,000 in and 5,000 out; Astra $6.75 at 300,000 in and 10,000 out against $3.50 without the surcharge.

Caching panel reproduces **independently** OpenAI's own sentence in the prompt-caching guide: one write plus one full reuse costs 1.35× a single uncached pass (against 2×), one write plus nine reuses 2.15× (against 10×). It also tests Eden AI's claim that caching pays off "once a prefix is reused more than twice": break-even is at N = (1.25 − r)/(1 − r) = 1.28 uses at r = 0.1, so caching is already cheaper on the second use; Eden's statement does not reproduce and the page says so.

### 2. Harness against effort (Reading)

ARC Prize table (Semi-Private, 3 Sep 2026): Standard max 62.7% $26,098; xhigh 59.3% $37,317; high 54.8% $40,705; medium 38.6% $48,090; low 17.5% $38,166; none 35.2% $49,791. Provider Adapter max 98.6% $17,332; xhigh 98.4% $18,147; high 99.9% $18,817; medium 98.4% $19,285; low 98.0% $21,298; none 96.7% $23,457. Derived: 99.9 − 62.7 = 37.2 points; 1 − 18,817/26,098 = 27.9% fewer dollars; the harness gap grows from 35.9 points at max to 80.5 at low. Reproduces both headline figures independently (they are ARC Prize's measurements; the chart only places them). Human comparison: $115 per 90-minute session, about nine games, $12.78 per attempted game.

Inspiration: ARC Prize's own table (no chart of both curves together is published).

### 3. gpt-oss on one GPU (tab)

From config.json: hidden 2880, 36 or 24 layers, 128 or 32 experts, top 4, expert FFN 2880 (gate and up fused, 2 × 2880 out), 64 query heads × 64, 8 KV heads, window 128 on alternate layers, vocab 201,088, untied embeddings. Expert = 2880·5760 + 5760 + 2880·2880 + 2880; router = 2880·E + E; attention per layer = q, k, v, o with biases plus one sink per head.

Reproduces the model card's Table 1 **independently**: 120b MLP 114.715B (card 114.71), attention 0.956B (0.96), embed + unembed 1.158B (1.16), active 5.133B (5.13, unembedding counted, embeddings not), total 116.829B (116.83); 20b 19.119, 0.637, 1.158, 3.608 (3.61), 20.915 (20.91). Checkpoint with MoE at 4.25 bits and the rest at 2 bytes: 60.70 GiB against 60.8 GiB, 12.80 GiB against 12.8 GiB.

KV cache: 2 × 8 × 64 × 2 bytes = 2,048 bytes per token per layer; 18 dense layers grow with context (36,864 bytes per token), 18 windowed layers hold 128 tokens. 131,072 tokens: 4.5 GiB per sequence on 120b. Without GQA and without the window it would be 72 GiB. The "80 GB" budget is taken as 80 × 10^9 bytes (labelled assumption).

MXFP4 block: 32 FP4 (E2M1) values sharing one 8-bit power-of-two scale, so 4 + 8/32 = 4.25 bits. The block demo quantises a random block (illustrative values) and shows the error.

### 4. Lineage (tab)

Dates: GPT-1 11 Jun 2018, GPT-2 14 Feb 2019, GPT-3 API 11 Jun 2020 (paper 28 May 2020), InstructGPT paper 4 Mar 2022, ChatGPT 30 Nov 2022, GPT-4 14 Mar 2023, GPT-4 Turbo 6 Nov 2023, GPT-4o 13 May 2024, o1-preview 12 Sep 2024, o3-mini 31 Jan 2025, GPT-4.1 14 Apr 2025, o3 and o4-mini 16 Apr 2025, gpt-oss 5 Aug 2025, GPT-5 7 Aug 2025, GPT-5-Codex 15 Sep 2025, GPT-5.1 12 Nov 2025, GPT-5.2 11 Dec 2025, GPT-5.4 5 Mar 2026, GPT-5.5 23 Apr 2026, GPT-5.6 9 Jul 2026 (Sol preview 26 Jun), Astra 3 Sep, GPT-Live-1 and Agents API 10 Sep, Astra for Law 17 Sep, GPT-6 Sol and Luna 22 Sep, AISI report and GPT-6.1 Astra withheld 28 Sep, GPT-6.1 Sol 29 Sep. Sources: hidekazu-konishi timeline (each OpenAI post with its date), arXiv, press. Disclosed sizes: 117M, 1.5B, 175B, then none until gpt-oss.

### 5. Cost per task (tab)

AA snapshot rows (v4.3, methodology v4.3.2, read 1 Oct 2026). Ratios against Astra (max), recomputed: GPT-6.1 Sol per token 0.2, per task 0.222 (4.5 times cheaper, not 5), output tokens 1.12×; GPT-6 Sol per token 0.2, per task 0.321, input tokens 2.13×; GPT-6 Luna per token 0.01, per task 0.0208 (48 times cheaper, not 100), output tokens 2.40×, input 2.67×; Terra 0.24 per output token, 0.429 per task. Hidden reasoning share of output tokens: Astra 74%, Luna 89%. Fable 5.1 per task $7.63 against Astra $3.26: 57% less, reproducing Trending Topics' "gap of 57 percent". The scatter reproduces AA's values by reading them; the ratios are derived (formula shown).

### 6. Four rulers (Reading)

v4.1 (before 4 Sep): Fable 5.1 66, Astra 61, GPT-5.6 Sol 61 (Trending Topics, 8 Sep). v4.2 (4 Sep): Fable 57, Astra 55, GPT-5.6 Sol 51 derived from AA's "4pt gain over GPT-5.6 Sol" (AA v4.2 article; labelled derived). v4.3 (7 Sep, read 8 Sep): Astra 53, Fable 53, GPT-5.6 Sol 47 (Trending Topics). v4.3.2 (methodology 19 Sep, read 1 Oct): Astra 52.7, Fable 53.4, GPT-5.6 Sol 47.0, Opus 5.5 57.6 (snapshot). Drawn as four separate panels, never joined by lines (never splice versions).

## Contradictory or stale sources found (and how the HTML handles them)

- **AA index "changed three times around Astra's launch"**: AA's own v4.2 article and its CEO name v4.1 as the version before; there were two revisions (v4.2 on 4 Sep, v4.3 on 7 Sep) plus the v4.3.2 methodology update (19 Sep). Corrected: three versions, two revisions, one methodology update.
- **Ultrafast**: the page attaches it to GPT-6.1 Sol. VentureBeat says it is available now for GPT-6 Astra with a 6.1 Sol version "coming soon"; OpenAI's Ultrafast guide lists GPT-6 Astra (and a preview for GPT-5.6 Sol), and the pricing page lists Ultrafast rates for Astra only ($60 / $6 / $75 / $300). Corrected.
- **Fast mode "twice the speed"**: OpenAI's guide says "up to 2.5× faster speeds" at 2× price. Corrected.
- **Real-SWE**: page says Astra 33.8% behind Fable 5.1 38.8% with GLM-5.3 leading. The primary page (Specific Labs, read 1 Oct; pass@1 averaged over eight runs, high reasoning, native harnesses) ranks Astra in Codex CLI first at 46.25%, Fable 5.1 in Claude Code 45.00%, Gemini 3.8 Flash 38.75%, GLM 5.3 37.50% (best open model), GPT-5.6 Sol 26.25%. The 38.8 and 33.8 figures come from a dev.to summary of 25 Sep. Both shown with dates; the primary is current.
- **Effort levels**: page says every GPT-6 model accepts low to max and GPT-6 Sol and Luna also accept none; docs agree, and add that GPT-6.1 Sol rejects none and minimal, Astra returns HTTP 400 on none, and GPT-6.1 Sol, GPT-6 Sol, GPT-6 Luna and GPT-5.6 default to medium. Added.
- **Codex models "through GPT-5.1"**: the dated timeline lists GPT-5.1-Codex, GPT-5.2-Codex and GPT-5.3-Codex, and mainline models shipping directly in Codex since GPT-5.5 (April 2026). Corrected.
- **Recurrent depth stated as fact**: it rests on The Information's reporting (2 Sep) and OpenAI researchers' responses (Pachocki on X, via Fortune and TechCrunch); the system card does not mention the architecture. The HTML says so.
- **"OpenAI's own card reports 99.9% on ARC-AGI-3, 98% on FrontierMath Tier 4"**: OpenAI's launch table (as copied by CellCog; openai.com unreachable) lists Agents' Last Exam, OSWorld 2.0, ScreenSpot-Pro, Terminal-Bench 4.0 and -Science, AutomationBench, BenchCAD, GPQA Diamond and ExploitBench; the 99.9% is ARC Prize's Provider Adapter run. The FrontierMath Tier 4 98% could not be traced to any fetched source; kept, labelled unconfirmed.
- **GPT-5.6 Sol promotional pricing "from 21 August"**: OpenAI's docs give the price ($4 / $20, 20% and 33% below launch) and the end date (at least 21 November 2026) but not the start date; start date kept as the page's, labelled unconfirmed.
- **Opus 5 26.9% at 11.1×; Luna 93% below**: confirmed in VentureBeat; VentureBeat also gives "96% below Fable 5" for Luna. Added.
- **"OSWorld 2.0 offline" for GPT-6 Sol**: the GPT-6 Sol article says OSWorld 2.0 without "offline"; the 6.1 article uses "offline set". Wording aligned.

## Inspiration

- ARC Prize's table and its "higher reasoning levels generally cost less" note (the chart makes it visible).
- OpenAI's prompt-caching guide's own worked multiples (1.35×, 2.15×), which the calculator reproduces.
- GDM v3 "Cost per task" and "Gemma on one machine" tabs (layout, controls, reproduction table), DeepSeek v3 Lineage cards.
- Raschka's gpt-oss article draws the block; this page computes the parameter table instead of redrawing it.

## What the methodology lacked here

1. **Unreachable first-party pages.** openai.com returns 403 to every fetcher, so OpenAI's own launch posts could only be read through the API docs' markdown mirror (`.md` suffix, which worked and is the best source) and through press that copies the tables. The methodology should name "docs markdown mirrors" as a source class and require that a figure seen only in a secondary copy be labelled as such.
2. **A leaderboard that changed under its own name.** Real-SWE's live page now contradicts the figures quoted a week earlier. The rule "speeds are measurements with a date" should extend explicitly to any live leaderboard: quote it with its read date and say when an earlier quote differs.
3. **Architecture known only from reporting.** The rules cover contradictory primary sources but not a central claim (recurrent depth) that has no primary source at all, only reporting and a denial-shaped clarification. Add: state the provenance chain, and keep mechanism claims to what the vendor has said.
4. **When a page's own sources contradict each other about a product variant** (Ultrafast on Astra or Sol), the pricing table is the tie-breaker because it is what the API bills. Worth writing down as a rule.
