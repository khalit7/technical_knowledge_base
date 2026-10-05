# Sections 4 to 17: one file per example, rustc 1.99.0 --edition 2024 (debug build unless -O).
run l_move lang move
fail l_move_err lang move_err
run l_drop lang drop
run l_own_anim lang own_anim
rec l_own_anim_py lang 'python3.14 own_anim.py'
run l_borrow lang borrow
fail l_gate_err lang gate_err
run l_gate_fix lang gate_fix
run l_gate_reorder lang gate_reorder
fail l_life_err lang life_err
run l_life lang life
fail l_life_err2 lang life_err2
fail l_dangle_err lang dangle_err
run l_strings lang strings
rec l_strings_py lang 'python3.14 strings.py'
fail l_index_err lang index_err
run l_enums lang enums
fail l_match_err lang match_err
run l_states lang states
run l_errors lang errors
fail l_qmark_err lang qmark_err
rec l_errs errs 'cargo run -q'
run l_traits lang traits
fail l_bound_err lang bound_err
fail l_notimpl_err lang notimpl_err
rec l_mono lang 'rustc --edition 2024 -O mono.rs && ./mono && nm mono | c++filt | grep biggest | cut -c 18- | sort'
run l_iters lang iters
run l_colls lang colls
rec l_colls2 lang 'for i in 1 2 3; do ./colls | sed -n 3p; done'
fail l_modvis_err lang modvis_err
rec l_failing_test lang 'rustc --edition 2024 --test failing_test.rs -o failing_test && ./failing_test'
rec l_tokstat_run tokstat 'cargo run -q --release -- ../chat.jsonl'
rec l_tokstat_test_full tokstat 'cargo test 2>&1 | grep -E "Running|Doc-tests|^test |test result"'
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
rec l_ub_miri ub 'cargo +nightly miri run -q 2>&1 | grep -v "^Preparing a sysroot" '
