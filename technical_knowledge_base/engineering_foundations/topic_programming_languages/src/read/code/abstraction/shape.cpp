#include <concepts>
#include <cstdio>
#include <sstream>
#include <string>
#include <vector>
template <class T>
concept HasTokens = requires(const T& x) { { x.tokens() } -> std::convertible_to<std::size_t>; };

struct Message {
    std::string text;
    std::size_t tokens() const { std::istringstream in(text); std::string w; std::size_t n = 0; while (in >> w) n++; return n; }
};
template <HasTokens T>                       // a template: compiled once per T, like Rust generics
std::size_t total(const std::vector<T>& items) { std::size_t s = 0; for (auto& x : items) s += x.tokens(); return s; }

int main() {
    std::printf("%zu\n", total(std::vector<Message>{{"hello there"}, {"a b c"}}));
    std::printf("%zu\n", total(std::vector<unsigned>{42}));
}
