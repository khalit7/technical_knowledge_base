# Visual ideas for the 2026-11-02 issue

Chosen fresh for this week (`.claude/skills/explainer-page/visuals/choosing.md`).

## Built
- **Week strip** (`v_strip`, `12_js_strip.js`): kept from the series; axis 21 October to 2 November.
- **Rank on index v4.3.2 against rank on v5** (`v_index`, `13_js_index.js`), under the Carbon top story: the headline "the open-weight gap went from 3 to 12 points" divides two different scales, so the chart joins each model's place in the old order to its place in the new one and says the numbers cannot be compared across columns. Ties keep list order; Sonnet 5.5's v5 score is secondary and labelled.
- **Round to nearest against stochastic rounding** (`v_round`, `14_js_round.js`), the before/after animation: one fp32 master weight of 0.03 with an update of 0.000001 a step, its bf16 copy under each export, four steps per mode on the shared step controller. Magnitudes are chosen to match the kind the Fair Cast paper reports (a lag of about 60 steps); the caption says it is an illustration, not the paper's data. Nothing moves before a click.

## Considered and rejected
- A cumulative running mean of the stochastically rounded copy: it trails a rising master by construction (the mean of a ramp is half its height), so it suggested a bias that does not exist; removed after the first screenshot.
- A capex chart for Alphabet, Microsoft and Amazon: the three report different measures (purchases of property and equipment, additions including or excluding finance leases), so bars would compare unlike figures; the cards state each with its definition.
- The tampered extension's behaviour as a step diagram: the tech-news rules say never draw an attack route step by step.
- Anthropic's S-1 revenue by quarter as a chart: the cards give the half-year and Q2 figures; a quarterly chart would be the only visual of a company's accounts in a page about technology, and adds little to two numbers.
