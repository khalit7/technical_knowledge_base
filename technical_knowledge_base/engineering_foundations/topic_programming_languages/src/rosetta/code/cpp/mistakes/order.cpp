#include <algorithm>
#include <concepts>
#include <string>
#include <vector>

template <std::totally_ordered T>
std::vector<T> top_k(std::vector<T> v, size_t k) {
    std::sort(v.begin(), v.end(), [](const T& a, const T& b) { return a > b; });
    v.resize(std::min(k, v.size()));
    return v;
}

struct Message {
    std::string user;
    std::string text;
};

int main() {
    std::vector<Message> ms{{"u0029", "hi"}, {"u0005", "yo"}};
    return top_k(ms, 1).size();  // Message has no < or >
}
