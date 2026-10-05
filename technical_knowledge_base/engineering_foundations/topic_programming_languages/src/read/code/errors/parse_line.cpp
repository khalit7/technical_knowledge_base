// C++23 std::expected: a value OR an error, returned like Rust's Result (no exception thrown).
#include <cstdio>
#include <expected>
#include <string>
std::expected<long, std::string> parse_count(const std::string& s) {
    if (s.empty()) return std::unexpected("empty field");
    long v = 0;
    for (char c : s) {
        if (c < '0' || c > '9') return std::unexpected("not a digit: '" + std::string(1, c) + "'");
        v = v * 10 + (c - '0');
    }
    return v;
}
int main() {
    for (std::string s : {"9491", "94x1", ""}) {
        auto r = parse_count(s);
        if (r) std::printf("ok   %ld\n", *r);
        else   std::printf("bad  %s\n", r.error().c_str());
    }
    long oops = *parse_count("94x1");   // nothing stops you reading the value of an error: UB
    std::printf("unchecked: %ld\n", oops);
}
