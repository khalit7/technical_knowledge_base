# Sections 1 to 4: one file per example, rustc 1.99.0 --edition 2024 (debug build).
# Copied from the Rust page (recorded 2026-10-05):
fail l_life_err lang life_err
run l_life lang life
fail l_life_err2 lang life_err2
fail l_dangle_err lang dangle_err
run l_smart lang smart
fail l_recursive_err lang recursive_err
run l_leak lang leak
run l_threads lang threads
fail l_race_err lang race_err
fail l_race_scope_err lang race_scope_err
fail l_rc_thread_err lang rc_thread_err
run l_unsafe_ok lang unsafe_ok
fail l_unsafe_deref_err lang unsafe_deref_err
rec l_ub_run ub 'cargo run -q --release'
[ -n "$SKIP_MIRI" ] || rec l_ub_miri ub 'cargo +nightly miri run -q 2>&1 | grep -v "^Preparing a sysroot" '
# Added for this page (recorded 2026-10-26, same rustc 1.99.0):
run l_static_bound lang static_bound
fail l_static_bound_err lang static_bound_err
fail l_elide_self_err lang elide_self_err
run l_elide_self_fix lang elide_self_fix
run l_sendsync lang sendsync
fail l_sendsync_err lang sendsync_err
