# NeoHorse-1: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3db5c17b0d0d81e3b105e033a359ad24, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the HarnessDev page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `check_page.mjs`, `svgparse.py`, the CSS and `10_js_common.js`, `11_js_ui.js`, `90_js_tabs.js`).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict (softened Takeaway); the core sentence, hero figure (the recipe's five parts and which the paper isolates), You need and New terms; Problem; Idea (the loop against curate-once, animated); Data from the routing harness (granularities, loss-mask widget, quality gates, Scene/Goal/Outcome); Routing signals and allocation; Training (Eq. 1, Eq. 2 widget, Eq. 3 with a predict question and live KL demo); Results (gains chart with error bars, predict question on 4B against base 9B, item-count error table); Traces (§5.1 and Appendix B); Data experiments (predict question with Figure 7 decoded against the base); How much to believe; What it takes to use this; Why it matters; Connections. |
| Schedule the curriculum | `t-run` | The live ingredient: the three-stage routing curriculum animated against shuffled SFT, with traffic, router-confidence and reserve controls; the coarsened OPD loss lab. |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 1 and 2 (track, scores or minus base, sort); Table 3 with the base, Figure 7's decoded runs and the released model added; benchmark sizes read from the scores; all 45 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **No toy model, no trace replay.** A training-recipe paper on private traffic with no code, data or released traces; a toy curriculum experiment would show whatever its design decides, not what happens at 4B. The live ingredient instead runs the method's two specified mechanisms on illustrative inputs (the Eq. 2 three-stage schedule, the Eq. 3 coarsened KL), and the page says next to it that it cannot show whether the ordering helps, because the paper never tests that.
- **The quantitative work is on the paper's own numbers:** benchmark sizes recovered from score granularity give the error bars the paper omits, and Figure 7 decoded from its vector SVG shows Table 3's harness run is one of its points and puts the base model beside the data experiments.
- **No Then and now.** A September 2026 result; "What it takes to use this" covers adoption.
- **Reading tab is long (about 27 minutes against the old 5).** The old page was written from the abstract; this one owns the method's details (gates, routing fields, both losses), the appendix cases and an evidence section that changes the reading.

## Light pass to the teaching contract (2026-10-25)

- **Top**: the idea in one sentence (the router already judges difficulty, so its records order and select the post-training data; +5.93 and +3.44 macro points; no part isolated, loop run once); a hero figure (`15_js_hero.js`: the five parts in order, each marked compared or not isolated, the whole recipe's measured gains from `recompute.json`, the next round dashed; the Table 3 numbers are left out so the data-experiments prediction stays open); You need (Gateways and routing, the loss mask on Alignment, Distillation and small language models); New terms.
- **Owned elsewhere, now linked** (what this paper did kept here): why on-policy distillation beats training on recorded text (Distillation and small language models; Eq. 3's coarsening, reverse KL and staging stay here), the loss mask (Alignment; agent-trajectory masks on Harnesses for training), routing by difficulty (Gateways and routing), binomial standard errors (Eval statistics).
- **Moved into closed blocks**: where the page came from (the corrections stay visible); the five components as the paper words them (one sentence plus the hero carry them); every structural check (the three outcomes stay); how the six verdicts are reached and stored; annotation-noise controls; why tiers are versioned; gradients and Eq. 4; what each benchmark tests; every baseline and sampling setting (runs per benchmark stay); Appendix B's three cases. The same week's Dwarkesh data-efficiency decomposition moved to one dated block "Since the paper".
- **Never autoplays**: `makeAnim` waits on its first frame until the reader acts (both `lp` and `cu`, and after a mode switch); the loop caption no longer says it starts by itself; `check_page.mjs` uses DOM clicks for tabs, scrolls each animation into view and fails on any frame drawn before a click, checks the hero is drawn, and opens every closed block. Tabs from the skill template (`99_js_tabs.js`, key `nh-tab`, with `data-to` scrolling).
- **No real image**: nothing physical to show; the paper's figures are redrawn (Figures 2 and 4) or decoded (Figure 7).
- **Takeaway softened** (card, `paper.json`, `live.md`): the old line said evaluation feedback "feeds back into the training mixture" (described, never measured), credited the gains to the method with no ablation, and gave "closing 89% of the macro gap to the base 9B" without saying the 4B beats the base 9B on only 5 of 10 benchmarks. The new line says allocation is designed, the parts are not isolated, the loop ran once, and the +6.26 over public data is mostly the public-data run falling 4.99 points below the base. The Notion property still carries the old line (with "11 benchmarks").
- **Length judgement**: Reading core 28 min before (6,470 words) and 26 after (5,968), plus 5 in closed details (1,180 words, from 0; `audit_pages.mjs`, 230 words a minute; header from `reading.json`). The top added about 2 minutes; the moves and owner links took out about 4. What stays is core: the method as the paper states it (three granularities, gates, three routing fields, Eq. 1 to 3), the results with their noise check, the data experiments and an evidence section that changes the reading, none of which another page carries. Other tabs unchanged (Schedule 2, Tables 7, Further reading 4).
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 301 units; core 251, depth 40, owned 5, volatile 2, fat 3; `ledger.py check` problems 0.
- **Source extracts**: em-dashes in `inputs/paper_v1.txt` (15) and `inputs/github_readme.md` (1) replaced with `--`; no author emails were present. `extract_paper.py` now does both on extraction; `tables.json` and `recompute.json` are byte-identical after the change.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or unexpanded macro.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `inputs/tables_v1.txt`, `inputs/anchors.txt`.
- `decode_figs.py` (with `svgparse.py`): Figure 7's six runs and Figure 1's labels from the vector SVGs to `inputs/figs.json`.
- `fetch_release.py`: dated release facts (GitHub, Hugging Face models and paper upvotes) to `inputs/release.json`. `inputs/github_readme.md` and `inputs/hf_card_4b.md` are the README and model card as fetched on 2026-10-03.
- `mk_tables.py`: `tables.json` (Tables 1 to 3, asserted against the extract; Figure 7).
- `recompute.py`: 45 checks and every derived number, to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `mk_coverage.py` writes `coverage.json` (35 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, both animations stepped.

## Checks (3 October 2026; rerun 25 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems (282 actions; nothing moves before a click); `recompute.py` 45 of 45; `mk_coverage.py` 35 of 35; `ledger.py check` problems 0.
