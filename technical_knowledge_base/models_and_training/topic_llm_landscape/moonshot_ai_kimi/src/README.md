# Moonshot AI: Kimi, HTML-only page (v3)

Replaces all the text of https://app.notion.com/p/3c65c17b0d0d81f5abf5dbdbac821a12 with one self-contained interactive page.

- `live.md`, `live_before_delete.md`: the page as fetched on 1 Oct 2026 (no child pages, databases or video; one existing embed).
- `parts/`: source. `build.sh` assembles `visual.html` (each script in its own `<script>`, error box, link aliases `{{text|@alias}}` / `{{text|n:<notion id>}}`, reading time and resource total).
- `recompute.py`: every default recomputed from `src/` (configs, HF safetensors counts, papers).
- `viz_ideas.md`: ranked ideas, data, formulas, rejected ideas.
- `coverage.json` (`mk_coverage.py`): every fact of live.md and where the HTML carries it.
- `check.mjs`: exercises every control at 920/390 px in both themes, checks NaN/undefined, sideways scroll, error box, animation frames and reduced motion. `shots.mjs`, `sec.mjs`, `tabshot.mjs`: screenshots into `shots/`.

Tabs: Reading (with the KDA against full-attention animation, Newton-Schulz stepper, QK-Clip, delta-rule sandbox, hybrid-ratio chart, Quantile Balancing, AttnRes), Parameters and memory, Lineage, Further reading.

## 2026-10-23 pilot: one owner per concept
Attention mechanisms now have one owner, Attention variants, and whole-model KV-cache sizing has one, Long context (teaching contract, "one owner per concept"). The passages flagged as overlapping (NoPE on K3's MLA layers, Gated MLA, QK-Clip's handling of MLA's shared rotary key) turned out to be Kimi's own choices: Attention variants mentions each in one line and points back here, and it does not carry QK-Clip's per-part scaling (content query and key by the square root of gamma, rotary query by gamma) or the NoPE rationale (KDA's decay carries position). So nothing was removed; `src/ledger.json` is empty on purpose.
- **Links added instead:** the scope note now sends MLA and attention mechanisms to Attention variants and whole-model cache sizes to Long context (it used to name the LLM Architecture Gallery for MLA); the QK-Norm sentence, the shared rotary key, the NoPE paragraph (its generic clause, why NoPE lets MLA run as plain multi-query attention, now links the derivation) and the Gated MLA bullet each link Attention variants; the KDA/MLA animation's scale note points at the MLA explainer on Attention variants instead of the DeepSeek page, where it no longer is.
- **Kept here:** the KDA ratio ablation, the K3 cache arithmetic on Parameters and memory, everything else.
- Also: the KDA/MLA animation (`14_js_kx.js`) no longer autoplays, on first view or on a mode switch; it waits on step 1 until the reader presses play or steps. The tab script opens a tab named in the URL hash (`#t-par`). The header reads "Reading: 37 min, plus 1 in closed details." measured with `html_utils/audit_pages.mjs` (before: 36 plus 1; the minute is the added link text); `build.sh` now also counts closed details, but the header number is set by hand from the audit.

