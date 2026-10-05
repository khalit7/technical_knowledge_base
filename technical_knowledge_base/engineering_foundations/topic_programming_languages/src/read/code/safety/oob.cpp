#include <cstdio>
#include <vector>
int main() {
    std::vector<int> top = {9491, 4816, 3499};
    std::printf("top[5] = %d\n", top[5]);          // no check: undefined behaviour
    std::printf("top.at(5) = %d\n", top.at(5));    // checked: throws std::out_of_range
}
