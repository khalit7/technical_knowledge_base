#include <cstdio>
#include <cstring>

// The same class with only a destructor: the compiler-written copy copies the POINTER.
class Buffer {
public:
    float* data;
    explicit Buffer(std::size_t n) : data(new float[n]()) {}
    ~Buffer() { delete[] data; }
};

int main() {
    Buffer a(4);
    Buffer b = a;          // both now point at the same array
    std::printf("same array: %d\n", a.data == b.data);
}                          // b's destructor frees it, then a's frees it again
