# Python-to-Rust prediction prompts: the Python original and three Rust candidates each
for p in "$W"/drill/d*.py; do
  d=$(basename "$p" .py)
  rec "dr_${d}_py" drill "python3.14 $d.py"
  for c in a b c; do run "dr_${d}_$c" drill "${d}_$c"; done
done
rec dr_d09_a_again drill './d09_a; ./d09_a; ./d09_a'
