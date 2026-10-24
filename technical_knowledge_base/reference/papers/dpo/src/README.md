# Direct Preference Optimization (DPO): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d818bb1d8cafd30e20f9e, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the reference folder's shared pieces (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `90_js_tabs`, `mk_paper.py` as in LoRA, `mk_coverage.py`, `check_page.mjs`).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; the core sentence and the hero (the paper's Figure 1 with the bridge equation), You need and new terms; Problem (Eqs. 1 to 3); Idea (Eqs. 4 to 7, RLHF against DPO pipeline animation on the toy); The loss (gradient, DPO against Unlikelihood animation on four real training pairs, likelihood-displacement predict question); Theory (Section 5 lemmas and theorem, measured on the toy; implicit reward against true reward); Experiments; Results (Figure 2 left rebuilt, toy-against-paper predict question, standard-error predict question); How much to believe; What it takes; Why it matters; Connections. |
| Train DPO and RLHF | `t-run` | Live ingredient: a 4-word toy language (20,736 sequences, 444-logit autoregressive policy) preference-tuned in the browser with DPO, IPO, cDPO, Unlikelihood, Preferred-FT, PPO on a learned reward and PPO-GT, against the exact Eq. 4 frontier; Figure 2 at toy scale (19 runs, rerunnable, reproduces `toy_sweep.mjs` exactly); 4,000-step runs; Theorem 1 measured. |
| The paper's figures, rebuilt | `t-tables` | Figures 2, 3, 4 from their SVG vector data; Tables 1 and 2 with standard errors; checks on the paper's text. |
| Then and now | `t-then` | Animation: the push on a pair against its margin for Unlikelihood, DPO, SLiC hinge, IPO, cDPO, SimPO, each with its 4,000-step toy result; dated timeline of what followed; survived/changed table. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Live ingredient: the loss run live on a tiny problem with a known answer** (the training-recipe row), not a trace replay. DPO is a training objective, and its claim ("optimises the RLHF objective exactly, better than PPO") can only be tested where the RLHF optimum is computable. The toy enumerates all 20,736 sequences, so reward, KL and the Eq. 4 optimum are exact. Trained live in the browser (as Switch Transformers): no shipped weights; JS losses and gradients checked against PyTorch autograd.
- **The toy disagrees with the paper's Figure 2**, and the page says so beside the paper's figure: in the toy PPO-GT sits on the exact frontier, DPO at β = 1 and 5 is about as close, and DPO at the paper's β = 0.05 and 0.1 falls well short. The task was not retuned (ViT lesson); the "can and cannot test" box says what the toy cannot reproduce (PPO's difficulty at scale).
- **Figures rebuilt from vector paths** (ReAct lesson): DPO prints almost no numbers. Decoding showed the TL;DR points are counts out of 256 and the bars are ±1 binomial SE, which drives "How much to believe".
- **Tables tab renamed "figures"**: the evidence is in figures; Tables 1 and 2 sit in the same tab.
- **Reading length** 19 min against the old page's 9: the page owns the derivation, the theory and the evidence judgement; trimmed twice.

## Files

- `save_live.py` (Notion fetch from the session transcript into `live.md`), `extract_paper.py` (arXiv HTML v1, v2, v3 to `inputs/paper_v*.txt`, tables to `inputs/table_*.txt`), `decode_figs.py` (`inputs/figs/*.svg` to `inputs/figs.json`: ticks matched to labels, markers, polylines, error bars; legend bars dropped).
- `parts/22_js_dpo.js`: the toy engine (policy, reference, reward, data, every loss, reward model, PPO, exact evaluation, `makeRunner`); runs in the browser and node.
- `toy_sweep.mjs` (node, about 16 s): every toy number the page quotes, to `inputs/toy.json`. `check_engine.mjs` then `uv run --with torch python check_engine.py`: PyTorch check, `model/check_engine.json` (PASS, worst 1.9e-13).
- `recompute.py`: derived numbers about the paper's evidence (n = 256 grid, bar/SE ratio, z-scores, frontier dominance, Table 1 and 2 SEs) to `inputs/recompute.json`. `mk_toydata.py`: `parts/_gen_toy.js`. `mk_paper.py`: card, Further reading, data.
- `inputs/`: paper text, figure SVGs, `repo_README.md`, `repo_preference_loss.txt` (Apache 2.0 code), `later_extracts.txt` (abstracts and quoted lines of every later work cited), `toy.json`, `figs.json`, `recompute.json`.
- `check_page.mjs`: every control in both themes and widths, each trainer method to 150 steps, the sweep rerun (exact match), the three animations stepped; since 2026-10-25 it also fails if an animation moves before a click and opens every closed block. `mk_coverage.py`: `coverage.json`.

