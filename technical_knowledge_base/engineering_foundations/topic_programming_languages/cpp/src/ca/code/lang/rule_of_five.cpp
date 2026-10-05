#include <cstdio>
#include <cstring>
#include <utility>

// A class that owns a raw buffer must write all five special members.
class Buffer {
    float* data_;
    std::size_t n_;
public:
    explicit Buffer(std::size_t n) : data_(new float[n]()), n_(n) {}
    ~Buffer() { delete[] data_; }                                   // 1 destructor
    Buffer(const Buffer& o) : data_(new float[o.n_]), n_(o.n_) {    // 2 copy constructor
        std::memcpy(data_, o.data_, n_ * sizeof(float));
    }
    Buffer& operator=(const Buffer& o) {                            // 3 copy assignment
        Buffer tmp(o);
        swap(tmp);
        return *this;
    }
    Buffer(Buffer&& o) noexcept                                     // 4 move constructor
        : data_(std::exchange(o.data_, nullptr)), n_(std::exchange(o.n_, 0)) {}
    Buffer& operator=(Buffer&& o) noexcept {                        // 5 move assignment
        Buffer tmp(std::move(o));
        swap(tmp);
        return *this;
    }
    void swap(Buffer& o) noexcept { std::swap(data_, o.data_); std::swap(n_, o.n_); }
    std::size_t size() const { return n_; }
};

// Rule of zero: let a member that already manages itself do the work.
#include <vector>
struct Buffer0 {
    std::vector<float> data;   // the compiler writes all five, correctly
};

int main() {
    Buffer a(4), b = a, c = std::move(a);
    b = c;
    Buffer0 x{std::vector<float>(4)}, y = x, z = std::move(x);
    std::printf("b %zu, c %zu, moved-from a %zu; y %zu, z %zu, moved-from x %zu\n",
                b.size(), c.size(), a.size(), y.data.size(), z.data.size(), x.data.size());
}
