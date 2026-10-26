# Sections 4, 5 and 7 of Rust: the essentials (ownership, borrowing, modules): one file per example, rustc 1.99.0 --edition 2024.
run l_move lang move
fail l_move_err lang move_err
run l_drop lang drop
run l_own_anim lang own_anim
rec l_own_anim_py lang 'python3.14 own_anim.py'
run l_borrow lang borrow
fail l_gate_err lang gate_err
run l_gate_fix lang gate_fix
run l_gate_reorder lang gate_reorder
fail l_modvis_err lang modvis_err
rec l_tokstat_run tokstat 'cargo run -q --release -- ../chat.jsonl'
