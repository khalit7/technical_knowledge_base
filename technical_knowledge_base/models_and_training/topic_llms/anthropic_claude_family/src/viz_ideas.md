# Anthropic: Claude family, visualisation ideas (v3)

Follows the Methodology in `interactive-html-ideas.md` section 2. Research by direct fetch on 1 October 2026 (WebFetch and curl; no web search). Every number below was recomputed in `recompute.py`; its output is quoted.

## 0. What exists, and the through-line

- The page (live.md) is text plus an older embed built on the deprecated template (`pages/anthropic-claude-family/`). No child pages, no databases, no video. The new HTML replaces both.
- Outbound links on the page: Fable 5.1 post, VentureBeat, Opus 5.5 post, Sonnet 5.5 post, Vellum, Artificial Analysis (Opus 5.5 medium), models overview, pricing, thinking docs, effort docs, Constitutional AI paper, hidekazu-konishi timeline, Toloka; eight Notion mentions.
- **Through-line:** *what a Claude task costs, and which dials the caller still holds.* The ladder sets the price per token; caching sets what re-reading costs; effort (and, before 2026, a token budget) sets how many tokens the model writes; preserved thinking sets what the harness may not do to its history.

## 1. What the text needs in order to be understood

1. The family on one axis: tiers as lanes, releases, and the control-surface changes (budget, adaptive, effort, tokenizer, preserved thinking). A time axis.
2. Which request a model accepts: thinking type x model x effort, with 400 errors. A matrix (docs table).
3. Append-only: what an edit to the history does to thinking blocks and to the cache. A simulator.
4. The session cost formula and where the money goes as the inputs move; the cache cut's effect; window fill. A calculator.
5. Cost per task versus price per token, and effort as a price: AA's measured runs. A scatter plus decomposition.
6. The agentic lead as a trajectory: METR time horizons. A log chart with a refittable doubling time.
7. Constitutional AI's two phases with the paper's numbers. A stepper.
8. Benchmark numbers that only compare within a version and effort. A ledger table.

## 2. Candidates, scored

Questions scored 0 to 2: parameter to move (Param), reproduces a published figure (Repro, x2), computable from public data (Comp, x2), teaches something a sentence cannot (Teach), corrects a misconception (Misc), measures the through-line (Thru), absent from page and main explainers (New); build cost subtracted.

