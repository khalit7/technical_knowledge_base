#include <cstdio>
#include <vector>

int main() {
    std::vector<int> v;
    std::size_t last = v.capacity();
    std::printf("size 0 capacity %zu\n", last);
    for (int i = 0; i < 1000; ++i) {
        v.push_back(i);
        if (v.capacity() != last) {     // a new, bigger buffer: everything was moved
            last = v.capacity();
            std::printf("size %zu capacity %zu\n", v.size(), last);
        }
    }
}
