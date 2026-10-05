# Borrow-checker lab: each scenario's error (or panic) and its fix, rustc 1.99.0 --edition 2024.
for f in "$W"/bc/*_err.rs; do
  b=$(basename "$f" _err.rs)
  if grep -q "fails at run time" "$f"; then run "bc_${b}_err" bc "${b}_err"; else fail "bc_${b}_err" bc "${b}_err"; fi
  run "bc_${b}_fix" bc "${b}_fix"
done
rec bc_13_polonius bc 'rustc +nightly --edition 2024 -Zpolonius=next 13_map_get_insert_err.rs && ./13_map_get_insert_err'
rec bc_05_py bc 'python3.14 05_mutate_while_iterating.py'
rec bc_explain bc 'rustc --explain E0502 | head -n 12'
# Python-to-Rust drill: the Python original and three Rust candidates each
for p in "$W"/drill/d*.py; do
  d=$(basename "$p" .py)
  rec "dr_${d}_py" drill "python3.14 $d.py"
  for c in a b c; do run "dr_${d}_$c" drill "${d}_$c"; done
done
rec dr_d09_a_again drill './d09_a; ./d09_a; ./d09_a'
