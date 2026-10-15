# Coverage and corrections: XLA and compilation

A new page: there was no old Notion page with this title, so no `live.md`. The old pages saved in the root's `src/read/old/` touch compilation in a few lines; those claims were checked here.

| Old claim (where) | Verdict | Evidence |
|---|---|---|
| "Under jit, XLA turns these [`x.at[i].set`] into true in-place updates, so no copy cost in practice" (old JAX core page, `old/jax_core.md:44`) | **Corrected**: in place only when the array is donated or is an intermediate; a non-donated argument is copied in full first | `lab/inplace.py`: optimised HLO has `copy` + update fusion without donation, no copy with donation (alias 16 MiB) or for an intermediate; `copy_insertion.h:41` (entry parameters live out need their own allocation). Reading section 6 |
| `@nnx.jit` "donates internally" (old training-stack page, `old/training_stack.md:124`) | **Wrong** (owned by the training-stack sibling and the root's FACTS: `nnx.jit` donates nothing by default) | FACTS.md xla section, flax `compilation.py:317-318` |
| `jax.jit` compiles one executable per (shape, dtype, static args); recompilation is the silent killer; log with `jax_log_compiles`; bucket shapes (`old/jax_core.md:62-80`) | Verified and extended: the key also includes weak types, pytree structure, function identity and the tracing context (config) | `lab/recompile_lab.py`: 11 scenarios with JAX's own explanations |
| "For most training work you never write [a kernel]: XLA fusion + the stock attention kernel" (`old/tpu_and_pallas.md:125`) | Kept by the root as opinion; here the limits of XLA fusion are measured (13 breaker programs, refusal reasons) | Fusion explorer |

## Corrections to the root's Compiler lab (suggested, not edited)
- Its "kernels" count (1,057 for the undonated step) includes 241 reduction combiner computations (`add` or `maximum` with two parameters, reached through `to_apply=`), which are not kernels: `hlo_tools.hlo_counts` marks only `calls=` targets as fused. Top-level kernels: 816 undonated (783 fusions + 33 dots), 817 donated (+1 copy).

## Discrepancies found in sources
- XLA `debug_options_flags.cc` at 91888df6: the YNN fusion-type defaults add three types (line 272-277) while the flag's help text says "The default list is currently empty" (line 1660 onward).
- JAX `docs/export/export.md` at jax-v0.11.2: "As of June 2024, all function exported with version 9 (the latest ...)" directly above an example printing 10; version 10 became the default in JAX 0.7.0 per the same document.
