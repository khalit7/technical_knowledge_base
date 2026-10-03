# Visualisation ideas: MOLE

The question the paper keeps returning to: of the harm agents complete inside an organisation, how much does a monitor with a fixed daily review budget catch, and what does it need to see?

| id | idea | score (teaches / data / effort) | placement | status |
|---|---|---|---|---|
| P-mole.1 | **The daily review queue, replayed on the released corpus**: every active account ranked by the paper's count-based monitor, top K shaded, completed harms caught or missed, day by day over the 15 test days; z-score against peer-fit on one scale; K slider and feature switches; JS checked bit-for-bit against Python | 5 / 5 (real data, reproduces 7/45 and 8/45) / 4 | Run tab | built |
| P-mole.2 | **What a monitor actually sees**: two released completed-harm account-days rendered in the paper's own format at the three observability levels, with argument clipping and where the harmful content falls past it, plus the hidden system prompt | 5 / 5 / 3 | Reading | built; exposed the 600-character clip and the elicitation preamble |
| P-mole.3 | **Ranking with whole-number counts**: Figure 4's 40 monitors as k of 45 with exact binomial intervals, against a random queue | 4 / 5 / 1 | Reading (predict reveal) and Tables | built |
| P-mole.4 | **Refusal against completion scatter** with Figure 3's four-way bars decoded from vector rectangles | 4 / 5 / 2 | Reading (predict reveal) and Tables | built |
| P-mole.5 | **Observability small multiples**: Table 12 as 4 generators × 3 monitors × 5 inputs, metric toggle, counts on hover | 4 / 5 / 2 | Reading (predict reveal) and Tables | built |
| P-mole.6 | **Threat explorer**: Table 1 plus Table 4 plus Figure 6's row per threat | 3 / 5 / 1 | Reading | built |
| P-mole.7 | **Cost against budget-AUC** for Table 22's strategies per test corpus, with the rarity-gated escalation curve | 3 / 4 / 1 | Tables | built |
| P-mole.8 | Semantic monitor rerun live (call an LLM per account-day) | rejected: no network in the Notion iframe, and the paper's saved scores are not released |
| P-mole.9 | Multiday corpus toggle in the live tab | rejected for size (another 3,553 account-days, about 140 KB); its reproduction is reported in the checks instead |

What the methodology lacked for this page: a pattern for a benchmark paper whose raw data is released. The best live ingredient was neither a toy nor a simulation but the paper's own simplest baseline rerun on its own data, which both teaches the metric and verifies the paper; and reading the raw released traces (not only the tables) is where the most important corrections came from.
