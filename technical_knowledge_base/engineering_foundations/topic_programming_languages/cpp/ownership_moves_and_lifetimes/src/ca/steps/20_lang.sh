# Language examples for "C++: ownership, moves and object lifetimes": Apple clang 17 (Command Line Tools, macOS 26 SDK), C++23, -O2.
run() { rec "$1" lang "clang++ -std=c++23 -O2 -Wall -Wextra $2.cpp -o $2 && ./$2${3:+ $3}"; }
fail() { rec "$1" lang "clang++ -std=c++23 -Wall -Wextra -c $2.cpp -o /dev/null"; }
run l_copy copy
rec l_copy_py lang 'python3.14 copy.py'
fail l_const const
run l_stack_heap stack_heap
fail l_unique_copy unique_copy
run l_sizes sizes
run l_moved_from moved_from
run l_rule_of_five rule_of_five
for s in scope copymove calls growth growth_nx reserve unique shared unwind cycle temps; do
  rec "lt_$s" lang "clang++ -std=c++23 -O2 -Wall -Wextra lifetime.cpp -o lifetime && ./lifetime $s"
done
# What an owner costs per call (best of 5, ns per call; prints the load average first)
run t_ptr_cost ptr_cost
