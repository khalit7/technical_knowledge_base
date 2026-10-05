#include <cstdio>
int f(bool flag) {
    int total;               // not initialised: reading it is undefined behaviour
    if (flag) total = 1;
    return total;
}
int main(int argc, char**) { std::printf("%d\n", f(argc > 1)); }
