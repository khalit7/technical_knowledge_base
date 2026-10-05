// Task: one generic top_k used for two different element types.
#include <algorithm>
#include <concepts>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

// A template: the compiler writes a separate top_k for each T and Key it is used with.
template <typename T, typename Key>
    requires std::totally_ordered<std::invoke_result_t<Key, const T&>>
std::vector<T> top_k(std::vector<T> items, size_t k, Key key) {
    std::sort(items.begin(), items.end(), [&](const T& a, const T& b) { return key(a) > key(b); });
    if (items.size() > k) items.resize(k);
    return items;
}

int main() {
    std::vector<std::pair<std::string, int>> counts{{"u0005", 4816}, {"u0029", 9491}, {"u0042", 3499}};
    for (auto& [u, n] : top_k(counts, 2, [](const auto& kv) { return kv.second; })) std::cout << u << ":" << n << " ";
    std::cout << "\n";
    std::vector<std::string> words{"kernel", "a", "attention", "GPU"};
    for (auto& w : top_k(words, 2, [](const std::string& w) { return w.size(); })) std::cout << w << " ";
    std::cout << "\n";
}
