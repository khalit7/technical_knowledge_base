// Count tokens per user in a JSONL chat log; print the top 5. Spec: ../../PROGRAM.md
// Build: clang++ -std=c++20 -O2 -Wall -Wextra -o count_tokens count_tokens.cpp
// (json_lite.hpp sits next to this file)
#include <algorithm>
#include <cerrno>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include "json_lite.hpp"  // Message and Parser: our small JSON parser

// A token is a maximal run of ASCII letters or digits. Bytes >= 0x80 (any
// non-ASCII character in UTF-8) are separators.
static long long count_tokens(std::string_view text) {
    long long n = 0;
    bool inside = false;
    for (unsigned char c : text) {
        bool tok = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
        if (tok && !inside) ++n;
        inside = tok;
    }
    return n;
}

int main(int argc, char** argv) {
    const char* path = argc > 1 ? argv[1] : "chat.jsonl";
    std::ifstream f(path);
    if (!f) {
        std::fprintf(stderr, "error: cannot open %s: %s\n", path, std::strerror(errno));
        return 1;
    }
    std::unordered_map<std::string, long long> per_user;
    long long lines = 0, ok = 0, bad = 0, first_bad = 0;
    std::string line;
    while (std::getline(f, line)) {
        ++lines;
        std::optional<Message> m = Parser(line).message();
        if (!m) {
            ++bad;
            if (!first_bad) first_bad = lines;
            continue;
        }
        ++ok;
        per_user[m->user] += count_tokens(m->text);
    }
    long long total = 0;
    for (const auto& [user, n] : per_user) total += n;
    std::vector<std::pair<std::string, long long>> top(per_user.begin(), per_user.end());
    std::sort(top.begin(), top.end(), [](const auto& a, const auto& b) {
        return a.second != b.second ? a.second > b.second : a.first < b.first;
    });
    std::printf("lines %lld  ok %lld  malformed %lld (first at line %lld)\n", lines, ok, bad, first_bad);
    std::printf("users %zu  tokens %lld\n", per_user.size(), total);
    std::printf("top 5 users by tokens:\n");
    for (size_t r = 0; r < top.size() && r < 5; ++r)
        std::printf("%2zu. %s  %lld\n", r + 1, top[r].first.c_str(), top[r].second);
    return 0;
}
