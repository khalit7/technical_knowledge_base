# Visualisation ideas for Part 2 (Python in 2026)

Scored 1-5 on: teaches more than text, uses real data, before/after of one input, fits a phone.

| Rank | Idea | Score | Built as | Data |
|---|---|---|---|---|
| 1 | Four thread lanes of the same job, GIL vs no GIL, to scale, time cursor | 5/5/5/4 | Reading s9 animation (toggle 3.14, 3.14t, 3.15, 3.15t) | real per-block timestamps, `ft_bench.py trace(4)` |
| 2 | Import timeline of one CLI, eager vs lazy vs -X lazy_imports=all, to scale | 5/5/5/4 | Reading s8 animation | `-X importtime` of the real runs |
| 3 | pyproject.toml / uv.lock / .venv agreement stepper | 4/5/4/4 | Reading s2 animation | the real uv transcript |
| 4 | Version matrix: 21 changes x 5 interpreters, click for output, "my minimum version" filter | 5/5/3/3 | Version explorer tab | real runs |
| 5 | Type-checker drill: predict which checkers flag it | 4/5/3/4 | Reading s4 | real outputs |
| 6 | Wheel-name decoder | 4/4/2/5 | Reading s6 | real PyPI file names |
| 7 | Thread scaling chart, JIT table, executor table, wheel survey | 3/5/2/4 | Runtime lab tab | real runs |
| 8 | Release lifecycle bars | 3/4/1/4 | Version explorer | devguide table |

Rejected: a generic "how the GIL works" lock animation (the root Reading already animates a racy counter on GIL vs 3.14t, and
Part 1 owns the GIL explanation; here the lanes use real timestamps instead); a resolver animation (illustrative only, no real
data to drive it); a JIT bytecode-to-stencil animation (would need CPython internals we could not record faithfully).

Inspiration: the root page's Toolchain atlas walkthrough replay (the uv stepper extends it past the first five commands), the
DeepSeek MLA explainer's before/after toggle (the lanes and the import timeline both keep one axis across the toggle).

What the methodology lacked: guidance for measurements on a shared, loaded laptop; this part records load averages next to
every timing and says what counts as noise.
