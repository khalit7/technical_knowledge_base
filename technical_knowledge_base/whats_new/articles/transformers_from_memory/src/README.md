# How this page is built

An article page (`.claude/skills/explainer-page/page-kinds/article.md`), built 2026-11-27 from the reference folder `../weight_space_programming/src/`, with `mk_article.py` from `../raschka_positional_embeddings/src/` (optional fields `companion` and `more_note`).

## Build and check
```sh
nice -n 15 python3 src/recompute.py                 # from src/: about a minute; writes inputs/recompute.json and parts/22_js_am_data.js
bash src/build.sh                                   # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
node src/check_page.mjs <page>/index.html           # from the repo root: every tab at 390 dark, 920 and 1400 light; the live figure's 273 values against recompute.json; prose numbers
python3 html_utils/ledger.py init <page> && (cd src && python3 label_ledger.py) && python3 html_utils/ledger.py check <page>
```
Re-extract the article (its text never enters the repo): `curl -sL -A '<browser user agent>' <url> -o <scratch>/post.html`, then `python3 -I extract_article.py <scratch>/post.html <date>` from `src/`. The site is Hugo with unquoted attributes: the body is `<div class=c-article__content>` up to `<details class=c-citation>`; section headings carry ids (`inputs/anchors.txt`, used by `ah:` labels).

## Files changed from the reference
- `extract_article.py`: `URL`, `START`/`END`; two generic fixes worth keeping for the next builder: self-closing `<svg .../>` placeholders are dropped before the script/svg remover (otherwise it ate half the post up to a later `</svg>`), and a bare `<` inside TeX (`k^T x < 0`) is escaped before tags are stripped; ids are read quoted or unquoted.
- `recompute.py` (new): the article's experiment from scratch (mulberry32 plus Box-Muller random numbers, identical in the JS), Gaussian capacity estimates, truncated exponentials, a query at similarity 0.9, numbers stored at capacity; writes `inputs/recompute.json` and the d = 64 data part.
- `parts/23_js_am_hero.js` (the hero, static), `parts/24_js_am_lab.js` (the live figure), `parts/22_js_am_data.js` (generated). Title in `01_head.html`, storage key `am-tab`, two CSS rules added to `03_css.html`.
- `check_page.mjs`: the generic loop kept; the page checks replaced by the live-figure comparison (all three d, every store, worst relative difference 0) and the prose numbers from `recompute.json`; console errors from the AI buddy's `kb_index.json` fetch on `file://` are ignored.

## Departures from page-kinds/article.md
- **A live ingredient inside Reading (section 10)**: the article's capacity curves recomputed in the browser, with one variable, the key size d. Reason: the owner pages draw the outer-product state (Beyond attention, Figs. 2 and 3) but no page has the ratio against M for every store, and switching d shows what reading cannot: softmax's capacity falls a hundredfold from d = 64 to 32 and drops below the cubed ReLU's at d = 16. It opens on the d = 64 curves recorded by `recompute.py` (same code and random numbers) so the page does no work until asked; computing on load delayed the page check past the AI buddy's index fetch. The author's own interactive figure (one recall's weights) is linked, not rebuilt.
- **Two closed blocks inside the argument** (the Transformer v2/v3 appendix, verified against the arXiv versions; why the shared-gate SwiGLU matches the squared ReLU), to keep the core shorter than the article.
- **Responses are Hacker News comments**: no rebuttal, replication or blog response exists; commenters are not named.
- **No "Since the article" block**: nothing has followed it.
- **The author's data is cited, not copied**: the code repository has no licence file, so `crosstalk.json` stays out of the repo; its crossings are quoted (closed block "recomputed").

## Length judgement
Reading 15 minutes core plus 3 in closed details (measured 2026-11-27, `audit_pages.mjs`), against the article's own 19 (4,276 words; formulas make it slower than the count). That is not much shorter, and right here: the article is dense derivation, the page carries its argument in nine short sections plus a live figure the article does not have, and the judgement (what capacity measures, noisy queries, numbers per memory) is the page's main addition. Ledger: 143 units, core 89, depth 52, fat 2, problems 0.

## Sources read (27 November 2026)
The post (fetched that day) and its footnotes and three collapsed asides; the two earliest Wayback copies (16 October 2026, 18:16 and 19:06 UTC; same text); the code repository at commit 5defb8d (README, crosstalk.py, data/crosstalk.json); all 152 Hacker News comments (item API; 670 points); arXiv 1706.03762 v1 to v5 and its submission history; the Qwen2.5-1M report (arXiv 2501.15383, section 5.1); the arXiv titles of the Further reading papers; the author's home page (affiliation, the Perplexity talk).
Not checked, quoted from the article: Li et al.'s 1% activation figure, Morris et al.'s 3.6 and Allen-Zhu and Li's 2 bits per parameter.
