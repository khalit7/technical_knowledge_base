#include <expected>
#include <string>
#include <cstdio>
std::expected<int, std::string> parse(const std::string& s) {
    size_t n = 0; int v = 0;
    try { v = std::stoi(s, &n); } catch (const std::exception& e) { return std::unexpected(e.what()); }
    if (n != s.size()) return std::unexpected("trailing junk");
    return v;
}
int main() { for (auto s : {"42", "4x2", "x"}) { auto r = parse(s); r ? std::printf("%d\n", *r) : std::printf("error: %s\n", r.error().c_str()); } }