## Checks (3 October 2026)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 237 KB. `check_page.mjs`: about 400 actions, 0 problems; sweep rerun in the browser in 3.5 s, largest difference 5e-5 (rounding of stored values). `check_engine.py`: PASS. `mk_coverage.py`: 51 of 51.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence (the change of variables and what it deletes); the hero is the paper's own Figure 1 (CC BY 4.0, `img/`, `img/CREDITS.md`), split into its two panels so the labels stay legible at 390 px, with the bridge equation under it (Eq. 5 put into Bradley-Terry, the Z terms cancel). Then "You need" (the RLHF pipeline on the alignment page, cross-entropy on Loss functions) and the new terms (π_ref, β, implicit reward, frontier, Preferred-FT, Unlikelihood, PPO-GT).
- **Visuals inline**: the likelihood-displacement chart and the toy-sweep chart left their predict reveals; each sits in its own titled card right after its question, and the reveal keeps the short answer.
- **No autoplay**: `makeAnim` in `11_js_ui.js` replaced by the patched copy (as on ReAct, CLIP and Constitutional AI), so the pipeline, pair and Then-and-now animations wait on their first step; `90_js_tabs.js` replaced by the template `99_js_tabs.js` (storage key `dpo-tab`). The page has no `21_js_rd_common.js`; its own controller is `makeAnim`.
- **Owned elsewhere, linked with this paper's sentence kept**: the RLHF pipeline in general, the DPO-against-PPO evidence (Xu, Tang, Tajwar), the successor losses compared on one pair, and why likelihood displacement happens (all Alignment: SFT, RLHF, DPO family, RLVR); standard errors in general (Eval statistics); judge biases (LLM-as-judge).
- **Closed**: Plackett-Luce rankings (A.3); Definition 1, Lemmas 1 and 2 and Theorem 1 in full (the core keeps the theorem in one sentence); the three tasks' models and labellers; every baseline; hardware and the settings that worked.
- **Volatile**: the adoption list (Zephyr, Mixtral, Llama 3, Qwen2, Tülu 3, OLMo 2) and the "rough consensus as of 2026" moved into one dated closed block ("sources read 3 October 2026"); Why it matters keeps the durable claims in a paragraph each.
- Header: "Reading: 20 min, plus 3 in closed details.", read by `build.sh` from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 20.0 min (4,609 words) | 20.2 min (4,644) |
| The paper, closed | 0 | 3.3 min (767) |
| Train DPO and RLHF | 4.2 min core + 2.1 closed | unchanged |
| The paper's figures, rebuilt | 5.5 min | unchanged |
| Then and now | 3.4 min | unchanged |

Why about 20 minutes is right: the added top (core sentence, hero caption, terms and owner links, about 2 minutes) was paid for by closing the lemma statements, task and baseline detail, hardware and settings, and the dated adoption list. What stays open is the paper's argument in order: the RLHF objective, the three-line change of variables, the loss and its weighted gradient with the pair animation, Theorem 1 measured on the toy, every result with its number, and the evidence section this page owns. Cutting further would drop results, not repetition.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
255 units: core 209, depth 34, owned 6, volatile 5, fat 1. 244 drafted by `ledger.py init` from the page before the pass; 11 added (core sentence, hero, terms, the two moved charts, six owner links). Fat: the old animation-manners line. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 5, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 410 actions, 0 problems (including no movement before a click and every closed block opened); sweep rerun matches to 5e-5. `mk_coverage.py`: 51 of 51 (the reading-time item's keys and one quoted key updated). `check_engine.py` not rerun: the engine (`22_js_dpo.js`) is unchanged.
