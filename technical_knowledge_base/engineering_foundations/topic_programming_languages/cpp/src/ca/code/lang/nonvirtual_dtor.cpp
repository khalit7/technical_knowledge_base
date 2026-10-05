#include <cstdio>

struct Base {
    ~Base() { std::printf("~Base\n"); }          // NOT virtual
};
struct Derived : Base {
    int* buf = new int[100];
    ~Derived() { delete[] buf; std::printf("~Derived\n"); }
};

int main() {
    Base* p = new Derived;
    delete p;    // undefined behaviour: only ~Base runs here, buf leaks
}
