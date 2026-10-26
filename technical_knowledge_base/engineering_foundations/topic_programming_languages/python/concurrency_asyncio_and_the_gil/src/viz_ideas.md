# Visuals: built and rejected

Built
- Hero: four static timelines (threads under the GIL, threads on 3.14t, an asyncio loop with one blocking call, four processes), illustrative schedules, one legend. Chosen because the core sentence is a statement about who runs at each instant; every row is measured later on the page.
- Section 1: bars of `k1_gil` on both builds, behind a prediction prompt (replaces two text outputs, which moved to a closed block).
- Section 2: the event-loop stepper on the real `a2_trace` events (from the language page's Event loop tab), with a prediction prompt for mode 3; fan-out bars from `a3_fanout` (new; the output text moved to a closed block).
- Section 3: the per-block thread lanes on four interpreters (from the language page), speed-up bars, the scaling chart and table (from the Runtime lab, closed), the lost-update prediction with its table, transcripts, the wheel survey (closed).
- Section 4: job-time bars on 3.14 (new), the start-up table, every run (closed), transcripts.

Rejected
- A separate Runtime lab tab: its tables back single claims, so they sit in closed blocks beside them.
- A start-up bar chart for subinterpreters: the three start-ups span three orders of magnitude (0.05, 6 and 84 ms); a table reads better than log bars.
- An animated hero: the comparison is structural; animation would add nothing the four rows do not show.
