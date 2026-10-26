# Source of the Reading tab (folder `ra`, copied from the Rust page's `src/ra`)

`tpl/20_read_a..e,z.html` are the Reading parts with directives; `python3 src/ra/gen.py` replaces them and writes `../parts/20_read_*.html`:
`[[code:PATH[:A-B]]]` (a source under `code/`), `[[out:NAME]]` (a recorded output `out/NAME.txt`), `[[pr:NAME|Q]]` (predict, then reveal),
`[[g:NAME|REGEX]]` (a value from an output) and `[[sendsync]]` (the Send and Sync table; gen.py fails if a "yes" cell is not asserted in
`code/lang/sendsync.rs` or a "no" cell is not refused in `out/l_sendsync_err.txt`). Never edit generated parts by hand.

`sh src/ra/run_all.sh` reruns every program in a scratch copy (`$PL/lsp/work`, default `$TMPDIR/pl`) and rewrites `out/`. It needs rustc
1.99.0 (set `RUSTUP_HOME` and `CARGO_HOME` to an existing install, or put one under `$PL/rust`) and, for `l_ub_miri`, the nightly toolchain
with Miri (`SKIP_MIRI=1` keeps the recorded output). About ten seconds without Miri.

Provenance: `code/lang/{life,life_err,life_err2,dangle_err,smart,recursive_err,leak,threads,race_err,race_scope_err,rc_thread_err,unsafe_ok,unsafe_deref_err}.rs`,
`code/ub/` and their outputs are the Rust page's (recorded 2026-10-05). `static_bound*.rs`, `elide_self_*.rs` and `sendsync*.rs` were
written and recorded for this page on 2026-10-26 with the same compiler. The other examples, the borrow-checker lab and the drill stayed on
the Rust page and were removed from this copy.
