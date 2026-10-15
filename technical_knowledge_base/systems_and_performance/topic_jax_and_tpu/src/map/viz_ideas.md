# Tool map: visual ideas

## Built
- **Same jobs, 2023 vs 2026 (before/after animation).** Ten job slots; each step applies one dated, sourced change (12 changes). Play, step, scrub, and 2023/2026 jump buttons; pauses off screen, no autoplay under reduced motion. Chosen because the honest story of the JAX ecosystem since 2023 is turnover per job, and a slot keeps the input fixed while the occupant changes.
- **Filterable, sortable tool table** with a detail panel: status (with the owner's notice quoted), latest release, last commit, licence, when to use, when to avoid, verdict labelled as judgement, sources.
- **Picker:** job by hardware (12 x 4 combinations), giving the stack in order, a hardware note and tools to steer away from with the reason.
- **Lineage lifespans:** one bar per tool from start to now (or last activity), coloured by status, with arrows for hand-overs; solid when documented, dashed when our reading. Narrow layout puts labels above bars.
- **JAX API changes table** (pmap, pjit, xmap, export, Shardy, set_mesh) and the same names probed in the installed jax.

## Rejected
- Stars or download counts as a health bar: popularity is not maintenance status, and the brief asks for status. Stars are kept in the data only.
- A force-directed dependency graph of the packages: hard to read at 390 px and it says little a reader can act on.
- A per-month commit heatmap: commits mislead here (T5X, Pax and jmp have automated lint commits in 2026).
