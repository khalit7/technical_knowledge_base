// The whole program's loop in C++ (same parser as the Rosetta C++ version, json_lite.hpp).
#pragma once
#include <fstream>
#include <string>
#include <unordered_map>
#include "json_lite.hpp"
#include "tokens.h"
struct FileTally {
    uint64_t lines = 0, ok = 0, bad = 0, first_bad = 0;
    std::unordered_map<std::string, uint64_t> per_user;
    bool opened = false;
};
inline FileTally count_file_cpp(const std::string& path) {
    FileTally t;
    std::ifstream f(path);
    if (!f) return t;
    t.opened = true;
    std::string line;
    while (std::getline(f, line)) {
        ++t.lines;
        std::optional<Message> m = Parser(line).message();
        if (!m) { ++t.bad; if (!t.first_bad) t.first_bad = t.lines; continue; }
        ++t.ok;
        t.per_user[m->user] += count_tokens_sv(m->text);
    }
    return t;
}
