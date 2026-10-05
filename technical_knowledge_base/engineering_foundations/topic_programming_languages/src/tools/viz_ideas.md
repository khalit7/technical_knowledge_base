# Toolchain atlas: visual ideas, built and rejected

The tab's question: "for each job a project needs done, which tool does each ecosystem use, how current is it, and what do I type?" Python is the reference column (the reader knows it), so every other cell carries a "From Python" bridge and a "Watch out" trap where the analogy breaks.

Scores 0 to 2 on: reader controls something / reproduces a published or measured figure (x2) / computable from public data (x2) / shows what prose cannot / corrects a misconception / measures the tab's question / absent elsewhere; minus build cost.

## Built

| # | Idea | Score | Why it earns its place | Data |
|---|---|---|---|---|
| A1 | **Atlas grid**: 15 jobs x 4 languages, grouped (Set up, Write, Check and run, Share); language chips, job-group filter, tool search with highlighting; click a cell for the detail | 11 | The whole subject on one screen; search answers "where does napi sit?" and shows the same job's tools across languages in one row | atlas.json from registries (build_data.py resolves every version by key; no version typed by hand where a registry has it) |
| A2 | **Cell detail**: summary, every tool with one-sentence description, version, release date, source link, checked date, beginner command; From Python bridge; Watch out | 10 | Each fact sourced and dated in place | as above |
| A3 | **Seen it run** inside cells: the same bug through Python (runtime TypeError), ty, mypy and pyright; Node running a wrongly typed call and tsc rejecting it; signed overflow with and without UBSan; the dangling pointer in Rust refused by the borrow checker, run silently with a raw pointer, caught by Miri; PyO3 build and import | 11 | Real outputs, before and after: the difference between tools is seen, not described. Every output is from walk/*.txt | walk/walk_extra.sh, walk_miri.sh, walk_pyo3.sh |
| A4 | **Compare two** for one job, side by side (stacks on a phone) | 8 | The requested "compare two languages for one job"; defaults to Python vs Rust for project and dependencies, the reader's main path | atlas.json |
| A5 | **First project in 5 commands**, animated replay: terminal on the left typing each real command and its real output, the project folder filling up on the right with each new file highlighted; play, pause, step, scrub, speed; starts paused under reduced motion and only runs on screen | 12 | A before/after per step (empty folder to project) that teaches what each generated file is for. Honest failures kept: TypeScript's first type check fails on a fresh npm project (CommonJS default, .ts imports), then the fixes | walk/*.txt, transcripts produced by walk_*.sh on 2026-10-05 |
| A6 | Fifth walkthrough, **Rust inside Python** (maturin + PyO3, 3 commands) | 10 | The reader's stated goal; the same count_tokens, imported from Python | walk/pyo3.txt |
| A7 | **Timeline**: five lanes (Python, C++, Rust, ECMAScript, TypeScript and Node) on one time axis from 2015/2020/2023 to 2027; filled marks happened, hollow ones are scheduled; diamonds are standards and editions; a dashed line at the check date; click for the change and its source; lane lists underneath as an accessible and phone-readable fallback | 10 | The "lay the subject on one axis" pattern; shows cadence differences (yearly Python and ECMAScript, three-yearly C++, six-weekly Rust with rare editions, TypeScript's 6 then 7 jump) | meta.py TIMELINE, every item with its URL |
| A8 | **Old pages checked**: 23 claims with verdict chips (wrong, outdated, imprecise, incomplete, unconfirmed, confirmed) and sources | 9 | Corrections visible, as the method asks | corrections.md |

## Rejected

| Idea | Why not |
|---|---|
| Download counts or GitHub stars per tool | Popularity is not what the reader asked; numbers move weekly and add little to "what do I type" |
| Release-frequency chart per tool | The timeline shows cadence where it matters (languages); per-tool cadence is noise for a beginner |
| Install-size or speed bars (uv vs pip, tsc 6 vs 7) | Vendor figures (Microsoft's 8x to 12x for TypeScript 7) are quoted with attribution in the timeline; an independent measurement belongs to the Benchmark tab, not here |
| A dependency-graph drawing of each ecosystem | Pretty, but nothing to read from it that the grid and bridges do not say |
| Running the walkthroughs live in the page | The page is a sandboxed iframe with no network or processes; recorded real transcripts instead |
| ASan output in the sanitizer cell | Could not be produced on this machine (Apple clang 14 and 17 on macOS 27); shown as a measured limitation rather than borrowed from documentation |

## What the methodology lacked for this tab
- A rule for "versions as data": every version is a reference to a registry record fetched by a script, with the fetch date, so the tab can be refreshed by re-running research/fetch_versions.py and build_data.py.
- A rule for recorded terminal sessions: the transcript is the source; the page shows slices of it by command, never retyped output.
