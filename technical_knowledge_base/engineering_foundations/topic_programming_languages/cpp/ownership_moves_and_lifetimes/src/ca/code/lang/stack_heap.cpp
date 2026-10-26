#include <cstdio>
#include <memory>
#include <vector>

int global_counter = 0;            // static storage: lives for the whole program

void show(const char* what, const void* p) { std::printf("%-28s %p\n", what, p); }

int main() {
    int on_stack = 1;                       // automatic storage (the stack)
    int also_on_stack = 2;
    auto on_heap = std::make_unique<int>(3); // dynamic storage (the heap)
    std::vector<int> v{1, 2, 3};            // the vector object is on the stack...

    show("&global_counter (static)", &global_counter);
    show("&on_stack", &on_stack);
    show("&also_on_stack", &also_on_stack);
    show("&v (the vector object)", &v);
    show("on_heap.get() (heap int)", on_heap.get());
    show("v.data() (its elements)", v.data());     // ...its elements are on the heap
    std::printf("sizeof(v) = %zu bytes, whatever v.size() is\n", sizeof(v));
}
