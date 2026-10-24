# Visual ideas: Agentic retrieval, long context and memory (prefix ar)

Question the page keeps returning to: who decides what the model reads, and what does each choice cost and buy, measured on the same 200 HotpotQA questions?

Scores 0 to 2 on the Methodology's questions (moves with a parameter, reproduces a figure, computable, shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere; animation point added).

## Built

| Idea | What it shows, what the reader does | Data | Placement | Score |
|---|---|---|---|---|
| One question, four second searches (before/after animation) | The same bridge question searched a second time with the same words, with the 1.7B agent's own query and with the sentence hop 1 states; result chips with the gold paragraphs coloured and hop 2's rank on a log ladder; 8 real questions, play/step/scrub | s_hops.py (bge-small, CPU, deterministic) | Reading, section 2 | 13 |
| Second-query bars | Of 78 questions needing a second hop, how many each query variant finds in the top 3 (oracle sentence 37, question + sentence 50, exact entity 78, agent 18 of 50, decomposition 11 of 60) | s_hops.py | Reading, section 2 | 11 |
| Predict, then reveal | "Searching again with the same question finds the missing paragraph for how many of 78?" (17) | s_hops.py | Reading, section 2 | 8 |
| Where the answer got lost, animated across strategies | Stacked bars (right, read wrong, one gold, none) growing strategy by strategy; three modes (top 10 vs agent, long context vs agent, all eight) | s_traj.py over the root's recorded runs | Reading, section 6 | 12 |
| Result formatting bars | Tokens per search result as full text, JSON, title + first sentence, titles | s_tool.py (tokenizer) | Reading, section 1 | 7 |
| Loop formula against recordings | Table: formula vs billed vs prefilled tokens by number of searches | s_tool.py | Reading, section 1 | 9 |
| Signal AUROC table | Which query-time signals predict retrieval and answer success (best-hit score below a coin for multi-hop) | s_outcomes.py, s_router.py | Reading, section 4 | 10 |
| Router policy table | Rules, learned router, CRAG-style, random, oracle with bootstrap intervals | s_router.py | Reading, section 5 | 10 |
| Trajectory comparer (own tab) | 40 questions, five strategies side by side, step chips with gold marked, thoughts, answers, bins, and one clock in recorded seconds across all lanes (play, scrub), counters for calls, billed and computed tokens | root runs via s_traj.py | Tab | 12 |
| Router lab (own tab) | Pick cheap and expensive paths, a signal and the escalated share; F1, EM, tokens, seconds with bootstrap CI; cost-accuracy plot with the policy's curve, the random-split line, all always-X points and the oracle | outcomes.json, router.json | Tab | 12 |
| Long-context calculator (own tab) | Tokens, dollars per query and per day at dated list prices with cache writes, seconds to first token from the fitted prefill model, KV GiB from configs, window and extrapolation flags; a to-scale race of time to first token (RAG vs uncached vs cached); predicted-vs-recorded validation scatter; accuracy against tokens read | longctx.json, prices from the production child | Tab | 12 |
| Root position result | The root's 20-paragraph lost-in-the-middle run for 1.7B and 4B, with its paired intervals stated | root position run via s_post.py | Reading, section 8 | 8 |
| Lost in the middle by length | 5 / 10 / 40 / 80 paragraphs x 5 positions, 50 questions, the dip deepening with length | s_pending.py lim (generator, bench lock) | Reading, section 8 (table in the filled pending box) | 10 |
| Out-of-range prefill check | Orange points on the validation scatter: 49 calls at 9k to 15k tokens against the model fitted below 8k | s_longctx.py | Long-context tab | 8 |
| Dashed pending boxes | Every number awaiting a generator run, with the command and time estimate; filled automatically from data/pending.json when the runs exist (all 1.7B runs were made on 2026-10-15) | s_post.py | inline | n/a |

## Added 2026-10-24 (teaching-contract rebuild)

| Idea | Kind | Placement |
|---|---|---|
| Hero: F1 against billed tokens, twelve strategies, coloured by who decides | static annotated chart | top of Reading |
| Loop staircase: each call's prompt to scale, re-read against new, slider on n, recorded billed and prefilled beside it | one slider, one variable | section 1 |
| Search budget 1 to 6 against tokens, with 1 and 5 results per search | static chart | section 1 |
| Nine methods at Qwen3-1.7B and 4B (dumbbell) | static chart | section 3 |
| Evaluator signals as AUROC dots against a coin line | static chart | section 4 |
| Router lab | moved from its tab | section 5 |
| Deep-research shape from open_deep_research's source (lead, parallel researchers with own windows, compression) | static diagram | section 7 |
| Lost in the middle by window length (lines) | static chart | section 8 (the table moved into the caption) |
| Prefill validation scatter | moved from the calculator tab | section 8 |
| Memory curation: both hops kept against tokens, question only against question plus last thought | static chart | section 9 |
| Liu et al.'s published U next to ours | rejected: accuracy % and F1 on one axis would mix figure kinds; quoted in the caption instead | |

## Rejected

| Idea | Why not |
|---|---|
| Re-building the root's single-trajectory replay and tokens-per-step chart | The root's Agentic lab owns them; the comparer here is a different view (all strategies, one clock, bins) |
| Live agent in the page | No network, no model in the sandboxed iframe; recorded runs are exact |
| Entity graph drawings | The GraphRAG child owns graphs |
| An animated deep-research architecture diagram | Nothing was run; a table read from source with file and line teaches more than motion over boxes |
| A 4B column everywhere | Only where the root or this page ran the 4B (strategies, position, optional block); the 4B answered with a different prompt in the root's runs, so mixing is labelled |

## What the methodology lacked for this page

A rule for pages whose evidence arrives after the page is built: numbers as keyed facts, pending numbers as a data file whose nulls render as dashed boxes and are listed by the check script, so filling them is rerunning a script, never editing prose.
