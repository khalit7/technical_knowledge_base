Source of the interactive HTML on the Notion page "Topic: llm-training-and-post-training".

Build: `sh build.sh` writes `../index.html` from `parts/` (slot order in the comment at the top of build.sh).

Shape (agreed with Khalid 2026-10-03): stages compared on shared axes in the Reading tab; three data tabs (Open recipes compared, Price list of disclosed runs, Scaling calculator); Further reading. All 12 child pages kept; nothing folded in. Since then Tokenizers and Positional Encodings moved to Topic: llm-architecture (2026-10-18), and on 2026-10-19 the Training Infrastructure child was folded in and retired: its stack (bottom to top), its 2026 frameworks table, its operational checklist and a three-number failure summary became the "Running the job" subsection of Machinery (`20_read_c.html`, anchor `rd-run`), each row pointing to the page that owns it (Fault tolerance at scale, Power cooling reliability, Storage and data movement, Distributed Training, Topic: ml-infra-and-orchestration). The failure statistics, recovery, silent corruption and stragglers belong to Fault tolerance at scale; the checkpoint-interval maths and hardware error reporting to Power, cooling, reliability. The old page's `src/` stays in git for history.

Part ownership (parallel build): `20_read*` and `39_tab_more*` the Reading tab and Further reading; `32_*` recipes; `33_*` price list; `34_*` scaling calculator. Each tab's CSS is scoped under its tab id and its element ids are prefixed (`rc-`, `pl-`, `sc-`). Data and scripts for each tab live in `data/` and in a subfolder named after the tab (`recipes/`, `price/`, `scale/`).

2026-10-19: Sampling and Decoding moved to Topic: inference-and-serving (same Notion id; folder now `systems_and_performance/topic_inference_and_serving/sampling_and_decoding`). Its card left "Pages under this one"; the Reading's "The inference end" bullet in Machinery (`20_read_c.html`) still links it, now saying it lives under Topic: inference-and-serving, and the Neighbouring topics card for Topic: inference-and-serving names it as that topic's child. No "Moved to" card group was added: the page is about serving, not a training stage, so the neighbour card is its route from here.

## The 2026-10-23 rebuild and topic close (teaching contract)
The root had never been rebuilt to `.claude/skills/explainer-page/teaching/teaching-contract.md`; it was rebuilt at the topic close, after its children, with `rebuild-page.md`'s method (editing only, no new runs). The `models_and_training/topic_llm_architecture` root was the model.

