#include <vector>
template <typename T>
T total(const std::vector<T>& xs) {
    T sum{};
    for (const T& x : xs) sum += x;
    return sum;
}
struct Msg { const char* text; };

int main() {
    std::vector<Msg> msgs{{"hi"}, {"there"}};
    total(msgs);    // Msg has no +=
}
