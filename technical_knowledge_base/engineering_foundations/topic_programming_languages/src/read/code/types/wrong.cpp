#include <cstdint>
#include <cstdio>
#include <string_view>
std::uint64_t count_tokens(std::string_view text) {
    std::uint64_t n = 0; bool inside = false;
    for (unsigned char c : text) {
        bool tok = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
        if (tok && !inside) n += 1;
        inside = tok;
    }
    return n;
}
int main() {
    std::printf("%llu\n", (unsigned long long)count_tokens("x86_64 café"));
    std::printf("%llu\n", (unsigned long long)count_tokens(42));   // wrong type
}
