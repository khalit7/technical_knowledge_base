# Visuals: built and rejected

## Built
- **Hero: the pool check (live ingredient).** The window, the prefill pool as launched and after the fix on one token axis, a prompt-length slider, pool and engine toggles; the readout gives the path, the HTTP status, decode pages reserved, tokens this request wrote and its share of the attended KV. Computed exactly from the post's numbers and SGLang's v0.5.19 length rule (limit 681,274), checked against `recompute.py`. It shows what reading cannot quickly: the refused band between 681,274 and 1,048,576, that a refused reply was conditioned on almost nothing of its own (1 token in 700,000), and that either fix alone empties the band. Opens at 500,000 (normal path) so the prediction prompt beside it is not answered on screen.
- **Timeline** (static): the bug's public report, the upstream fix, the launch, the report and the releases on one axis; the decisive fact (fixed on main before the report) is a picture, not a sentence buried in section 3.
- **The handoff, before and after** (step animation, three modes on the same 8-page request): valid, rejected before the fix, rejected after #38935. Redrawn from the post's diagram (no open licence), with the fixed mode added.
- **The aborted-transfer race** (step animation, two modes): free at abort against deferred release, after SGLang's companion post. The post's own "ongoing hardening" section is about this class; one picture of it beats the paragraph.

## Rejected
- Embedding the post's diagram: no licence; redrawn instead.
- A KV-bytes calculator for GLM-5.3: Long context owns KV sizing, and GLM-5.3's layer config is not public.
- A chart of the PR table by release: the table already reads in one glance.
- 3D anything: nothing here has spatial structure that depth would teach.
