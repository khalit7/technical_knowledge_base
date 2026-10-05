# Loop lab: visual ideas

Built
1. Loop iteration stepper (7 stages per model call) with the context window as a stack of blocks to scale, two recorded runs side by side: the before/after of step 4 (unmanaged against clipped and masked) by default, presets for step 1 vs 1b, step 0 vs 2, step 2 vs 5. Totals measured per call; block split fitted (fixed + rate x characters), labelled. Runaway-continuation calls drawn by prompt tokens only, marked *.
2. Scoreboard of every run (click to open the transcript).
3. Step panels: what changed, predict-then-reveal, before/after metric cards, code diff against the previous step.
4. Transcript viewer: reply, the part after the first ACTION line (struck through, kept or discarded), parsed action, gate verdict, observation with raw vs clipped size.
5. Gate table: step 3's real check() on eleven actions.
6. Claude Code comparison: per-run table with cache columns and API-price equivalent; per-call viewer of Claude Code's trace.
7. One recorded turn written three ways (our text, Anthropic tool_use/tool_result, OpenAI function_call/function_call_output), the API shapes labelled illustrative.

Rejected
- Drawing the stack against the full 200K window: every bar would be a sliver; the window is stated instead.
- Animating every token: per-call granularity is what the recordings measure.
- A live in-page loop: no network in the Notion iframe.
- A todo-list step: see README.
