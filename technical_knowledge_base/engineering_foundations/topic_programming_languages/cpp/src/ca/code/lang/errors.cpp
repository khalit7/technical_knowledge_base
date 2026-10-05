#include <charconv>
#include <cstdio>
#include <expected>
#include <optional>
#include <stdexcept>
#include <string>
#include <string_view>

// 1. Exceptions: like Python's raise/except
long parse_or_throw(std::string_view s) {
    long v = 0;
    auto [p, ec] = std::from_chars(s.data(), s.data() + s.size(), v);
    if (ec != std::errc{} || p != s.data() + s.size())
        throw std::invalid_argument("not a number: " + std::string(s));
    return v;
}

// 2. optional: "a value or nothing", no reason given (like returning None)
std::optional<long> parse_opt(std::string_view s) {
    long v = 0;
    auto [p, ec] = std::from_chars(s.data(), s.data() + s.size(), v);
    if (ec != std::errc{} || p != s.data() + s.size()) return std::nullopt;
    return v;
}

// 3. expected (C++23): "a value or an error", like Rust's Result
enum class ParseError { empty, not_a_number };
std::expected<long, ParseError> parse_exp(std::string_view s) {
    if (s.empty()) return std::unexpected(ParseError::empty);
    long v = 0;
    auto [p, ec] = std::from_chars(s.data(), s.data() + s.size(), v);
    if (ec != std::errc{} || p != s.data() + s.size()) return std::unexpected(ParseError::not_a_number);
    return v;
}

int main() {
    try {
        parse_or_throw("12x");
    } catch (const std::invalid_argument& e) {
        std::printf("caught: %s\n", e.what());
    }
    auto o = parse_opt("12x");
    std::printf("optional: has_value=%d, value_or(-1)=%ld\n", o.has_value(), o.value_or(-1));

    for (std::string_view s : {"4816", "", "12x"}) {
        auto r = parse_exp(s)
                   .transform([](long v) { return v * 2; });   // runs only on success
        if (r) std::printf("expected \"%.*s\": value %ld\n", (int)s.size(), s.data(), *r);
        else   std::printf("expected \"%.*s\": error %d\n", (int)s.size(), s.data(), (int)r.error());
    }
}
