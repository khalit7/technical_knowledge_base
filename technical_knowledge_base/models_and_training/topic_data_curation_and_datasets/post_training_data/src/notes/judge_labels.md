# OpenR1-Math: what the Llama judge accepted that Math-Verify rejected (hand-read sample)

Population: generations in the 6,000-problem sample with correctness_math_verify = False and correctness_llama = True
(2,701 generations). Sample: 30, drawn with random.Random(5) from check_rows.jsonl.gz (pd_check.py output), read on
2026-10-15 by the page agent (an agent's reading, not an expert annotator's): gold label, the boxed answer(s) after
</think>, question type. Indices are (problem row in openr1_math.parquet, generation).

| Category | Count | Rows |
|---|---|---|
| Multiple choice: the model boxed a letter, the label stores the option's value (or the reverse); the checker cannot map one to the other, the judge can read the options | 14 | (5683,0) (5950,1) (4851,0) (2294,1) (508,1) (1425,0) (3435,0) (4304,1) (3535,1) (5264,1) (2006,1) (2607,0) (1650,1) (690,1) |
| Equivalent answer in another form, or several answers where the label lists them differently (intervals, solution sets, "x=0 and y=0" for "0", a free constant) | 11 | (2332,1) (285,1) (4262,1) (5933,0) (1029,1) (2276,1) (4985,1) (932,0) (2295,0) (1257,0) (5638,0) |
| Rounding: 40\sqrt{2} for 56.6 | 1 | (1439,0) |
| Label garbled by extraction from the source solution (missing symbols), so no rule can match | 2 | (3306,1) (3748,1) |
| Judge accepted a wrong or unclear answer (998000 for 998^2-4 = 996000; "Yes/No" for 2020) | 2 | (140,1) (3591,0) |

Reading: 28 of 30 judge rescues look right (14 are the multiple-choice letter/value mismatch alone), 2 look wrong.
With n = 30 the share of wrong rescues is uncertain (2/30 = 7%; a 95% Wilson interval is about 2% to 21%).
