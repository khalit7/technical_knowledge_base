// Task: closures. A tally that remembers state, and loop capture.
#include <functional>
#include <iostream>
#include <map>
#include <string>
#include <vector>

std::function<long(const std::string&, long)> make_tally() {
    std::map<std::string, long> counts;
    // [counts] copies the map INTO the lambda; mutable lets the lambda change its copy.
    return [counts](const std::string& user, long n) mutable {
        return counts[user] += n;
    };
}

int main() {
    auto add = make_tally();
    add("u0029", 5);
    long x = add("u0029", 7);
    long y = add("u0005", 3);
    std::cout << x << " " << y << "\n";

    std::vector<std::function<int()>> by_value, by_ref;
    for (int i = 0; i < 3; ++i) {
        by_value.push_back([i] { return i; });  // copies i now
    }
    int j = 0;
    for (; j < 3; ++j) by_ref.push_back([&j] { return j; });  // refers to j itself
    for (auto& f : by_value) std::cout << f() << " ";
    for (auto& f : by_ref) std::cout << f() << " ";
    std::cout << "\n";
}
