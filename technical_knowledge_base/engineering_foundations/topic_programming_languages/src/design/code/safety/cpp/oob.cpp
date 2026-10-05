#include <vector>
#include <cstdio>
int main() {
    std::vector<int> v = {1, 2, 3};
    std::printf("v[3] = %d\n", v[3]);   // past the end: undefined behaviour, no check
    std::fflush(stdout);
    std::printf("v.at(3) = %d\n", v.at(3));  // checked: throws
}
