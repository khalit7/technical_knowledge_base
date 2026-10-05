// Task: count tokens in 4 chunks on 4 threads, merge the per-user counts.
#include <fstream>
#include <iostream>
#include <string>
#include <thread>
#include <unordered_map>
#include <vector>

#include "json_lite.hpp"

static long long count_tokens(std::string_view t) {
    long long n = 0;
    bool inside = false;
    for (unsigned char c : t) {
        bool tok = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
        if (tok && !inside) ++n;
        inside = tok;
    }
    return n;
}

int main(int argc, char** argv) {
    std::ifstream f(argc > 1 ? argv[1] : "chat.jsonl");
    std::vector<std::string> lines;
    for (std::string l; std::getline(f, l);) lines.push_back(l);
    const int T = 4;
    std::vector<std::unordered_map<std::string, long long>> parts(T);  // one map per thread
    std::vector<std::thread> threads;
    for (int t = 0; t < T; ++t) {
        threads.emplace_back([&, t] {
            for (size_t i = t; i < lines.size(); i += T)
                if (auto m = Parser(lines[i]).message()) parts[t][m->user] += count_tokens(m->text);
        });
    }
    for (auto& th : threads) th.join();  // forget this and the program aborts
    std::unordered_map<std::string, long long> total;
    for (auto& p : parts)
        for (auto& [u, n] : p) total[u] += n;
    long long sum = 0;
    std::pair<std::string, long long> top{"", -1};
    for (auto& [u, n] : total) {
        sum += n;
        if (n > top.second || (n == top.second && u < top.first)) top = {u, n};
    }
    std::cout << "users " << total.size() << " tokens " << sum << " top " << top.first << " " << top.second << "\n";
}
