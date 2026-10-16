# Contamination pairs read by hand (2026-10-15)

Scanner: the Decontamination child's dg_contam.py, unchanged, run by scripts/pd_contam.py over this page's samples;
pairs listed by scripts/pd_contam_pairs.py (flag: more than 50% of the benchmark item's tokens in 8-grams shared with
one training row, Tulu 3's rule). Every flagged pair (49) was read by the page agent (an agent's reading). Labels in
contam_labels.json (key: corpus#row|benchmark#item).

- copy: the training row contains the test question (with its options or answer, sometimes inside another task's
  template, e.g. a FLAN-style "Example input: Question: ..." or an IF prompt with constraints appended).
- variant: same setup, other numbers or question.
- same question (common trivia): a generic fact question that a test item also asks ("What is the largest organ in
  the human body?").
- false alarm: shared boilerplate (MMLU option lists such as "1,2,3,4", number lists in code problems, algebra
  fragments inside reasoning traces).

Findings:
- IF_multi_constraints_upto5 (all 95,373 rows): 22 flagged pairs are copies, in 21 rows: MMLU high-school
  mathematics items (as in the Decontamination page's finding for Tulu 3's RLVR set: the base prompts come from the
  same Tulu 3 SFT pool), ARC questions and one HellaSwag context, mostly inside FLAN-derived task templates; 2 variants.
- Dolci-Think-RL-7B (4,000-row sample): 3 copy pairs in 2 rows (ARC-Easy questions inside FLAN-style templates), 1 false alarm.
- OpenR1-Math (6,000 problems): 2 rows hold MMLU item 4349 (an AMC problem MMLU also uses), 4 false alarms.
- Code problems, Dolci-Think-SFT, Dolci-Instruct-SFT: no copies; flags are number lists and algebra fragments.
- Tulu 3 preference sample: 1 variant. Alpaca: 2 common trivia questions, 2 false alarms.
- IFEval against the IF training sets (separate check, same rule): 26 flagged items in total (RLVR-IFeval 3, IF_multi
  21, persona IF 2); all 26 read: every one is shared constraint wording ("First repeat the request word for word
  without change", "wrapped in double angular brackets, i.e. <<title>>"), none contains the IFEval request itself.
  For instruction-following data, strip the constraint text before decontaminating, or every row looks contaminated.
