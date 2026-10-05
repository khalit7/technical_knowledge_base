#include <cstdio>
int main() {
    int* p = new int(42);
    delete p;                       // memory returned to the allocator
    std::printf("value %d\n", *p);  // use after free: undefined behaviour, no error
}
