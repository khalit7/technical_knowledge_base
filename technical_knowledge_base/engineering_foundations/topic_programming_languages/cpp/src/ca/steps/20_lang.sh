# Language sections: Apple clang 17 (Command Line Tools, macOS 26 SDK), C++23, -O2.
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
run l_classes classes
fail l_explicit_err explicit_err
run l_virtual virtual
run l_slicing slicing
rec l_nonvirtual_dtor lang 'clang++ -std=c++23 -O2 -Wall nonvirtual_dtor.cpp -o nonvirtual_dtor && ./nonvirtual_dtor'
run l_templates templates
rec l_templates_nm lang 'clang++ -std=c++23 -O0 -c templates.cpp -o templates.o && nm -C templates.o | grep " total<"'
fail l_tmpl_err tmpl_err
fail l_concept_err concept_err
fail l_sort_err sort_err
fail l_rsort_err rsort_err
rec l_sort_err_count lang 'for f in sort_err rsort_err; do printf "%-10s %4s lines of diagnostics, %s errors\n" $f $(clang++ -std=c++23 -c $f.cpp -o /dev/null 2>&1 | wc -l) $(clang++ -std=c++23 -c $f.cpp -o /dev/null 2>&1 | grep -c " error: "); done'
run l_vector_growth vector_growth
run l_strings strings
run l_containers containers
run l_ranges ranges
run l_lambdas lambdas
run l_errors errors
rec l_features17 lang 'clang++ -std=c++26 features.cpp -o features17 && ./features17'
rec l_features23 lang 'clang++-23 -std=c++26 features.cpp -o features23 && ./features23'
rec l_std_default lang 'for c in /usr/bin/clang++ clang++ clang++-23; do printf "%-18s default __cplusplus = " $c; echo __cplusplus | $c -x c++ -E -P - | tail -n 1; done'
for s in scope copymove calls growth growth_nx reserve unique shared unwind; do
  rec "lt_$s" lang "clang++ -std=c++23 -O2 -Wall -Wextra lifetime.cpp -o lifetime && ./lifetime $s"
done
