#include <cstdlib>
#include <cstdio>
int main() {
    int v[] = {3, 1, 2};
    // C's qsort, called directly; a capture-free lambda converts to a C function pointer
    std::qsort(v, 3, sizeof(int), [](const void* a, const void* b) {
        return *static_cast<const int*>(a) - *static_cast<const int*>(b); });
    std::printf("%d %d %d\n", v[0], v[1], v[2]);
}
