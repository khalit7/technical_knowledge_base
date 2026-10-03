# Price list (t-price): visualisation ideas

The question this tab answers: what did a training run cost, and what does that figure actually cover? The old page quoted prices across stages and accountings and compared them directly ($40M against $2.62M), so the misconception to correct is "a price is a price".

| ID | Idea | Score notes | Status |
|---|---|---|---|
| PL-1 | Log-axis dot plot, one row per run, marks coloured by stage, shaped by kind (published, reported, estimate, derived); click a row for a card with what it bought and a six-item "includes" checklist | the central visual; every number traced; covers 32 runs | built |
| PL-2 | Separate axes for dollars, GPU-hours and FLOPs (a switch, never one axis) | methodology rule: different kinds of figure never share an axis | built |
| PL-3 | Two figures for the same run joined by a line (Thomson $450K and $40M; Epoch's amortised and cloud estimates) | shows "one run, two accountings" at a glance | built |
| PL-4 | "Split into stages" toggle for runs that publish a stage breakdown (DeepSeek-V3, R1) | puts V3's $10K post-training next to its $5.3M pretraining | built |
| PL-5 | Sortable, filterable table with "covers" and "costed as" columns; filter by stage and by what a figure includes | Khalid asked for it; the table is the data | built |
| PL-6 | Same stage, different budgets: nested squares with area proportional to dollars, zoom animation from the bigger budget to the smaller, plus a like-for-like checklist that says whether the ratio is fair and in which direction it errs | makes 2,183x and 111,000x concrete; corrects ratio-of-unlike-figures | built |
| PL-7 | Before/after: a headline figure grows as excluded costs are added back (DeepSeek-V3, GPT-4 via Epoch, Thomson Reuters); illustrative steps hatched and labelled; capital on its own bar | the DeepSeek $5.6M misconception; every step sourced or labelled illustrative | built |
| PL-8 | Magic's multiples decomposed: which two numbers each "x times" divides (61x raw 6ND, 12x smallest of 28 transcribed multipliers, median 48x against V4 Pro) | methodology rule for "x times" claims | built (as a box, not a chart) |
| PL-9 | Convert every run to dollars at one common GPU rate so all sit on one axis | would invent numbers the sources do not give, and mix GPU types | rejected |
| PL-10 | Timeline of training cost (date on x, dollars on y) | Epoch already draws it with far more runs; our mix of stages would make a misleading trend | rejected |
| PL-11 | Dollars per unit of capability (cost per benchmark point) | the runs bought different things (a 4B planner, a 1T base model); no shared benchmark | rejected |
| PL-12 | Energy axis (OLMo 2 MWh, Llama tCO2) | only two labs publish energy; kept as a note in the cards | rejected |
| PL-13 | GPU-count by duration rectangles (area = GPU-hours) | needs both numbers; missing for most 2026 runs (MiMo, Neon, Thomson) | rejected |
| PL-14 | Speedrun progression chart (92 records) | belongs to the Pretraining child page; here the first and latest records suffice | rejected |
| PL-15 | Hardware capex alongside run costs on the same axis | different kind of figure (capital reused across models) | rejected; shown only as a separate bar in PL-7 |