**Reading tab**
- **Top**: the core idea in one sentence; a hero (static HTML diagram in `20_read.html`): the five learning stages with their signal, their data with one sourced example each, and their compute as a share of pretraining on a log bar (InstructGPT SFT 0.13% and RLHF 1.6% of GPT-3, R1 5.3% of V3, OLMo 2 mid-training 5 to 10%), the three cheaper stages beneath, every stage linked to its owner; "You need"; eight new terms.
- **In one screen**: the stage x axis grid kept (it is the root's comparison). Its 32 paragraphs are now static HTML in a closed block (`#rd-gsrc`); `22_js_rd_grid.js` only shows the selected one, so search and the ledger see the text. The same for Choosing a path (`#rd-chsrc`, `28_js_rd_choose.js`).
- **Retired, each replaced by one sentence and a link** (parts in `retired/parts/`):
  - Axis 1's same-prompt-through-five-checkpoints animation (`23_js_rd_ckpt.js`; illustrative outputs): Alignment's hero shows a real recipe stage by stage, and its section 8 how recipes chain the stages.
  - Axis 4's KL-leash animation (`26_js_rd_kl.js`; illustrative coefficients): Reward Hacking section 2 owns the measured over-optimisation curves (ledger `owned:`, key "β rl ln d").
  - Machinery's bytes-per-parameter calculator (`27_js_rd_mem.js`): PEFT's "Memory: full fine-tuning, LoRA and QLoRA" owns the calculator (ledger `owned:`, key "LLaMA 65B"); the 16-bytes paragraph stays as the definition.
- **Kept as the root's own**: the data-by-stage stepper (Axis 2) and "Same batch, three algorithms" (Axis 3; RL for LLMs and Alignment link to it), the "what goes wrong" table, the parallelism table (now naming the Distributed Training section of each split), and "Running the job", now its own section (anchor `rd-run` unchanged; about ten ML-infra and hardware pages link to it).
- **Into closed blocks (depth)**: the 2026 evidence of each axis (SWE-2; Magic, ToolGrad, NeoHorse-1, Neon, Thomson Reuters' selection; sandboxes, harnesses, the Postgres planner, research preference models; Dream-RSI and Agora; the MoE memory-peaks paper) with their correction boxes, the frameworks table, the run checklist, "How we got here" and five cross-stage misreadings. The four stage-specific mistakes (DPO, rising reward, LoRA, quantisation) were dropped as owned by Alignment, Reward Hacking, PEFT and Quantization and Precision.
- **Child cards** moved from Further reading into the Reading tab's last section, with each child's current title, what it covers and the reading time its header states. Continued Pretraining (CPT) keeps its card (not rebuilt; planned merge into Data mixing).
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (key `train-tab`); the RL mode switch no longer starts playback (`25_js_rd_rl.js`).

**Scaling calculator tab**: "Two answers for Chinchilla-optimal", "One budget, three allocations" (animation `34_js_scale3_anim.js`, retired) and "Why everyone over-trains" (inference slider and chart) are owned by Pretraining section 3, which carries every unit (ledger `owned:` keys 0.457, 32B and 93, Besiroglu, 4.68B, 402B, 1,868, break-even, Sardana); they are one paragraph now. The calculator (6ND, attention term, GPU-hours, MFU, rental cost, the fits' optimum and loss) and the presets-against-published table stay: they span pretraining, the Price list and Distributed Training's layout calculator. `34_js_scale2_calc.js` guards the removed elements; `scale/check_scale.mjs` checks them only if present. The old tab is kept as `retired/parts/34_tab_scale.before_2026-10-23.html`.

**Open recipes tab**: links Alignment section 8, "Three patterns.". **Further reading**: points to the Reading tab's child cards; card text updated.

## Length judgement (2026-10-23, `html_utils/audit_pages.mjs`, 230 words a minute)
| | Before | After |
|---|---|---|
| Reading, core | 7,250 words, 31.5 min | 4,994 words, 21.7 min |
| Reading, closed details | 1.5 min | 21.8 min (about 8 of it the grid's 32 paragraphs and the seven paths, duplicated as static text) |
| Open recipes compared | 15.3 + 1.1 | 15.5 + 1.1 |
| Price list | 6.4 + 1.0 | 6.4 + 1.0 |
| Scaling calculator | 10.1 + 4.2 | 6.3 + 4.0 |
| Further reading | 5.6 | 4.8 |
| Page bytes | 428,952 | 411,518 |

Why about 22 minutes is right: the core is the map (hero, one-screen grid), the four axes each with the distinction that shows only across stages and one visual where it compares stages (data by stage, three algorithms' memory), the machinery and the stack of a run that no child owns, choosing, and eight child cards. Every mechanism a child teaches is one sentence and a link. 2026 news, corrections, the lineage and the frameworks table are closed.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
399 units: core 222, depth 113, owned 23 (Pretraining 19, Reward Hacking 2, PEFT 1, Sampling and Decoding 1), fat 41. 391 drafted by `ledger.py init` from the page as built before the rebuild, labelled by script (key found in the new page's core or closed text), the residue by hand; 8 added by hand for the new hero, terms, cards and links. Fat units carry a `note` (navigation, the four axis cards that the grid headers replace, the retired illustrative animations and their controls, the old child cards with stale times).

## Checks (2026-10-23)
`sh html_utils/checkpage.sh <page>`: tabs 5, emdash 0, errbox 1, clipped 0, fail=0. `node src/check_read.mjs`: grid 32 cells, data 6 steps, RL 17 steps, 7 paths, no animation moves before the reader acts, problems 0. `node src/scale/check_scale.mjs ../index.html` (from `src/`): 2,446 checks, 0 failures. `node src/recipes/check_recipes.mjs`: 145 clicks ok. `node src/price/check_price.mjs`: 870 clicks, 0 failures.
