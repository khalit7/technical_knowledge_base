# Undefined behaviour gallery: each case compiled with LLVM clang 23 at -O0 and -O2, then under a sanitizer or a warning.
# Runs are wrapped in a 5-second alarm (perl) so a hang cannot stall the script; the recorded command omits the wrapper.
ubrun() { # ubrun NAME FILE FLAGS [ENV]
  n=$1; f=$2; fl=$3; env=${4:-}
  recq "$n" ub "echo '\$ clang++-23 -std=c++23 $fl $f.cpp -o $f && ${env:+$env }./$f'; mkdir -p $n && cd $n && clang++-23 -std=c++23 $fl ../$f.cpp -o $f && env $env perl -e 'alarm 5; exec @ARGV' ./$f" 
  # the shell's crash line names the wrapper; keep only the signal it reports
  sed -i '' -e "s#\.\./##g" -e "s/^sh: line [0-9]*: *[0-9]* \(.*[a-z0-9]\) *env.*/(the shell reports: \1)/" "$OUT/$n.txt"
}
for c in overflow table uninit no_return index_oob dangling_vec string_view_temp lambda_dangle race double_free; do
  ubrun ub_${c}_O0 $c -O0
  ubrun ub_${c}_O2 $c -O2
done
ubrun ub_overflow_san overflow "-O2 -fsanitize=undefined"
ubrun ub_no_return_san no_return "-O2 -fsanitize=undefined"
ubrun ub_table_san table "-O2 -g -fsanitize=address"
ubrun ub_index_oob_san index_oob "-O2 -g -fsanitize=address"
ubrun ub_index_oob_hard index_oob "-O2 -D_LIBCPP_HARDENING_MODE=_LIBCPP_HARDENING_MODE_FAST"
ubrun ub_index_oob_hard_dbg index_oob "-O2 -D_LIBCPP_HARDENING_MODE=_LIBCPP_HARDENING_MODE_DEBUG"
ubrun ub_dangling_vec_san dangling_vec "-O2 -g -fsanitize=address"
ubrun ub_string_view_temp_san string_view_temp "-O2 -g -fsanitize=address"
ubrun ub_lambda_dangle_san lambda_dangle "-O2 -g -fsanitize=address" "ASAN_OPTIONS=detect_stack_use_after_return=1"
ubrun ub_double_free_san double_free "-O0 -g -fsanitize=address"
ubrun ub_race_san race "-O2 -g -fsanitize=thread"
rec ub_uninit_warn ub 'clang++-23 -std=c++23 -Wall -c uninit.cpp -o /dev/null'
rec ub_string_view_temp_warn ub 'clang++-23 -std=c++23 -Wall -c string_view_temp.cpp -o /dev/null'
rec ub_lambda_dangle_warn ub 'clang++-23 -std=c++23 -Wall -c lambda_dangle.cpp -o /dev/null'
rec ub_uninit_init ub 'clang++-23 -std=c++23 -O2 -ftrivial-auto-var-init=zero uninit.cpp -o uninit_zero && ./uninit_zero'
