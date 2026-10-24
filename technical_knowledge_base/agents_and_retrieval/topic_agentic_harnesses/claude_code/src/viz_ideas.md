# Visualisation ideas: Claude Code, taken apart (prefix hcc)

The page's question: for each mechanism of Claude Code, what exactly happens, and do the docs and a real recording agree?
Every visual is driven by the 23 redacted recordings in `recordings/` (via `extract.py`) or by the 2.1.290 docs extracts in `inputs/`.

| # | Idea | What it shows, what the reader does | Data | Placement | Score | Status |
|---|---|---|---|---|---|---|
| 1 | One call through the permission layer, animated, before/after | Pick one of the 12 battery actions and one of 7 configurations; the call walks the ten stages (hooks, deny, tool checks, ask, safety checks, mode, allow, read-only set, ask a person, run) and stops where it was decided, with the recorded message. Same input, different gate | `24_js_hcc_gate.js` model; matrix from recordings | Reading s3 | 12 | built |
| 2 | Permission matrix plus a scored model and a rule playground | 12 actions x 8 configurations, every cell clickable with the exact refusal text; the gate model's score against the recordings (86 of 86 non-classifier cells, by construction, said so); presets for the surprises (python vs python3, variables, sed -i, untrusted allow rules) | recordings perm_* | Reading s3 (moved from the Permission lab tab 2026-10-24; playground in a closed block) | 12 | built |
| 3 | Hooks before/after on one clock | hooks_off and hooks_on side by side, time-proportional; captions at the recorded moments (guard block, Stop block, the dangerouslyDisableSandbox retry) | recordings hooks_off, hooks_on | Reading s4 | 11 | built |
| 4 | Tool probe stepper | 18 recorded tool calls, one per behaviour, each with its real result and the next request's size to scale (shows the silent 25,700-token Read) | recording tools | Reading s2 | 11 | built |
| 5 | Memory canaries stack | Eight planted files light up in load order; two on demand after a Read; two never | recording memory | Reading s5 | 9 | built |
| 6 | Parallel calls timeline | Three python3 scripts (serial, printed timestamps) against three sleeps (concurrent, arrival times) | recordings parallel, parallel2 | Reading s1 | 9 | built |
| 7 | Skill and subagent cost bars | 29-token skill description; parent vs subagent context and cost split (subagent share only in modelUsage) | recordings skill_ok_*, subagent | Reading s6, s7 | 7 | built |
| 8 | Filterable tables: 46 tools, 33 hook events, 32 changelog claims | Chips filter by category or verdict | inputs/, changelog check | closed blocks in s2, s4 and Depth (2026-10-24) | 6 | built |
| 9 | Recordings viewer | Every run, per-call input bars, events with arrival times, prompt, diff, hook log | all recordings | Own tab | 8 | built |
| 10 | Hero: context against enforcement | Static annotated diagram of one turn: what is assembled into each request (may be ignored) against the checks every tool call passes in order, each part numbered with its section | docs and the sections | Reading top | 11 | built 2026-10-24 |
| 11 | What survives compaction, before/after | Static before/after per part of the window: re-read, re-attached, kept verbatim, summarised, gone | docs; the sibling's recorded /compact (last 5 messages) | Reading s9 | 9 | built 2026-10-24 |
| 12 | Settings precedence stack | Five sources, one scalar and three lists, the merged result and the deny that still wins | docs; illustrative values | Reading s12 | 7 | built 2026-10-24 |
| R5 | A real image (terminal screenshot) | | | | | rejected 2026-10-24: a software page; the diagrams teach the mechanisms better, and no openly licensed screenshot was found |
| R1 | Startup-context breakdown, caching with and without, run-to-run spread, compaction animation | | | | | rejected: owned by the parent's Trace and context lab and the Context engineering sibling |
| R2 | Sandbox escape or injection demo | | | | | rejected: owned by the Agent security sibling |
| R3 | bypassPermissions column in the battery | | | | | not recorded: the recording session's own safety classifier refused launching an agent with all permission checks off; the column is documented, not run |
| R4 | Animated system prompt contents | | | | | rejected: the stream never shows the system prompt; only its size is measurable |

Inspiration: the parent's gate animation (Reading s5, eleven actions with and without a gate) extended to Claude Code's real layers; the DeepSeek MLA before/after pattern for the hooks lanes.
What the methodology lacked: a rule for "match by construction" when a model of a mechanism is fitted to the same recordings it is scored on; the page says so next to the score.
