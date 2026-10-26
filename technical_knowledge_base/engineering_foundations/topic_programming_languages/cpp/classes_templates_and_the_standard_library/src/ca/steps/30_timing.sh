# Timings (best of 7 or 5 repetitions inside each program); load average recorded before each run.
# vcost and throw_cost are the C++ page's two measurements (kept as they were, rerun); dispatch and exc_cost extend them
# and run three times each, so the page can show the spread between runs. dispatch peaks at about 1.4 GB.
rec t_vcost lang 'sysctl -n vm.loadavg; clang++ -std=c++23 -O2 vcost.cpp -o vcost && ./vcost'
rec t_throw lang 'sysctl -n vm.loadavg; clang++ -std=c++23 -O2 throw_cost.cpp -o throw_cost && ./throw_cost'
rec t_dispatch lang 'clang++ -std=c++23 -O2 dispatch.cpp -o dispatch && for r in 1 2 3; do echo "run $r, load average $(sysctl -n vm.loadavg)"; ./dispatch; done'
rec t_exc lang 'clang++ -std=c++23 -O2 exc_cost.cpp -o exc_cost && for r in 1 2 3; do echo "run $r, load average $(sysctl -n vm.loadavg)"; ./exc_cost; done'
