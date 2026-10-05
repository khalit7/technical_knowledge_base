// Tokens = maximal runs of ASCII letters or digits, counted over UTF-8 bytes
// (bytes of non-ASCII characters are >= 0x80, so they always separate tokens).
#pragma once
#include <cstdint>
#include <string_view>
inline uint64_t count_tokens_sv(std::string_view s) {
    uint64_t n = 0;
    bool inside = false;
    for (unsigned char c : s) {
        bool t = (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
        if (t && !inside) ++n;
        inside = t;
    }
    return n;
}