| # | Candidate | Param | Repro x2 | Comp x2 | Teach | Misc | Thru | New | Cost | Score | Placement |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | Session cost calculator: page formula, fixed or growing context with automatic caching, every model at once, 5 m or 1 h cache, batch, tokenizer per word, window check | 2 | 2 | 2 | 2 | 2 | 2 | 2 | -1 | 17 | Own tab "Session cost" (Reading keeps the worked numbers, computed) |
| E | Request checker: model x thinking value x effort -> accepted, default, or 400 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 0 | 17 | Reading, How thinking is controlled |
| B | Effort and cost per task: AA v4.3 index against cost per task, effort settings joined; a run split into output, cached and uncached input; price swap and cache-price counterfactual | 2 | 2 | 2 | 2 | 2 | 2 | 1 | -1 | 16 | Own tab "Effort and cost per task" |
| F | Append-only simulator: a transcript of blocks; edit, append, switch model, change effort; thinking blocks valid, dropped or 400, cache hit point | 2 | 1 | 2 | 2 | 2 | 2 | 2 | -1 | 15 | Reading, Passing thinking back |
| D | METR time horizon: every model on a log scale, Claude highlighted; refit the doubling time over a chosen set | 2 | 2 | 2 | 2 | 1 | 1 | 2 | -1 | 15 | Own tab "Task length" |
| C | Lineage: lanes Haiku, Sonnet, Opus, Mythos class, plus an API control-surface lane; card per release; 2026 zoom | 1 | 0 | 2 | 2 | 1 | 2 | 2 | -1 | 11 | Own tab "Lineage" (Khalid's favoured shape) |
| H | Benchmark ledger: Anthropic's three release tables in one grid, version and effort per cell | 1 | 1 | 2 | 1 | 2 | 1 | 1 | -1 | 11 | Reading, Claude 5.5 |
| G | Constitutional AI stepper | 1 | 0 | 2 | 2 | 1 | 1 | 1 | 0 | 10 | Reading, Training |
| J | Animated session, turn by turn: the same 16-turn session with no cache against prompt caching (automatic caching), one square per 1,000 tokens, read/write/output coloured, running counters, model switch (Haiku 4.5's window fills at turn 15); play, pause, step, scrub, speed, on-screen only, paused under reduced motion | 2 | 1 | 2 | 2 | 2 | 2 | 2 | -1 | 15 (+1 animation point per Khalid's new rule) | Reading, Worked example (added on Khalid's animation guidance) |
| I | Price ladder bars beside the lineup table | 0 | 0 | 2 | 1 | 1 | 2 | 0 | 0 | 8 | Reading, Current lineup |

## 3. Data, formulas and what the defaults reproduce

**A. Session cost.** Prices: [pricing](https://platform.claude.com/docs/en/about-claude/pricing) (raw markdown saved in src/about-claude_pricing.md): 5 m write 1.25x input, 1 h write 2x, read 0.1x (0.05x Opus 5.5, 0.025x Fable 5.1 and Mythos 5.1), batch halves input and output and stacks with caching.
- Fixed prefix: C = (P w + T (P c + N i + O o)) / 10^6. Defaults P 100,000, T 50, N 5,000, O 2,000 reproduce the page's own worked example (by construction, same formula): Fable 5.1 $10.00, Fable 5 $13.75, no cache $57.50, Opus 5.5 $4.50, Opus 5 $6.875, Sonnet 5.5 $2.75, Haiku 4.5 $1.375. Shares: cache 40% of a Fable 5 turn, 14% of a Fable 5.1 turn, output 57%.
- Fable 5 to 5.1 saving at defaults 27.3%, against Anthropic's "around 25%" (an independent claim, matched approximately). Anthropic's "up to around 45%" needs cached reads to be 60% of the Fable 5 bill (0.45 / 0.75).
- Opus 5.5 against Opus 5 on the same tokens: 34.5% cheaper; Anthropic's "40% less" also counts fewer tokens.
- Growing context (our model of [automatic caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching): each request writes what is new since the last one at the write price, reads the rest; thinking stays in context on keep-all models per the [thinking docs](https://platform.claude.com/docs/en/build-with-claude/thinking)): Opus 5.5 $6.92, Fable 5.1 $13.94. A 200K window (Haiku 4.5) fills at turn 15: 100,000 + 14 x 7,000 + 5,000 = 203,000.
- Pricing page example (Opus 5, 10,000 uncached, 40,000 cache reads, 15,000 output): $0.445 of tokens, plus $0.08 runtime = $0.525 (reproduced by construction).
- Break-even reads: one for the 5 m cache, two for the 1 h cache (pricing page's own statement, reproduced).

**B. Effort and cost per task.** aa_snapshot.json (AA Intelligence Index v4.3, methodology v4.3.2, read 2026-10-01). Output cost = output tokens x output price (published inputs). Input cost = cost to run minus output cost; cached share f fitted from (price_in - input cost / input tokens) / (price_in - price_cached); AA says it uses each model's live typical cache-hit rate ([methodology](https://artificialanalysis.ai/methodology/intelligence-benchmarking)). The split reproduces AA's cost to run **by construction**. Fitted f: Opus 5.5 medium 0.926, xhigh 0.962, max 0.968; Fable 5.1 0.958; Haiku 4.5 0.657.
- Opus 5.5 medium (51.2, $1.34) against GPT-6 Astra max (52.7, $3.26): 41% of the cost, 1.5 points lower.
- Sonnet 5.5 max costs $7.62 per task against Opus 5.5 max $5.98 at half the per-token price: 1.59x the output tokens and 1.70x the input tokens. Its tokens at Opus 5.5 prices: 1.60x its own bill.
- Effort as a price: Opus 5.5 xhigh 2.6x medium's cost per task for +4.8 points, max 4.5x for +6.4; Sonnet 5.5 max 13x medium for +15.3.
- Fable 5.1 run re-priced at Fable 5's $1.00 cache read (same tokens, same f): 23.6% saving, near Anthropic's "around 25%" (independent claim; f is fitted).
- Output is 72% of Fable 5.1's run cost.

**D. METR.** Raw data [benchmark_results_1_1.yaml](https://metr.org/assets/benchmark_results_1_1.yaml) (METR-Horizon-v1.1, page [time horizons](https://metr.org/time-horizons), updated 8 May 2026). OLS of log2(p50 minutes) on release date: SOTA points from 2023, p50 at most 16 h: 128.744 days, **independently reproducing** METR's stated 128.744; SOTA all time: 187.778 against 187.778. Claude-only fit: 101 days. Claude points: 3 Opus 4.0 min, 3.5 Sonnet 11.4 and 20.5, 3.7 Sonnet 60.4, Opus 4 100.4, 4.1 100.5, 4.5 293.0, 4.6 718.8, Mythos Preview (early) 1,044.8 (over 16 h, excluded from METR's fit). No 5.x model measured yet.

**E. Request checker.** [Thinking docs](https://platform.claude.com/docs/en/build-with-claude/thinking) per-model table (no field, adaptive, enabled with budget, between_tools, disabled) and [effort docs](https://platform.claude.com/docs/en/build-with-claude/effort) (which models accept xhigh and max; default effort). By construction.

**F. Simulator.** [Preserved thinking](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking): what invalidates (system, tools, earlier messages), error or drop_block, dropped blocks not billed, readability by model, enforcement for accounts from 31 Aug 2026; [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) hierarchy tools, system, messages; [effort](https://platform.claude.com/docs/en/build-with-claude/effort) per-message change keeps the cache. Token sizes of blocks are illustrative and labelled.

**G. CAI.** [Paper](https://arxiv.org/abs/2212.08073), extracted with pdftotext: 16 principles sampled per revision step; 182,831 red-team prompts (42,496 human, 140,335 model-generated); 4 critique-revision pairs per prompt; 135,296 human helpfulness prompts; hybrid preference model: human labels for helpfulness, AI labels only for harmlessness; multiple-choice comparison by a feedback model; 52B models.

**H. Benchmarks.** Three Anthropic tables: [Fable 5.1](https://www.anthropic.com/claude-fable-and-mythos-5-1), [Opus 5.5](https://www.anthropic.com/claude-opus-5-5), [Sonnet 5.5](https://www.anthropic.com/claude-sonnet-5-5). Same model, different version: Fable 5.1 GDPval-AA v2 1853 against v2.1 1735; Opus 5 1824 against 1708; OSWorld 2.0 partial 77.9% against 2.1 partial 80.7% for Fable 5.1.

**C. Lineage.** [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations), model overview pages, Anthropic posts, [hidekazu-konishi timeline](https://hidekazu-konishi.com/entry/anthropic_claude_model_release_timeline.html), [Wikipedia](https://en.wikipedia.org/wiki/Claude_(language_model)), release_history.json.

## 4. Inspiration

Google page's thinking-level matrix (G6) and cost-per-task split (G2), Topic: llms capability-against-price (T5) and benchmark heatmap (T4), DeepSeek Lineage (D12), METR's own interactive chart, the Ultra-Scale Playbook's calculators.

## 5. Rejected, and why

- **Animated fixed budget against adaptive thinking**: Anthropic publishes no per-step thinking amounts, so the adaptive side could only be invented; nothing to draw to scale. The request checker shows the switch between the two designs instead.
- **Animated tool-use turn with interleaved thinking**: block sizes would be illustrative only and the append-only simulator already steps through the same transcript; the caching animation carries the turn-by-turn idea with real prices.

- **API price history tab** (per tier, since 2023): Khalid removed DeepSeek's equivalent; prices stay as facts on Lineage cards and the lineup tables.
- **Revenue or business ledger**: no primary series; Khalid removed the DeepSeek equivalent.
- **Model size chart**: Anthropic publishes no parameter counts.
- **Attribution graph explorer**: the data lives in Anthropic's own interactive tool and images; belongs on an interpretability page.
- **Output speed and latency bars** (AA 71.2 tokens/s, 25.9 s to first token for Opus 5.5 medium): single dated numbers with nothing to move.
- **LMArena rank**: snapshot rank with its own versioning; off the through-line.
- **Tokenizer explorer**: the new tokenizer is not public; kept as a 1.3x toggle in Session cost, labelled approximate.
- **Constitution text explorer**: belongs to the RL for LLMs page.
- **Glasswing partner map**: decorative.

## 6. What the methodology lacked here

1. **Summarised fetches can invent numbers.** WebFetch's summary of the prompt-caching page returned a "worked cost example" ($0.0012, 96%) that is not in the raw page. Rule to add: for documentation, fetch the raw markdown (Anthropic's docs serve `<url>.md`) and grep every number before using it.
2. **Rule tables are data too.** On an API-centred page the most useful reproducible artefacts were the docs' own matrices (thinking value by model, effort level by model). The scoring favours numeric reproduction and underrates a validator that reproduces a documented rule table by construction; worth a line.
3. **Composite cost metrics are not ratios.** AA's cost per task is a weighted average, so cost to run divided by cost per task gives a different task count per model (912 to 2,833). Decompose the run total, and plot cost per task only as AA states it.
4. **Raw data beats charts.** METR's YAML let an OLS fit reproduce its doubling times to the third decimal, which a chart image never would; the methodology should say to look for the data file behind every tracker chart.
