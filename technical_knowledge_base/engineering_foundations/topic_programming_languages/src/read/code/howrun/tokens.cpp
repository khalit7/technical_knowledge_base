#include <cstdint>
#include <string_view>
// Same loop as the Python: count maximal runs of ASCII letters and digits.
std::uint64_t count_tokens(std::string_view text) {
    std::uint64_t n = 0;
    bool inside = false;
    for (unsigned char c : text) {
        bool tok = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
        if (tok && !inside) n += 1;
        inside = tok;
    }
    return n;
}
