// Task: where do 8 timestamps live in memory?
#include <cstdint>
#include <cstdio>
#include <vector>

int main() {
    std::vector<std::int64_t> ts;
    for (int i = 0; i < 8; ++i) ts.push_back(1759650000 + 7 * i);
    std::printf("vector object at %p, buffer at %p, %zu bytes per element\n",
                (void*)&ts, (void*)ts.data(), sizeof(ts[0]));
    for (int i = 0; i < 8; ++i)
        std::printf("ts[%d] at %p  value %lld\n", i, (void*)&ts[i], (long long)ts[i]);
}
