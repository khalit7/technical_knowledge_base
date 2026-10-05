#include <cstdio>
#include <string>
#include <vector>

// One template, many functions: the compiler writes a copy per type used.
template <typename T>
T total(const std::vector<T>& xs) {
    T sum{};
    for (const T& x : xs) sum += x;
    return sum;
}

template <typename K, typename V>
struct Pair { K key; V value; };       // a class template

int main() {
    std::printf("%d\n", total(std::vector<int>{1, 2, 3}));
    std::printf("%.1f\n", total(std::vector<double>{0.5, 0.25}));
    std::printf("%s\n", total(std::vector<std::string>{"to", "ken"}).c_str());
    Pair<std::string, long> p{"u0029", 9491};
    std::printf("%s %ld\n", p.key.c_str(), p.value);
}
