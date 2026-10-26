# Standards section: Apple clang 17 (Command Line Tools, macOS 26 SDK) and LLVM clang 23. The language examples of
# the old Part 1 moved to the ownership and classes children (each has its own copy of this step, trimmed).
rec l_features17 lang 'clang++ -std=c++26 features.cpp -o features17 && ./features17'
rec l_features23 lang 'clang++-23 -std=c++26 features.cpp -o features23 && ./features23'
rec l_std_default lang 'for c in /usr/bin/clang++ clang++ clang++-23; do printf "%-18s default __cplusplus = " $c; echo __cplusplus | $c -x c++ -E -P - | tail -n 1; done'
