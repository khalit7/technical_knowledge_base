# src: Remember When It Matters: Proactive Memory Agent for Long-Horizon Agents (arXiv 2607.08716)

`sh build.sh` writes `../index.html` (it runs `mk_traces.py`, `recompute.py` and `mk_paper.py` first). Then:
- `python3 mk_coverage.py`: `coverage.json`, every fact of `live.md` checked against the built page.
- `node src/check_page.mjs [shots dir]` from the repo root: every control in both themes and widths, both animations stepped.
- `python3 parse_traces.py <examples dir>` re-parses the five released example traces into `inputs/traces.json` (download commands in its docstring; the HTML exports are not kept, three are over 1 MB).

| File | What |
|---|---|
| `live.md` | the Notion row page as fetched (saved by `save_live.py` from the session transcript) |
| `paper.json` | headline card, verdict, resources, KB links |
| `tables.json` | Tables 1 to 4 transcribed at printed precision from `inputs/table_*.txt`, plus the Terminal-Bench paper's reference rows |
| `recompute.py` | task counts behind every percentage, macro and micro averages, noise bounds (unpaired SE, exact McNemar), SETA implied sizes, trace totals, token and cost estimates; writes `inputs/recompute.json` |
| `parse_traces.py`, `mk_traces.py` | released traces to `inputs/traces.json`, then cut down to `parts/_gen_traces.js` for the Replay tab |
| `inputs/injection_labels.json` | this page's reading of each of the 52 reminders (recall, diagnose, check); a judgement, shown beside each reminder |
| `inputs/paper_v1.txt` | the arXiv HTML as text (`extract_paper.py`), the only arXiv version |
| `inputs/code/` | the released run configurations, `memory_agent.py` (prompts) and `trigger.py` |

## Shape, and departures from .claude/skills/explainer-page/page-kinds/paper.md

- **Live ingredient: a trace replay** (the agent kind in papers.md), built from the five example runs the authors released (baseline and memory run of the same Terminal-Bench task). Nothing is simulated; memory-agent tokens and costs are estimates from character counts (3.76 characters per token, calibrated on the actor's first prompt in all ten runs) at list prices, and are labelled as such.
- **The Reading-tab animation** runs one real memory step (`sqlite-with-gcov`, trigger 4) through the full design and each Table 2 ablation; only the full design's content is real, the ablations' content is labelled illustrative.
- **No "Then and now"**: a 2026 result paper with no lineage yet.
- **The Reading tab is long (about 25 minutes against the old page's 3)**: the old summary was second-hand and missed the code, the traces, Table 2's run-to-run evidence and the cost question; the corrections need the evidence beside them.
- Em-dashes inside quoted trace text and prompts are replaced by commas (the page has none anywhere).

## Light pass to the teaching contract (2026-10-26)

- **Top**: the idea in one sentence (a second model beside an unchanged agent keeps a memory bank and each step reminds or stays silent; Opus 4.6 watching Sonnet 4.5 takes Terminal-Bench 2.0 from 32 to 39 of 85 tasks and τ²-Bench from 153 to 172 of 278 in single runs, but always reminding does as well, so a watcher is shown to help, not its silence); a static hero (`parts/14_js_hero.js`): the actor's loop, the memory agent's inputs, Phase 1 and Phase 2, the reminder riding on the next call (52 of 80 steps in the released traces), and the task counts from Table 1 and Table 2's always-remind row; You need (Context engineering, Long context, RL for LLMs); New terms.
- **Owned elsewhere, now linked** (what this paper did kept here): memory layers such as Mem0 (Context engineering), why information still in context stops being used (Long context), SFT and GRPO (RL for LLMs), paired tests and standard errors (Eval statistics).
- **Moved into closed blocks**: "What the released code adds" (run settings, two calls per step, the BM25 pre-filter, the prompt's wording; the trust section keeps the points that change the reading); the paper's Terminal-Bench and τ²-Bench cases (a one-sentence summary stays); small text and table inconsistencies; where the old summary came from (the corrections list stays visible).
- **Never autoplays**: `makeAnim` in `11_js_ui.js` waits on its first frame until the reader acts (also after a mode or task switch, including `23_js_run.js`); tabs from the skill template (`99_js_tabs.js`, key `pm-tab`). `check_page.mjs` uses DOM clicks for tabs, fails on any frame drawn before a click (`tl`, `rp`), checks the hero is drawn and opens every closed block.
- **No real image**: nothing physical to show; the paper's Figure 3 is redrawn as the hero.
- **Takeaway softened** (card, `paper.json`, `live.md`): the card line now adds that every number is a single run with no cost reported, that always reminding solves as many τ²-Bench tasks as selective reminding (171 against 170 and 172), and that in the released traces the agent speaks at 52 of 80 steps, often with fresh advice. The Notion property, saved in `live.md` before this pass, read: "Pair a second model alongside an acting agent to decide when to remind it of what it already knows: Terminal-Bench 2.0 success rises 37.6% to 45.9% for Claude Sonnet 4.5 and 37.6% to 41.1% for Qwen3.5-27B, tau2-Bench 55.0% to 61.8% and 66.2% to 68.7%, with no retraining of the worker, and reminding selectively beats reminding at every step." It credits 41.1% to the wrong Qwen model (27B is the memory agent; the actor is 122B-A10B) and claims a selectivity win the ablation does not show; Notion still carries it.
- **Source extracts**: em-dashes in `inputs/paper_v1.txt` (8), `table_S4_T2.txt` (2), `table_S4_T6.txt` (2), `code/memory_agent.py` (10) and `code/baseline_terminalbench.yaml` (1) became `--`; in `inputs/traces.json` (77, real trace text) each is stored JSON-escaped instead, because the page's character-count estimates read that text and `--` would change them; `_gen_traces.js` and `recompute.json` are byte-identical after the change. No author emails were present. `extract_paper.py` and `parse_traces.py` now do this on extraction.
- **Length judgement**: Reading core 25 min before (5,745 words) and 25 after (5,734), plus 2 in closed details (517 words, from 0; `audit_pages.mjs`, 230 words a minute; header from `reading.json`). The top added about 2 minutes and the moves took out about as much. What stays is core: the design as the paper states it, the results turned into task counts, the ablation that undercuts the title, what the released traces show, the training study and an evidence section that changes the reading. Other tabs unchanged (Replay 3, Tables 5, Further reading 3). Visuals inline: 4 before, 5 after (the hero).
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 265 units; core 247, depth 13, owned 4, fat 1; `ledger.py check` problems 0.
- **Checks (26 October 2026)**: `checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems (276 actions); `mk_coverage.py` 26 of 26.
