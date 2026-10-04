# Knowledge and reasoning benchmarks: visual ideas (built and rejected)

Question the page keeps returning to: what does a knowledge or reasoning score mean, given how the benchmark was built, how it is graded and how wrong its answer key is?

Scored 0 to 2 per the Methodology (html_utils/interactive-html-ideas.md section 2); real data and reproducing a published figure count double; animation point added.

| # | Idea | Score | Placement | Status |
|---|---|---|---|---|
| K1 | **Re-grade with a fixed key, animated before/after**: MMLU-Redux (5 subjects, real per-item error labels in dataset order, 10 models' EM and HELM ranks before and after removing flawed items, bars re-sort) and HLE-Verified (2,500 squares grouped 668/1,143/689; 7 models raw vs repaired subset vs full set, calibration error) | 14 | Tab "Fix the key" | built; reproduces MMLU-Redux Table 2 and HLE-Verified Table 2 by construction; recompute.py checks the deltas and finds the HLE-Verified prose disagrees with its table for 6 of 7 models |
| K2 | **MMLU defect map**: 57 subjects, stacked by error type, sorted by rate or by estimated flawed test questions (rate x test size) | 12 | Tab "Fix the key" | built; reproduces 6.49% and virology 57% independently from the dataset; derived stratified estimate 7.0% |
| K3 | **Two hypotheses on one ARC task, animated**: 007bbfb7, Rule A (self-copy) vs Rule B (3x upscale) built block by block, graded cell by cell, exact match | 13 | Tab "ARC-AGI lab" | built; Rule A 81/81 on all 6 pairs, Rule B 61 to 67 of 81 (checked in recompute.py) |
| K4 | **Solve real ARC tasks** (4 ARC-AGI-1 training, 1 ARC-AGI-2 eval), paint editor, two attempts, exact match | 11 | Tab "ARC-AGI lab" | built |
| K5 | **RHAE calculator** with presets (human, 2x, 10x on level 5, stop after 3, faster than people) | 10 | Tab "ARC-AGI lab" | built; formula from the ARC-AGI-3 technical report; preset values checked |
| K6 | **Grade it yourself**: 8 real MCQ items (MMLU via Redux incl. a wrong Redux label, MMLU-Pro, ARC-Challenge, HellaSwag, WinoGrande twins) + SimpleQA three-way toy grader + Wilson scorecard | 11 | Tab "Grade it yourself" | built; GPQA, HLE, BBH items deliberately not shown (do-not-publish requests, canaries) |
| K7 | **HLE tools on/off dumbbells**: Anthropic full HLE (+3.3, +7.0), HLE-Diamond maintainer runs (+19.3 to +32.2), Grok 4 secondary | 10 | Reading, HLE | built; shows the root's "3.3 to 7.0" correction is set-specific |
| K8 | **ARC-AGI-3 harness x effort bars** (GPT-6 Astra, 12 runs with costs) | 9 | Reading, ARC-AGI-3 | built from the root's same.json |
| K9 | **SimpleQA guessing what-if** on Table 3 rates; derived threshold p > F/2 | 9 | Reading, SimpleQA | built; reproduces Table 3 F-scores |
| K10 | GPQA funnel 564/546/448/198 | 6 | Reading, GPQA | built (static HTML bars) |
| K11 | MMLU life-cycle chart | 8 | none | rejected: the root's Reading tab already animates it; linked |
| K12 | GPQA / HLE / ARC trajectory charts | 8 | none | rejected: the root's Saturation timeline owns them; dated points given in prose |
| K13 | Error-bar calculator | 8 | none | rejected: root's Same model tab owns it; GPQA numbers given inline |
| K14 | Physics re-grading pipeline replay | 9 | none | rejected: exists on the paper page ("Follow the audit"); linked |

What the Methodology lacked here: a rule for real items from datasets that ask not to be published (GPQA, HLE, BIG-Bench canaries). Followed: show none, say why on the page.
