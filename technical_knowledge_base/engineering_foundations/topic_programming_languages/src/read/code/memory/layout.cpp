// Where do the records of a vector live in memory?
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <vector>
struct Record { std::uint32_t user; std::uint64_t tokens; };   // 4 + (4 padding) + 8 bytes
int main() {
    std::vector<Record> records;
    records.reserve(4);
    for (std::uint32_t i = 0; i < 4; i++) records.push_back({1000 + i, 1'000'000 + 7ull * i});
    std::printf("sizeof(Record) = %zu, alignof = %zu, offsetof(tokens) = %zu\n", sizeof(Record), alignof(Record), offsetof(Record, tokens));
    std::printf("vector object (pointer, size, capacity) at %p, %zu bytes, on the stack\n", (void*)&records, sizeof(records));
    for (int i = 0; i < 4; i++)
        std::printf("records[%d] at %p  user=%u tokens=%llu\n", i, (void*)&records[i], records[i].user, (unsigned long long)records[i].tokens);
}
