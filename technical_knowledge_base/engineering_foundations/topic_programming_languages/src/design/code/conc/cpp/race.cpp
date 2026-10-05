// flags: -O0
#include <thread>
#include <cstdio>
int n = 0;
int main() {
    auto work = [] { for (int i = 0; i < 1000000; i++) n++; };  // unsynchronised: a data race
    std::thread a(work), b(work);
    a.join(); b.join();
    std::printf("%d of 2000000\n", n);
}
