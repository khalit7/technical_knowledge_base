# How this page is built

An article page (`.claude/skills/explainer-page/page-kinds/article.md`), built 2026-11-27 from the reference folder `../../weight_space_programming/src/` (copied unchanged: `build.sh`, `label_ledger.py`, the template parts, `03_css.html`; `mk_article.py` with `DATA_EXTRA = {}`; `extract_article.py` with this site's `URL` and `START`/`END`).

## Build and check
```sh
bash src/build.sh                                   # writes ../index.html; stops on a missing text fragment or section id, an em-dash or an unexpanded macro
node <page>/src/check_page.mjs <page>/index.html    # from the repo root: every control, 390 dark, 920 and 1400 light, the figures' numbers against the essay's
python3 src/label_ledger.py                         # after `python3 html_utils/ledger.py init <page>`; then `ledger.py check <page>`
```
`inputs/article.txt` (the essay's text, gitignored) is re-made with
`curl -sL -A 'Mozilla/5.0' https://already-clean.goodfire.com/ -o <scratch>/post.html` then `python3 -I extract_article.py <scratch>/post.html <date>`.
Without it, `fragments.json` resolves every fragment and the page rebuilds identically.

## Files written for this article
| File | What |
|---|---|
| `article.json` | Card, headline numbers, verdict, discussion, six responses, the companion paper (Since), resources, KB links, topics. |
| `parts/20_read_a.html` | Page CSS for the two colours of the argument, the card, core idea, hero, nav, The claim. |
| `parts/20_read_b.html` | Cats and cars (Fig. 2), InceptionV1's last layer (Fig. 3), the two explanations and the five causes. |
| `parts/20_read_c.html` | Squeezed vision models, weak activations, language models (Fig. 4), explanations that can lose (Fig. 5), zooming out, the appendix in a closed block. |
| `parts/20_read_d.html` | How much to believe (Fig. 6), responses, where it moves the KB, Since, Provenance. |
| `parts/23_js_nc_figs.js` | The six figures (prefix `nc`). |
| `check_page.mjs` | The reference's control loop; this page's checks: every figure drawn, each figure's printed numbers present in its caption, the hero's members logic. |

## Departures from page-kinds/article.md
- **Section ids instead of text fragments for margin labels.** The essay's sections carry real ids (`inputs/anchors.txt`), so every "in the article" label is an `ah:` link; inline claims still use `ar:` text fragments.
- **No code or logs link on the card.** Nothing is released beside the essay (its interactive figures read public JSON, not documented as a release). The companion paper sits in the dated Since block, since it came out 26 days later and is the authors' own follow-up.
- **The evidence section leans on the companion paper and on the replies' own measurements**, because the essay's language-model numbers are preliminary and unsourced; Fig. 6 puts every published "how clean" number on one axis, labelled by model, judge and definition.
- **No live ingredient beyond Fig. 1's neuron-count control.** The essay argues from case studies of real models whose data is only in images; a toy would not test its claim, and a local measurement was not run (machine at HIGH load; see `viz_ideas.md`, .7).
- **Read time on the card is measured (67 min)**, from the essay's plain-text version, prose before the appendix at 230 words a minute; the essay states 65. The extract (33,000 words) includes text inside interactive figures and is not a fair count.

## Length judgement
Reading 30 minutes core plus 4 in closed details (measured 2026-11-27, `audit_pages.mjs`), against the essay's 67 minutes of prose plus 39 of appendix (measured from its plain-text version; it states 65). The page keeps every argument step in the essay's order with its numbers, the appendix's load-bearing experiments in one closed block, and adds what the essay lacks: an evidence section built on the companion paper and the replies, six responses, and six figures. Shorter would drop either the language-model evidence (where the essay's claims are weakest, so the reader needs it to judge them) or the replies. Ledger: 258 units, core 193, depth 60, volatile 3, fat 2, problems 0.

## Sources read (27 November 2026)
The essay (HTML and its plain-text `essay.md`), its first archived plain-text copy (Wayback, 15 October 2026 22:05 UTC); the companion paper "Neurons as an Interpretable Basis" (plain-text version, 2026-11-10); LessWrong through GreaterWrong: the linkpost and its comments (Neel Nanda's comment 7wcSqBNzQF2o9SHyY), leogao's post and comments (Julian Bradshaw's analysis), Nalagatla and Guerrero Alvarez, Jasper Blank (and leogao's reply), neverix, testingthewaters, shoubidouwah ("Suddenly, Unclean", read, not listed: a short speculative note); the Hacker News item and its top comments through the API.
Unconfirmed, left out: secondary write-ups' paraphrases of Nanda beyond his comment; Liv Gorton's objection beyond the essay's footnote; the companion paper's suspicion that Qwen3-32B copies layers of Qwen3-14B (stated by the authors as a suspicion).
