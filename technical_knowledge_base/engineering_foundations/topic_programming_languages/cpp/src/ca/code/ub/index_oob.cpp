#include <cstdio>
#include <vector>

int main() {
    std::vector<int> top{9491, 4816, 3499};
    std::printf("top[5] = %d\n", top[5]);   // [] does not check the index
}
