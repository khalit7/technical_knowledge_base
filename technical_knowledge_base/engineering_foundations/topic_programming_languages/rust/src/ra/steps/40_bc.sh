# Borrow-checker lab: each scenario's error (or panic) and its fix, rustc 1.99.0 --edition 2024.
for f in "$W"/bc/*_err.rs; do
  b=$(basename "$f" _err.rs)
  if grep -q "fails at run time" "$f"; then run "bc_${b}_err" bc "${b}_err"; else fail "bc_${b}_err" bc "${b}_err"; fi
  run "bc_${b}_fix" bc "${b}_fix"
done
rec bc_13_polonius bc 'rustc +nightly --edition 2024 -Zpolonius=next 13_map_get_insert_err.rs && ./13_map_get_insert_err'
rec bc_05_py bc 'python3.14 05_mutate_while_iterating.py'
rec bc_explain bc 'rustc --explain E0502 | head -n 12'
# The three Python-to-Rust predictions this page keeps (d02 moves, d03 floor division, d12 2 ** 64): the Python and three Rust candidates
for p in "$W"/drill/d*.py; do
  d=$(basename "$p" .py)
  rec "dr_${d}_py" drill "python3.14 $d.py"
  for c in a b c; do run "dr_${d}_$c" drill "${d}_$c"; done
done
