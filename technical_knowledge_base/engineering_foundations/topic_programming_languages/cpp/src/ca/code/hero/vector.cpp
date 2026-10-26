#include <cstdio>
#include <cstdlib>
#include <new>
#include <vector>

// Log every heap allocation and free, so the run shows when the vector's buffer is made and released.
static bool trace = false;
void* operator new(std::size_t n) {
    void* p = std::malloc(n);
    if (trace) std::printf("  operator new: %zu bytes on the heap at %p\n", n, p);
    return p;
}
void operator delete(void* p) noexcept {
    if (trace) std::printf("  operator delete: heap %p freed\n", p);
    std::free(p);
}
void operator delete(void* p, std::size_t n) noexcept {
    if (trace) std::printf("  operator delete: %zu bytes at heap %p freed\n", n, p);
    std::free(p);
}

int main() {
    trace = true;
    std::printf("{  enter the block\n");
    {
        std::vector<float> v{1.0f, 2.0f, 3.0f};
        std::printf("  v itself: %zu bytes on the stack at %p (pointer, size, capacity)\n", sizeof v, (void*)&v);
        std::printf("  v.data(): %zu floats of %zu bytes on the heap at %p\n", v.size(), sizeof(float), (void*)v.data());
        std::printf("}  leave the block: v's destructor runs now\n");
    }
    std::printf("after the block: nothing is left to free\n");
}
