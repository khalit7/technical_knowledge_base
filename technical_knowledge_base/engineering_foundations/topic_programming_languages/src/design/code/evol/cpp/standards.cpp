// cmd: for s in 11 14 17 20 23; do clang++ -std=c++$s standards.cpp -o p && ./p; done
#include <cstdio>
int main() { std::printf("__cplusplus = %ld\n", __cplusplus); }  // one ISO standard every 3 years
