# 2026-09-28: tech news, visualisation ideas

The page is a news issue: 74 items in seven sections. The question the week keeps returning to is **what a unit of capability costs**: three frontier launches priced against each other, open weights taking most of a gateway's tokens and little of its spend, two science results with bills attached, and agent results (Fusion, JitMem) whose gain is a cost effect. Layout as Khalid set it on the 2026-08-24 issue: At a glance, one tab per section (each with its own lead, verbatim items, labelled checks, cross-tab links and follow-ups) and Further reading. Each visual sits after the item it explains.

Scoring as in the Methodology (0 to 2 each; reproduce and computable count double; +1 for a step-by-step before/after animation; build cost subtracted).

| Rank | Idea | Moves a parameter | Reproduces (x2) | Computable (x2) | Beyond a sentence | Corrects | Central question | New | Animation | Cost | Score | Placement | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | N28.1 Price changes by kind, and one task priced before and after | 2 | 2 (58.3%, 50%, 20%, 60%) | 2 | 1 | 2 ("roughly halved" holds for OpenAI only; the cache cut makes Opus 5.5's per-task saving 25% at the default) | 2 | 2 | 0 | -1 | 18 | Top stories, after the releases item | built |
| 2 | N28.2 Ord's swarm arithmetic: N agents = N^λ tokens, both directions | 2 | 2 (3x to 5x, 4.9x, 900x to 15,000x, independently) | 2 | 2 | 0 | 1 | 2 | 0 | -1 | 16 | Talk of the town, after Ord's item | built |
| 3 | N28.3 Read-time against write-time memory curation, animated (JitMem) | 1 | 1 (end counters are the paper's efficiency table) | 1 | 2 | 1 ("already beats" is "competitive with or surpasses") | 1 | 2 | 1 | -2 | 10 | Research, after JitMem | built |
| 4 | N28.4 Prompt cache across a session: one model, a mid-session switch, Fusion's lead and sidekick, animated, with the measured table | 1 | 1 (36%, +69%, 2.7x from the AA table) | 1 | 2 | 2 (Fusion does switch at compaction; "independent" overstates it) | 2 | 2 | 1 | -2 | 14 | Dev tools, after Devin Fusion | built |
| 5 | N28.5 Tokens against spend, and the margin a cheaper token buys | 1 | 2 (7.8x derived from 56% and 14%) | 2 | 1 | 1 (margins fell by June; seats against per-token costs) | 2 | 2 | 0 | -1 | 14 | Top stories, after the Vercel and Harvey item | built |
| 6 | N28.6 Cost per checked result on a log dollar axis | 1 | 2 (3 to 4.35 orders; 5.35 only against the $100 compute part) | 2 | 1 | 2 ($100 is part of a route, not a route) | 2 | 1 | 0 | -1 | 15 | Top stories, after the science item | built |
| 7 | N28.7 Bits per weight that fit the box (dlab) | 2 | 2 ("roughly a tenth" = 9.4%) | 2 | 1 | 1 (only the 35B width is stated; the others are derived ceilings) | 1 | 1 | 0 | -1 | 13 | Dev tools, after dlab | built |
| 8 | Week strip (N1) | 1 | 0 | 2 | 2 | 0 | 1 | 0 | 0 | -1 | 7 | At a glance | reused |
| - | Step-by-step animation of the DNS escape (sandbox, proxy, resolver, delegation service), with the allowlist as the fix and Perplexity's gateway as a third mode | 1 | 1 | 1 | 2 | 1 | 1 | 2 | 1 | -2 | 10 | none | not built: drawing the escape route step by step would amount to a how-to for getting out of an agent sandbox; the item keeps its verbatim text and its dated checks (timeline, remediations, Perplexity's counts) |
| - | SchrodingerRepo's four disguises on one snippet | 1 | 0 | 0 (the snippet would be invented) | 1 | 0 | 0 | 2 | 0 | -1 | 3 | none | rejected: the paper's own example (QuerySet to LedgerSuite) says it in a sentence |
| - | Intelligence Index v4.3.2 against cost per index task | 0 | 1 | 1 (three models with both values) | 0 | 1 | 2 | 1 | 0 | -1 | 6 | none | rejected: three points; carried as a check note on MiMo |
| - | Money by kind (N5 reuse: Akamai, OpenEvidence, DeepSeek, SB Energy) | 0 | 0 | 1 | 0 | 1 | 0 | 0 | 0 | -1 | 1 | none | rejected: contract value, valuation, run rate and IPO target are different kinds and no comparison teaches anything |
| - | vLLM startup before and after (12s to 2s, 28.9s to 8.2s) | 0 | 0 | 2 | 0 | 1 (the figures are not Fast Start's) | 0 | 0 | 0 | 0 | 5 | none | rejected: two numbers, and the correction is the point |
| - | Perplexity's counts as unit rows (0/108, 4/9, 11/54, 8/10) | 0 | 0 | 2 | 0 | 0 | 1 | 1 | 0 | -1 | 5 | none | rejected: four fractions with different denominators read as easily as drawn |

## Data, formulas and sources
- Prices: https://www.anthropic.com/news/claude-opus-5-5, OpenAI https://openai.com/index/introducing-gpt-6-sol-and-luna (Wayback) and https://developers.openai.com/api/docs/changelog (GPT-5.6 promotional prices since 21 August), https://developers.openai.com/api/docs/models/gpt-6-astra, xAI https://docs.x.ai/developers/pricing. Task cost = (input x (1 - cache share) x input price + input x cache share x cache price + output x output price) / 1e6.
- Ord: https://www.tobyord.com/writing/swarm-scaling (λ 0.68, 0.57, 0.48). Equivalent tokens N^λ, speed-up N^λ, compute N^(1-λ), agents to match M^(1/λ).
- JitMem: https://arxiv.org/html/2609.27334 (method; efficiency table on ALFWorld, GPT-5.4 executor: 9.0K, 19.7K, 22.4K, 10.9K, 9.8K tokens; 17.8, 16.2, 16.9, 13.2, 11.6 steps). Tasks, lessons and payload text are illustrative.
- Fusion: https://cognition.com/blog/local-fusion, https://cognition.com/blog/devin-fusion, https://artificialanalysis.ai/agents/coding-agents (61.7 at $7.90, 9.69M tokens, 95.8% cache hit, 99.5 steps; 62.2 at $12.39, 5.72M, 91.6%, 36.7). Session turn sizes are illustrative.
- Vercel: https://vercel.com/blog/ai-gateway-production-index-september-2026; Harvey via https://aiweekly.co/alerts/harvey-moves-flagship-off-frontier-labs-to-moonshots-kimi-k3. Price ratio (86/44)/(14/56); margin = 1 - 1.5 x relative price.
- Science costs: https://www.anthropic.com/research/yes-claude-can-do-nine-loops; The Batch https://charonhub.deeplearning.ai/inside-the-dispute-over-a-landmark-agent-driven-mathematical-proof/.
- dlab: https://timdettmers.com/2026/09/21/dlab-open-source-week/. GB = params x bits / 8.
- All recomputed in recompute.py.

## Inspiration
The two animations follow the DeepSeek MLA explainer pattern (same input, old way and new way, to scale, caption per step, counters, play, pause, step, scrub, speed, only in the visible tab, starting on a completed first step and never auto-playing under reduced motion); the shared controller is parts/10b_js_anim.js, reusable by later issues. The price dumbbells and the log cost axis follow the "one kind of figure per axis" rule from the 2026-08-24 money chart.

## What the methodology lacked for this issue
- A rule for **security incidents**: report what happened, the timeline, the scale and the fix, and check them against the sources, but do not draw an escape or attack route step by step, even as an illustrative before/after; the text carries it.
- A rule for **cost claims stated as orders of magnitude**: find which two figures the claim divides, and show the parts of a budget as parts (the $100 inside a $1,000 to $2,000 route).
- When a vendor's evaluation partner publishes the comparison, label it "with" rather than "independent", even when the numbers check out.
