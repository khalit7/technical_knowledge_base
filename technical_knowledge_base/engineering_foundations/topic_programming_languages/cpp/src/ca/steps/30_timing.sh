# Timings (best of 7 or 5 repetitions inside each program); load average recorded before each run.
rec t_vcost lang 'sysctl -n vm.loadavg; clang++ -std=c++23 -O2 vcost.cpp -o vcost && ./vcost'
rec t_throw lang 'sysctl -n vm.loadavg; clang++ -std=c++23 -O2 throw_cost.cpp -o throw_cost && ./throw_cost'
