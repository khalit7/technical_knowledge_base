# xAI / SpaceXAI: Grok, interactive page (v4, rebuilt 2026-10-24 to the teaching contract)

Child page of Topic: llm-landscape (storage key `xai-tab`). Rebuilt by editing only: no new runs; every number keeps its source.

## Build and checks (current)
- `sh build.sh` writes `../index.html`: HTML parts `00_top`, `01_css`, `01b_css` (2026-10-24 classes: `.core`, `.terms`, `.hero`, `details.dp`, the recipe matrix `.rx`), `02_header`, `03_read_a` (core idea, hero, you need, terms; lineage chart with the release notes closed below it; owner and name; Colossus), `04_read_b` (Grok-1 calculator then formula; training recipe matrix; Heavy animation), `05_read_c` (reading the numbers: index versions, Terminal-Bench reporters, tokens per task; the dated lineup table and price-cliff calculator, with closed blocks for retirements, the launch table and voice; posture and the injection animation; closed mistakes), `07_more`; then the error box and one script per JS part: `10_js_common`, `11_js_read`, `12_js_hv`, `13_js_ij`, `14_js_line` (now drawn in Reading), `16_js_hero`, `99_js_tabs` (the skill template).
- The header reading time is written by hand in `02_header.html`: after editing text, run `node html_utils/audit_pages.mjs <out.jsonl> <page>` (230 words a minute, core and closed details apart) and update it.
- `node <page>/src/check_controls.mjs <page>/index.html` (from the repo root): every button, select, chip, details block, slider and three lineage dots in 390 px dark and 920 px light, and once under reduced motion; both animations stepped to their last step in every mode; checks neither moves before a click or after a mode switch, and that the price cliff's default lands on $0.428.
- `python3 recompute.py`: every reproduced default (Grok-1 and Grok 2 counts, KV per token, Terminal-Bench gaps, index gaps, blends, Colossus rates, the cliff, the disclosure window). `python3 html_utils/ledger.py check <page>`: the knowledge ledger.
- `inputs/`: saved sources (S-1 text, xAI docs, Internet Archive copies of xAI posts, Artificial Analysis, Adversa, The Hacker News, news articles) and `aa_v43_snapshot.js`, the Artificial Analysis v4.3 rows the removed Price and position tab drew (kept for provenance; the four rows the index panels use are inlined in `11_js_read.js`).

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (industrial edge: capital to compute fast, compute spent on RL at pretraining scale and parallel test-time attempts, shipped monthly and cheap; read the numbers by who ran them); a new static hero (five stages, each box linking to its section, with the X data band and the posture cost band); "You need" linking Mixture of experts, Attention variants, RL for LLMs and the root's test-time compute tab; five new terms.
- **Lineage**: the Lineage tab moved into Reading because the order explains the strategy (one flagship a year while Colossus was built, then five in eight months); its 41 cards sit in a closed block that a dot click opens. Owner and name became a four-date list (was four boxes plus a verdict); the rest of the corporate record is closed.
- **Colossus**: the S-1 figures moved into the chart caption; the correction is a visible correction box.
- **Grok-1**: concrete numbers first, then the calculator, then the formula (was formula first); the MoE definition is a link to its owner; the reproduction checks are a closed block with a one-line summary in the core.
- **Training**: a new recipe matrix (base model, RL stage, data, compute for every release with a described change), replacing the "Grok 1.5 to 4.5" chronicle; the in-between releases are a closed block.
- **Heavy**: unchanged animation, now with a prediction prompt and answer; condensed prose.
- **Reading the numbers** (new section, from the old Grok 3, Grok 4, Grok 4.6 and Grok 4.7 sections): three habits, each with its visual: index version (the two-ruler panels), harness (Terminal-Bench reporters), tokens (new Grok 4.6 against 4.7 bars: same price, 2.25 times the tokens, twice the cost per task). Artificial Analysis's full run is closed.
- **Lineup**: one dated table (volatile), the price-cliff calculator with a prediction prompt; retirements, the full launch table and Grok Voice 3.0 are closed blocks.
- **Posture and security**: condensed; the injection animation stays inline. The lessons now link Agent security (egress control lives there) instead of Building a harness, which does not carry them. Mistakes are one closed block.
- **Tabs**: Reading, Further reading. The Price and position scatter was removed: cross-provider comparison is the landscape root's (Capability vs price tab). `90_js_tabs.js` replaced by the template `99_js_tabs.js`. Both animations had autoplayed on scroll and after every mode switch; they now start paused and wait for play or a step.
- **Images**: none. Wikimedia Commons has no openly licensed photograph of the Colossus sites (checked 2026-10-24; the only Colossus file is an editorial cartoon), and the page's mechanisms are better as diagrams.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core | 25.7 min (5,920 words) | 22.1 min (5,073 words) |
| Reading, closed details | 1.1 min | 10.2 min |
| Other tabs | 8.3 min (Lineage 5.1, Price and position 1.4, Further reading 1.8) | 2.0 min (Further reading) |
| Visuals inline in Reading | 3 counted (about 9 in all) | 5 counted SVGs (11 in all): hero, lineage, Colossus bars, Grok-1 calculator, recipe matrix, Heavy animation, index panels, Terminal-Bench bars, tokens bars, price cliff, injection animation |

Why about 22 minutes is right: the core is the lab's own design choices with the evidence for each (compute build rates, the one published architecture with its checks, the training recipe as described, parallel test-time compute, how to read its numbers, its posture and the injection) plus one dated table and a calculator. Per-release detail, corporate record, the full launch table, voice, retirements and mistakes are closed; cross-provider comparison and mechanisms are links.

## Knowledge ledger
229 units: core 145, depth 41, volatile 14, owned 6, fat 23 (`ledger.py check`: problems 0). 222 drafted by `ledger.py init` from the old page, 7 added by hand for script-drawn content (lineage cards, hero, recipe matrix, tokens bars, the removed scatter, Colossus bars, Terminal-Bench bars). Owned: the MoE definition by Mixture of experts; the all-model price and index scatter by the landscape root.

## Sources and supporting files
- `viz_ideas.md`: scored candidates, rejections, and the 2026-10-24 changes.

2026-10-26 (final follow-up sweep): two links called Test-time compute and reasoning a tab of the landscape root; it is a child page now.
