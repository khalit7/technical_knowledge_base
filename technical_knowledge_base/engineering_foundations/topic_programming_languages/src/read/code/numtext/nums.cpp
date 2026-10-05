#include <cstdint>
#include <cstdio>
#include <string>
int main(int argc, char**) {
    std::int64_t big = INT64_MAX;
    std::int64_t next = big + argc;     // signed overflow: undefined behaviour (argc is 1)
    std::printf("INT64_MAX + 1 = %lld\n", (long long)next);
    std::printf("-7 / 2 = %d   -7 %% 2 = %d\n", -7 / 2, -7 % 2);
    std::printf("0.1 + 0.2 = %.17g\n", 0.1 + 0.2);
    std::string s = "café 日本 \U0001F600";
    std::printf("size: %zu bytes   s[3] = 0x%02x (half of the é)\n", s.size(), (unsigned char)s[3]);
}
