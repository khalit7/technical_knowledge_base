// Task: the same parse returning std::expected (C++23): the error is in the type, like Rust's Result.
#include <expected>
#include <iostream>
#include <string>

#include "json_lite.hpp"

std::expected<Message, std::string> parse(const std::string& line) {
    Parser p(line);
    if (auto m = p.message()) return *m;
    return std::unexpected(p.error());
}

int main() {
    for (std::string line : {std::string(R"({"user": "u0029", "text": "hi"})"), std::string("not json at all")}) {
        auto r = parse(line);
        if (r) std::cout << "ok: " << r->user << std::endl;
        else std::cout << "error: " << r.error() << std::endl;
    }
    std::cout << parse("not json").value().user << "\n";  // .value() on an error throws
}
