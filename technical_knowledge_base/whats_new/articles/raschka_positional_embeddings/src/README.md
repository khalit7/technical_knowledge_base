# How this page is built

An article page (`.claude/skills/explainer-page/page-kinds/article.md`), built 2026-11-27 from the reference folder `../weight_space_programming/src/`. It is the short kind: the article explains a concept the knowledge base already owns (Positional Encodings, 3c65c17b0d0d81a5b7c9e578fcdfac00; the RoFormer paper page), so the page follows the argument briefly, links the mechanism to its owner, judges the article and lists what the owner should gain.

## Build and check
```sh
bash src/build.sh                                   # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
node src/check_page.mjs <page>/index.html           # from the repo root: every tab, 390 dark, 920 and 1400 light, hero labels inside the card, recomputed numbers in the prose
python3 html_utils/ledger.py init <page> && python3 src/label_ledger.py && python3 html_utils/ledger.py check <page>
```
Re-extract the article (its text never enters the repo): `curl -sL -A '<browser user agent>' <url> -o <scratch>/post.html`, then `python3 -I extract_article.py <scratch>/post.html <date>` from `src/`. Substack's body is `<div class="body markup">` up to `<div class="post-footer">`; its section headings carry ids (`inputs/anchors.txt`, used by the `ah:` margin labels).

## Files changed from the reference
- `extract_article.py`: `URL`, `START`/`END` for Substack.
- `mk_article.py`: `DATA_EXTRA = {}`; two optional `article.json` fields, `companion` (the author's appendix page: a card link and a Further reading entry) and `more_note` (the sentence under the article in Further reading, which was hard-coded for the reference article).
- `check_page.mjs`: the generic loop kept; the toy and data checks replaced by a check that every hero label sits inside its card and that the recomputed numbers (rotated pairs, 19.92, 128 MiB, 36 MiB, 0.30%, 22.4%) appear in the prose.
- `parts/22_js_rp_fig.js`: the one figure (the hero). `parts/20_read_a/b/c.html`: the Reading tab. Title in `01_head.html`, storage key `rp-tab`.
- `real_edit.py` and its input were not copied (the reference article's own measurement).

## Departures from page-kinds/article.md
- **Short, by design**: the argument is five sections that each say what the article adds over the owner, not a re-teaching in the article's order.
- **One visual only**, the hero (a map of where position enters one layer, five choices). No figure of the mechanism: the owner page draws it (its Figs. 3 and 4); the census shares exist only in the author's images and were not read off them.
- **No live ingredient**: nothing here teaches more than the owner's stages and measured runs.
- **Responses are reader comments** (no rebuttal, replication or discussion thread exists); commenters are not named. The author's appendix is listed as an addendum response because it carries the one factual error found.
- **No "Since the article" block**: nothing has followed it yet.
- **"The article's numbers, recomputed"** as a closed block: for an explainer, checking its worked numbers is the evidence test.

## Length judgement
Reading 15 minutes core plus 1 in closed details (measured 2026-11-27, `audit_pages.mjs`: 3,438 and 324 words), against the article's own 40 (9,200 words with code, appendix not counted). Right for a short article page: each section is the article's step plus what it adds to or where it differs from the owner, and the judgement section is the page's main value. Ledger: 160 units, core 112, depth 46, fat 2, problems 0.

## Sources read (27 November 2026)
The post (fetched that day); the appendix page; all 16 comments (Substack comments endpoint); MiniMax-M3 config.json; arXiv abstracts of 2603.11611 (Fractional Rotation) and 2509.10534 (PoPE); Thinking Machines' Inkling announcement; arXiv 2210.15424 Table 2 and 2108.12409's WikiText-103 extrapolation tables (to check the appendix); the Wayback index (first copy 15 November 12:15 UTC, a script shell with no text). No Hacker News or Lobsters thread found by web search.
Unconfirmed, marked on the page: Inkling's bias depending on the query hidden state (the article's description; the maker's post does not say).
