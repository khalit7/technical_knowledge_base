// Task: report why each malformed line fails, then let one error escape.
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>

#include "json_lite.hpp"

// Exception style: the return type says nothing about failure.
Message parse(const std::string& line) {
    Parser p(line);
    std::optional<Message> m = p.message();
    if (!m) throw std::runtime_error("invalid: " + p.error());
    return *m;
}

int main(int argc, char** argv) {
    std::ifstream f(argc > 1 ? argv[1] : "chat.jsonl");
    std::string line;
    for (int n = 1; std::getline(f, line); ++n) {
        try {
            parse(line);
        } catch (const std::runtime_error& e) {
            std::cout << "line " << n << ": " << e.what() << "\n";
        }
    }
    std::cout << "now without try/catch:" << std::endl;
    parse("not json at all");
}
