#include <cstdio>
#include <vector>

int main() {
    std::vector<int> a{1, 2, 3};
    std::vector<int> b = a;    // a COPY: b gets its own three ints
    b.push_back(4);
    std::printf("a has %zu, b has %zu\n", a.size(), b.size());

    std::vector<int>& r = a;   // a REFERENCE: another name for a
    r.push_back(99);
    std::printf("a has %zu after r.push_back\n", a.size());

    std::vector<int>* p = &a;  // a POINTER: holds a's address
    p->push_back(7);           // -> follows the pointer
    std::printf("a has %zu after p->push_back; p == &a is %d\n", a.size(), p == &a);

    p = nullptr;               // a pointer can be re-pointed, or point at nothing
    std::printf("p is now %s\n", p ? "set" : "null");
}
