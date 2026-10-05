#include <cstdio>
#include <string>
#include <thread>
#include <unordered_map>
#include <vector>

int main() {
    std::unordered_map<std::string, long> counts{{"u0029", 0}};
    std::vector<std::thread> ts;
    for (int t = 0; t < 4; ++t)
        ts.emplace_back([&] {
            for (int i = 0; i < 200000; ++i) counts["u0029"] += 1;  // no lock: a data race
        });
    for (auto& t : ts) t.join();
    std::printf("expected 800000, got %ld\n", counts["u0029"]);
}
