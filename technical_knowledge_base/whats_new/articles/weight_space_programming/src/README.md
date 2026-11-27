# How this page is built (the reference article folder)

The article method is `.claude/skills/explainer-page/page-kinds/article.md`. This is the first article page (built 2026-11-27); later article pages copy this `src/` and change what the list below says.

## Build and check
```sh
bash src/build.sh                                   # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
node src/check_page.mjs <page>/index.html           # from the repo root: every control, 390 dark, 920 and 1400 light, the toy against its formula, embedded data against inputs/
python3 src/label_ledger.py                         # after `python3 html_utils/ledger.py init <page>`; then `ledger.py check <page>`
```

## Files, and what the next article builder changes
| File | What it is | Change for a new article |
|---|---|---|
| `extract_article.py` | Fetched HTML (in scratch, never the repo) to `inputs/article.txt` (main text, emails removed, long dashes to `--`, every block on its own line) and `inputs/anchors.txt` (element ids). | `URL`, `START`/`END` (the tags around the main text on that site), `DROP`. |
| `inputs/article.txt` | The text every `ar:` fragment is checked against; its first line records the URL and fetch date. | Re-extract. |
| `article.json` | All the page's data: card, headline numbers (`at` is a fragment), verdict, responses, follow-ups (`since`), resources, KB links, topics. `whats_new.py` reads title, url, author, site, published, takeaway and topics. | Everything. |
| `mk_article.py` | Generates `_gen_card.html` (@@CARD@@), `_gen_resp.html` (@@RESP@@), `_gen_since.html` (@@SINCE@@), `_gen_more.html` (Further reading) and `_gen_data.js` (window.ARTICLE), and expands the macros `ar:`, `ah:`, `n:`, `#t-`, `[[ar:...|label]]`. | `DATA_EXTRA` only (this page ships `inputs/real_edit.json`; set `{}`). |
| `build.sh` | Runs `mk_article.py`, assembles head, split CSS, `03_css.html`, header, `20_read_*.html`, other tabs, Further reading, then one `<script>` per JS part with the tab wiring last; fills reading time from `reading.json`. | Nothing. |
| `parts/01_head.html`, `02_split.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` | Template copies (`build/templates/`); title set in the head, storage key `wp-tab`. | The `<title>` and the storage key. |
| `parts/03_css.html` | The card, margin label ("in the article:"), figure and response-list styles. | Nothing, unless the page adds classes. |
| `parts/10_header.html` | Crumb (Articles link, reading time) and tab bar. | Tabs, if the page has more than Reading and Further reading. |
| `parts/20_read_a/c/d/z.html` | The Reading tab, in the article's order. | All of it. |
| `parts/23_js_wp_figs.js`, `24_js_wp_toy.js` | This page's figures and live toy. | Replace with your own (keep the `RD.onRender` / `RD.onResize` pattern). |
| `real_edit.py`, `inputs/real_edit.json` | Measures the released Qwen edit (diff plus base tensors by HTTP range). | Delete unless your article releases weights. |
| `check_page.mjs` | Generic control loop plus this page's data checks. | Keep the loop; replace the toy and prose-number checks. |
| `label_ledger.py` | Labels the ledger by where each unit sits (closed blocks depth, the Since block volatile, Further reading depth). | Nothing. |
| `reading.json` | Minutes measured with `html_utils/audit_pages.mjs` after a build, written by hand. | Re-measure. |

## Text fragments (`ar:`)
Four to eight consecutive words copied from `inputs/article.txt`, unique there, inside one block (a fragment across two paragraphs or table cells does not match in a browser, and the extract puts each block on its own line so the build refuses it). Curly and straight quotes match each other in the check; the URL carries the article's own characters, `-` encoded as `%2D`. Distill-style posts have ids only on figures (`ah:figure-1`).

## Departures from page-kinds/article.md
- **"How much of this to believe" leans on the released logs, not only on the post.** The post's logs are complete, so the page reads the Experiment 8 prompt, final report, results table and edit diff: that is where the prompt hint, the unreported runs and the strength 6 come from. Article pages whose evidence is released should do the same.
- **A measured figure from released weights** (the sorted write strengths of 3,584 neurons with the 64 edited marked), not in the post: it shows that the edit's neurons were chosen by activations, which the post does not say.
- **One live ingredient, kept inside Reading** (no tab): a toy of the edit formula. Reason: the open question about the headline result is whether the edit is "reading weights" or steering; the toy shows, by moving one variable, that the edit's effect is proportional to the chosen neurons' activations (steering), that α = 1 removes and α = 6 reverses, and what a full projection would cost. Reading cannot show that as quickly. It opens at α = 0 so the figure beside the prediction prompt does not give the answer away.
- **Responses and follow-ups are generated from `article.json`** (`@@RESP@@`, `@@SINCE@@`) as well as the card and Further reading, so the issue's mention, the card and the page cannot disagree.

## Length judgement
Reading 23 minutes core plus 3 in closed details (measured 2026-11-27, `audit_pages.mjs`), against the article's own 26. That is long for a page about one post, and right here: the page carries eight experiments in the post's order, an evidence section built from the logs, seven responses, and two figures the post does not have. The authors' list of future uses went into a closed block. Ledger: 223 units, core 163, depth 54, volatile 4, fat 2, problems 0.

## Sources read (27 November 2026)
The post (and its first Wayback copy, 2 November 18:22 UTC); the logs repository README, `exp8_math/README.md`, `eval/RESULTS_excerpt.md`, `runs/p50c/turns/t001/prompt.txt`, `runs/p50c/work_notes/final_report.md`, `runs/p50c/edit/`; Qwen/Qwen3.5-0.8B config and two down-projection tensors at revision 2fc0636; Honnibal's post (full text); Willison's post; the Hacker News thread (first part) and its item API (2,971 points, 902 comments, submitted 2 November 18:21 UTC); both LessWrong posts; arXiv abstracts of 2611.08070, 2611.21449, 2611.18553, 2611.21885, 2611.27425 (export API).
Unconfirmed, left out: a Hugging Face MATH-500 number for the rebuilt model quoted only in press coverage; the citation behind "pipis2025loop" (no URL found).
