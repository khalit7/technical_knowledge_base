#include <vector>
// A concept names the requirement: T must support += and start from T{}
template <typename T>
concept Summable = requires(T a, T b) { T{}; a += b; };

template <Summable T>
T total(const std::vector<T>& xs) {
    T sum{};
    for (const T& x : xs) sum += x;
    return sum;
}
struct Msg { const char* text; };

int main() {
    std::vector<Msg> msgs{{"hi"}, {"there"}};
    total(msgs);    // rejected at the call, with the reason
}
