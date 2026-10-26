# Sections 1 to 7 of this page: one file per example, rustc 1.99.0 --edition 2024 (debug build unless -O).
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
rec l_failing_test lang 'rustc --edition 2024 --test failing_test.rs -o failing_test && ./failing_test'
rec l_tokstat_test_full tokstat 'cargo test 2>&1 | grep -E "Running|Doc-tests|^test |test result"'
