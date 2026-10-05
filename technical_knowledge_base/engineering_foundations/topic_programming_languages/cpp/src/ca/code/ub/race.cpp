#include <cstdio>
#include <thread>

long counter = 0;   // shared, not atomic, no lock

void work() { for (int i = 0; i < 1'000'000; ++i) counter += 1; }

int main() {
    std::thread a(work), b(work);
    a.join();
    b.join();
    std::printf("counter = %ld (expected 2000000)\n", counter);
}
