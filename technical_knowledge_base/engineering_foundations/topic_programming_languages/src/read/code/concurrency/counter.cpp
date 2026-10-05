// Four threads each add 1 to a shared counter a million times.
#include <cstdio>
#include <thread>
#include <vector>
long counter = 0;                       // shared, unprotected
int main() {
    const long N = 1'000'000; const int T = 4;
    std::vector<std::thread> threads;
    for (int t = 0; t < T; t++)
        threads.emplace_back([N] { for (long i = 0; i < N; i++) counter++; });
    for (auto& th : threads) th.join();
    std::printf("expected %ld  got %ld\n", N * T, counter);
}
