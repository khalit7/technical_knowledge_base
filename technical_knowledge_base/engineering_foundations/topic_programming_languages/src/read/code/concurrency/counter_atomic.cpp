// The fix: std::atomic makes each increment one indivisible hardware operation.
#include <atomic>
#include <cstdio>
#include <thread>
#include <vector>
std::atomic<long> counter{0};
int main() {
    const long N = 1'000'000; const int T = 4;
    std::vector<std::thread> threads;
    for (int t = 0; t < T; t++)
        threads.emplace_back([N] { for (long i = 0; i < N; i++) counter.fetch_add(1, std::memory_order_relaxed); });
    for (auto& th : threads) th.join();
    std::printf("atomic: expected %ld  got %ld\n", N * T, counter.load());
}
