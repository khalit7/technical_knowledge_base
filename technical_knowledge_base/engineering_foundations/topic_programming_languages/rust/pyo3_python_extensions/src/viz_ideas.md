# Rust: speeding up Python with PyO3 and maturin: visualisations

What the text needs to be understood: (1) why porting one function rarely speeds up the program (Amdahl); (2) what a call across the Python/Rust boundary does to its arguments (copy against view); (3) what releasing the GIL changes when several threads call Rust; (4) how far each step of a real port gets.

| Rank | Idea | Score (teach / data real / effort) | Placement | Data |
|---|---|---|---|---|
| 1 | Optimisation ladder: six steps of the root's program, end to end and per phase, with the code change of each step | 5 / 5 / 3 | Inline in section 10 as a step explorer (was the Optimisation ladder tab plus a summary chart and table) | hyperfine (`outputs/ladder_hf.json`), in-process phases (`outputs/ladder_phases.json`) |
| 2 | GIL timeline animation: four Python threads calling Rust, real start and end of each call, modes serial / held / released / free-threaded, same time scale (before/after) | 5 / 5 / 3 | Inline in section 8 (mode switch no longer plays) | `code/c7_gil.py` spans of the median run (`outputs/c7_gil_314*.json`) |
| 3 | Crossing animation: one call with three items, `Vec<String>` against `&str`, `Vec<f64>` against a NumPy view, with counters (bytes copied, allocations, UTF-8 bytes encoded) and the measured ns per item | 4 / 4 (mechanism from PEP 393 and PyO3; ns measured) / 3 | Inline in section 4 beside the conversion table (was the Crossing the boundary tab; mode switch no longer plays) | `outputs/c3_convert.json` |
| 4 | Phase bars, Python against "only the loop moved" | 5 / 5 / 1 | Now the hero: steps 0, 3, 4 and 5 on one scale, read again in section 1 | `ladder_phases.json` |
| 5 | Alternatives on one loop (Python, regex, mypyc, Cython, Numba, PyO3, plus root's nanobind and pybind11), log scale | 4 / 5 / 1 | Section 13 | `outputs/c8_alts.json`, root `crossing.json` |

Tables rather than charts: conversion costs (section 4), abi3 against version-specific build (section 12, closed), case studies (section 13, closed).

Rejected
- A per-call crossing chart for every binding: the root's Benchmark tab owns it; linked instead.
- Wheel-matrix explorer (platform x Python version): a static table of the generated CI matrix says the same.
- Animated Amdahl calculator: the phase bars and one formula with the measured p were enough.

Inspiration: the DeepSeek MLA explainer (one input, before/after toggle, counters, play/step/scrub), the C++ page's Part 2 ladder pattern.

What the methodology lacked: guidance for timing on a shared, loaded machine; here every figure carries its min and max, the load average is recorded, and the abi3 comparison is flagged as noisy.

## Changes when this became its own page (2026-10-26)
- The two lab tabs explained one mechanism each, so both moved inline beside the claim they prove (teaching contract): the crossing stepper beside the conversion table, the ladder explorer as section 10. The per-step code sits in a closed block inside the explorer.
- The hero is the phase-bar chart widened to four steps on one scale, because it carries the page's one sentence (the whole path must move).
- The ladder summary table and mini chart were dropped: the explorer's end-to-end bars show the same numbers.
- Neither step widget plays on a mode switch; nothing moves before the reader acts.
