# Method atlas (t-atlas) and Taxonomy (t-tax): sources and build

Both tabs read one data block, `window.ATLAS`, written into `parts/33_js_atlas_a.js`.

## Rebuild
```
python3 src/atlas/fetch_arxiv.py        # arXiv metadata and abstracts -> inputs/arxiv.json (network)
python3 src/atlas/fetch_other.py        # Crossref and page titles -> inputs/other_sources.json (network)
SCRATCH=<folder with the full texts> python3 src/atlas/mk_extracts.py   # quoted passages -> inputs/extracts.json
python3 src/atlas/rows.py               # rows, columns, corrections, chains, taxonomy -> data/atlas.json
python3 src/atlas/mk_atlas.py           # validate, check every quote, write the JS data block
sh src/build.sh
node src/atlas/check_atlas.mjs          # every control at 390 dark and 920 light, both tabs
```
`mk_extracts.py` needs the full texts in a scratch folder (never committed): arXiv PDFs converted with `pdftotext -layout` into `pdf/<id>.txt` (and `pdf/dqn.txt` for the Nature DQN paper), Sutton and Barto's 2020 PDF as `sb.txt` (http://incompleteideas.net/book/RLbook2020.pdf), the READMEs of Stable-Baselines3, CleanRL, verl, TRL (and `rloo_trainer.md` from TRL's docs), imitation and CORL, the Wayback capture of OpenAI's A2C post (`a2c.html`), the Wayback capture of Kool et al.'s OpenReview page (`kool.txt`) and the Nature article pages of AlphaGo and AlphaGo Zero (`nature16961.html`, `nature24270.html`). Only the short passages quoted are kept, in `inputs/extracts.json` (36 KB).

## Files
- `sources.py`: every source with a verified link and date (66; 61 cited by cells). arXiv titles, authors and v1 dates are filled from the API, DOIs were resolved through Crossref, other pages fetched (status 200) on 2026-10-03. Repo paper texts used for quotes: InstructGPT, DeepSeek-R1, Llama 3 and the SA-MRPO page README.
- `rows.py`: the 47 rows (9 cells each, 423 cells: 195 stated with a checked quote, 228 derived with a note), the 12 corrections, the two animation chains.
- `taxonomy.py`: the 18 axes of the Taxonomy tab (definition, sides, misconception, blur, quotes) and each row's place on the 14 axes that are not atlas columns; 17 placements carry a note, 3 are marked unconfirmed (MuZero's target depth, Dreamer's exploration, GSPO's reward source).
- `mk_atlas.py`: the checks (see its docstring). Quotes: 223 found word for word, 4 found as in-order words across the line breaks of two-column PDFs.
- `check_atlas.mjs`: the browser check (about 1,900 clicks).
- `viz_ideas.md`: visuals built and rejected (AT-1 to AT-16).
- `notes.md`: what was checked, the corrections, and judgement calls.
