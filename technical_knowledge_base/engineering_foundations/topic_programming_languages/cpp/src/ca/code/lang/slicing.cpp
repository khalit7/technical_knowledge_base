#include <cstdio>

struct Base {
    virtual const char* name() const { return "Base"; }
    virtual ~Base() = default;
};
struct Derived : Base {
    int extra = 42;
    const char* name() const override { return "Derived"; }
};

void by_value(Base b) { std::printf("by value: %s\n", b.name()); }
void by_ref(const Base& b) { std::printf("by reference: %s\n", b.name()); }

int main() {
    Derived d;
    by_value(d);   // copies only the Base part: "sliced"
    by_ref(d);
}
